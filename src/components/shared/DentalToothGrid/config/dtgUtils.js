/**
 * DentalToothGrid pure helpers: tooth type, gap keys/labels, schema geometry, download filename.
 */
import {
  FDI_GAP_SVG,
  UPPER_ARC_CTR,
  LOWER_ARC_CTR,
  UPPER_GAP_KEYS,
  LOWER_GAP_KEYS,
  STEP_NUMBERS,
  UPPER_Q1,
  UPPER_Q2,
  LOWER_Q4,
  LOWER_Q3,
} from "./constants.js";

/**
 * Distance along the tooth module bisector between successive icons on the visual
 * schema (same idea as step bubbles along a gap — collinear, not fanned sideways).
 */
export const MODULE_SCHEMA_ICON_ALONG_SPACING = 42;

/** Half of foreignObject icon box on treatment plan schema (see TreatmentPlanSchemaVisual). */
export const MODULE_SCHEMA_ICON_HALF = 16;

/**
 * Gaps whose midpoint lies on an interdental segment touching `toothNum` (FDI).
 */
export function getAdjacentGapKeysForTooth(toothNum) {
  const keys = [];
  for (const k of Object.keys(FDI_GAP_SVG)) {
    const parts = k.slice(1).split("-");
    const t1 = Number(parts[0]);
    const t2 = Number(parts[1]);
    if (t1 === toothNum || t2 === toothNum) keys.push(k);
  }
  return keys;
}

/**
 * Outward unit vector for tooth module leader lines: **angle bisector** of the
 * outward directions used for step/stripping lines on each gap adjacent to this
 * tooth ({@link getGapOutDir}). That centers the axis between the two adjacent
 * stripping “spokes” instead of using a pure arc-center radial (which skewed
 * toward one side). End teeth with one gap use that gap’s direction only.
 */
export function getModuleOutwardUnitFromAdjacentGaps(toothNum, toothCenter) {
  const keys = getAdjacentGapKeysForTooth(toothNum);
  if (keys.length === 0) {
    const isUpper = toothNum < 30;
    const c = isUpper ? UPPER_ARC_CTR : LOWER_ARC_CTR;
    const dx = toothCenter.x - c.x;
    const dy = toothCenter.y - c.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / len, y: dy / len };
  }
  if (keys.length === 1) {
    return getGapOutDir(keys[0]);
  }
  let sx = 0;
  let sy = 0;
  for (const k of keys) {
    const d = getGapOutDir(k);
    sx += d.x;
    sy += d.y;
  }
  const len = Math.sqrt(sx * sx + sy * sy) || 1;
  return { x: sx / len, y: sy / len };
}

/**
 * Point outside the arch for a module icon: along the bisector of adjacent gap
 * directions (see {@link getModuleOutwardUnitFromAdjacentGaps}). Multiple icons on
 * one tooth share this ray, spaced by {@link MODULE_SCHEMA_ICON_ALONG_SPACING}.
 * @param {number} toothNum - FDI
 * @param {{ x: number, y: number }} toothCenter
 * @param {number} slotIndex - 0..totalSlots-1 (first icon closest to the tooth)
 */
export function getOutwardIconPointForTooth(toothNum, toothCenter, slotIndex) {
  const { x: ux, y: uy } = getModuleOutwardUnitFromAdjacentGaps(
    toothNum,
    toothCenter
  );
  /** Pixels from tooth center to the *first* icon center along the bisector */
  const baseDist = 78;
  const dist = baseDist + slotIndex * MODULE_SCHEMA_ICON_ALONG_SPACING;
  return {
    x: toothCenter.x + ux * dist,
    y: toothCenter.y + uy * dist,
  };
}

const ALL_FDI_TEETH = [...UPPER_Q1, ...UPPER_Q2, ...LOWER_Q4, ...LOWER_Q3];

/** @type {Record<number, { x: number, y: number }> | null} */
let fdiToothSvgCentersCache = null;

/**
 * Approximate SVG center per FDI tooth on strippingPlanSchema.png (same space as FDI_GAP_SVG).
 * Interior teeth: average of adjacent gap midpoints. Endpoints (18,28,48,38): extrapolate along arch.
 */
export function getFdiToothSvgCenters() {
  if (fdiToothSvgCentersCache) return fdiToothSvgCentersCache;

  const toothToPoints = {};
  for (const [gapKey, pos] of Object.entries(FDI_GAP_SVG)) {
    const parts = gapKey.slice(1).split("-");
    const t1 = Number(parts[0]);
    const t2 = Number(parts[1]);
    for (const t of [t1, t2]) {
      if (!toothToPoints[t]) toothToPoints[t] = [];
      toothToPoints[t].push({ x: pos.x, y: pos.y });
    }
  }

  const extrapolate = (gapKey, neighborGapKey) => {
    const p0 = FDI_GAP_SVG[gapKey];
    const p1 = FDI_GAP_SVG[neighborGapKey];
    if (!p0 || !p1) return null;
    const vx = p0.x - p1.x;
    const vy = p0.y - p1.y;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const dist = 22;
    return { x: p0.x + (vx / len) * dist, y: p0.y + (vy / len) * dist };
  };

  /** @type {Record<number, { x: number, y: number }>} */
  const out = {};
  for (const t of ALL_FDI_TEETH) {
    const pts = toothToPoints[t];
    if (!pts?.length) continue;
    if (pts.length >= 2) {
      out[t] = {
        x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
        y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
      };
    } else {
      const single =
        t === 18
          ? extrapolate("U18-17", "U17-16")
          : t === 28
            ? extrapolate("U27-28", "U26-27")
            : t === 48
              ? extrapolate("L48-47", "L47-46")
              : t === 38
                ? extrapolate("L37-38", "L36-37")
                : null;
      if (single) out[t] = single;
    }
  }

  fdiToothSvgCentersCache = out;
  return out;
}

