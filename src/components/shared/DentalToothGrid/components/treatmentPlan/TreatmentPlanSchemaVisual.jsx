/**
 * Visual treatment plan overlay on the dental schema image: gaps, connector lines,
 * step bubbles, striping labels, green dots for holding/rotation clips, and
 * icons + leader lines for other tooth modules (axes = bisector of adjacent gap directions).
 */
import { useMemo } from "react";
import {
  DTG_SVG_W,
  DTG_SVG_H,
  STRIPING_MAP,
  FDI_GAP_SVG,
} from "../../config/constants.js";
import {
  getGapOutDir,
  getGapBoff,
  stepMatches,
  getFdiToothSvgCenters,
  getOutwardIconPointForTooth,
  MODULE_SCHEMA_ICON_HALF,
} from "../../config/dtgUtils.js";
import { MODULE_MAP, ModuleIcon } from "../../shared/DentalToothGridIcons.jsx";

const SCHEMA_HIGHLIGHT = "#7c3aed";
const SCHEMA_BLUE = "#3b82f6";
const SCHEMA_RED = "#dc2626";
/** Holding clip & rotation clip — shown as green dots on the schema */
const ATTACHMENT_MODULE_IDS = new Set(["holding-clip", "clip-rotation"]);
const ATTACHMENT_DOT_FILL = "#16a34a";
const ATTACHMENT_DOT_R = 6;
const MODULE_ICON_FO = 32;
const MODULE_ICON_HALF = MODULE_SCHEMA_ICON_HALF;