export function getToothType(num) {
  const n = num % 10;
  if (n === 8 || n === 7) return "molar3";
  if (n === 6) return "molar1";
  if (n === 5 || n === 4) return "premolar";
  if (n === 3) return "canine";
  if (n === 2) return "lateral";
  return "central";
}

export function buildGapKey(arch, t1, t2) {
  return `${arch === "upper" ? "U" : "L"}${t1}-${t2}`;
}

export function formatGapLabel(gapKey) {
  const prefix = gapKey.startsWith("U") ? "Upper" : "Lower";
  const nums = gapKey.slice(1).split("-");
  return `${prefix}: ${nums[0]} – ${nums[1]}`;
}

/** Short label for gap, e.g. "11 – 21" */
export function gapShortLabel(gapKey) {
  return gapKey.slice(1).replace("-", " – ");
}

/**
 * Returns the set of step numbers that are already placed in treatmentSteps.
 */
export function getPlacedStepNumbers(treatmentSteps) {
  const placed = new Set();
  Object.values(treatmentSteps || {}).forEach((steps) => {
    (steps || []).forEach((s) => placed.add(s.stepNum));
  });
  return placed;
}

/**
 * Returns the next step number that can be selected (first in sequence not yet placed).
 * Steps must be placed in order: 1, 3, 5, 7, ... 31.
 */
export function getNextSelectableStep(treatmentSteps) {
  const placed = getPlacedStepNumbers(treatmentSteps);
  return STEP_NUMBERS.find((num) => !placed.has(num)) ?? null;
}

/** True if stepRef { gapKey, stepIdx } matches the given gap/step */
export function stepMatches(stepRef, gapKey, stepIdx) {
  return (
    stepRef != null && stepRef.gapKey === gapKey && stepRef.stepIdx === stepIdx
  );
}

/** Flat list of treatment steps sorted by stepNum. Used by TabStripping todo list. */
export function buildStepList(treatmentSteps) {
  const entries = [];
  [...UPPER_GAP_KEYS, ...LOWER_GAP_KEYS].forEach((gapKey) => {
    const steps = treatmentSteps[gapKey] || [];
    steps.forEach((step, stepIdx) => {
      const simpleId = gapKey.slice(1) + (stepIdx > 0 ? `-${stepIdx}` : "");
      entries.push({
        id: `${gapKey}-${stepIdx}`,
        simpleId,
        gapKey,
        stepIdx,
        stepNum: step.stepNum,
        stripings: step.stripings || [],
      });
    });
  });
  entries.sort((a, b) => a.stepNum - b.stepNum);
  return entries;
}

/** Convert step id to simple format for storage, e.g. "U17-16-0" -> "17-16" */
export function toSimpleStepId(id) {
  if (!id || typeof id !== "string") return null;
  const simple = id.replace(/^[UL]/, "");
  return simple.replace(/-0$/, "") || simple;
}

export function getGapOutDir(gapKey) {
  const pos = FDI_GAP_SVG[gapKey];
  if (!pos) return { x: 0, y: -1 };
  if (typeof pos.angle === "number") {
    const rad = (pos.angle * Math.PI) / 180;
    const up = gapKey.startsWith("U");
    return { x: Math.sin(rad), y: up ? -Math.cos(rad) : Math.cos(rad) };
  }
  const c = gapKey.startsWith("U") ? UPPER_ARC_CTR : LOWER_ARC_CTR;
  const dx = pos.x - c.x;
  const dy = pos.y - c.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Per-gap span length (px from gap to first bubble). */
export function getGapBoff(gapKey, defaultBoff) {
  const pos = FDI_GAP_SVG[gapKey];
  if (!pos) return defaultBoff;
  if (typeof pos.length === "number") return pos.length;
  if (typeof pos.boff === "number") return pos.boff;
  return defaultBoff;
}

/**
 * @param {string} patientName
 * @returns {string} e.g. "John Doe treatment plan.pdf"
 */
function buildPatientTreatmentPlanPdfFilename(patientName) {
  const safeName =
    String(patientName || "Patient")
      .replace(/[/\\:*?"<>|]/g, "_")
      .trim() || "Patient";
  return `${safeName} treatment plan.pdf`;
}

/**
 * Suggested PDF filename for treatment plan / legacy stripping download.
 * @param {string} patientName - Display name of the patient
 * @returns {string} e.g. "John Doe treatment plan.pdf"
 */
export function buildStrippingPlanDownloadFilename(patientName) {
  return buildPatientTreatmentPlanPdfFilename(patientName);
}

/**
 * Suggested PDF filename for stripping & attachments V2 (canvas) download.
 * @param {string} patientName - Display name of the patient
 * @returns {string} e.g. "John Doe treatment plan.pdf"
 */
export function buildStrippingV2PlanDownloadFilename(patientName) {
  return buildPatientTreatmentPlanPdfFilename(patientName);
}