export default function TreatmentPlanSchemaVisual({
  treatmentSteps = {},
  toothModules = {},
  highlightedStep = null,
  onPreviewClick,
  showHeader = true,
}) {
  const BR = 11;
  const BOFF = 390;
  const SGAP = 78;
  const STRIPING_LINE_EXTEND = 32;
  const LSEP = 20;
  /** Horizontal offset of striping label from bubble center (same y as bubble for alignment) */
  const LABEL_X_OFFSET = 40;
  const FRAME_W = 36;
  const FRAME_H = 14;

  const toothCenters = useMemo(() => getFdiToothSvgCenters(), []);

  const attachmentDots = useMemo(() => {
    const els = [];
    Object.entries(toothModules || {}).forEach(([toothStr, modIds]) => {
      const toothNum = Number(toothStr);
      if (!Number.isFinite(toothNum)) return;
      const ids = Array.isArray(modIds) ? modIds : [];
      const hasClip = ids.some((id) => ATTACHMENT_MODULE_IDS.has(id));
      if (!hasClip) return;
      const pos = toothCenters[toothNum];
      if (!pos) return;
      els.push(
        <circle
          key={`attachment-${toothNum}`}
          cx={pos.x}
          cy={pos.y}
          r={ATTACHMENT_DOT_R}
          fill={ATTACHMENT_DOT_FILL}
          opacity={0.95}
          aria-hidden
        >
          <title>{`Attachment (holding / rotation clip) on tooth ${toothNum}`}</title>
        </circle>
      );
    });
    return els;
  }, [toothModules, toothCenters]);

  const showAttachmentLegend = attachmentDots.length > 0;

  const moduleIconMarkers = useMemo(() => {
    const lineEls = [];
    const iconEls = [];
    Object.entries(toothModules || {}).forEach(([toothStr, modIds]) => {
      const toothNum = Number(toothStr);
      if (!Number.isFinite(toothNum)) return;
      const ids = Array.isArray(modIds) ? modIds : [];
      const nonClip = ids.filter(
        (id) => !ATTACHMENT_MODULE_IDS.has(id) && MODULE_MAP[id]
      );
      if (nonClip.length === 0) return;
      const toothCenter = toothCenters[toothNum];
      if (!toothCenter) return;

      let lastIx = toothCenter.x;
      let lastIy = toothCenter.y;
      nonClip.forEach((modId, idx) => {
        const mod = MODULE_MAP[modId];
        const { x: ix, y: iy } = getOutwardIconPointForTooth(
          toothNum,
          toothCenter,
          idx
        );
        lastIx = ix;
        lastIy = iy;
        iconEls.push(
          <foreignObject
            key={`mod-fo-${toothNum}-${modId}-${idx}`}
            x={ix - MODULE_ICON_HALF}
            y={iy - MODULE_ICON_HALF}
            width={MODULE_ICON_FO}
            height={MODULE_ICON_FO}
            className="tp-schema-module-foreign"
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="tp-schema-module-fo"
              style={{ color: mod.color }}
              title={`${mod.label} — tooth ${toothNum}`}
            >
              <ModuleIcon mod={mod} svgSize={20} />
            </div>
          </foreignObject>
        );
      });
      const vx = lastIx - toothCenter.x;
      const vy = lastIy - toothCenter.y;
      const vlen = Math.sqrt(vx * vx + vy * vy) || 1;
      const lineEndX = lastIx + (vx / vlen) * MODULE_ICON_HALF;
      const lineEndY = lastIy + (vy / vlen) * MODULE_ICON_HALF;
      lineEls.push(
        <line
          key={`mod-line-${toothNum}`}
          x1={toothCenter.x}
          y1={toothCenter.y}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#64748b"
          strokeWidth={1.25}
          opacity={0.92}
        />
      );
    });
    return (
      <>
        <g className="tp-schema-module-markers-lines" aria-hidden>
          {lineEls}
        </g>
        <g className="tp-schema-module-markers-icons" aria-hidden>
          {iconEls}
        </g>
      </>
    );
  }, [toothModules, toothCenters]);

  const linesEls = [];
  const rectsAndTextEls = [];
  const gapData = [];

  Object.entries(treatmentSteps).forEach(([gapKey, steps]) => {
    if (!steps?.length) return;
    const pos = FDI_GAP_SVG[gapKey];
    if (!pos) return;
    const { x: gx, y: gy } = pos;
    const { x: dx, y: dy } = getGapOutDir(gapKey);
    const isLeft = dx < -0.25;
    const withIdx = steps.map((step, stepIdx) => ({ step, stepIdx }));
    const sortedWithIdx = [...withIdx].sort(
      (a, b) => b.step.stepNum - a.step.stepNum
    );
    const gapBoff = getGapBoff(gapKey, BOFF);
    const positions = sortedWithIdx.map(({ step, stepIdx }, si) => ({
      step,
      stepIdx,
      si,
      bx: gx + dx * (gapBoff + si * SGAP),
      by: gy + dy * (gapBoff + si * SGAP),
    }));
    gapData.push({
      gapKey,
      gx,
      gy,
      dx,
      dy,
      isLeft,
      positions,
    });
  });

  const isStepHighlighted = (gapKey, stepIdx) =>
    stepMatches(highlightedStep, gapKey, stepIdx);

  /** Midline gaps (11-21 upper, 41-31 lower): connector lines drawn bold */
  const isMidlineGap = (key) => key === "U11-21" || key === "L41-31";

  // Decorative horizontal line between upper and lower arch (no steps on it)
  const MIDLINE_X_CENTER = DTG_SVG_W / 2 - 1;
  const MIDLINE_Y_CENTER = (172 + 318) / 2; // between UPPER_ARC_CTR.y and LOWER_ARC_CTR.y
  linesEls.push(
    <line
      key="decoration-left-right-separator"
      x1={MIDLINE_X_CENTER}
      y1={50}
      x2={MIDLINE_X_CENTER}
      y2={400}
      stroke="#000000"
      strokeWidth={2}
      opacity={1}
    />,
    <line
      key="decoration-upper-lower-separator"
      x1={0}
      y1={MIDLINE_Y_CENTER}
      x2={DTG_SVG_W}
      y2={MIDLINE_Y_CENTER}
      stroke="#000000"
      strokeWidth={2}
      opacity={1}
    />
  );

  gapData.forEach(({ gapKey, gx, gy, dx, dy, isLeft, positions }) => {
    let prevBx = gx;
    let prevBy = gy;
    const connectorStrokeWidth = isMidlineGap(gapKey) ? 3 : 1.5;
    positions.forEach(({ stepIdx, si, bx, by }) => {
      const lsx = si === 0 ? gx : prevBx - dx * BR;
      const lsy = si === 0 ? gy : prevBy - dy * BR;
      const strokeColor = isStepHighlighted(gapKey, stepIdx)
        ? SCHEMA_HIGHLIGHT
        : SCHEMA_BLUE;
      linesEls.push(
        <line
          key={`cl-${gapKey}-${si}`}
          x1={lsx}
          y1={lsy}
          x2={bx - dx * BR}
          y2={by - dy * BR}
          stroke={strokeColor}
          strokeWidth={connectorStrokeWidth}
        />
      );
      prevBx = bx;
      prevBy = by;
    });

    positions.forEach(({ step, stepIdx, si, bx, by }) => {
      if (step.stripings?.length > 0) {
        const n = step.stripings.length;
        const lineEndX = gx - dx * STRIPING_LINE_EXTEND;
        const lineEndY = gy - dy * STRIPING_LINE_EXTEND;
        const strokeColor = isStepHighlighted(gapKey, stepIdx)
          ? SCHEMA_HIGHLIGHT
          : "#64748b";
        linesEls.push(
          <line
            key={`sl-${gapKey}-${si}`}
            x1={bx - dx * BR}
            y1={by - dy * BR}
            x2={lineEndX}
            y2={lineEndY}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        );
        // Anchor labels to the bubble's y-axis so they stay aligned (same horizontal line as bubble)
        const labelX = bx + (isLeft ? -LABEL_X_OFFSET : LABEL_X_OFFSET);
        const labelStrokeColor = step.stripings?.includes("mesio-distal")
          ? SCHEMA_RED
          : "#64748b";
        step.stripings.forEach((stripId, li) => {
          const sInfo = STRIPING_MAP[stripId];
          const lbl = sInfo ? sInfo.label : stripId;
          const ly = by + (li - (n - 1) / 2) * LSEP;
          const iconX = isLeft ? labelX - 12 : labelX + 2;
          const frameX = isLeft ? iconX - FRAME_W - 3 : iconX + 3;
          const frameY = ly - FRAME_H / 2;
          const frameCx = frameX + FRAME_W / 2;
          const frameCy = frameY + FRAME_H / 2;
          const lineEndX = isLeft ? frameX + FRAME_W : frameX;
          const lineStartX = isLeft ? bx - BR : bx + BR;
          const strokeColor = isStepHighlighted(gapKey, stepIdx)
            ? SCHEMA_HIGHLIGHT
            : labelStrokeColor;
          linesEls.push(
            <line
              key={`lc-${gapKey}-${si}-${li}`}
              x1={lineStartX}
              y1={by}
              x2={lineEndX}
              y2={ly}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          );
          rectsAndTextEls.push(
            <rect
              key={`lr-${gapKey}-${si}-${li}`}
              x={frameX}
              y={frameY}
              width={FRAME_W}
              height={FRAME_H}
              rx={3}
              fill="#fff"
              stroke={strokeColor}
              strokeWidth="1.2"
            />,
            <text
              key={`lt-${gapKey}-${si}-${li}`}
              x={frameCx}
              y={frameCy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fill="#1e3a5f"
              fontFamily="'Inter', system-ui, sans-serif"
            >
              {lbl}
            </text>
          );
        });
      }
    });
  });

  gapData.forEach(({ gapKey, positions }) => {
    positions.forEach(({ step, stepIdx, si, bx, by }) => {
      const baseColor = step.stripings?.includes("mesio-distal")
        ? SCHEMA_RED
        : SCHEMA_BLUE;
      const bubbleColor = isStepHighlighted(gapKey, stepIdx)
        ? SCHEMA_HIGHLIGHT
        : baseColor;
      rectsAndTextEls.push(
        <circle
          key={`bc-${gapKey}-${si}`}
          cx={bx}
          cy={by}
          r={BR}
          fill={bubbleColor}
        />,
        <text
          key={`bt-${gapKey}-${si}`}
          x={bx}
          y={by}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11.5"
          fontWeight="700"
          fill="#fff"
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {step.stepNum}
        </text>
      );
    });
  });

  const PAD_X = 400;
  const PAD_Y = 400;
  const vbW = DTG_SVG_W + PAD_X * 2;
  const vbH = DTG_SVG_H + PAD_Y * 2;

  return (
    <div className="tp-schema-visual">
      {showHeader && (
        <div className="tp-schema-visual-header">
          <i className="fas fa-tooth" aria-hidden />
          <span>Visual treatment plan</span>
          {showAttachmentLegend && (
            <span className="tp-schema-attachment-legend" aria-hidden>
              <span
                className="tp-schema-attachment-legend-dot"
                style={{ background: ATTACHMENT_DOT_FILL }}
              />
              Holding / rotation clips
            </span>
          )}
          {typeof onPreviewClick === "function" && (
            <button
              type="button"
              className="tp-schema-preview-btn"
              onClick={onPreviewClick}
              aria-label="Preview in A4 format"
            >
              <i className="fas fa-expand" aria-hidden />
              <span>Preview</span>
            </button>
          )}
        </div>
      )}
      <div className="tp-schema-body">
        <svg
          viewBox={`${-PAD_X} ${-PAD_Y} ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="tp-schema-svg"
          role="img"
          aria-label="Visual treatment plan on dental schema"
        >
          <image
            href="/assets/strippingPlanSchema.png"
            x="0"
            y="0"
            width={DTG_SVG_W}
            height={DTG_SVG_H}
            preserveAspectRatio="xMidYMid meet"
          />
          {linesEls}
          {rectsAndTextEls}
          {moduleIconMarkers}
          {attachmentDots}
        </svg>
      </div>
    </div>
  );
}
