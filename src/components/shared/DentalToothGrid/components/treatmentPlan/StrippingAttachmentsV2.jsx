import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "@/i18n";
import { STEP_NUMBERS } from "../../config/constants.js";
import {
  MODULES,
  ModuleIcon,
  STRIPPING_V2_COMPANY_ONLY_MODULE_IDS,
  STRIPPING_V2_ONLY_MODULE_IDS,
} from "../../shared/DentalToothGridIcons.jsx";
import CommentPopup from "../popups/CommentPopup.jsx";
import "../../DentalToothGrid.css";
import {
  drawStrippingV2Scene,
  getStrippingV2AttachmentHitHalfExtents,
  getStrippingV2PlacedIconLayout,
  STRIPPING_V2_SCENE_BASE_HEIGHT,
  STRIPPING_V2_SCENE_BASE_WIDTH,
  STRIPPING_V2_STEP_BUBBLE_RADIUS,
} from "./strippingV2SceneDraw.js";

const BASE_WIDTH = STRIPPING_V2_SCENE_BASE_WIDTH;
const BASE_HEIGHT = STRIPPING_V2_SCENE_BASE_HEIGHT;
const STEP_BUBBLE_RADIUS = STRIPPING_V2_STEP_BUBBLE_RADIUS;

function newEntityId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `sa-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Same visual size as sidebar icons (viewBox 20×27). */
const MODULE_ICON_SVG_SIZE = 28;
/** Square card (canvas logical px); icon is letterboxed inside with equal padding. */
const ATTACHMENT_CARD_SIZE = 32;
/** Mesial / Distal / Mesiodistal — scale storage; overlay/hit use tight glyph box in scene draw. */
const STRIP_ATTACHMENT_CARD_SIZE = 48;
const STRIP_SCALE_MIN = 0.45;
const STRIP_SCALE_MAX = 1.55;
const STRIP_SCALE_STEP = 0.05;
const STRIP_PALETTE_ICON_BASE = 48;
const STRIP_PLACED_MIN_PX = 22;
const STRIP_PLACED_MAX_PX = 74;
/** Distance past half-height to the rotation handle (canvas logical px). */
const ROTATION_HANDLE_OUTSET = 14;
const ROTATION_HANDLE_HIT_RADIUS = 14;
/** Placed icon optical correction (negative moves icon up). */
const PLACED_ICON_OFFSET_Y = -2;
const PASTE_OFFSET_STEP = 28;
const ROTATE_STEP_DEG = 5;
const ROTATE_STEP_RAD = (ROTATE_STEP_DEG * Math.PI) / 180;

/** Let native Ctrl/Cmd+Z handle text fields (comment popup, inputs). */
function isEditableFocused(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag === "input") {
    const type = el.type?.toLowerCase() ?? "text";
    if (
      [
        "button",
        "submit",
        "checkbox",
        "radio",
        "reset",
        "file",
        "hidden",
      ].includes(type)
    ) {
      return false;
    }
    return true;
  }
  return el.isContentEditable === true;
}

const MARQUEE_MIN_SIDE_PX = 6;

function pointInMarqueeRect(px, py, x0, y0, x1, y1) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function buildMultiSelectionFromRect(cases, attachments, x0, y0, x1, y1) {
  const arrowIds = cases
    .filter((c) => pointInMarqueeRect(c.origin.x, c.origin.y, x0, y0, x1, y1))
    .map((c) => c.id);
  const attachmentIds = attachments
    .filter((a) => pointInMarqueeRect(a.x, a.y, x0, y0, x1, y1))
    .map((a) => a.id);
  return { arrowIds, attachmentIds };
}

function collapseSelectionFromMulti(arrowIds, attachmentIds) {
  if (arrowIds.length === 1 && attachmentIds.length === 0) {
    return { type: "arrow", id: arrowIds[0] };
  }
  if (attachmentIds.length === 1 && arrowIds.length === 0) {
    return { type: "attachment", id: attachmentIds[0] };
  }
  if (arrowIds.length + attachmentIds.length === 0) return null;
  return { type: "multi", arrowIds, attachmentIds };
}

/**
 * When 2+ attachments are multi-selected with no arrows: all strip or all non-strip.
 * Returns average scale factor for the slider, or null if mixed / ineligible.
 */
function getMultiUniformAttachmentScaleReadout(
  selection,
  attachments,
  isStripModuleId
) {
  if (selection?.type !== "multi" || selection.arrowIds.length !== 0)
    return null;
  if (selection.attachmentIds.length < 2) return null;
  const atts = selection.attachmentIds
    .map((id) => attachments.find((a) => a.id === id))
    .filter(Boolean);
  if (atts.length !== selection.attachmentIds.length) return null;
  const stripCount = atts.filter((a) => isStripModuleId(a.moduleId)).length;
  if (stripCount === atts.length) {
    const scales = atts.map((a) => a.width / STRIP_ATTACHMENT_CARD_SIZE);
    const value = scales.reduce((s, v) => s + v, 0) / scales.length;
    return { kind: "strip", value };
  }
  if (stripCount === 0) {
    const scales = atts.map((a) => a.width / ATTACHMENT_CARD_SIZE);
    const value = scales.reduce((s, v) => s + v, 0) / scales.length;
    return { kind: "icon", value };
  }
  return null;
}

function selectionHasArrow(selection, arrowId) {
  if (!selection) return false;
  if (selection.type === "arrow") return selection.id === arrowId;
  if (selection.type === "multi") return selection.arrowIds.includes(arrowId);
  return false;
}

function selectionHasAttachment(selection, attachmentId) {
  if (!selection) return false;
  if (selection.type === "attachment") return selection.id === attachmentId;
  if (selection.type === "multi")
    return selection.attachmentIds.includes(attachmentId);
  return false;
}

function getSelectedAttachmentIds(selection) {
  if (!selection) return [];
  if (selection.type === "attachment") return [selection.id];
  if (selection.type === "multi") return [...selection.attachmentIds];
  return [];
}

function getSelectedArrowIds(selection) {
  if (!selection) return [];
  if (selection.type === "arrow") return [selection.id];
  if (selection.type === "multi") return [...selection.arrowIds];
  return [];
}

/** Centroid for copy/paste: attachment centers + each arrow’s origin and target. */
function centroidForClipboard(cases, attachments, arrowIds, attIds) {
  const pts = [];
  attIds.forEach((id) => {
    const a = attachments.find((x) => x.id === id);
    if (a) pts.push({ x: a.x, y: a.y });
  });
  arrowIds.forEach((id) => {
    const c = cases.find((x) => x.id === id);
    if (c) {
      pts.push({ x: c.origin.x, y: c.origin.y });
      pts.push({ x: c.target.x, y: c.target.y });
    }
  });
  if (!pts.length) return null;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { cx, cy };
}

function normalizeAngleRad(r) {
  let t = r % (2 * Math.PI);
  if (t > Math.PI) t -= 2 * Math.PI;
  if (t < -Math.PI) t += 2 * Math.PI;
  return t;
}

/** Circular-mean direction for group rotation handle (attachments: rotation; arrows: shaft angle). */
function combinedMeanAngleForRotateHandle(
  cases,
  attachments,
  arrowIds,
  attIds
) {
  let sx = 0;
  let sy = 0;
  attIds.forEach((id) => {
    const a = attachments.find((x) => x.id === id);
    if (!a) return;
    sx += Math.cos(a.rotation);
    sy += Math.sin(a.rotation);
  });
  arrowIds.forEach((id) => {
    const c = cases.find((x) => x.id === id);
    if (!c) return;
    const ang = Math.atan2(c.target.y - c.origin.y, c.target.x - c.origin.x);
    sx += Math.cos(ang);
    sy += Math.sin(ang);
  });
  if (Math.abs(sx) < 1e-10 && Math.abs(sy) < 1e-10) return 0;
  return Math.atan2(sy, sx);
}

/** Perpendicular distance from (px,py) to segment AB (canvas logical px). */
function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-6) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * abx;
  const qy = ay + t * aby;
  return Math.hypot(px - qx, py - qy);
}

/**
 * Hit step bubble first; then arrow line if that arrow is part of `selection` (group move).
 * `hitOrigin` distinguishes bubble vs shaft so a line grab does not toggle off a sole arrow.
 */
const ARROW_LINE_HIT_PX = 10;

function hitTestArrowInteraction(pos, cases, selection) {
  for (let i = cases.length - 1; i >= 0; i -= 1) {
    const o = cases[i].origin;
    if (Math.hypot(pos.x - o.x, pos.y - o.y) < STEP_BUBBLE_RADIUS + 2) {
      return { index: i, hitOrigin: true };
    }
  }
  if (selection) {
    for (let i = cases.length - 1; i >= 0; i -= 1) {
      const c = cases[i];
      if (!selectionHasArrow(selection, c.id)) continue;
      const d = distancePointToSegment(
        pos.x,
        pos.y,
        c.origin.x,
        c.origin.y,
        c.target.x,
        c.target.y
      );
      if (d <= ARROW_LINE_HIT_PX) return { index: i, hitOrigin: false };
    }
  }
  return { index: -1, hitOrigin: false };
}

function clampedStripPlacementPx(scale) {
  const v = Math.round(STRIP_ATTACHMENT_CARD_SIZE * scale);
  return Math.min(STRIP_PLACED_MAX_PX, Math.max(STRIP_PLACED_MIN_PX, v));
}

function stripPlacementPxForModule(_moduleId, userScale) {
  return clampedStripPlacementPx(userScale);
}

function stripPaletteIconPx(scale) {
  return Math.min(
    56,
    Math.max(22, Math.round(STRIP_PALETTE_ICON_BASE * scale))
  );
}

/** Sidebar strip buttons use a fixed preview size; scaling applies only to placed canvas markers. */
const STRIP_PALETTE_ICON_FIXED = stripPaletteIconPx(1);

function normalizeIncomingStrippingV2Scene(s) {
  if (s == null || typeof s !== "object" || Array.isArray(s)) {
    return { cases: [], attachments: [] };
  }
  return {
    cases: Array.isArray(s.cases) ? s.cases : [],
    attachments: Array.isArray(s.attachments) ? s.attachments : [],
  };
}

function serializeStrippingV2SceneContent(cases, attachments) {
  return JSON.stringify({ cases, attachments });
}

const EMPTY_STRIPPING_V2_SCENE_SER = serializeStrippingV2SceneContent([], []);

/** Doctor-placed stripping V2 entities; lab items omit this or use `company`. */
const SCENE_OWNER_DOCTOR = "doctor";

function isDoctorOwnedSceneEntity(obj) {
  return obj != null && obj.sceneOwner === SCENE_OWNER_DOCTOR;
}

function selectionIsFullyDoctorOwned(cases, attachments, selection) {
  if (!selection) return false;
  if (selection.type === "attachment") {
    const a = attachments.find((x) => x.id === selection.id);
    return isDoctorOwnedSceneEntity(a);
  }
  if (selection.type === "arrow") {
    const c = cases.find((x) => x.id === selection.id);
    return isDoctorOwnedSceneEntity(c);
  }
  if (selection.type === "multi") {
    const arrowIds = selection.arrowIds ?? [];
    const attachmentIds = selection.attachmentIds ?? [];
    for (const id of arrowIds) {
      const c = cases.find((x) => x.id === id);
      if (!isDoctorOwnedSceneEntity(c)) return false;
    }
    for (const id of attachmentIds) {
      const a = attachments.find((x) => x.id === id);
      if (!isDoctorOwnedSceneEntity(a)) return false;
    }
    return arrowIds.length + attachmentIds.length > 0;
  }
  return false;
}

function filterRectSelectionToDoctorOwned(
  arrowIds,
  attachmentIds,
  cases,
  attachments
) {
  const arrows = arrowIds.filter((id) =>
    isDoctorOwnedSceneEntity(cases.find((c) => c.id === id))
  );
  const atts = attachmentIds.filter((id) =>
    isDoctorOwnedSceneEntity(attachments.find((a) => a.id === id))
  );
  return { arrowIds: arrows, attachmentIds: atts };
}

export default function StrippingAttachmentsV2({
  readOnly = false,
  scope = "company",
  initialScene,
  onSceneChange,
  onPrintPreview,
  /** When true, hide aligner step chips and step selector (e.g. doctor portal). */
  hideAlignerSteps = false,
  /**
   * Doctor portal: new placements get `sceneOwner: 'doctor'`; lab entities cannot
   * be selected, moved, rotated, or deleted.
   */
  restrictedToDoctorOwnedEdits = false,
}) {
  const { t } = useTranslation();
  const hideSteps = hideAlignerSteps || scope === "doctor";
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const historyRef = useRef([]);
  const movementRef = useRef({ changed: false });
  const casesRef = useRef([]);
  const attachmentsRef = useRef([]);
  const interactionRef = useRef(null);
  const [currentAligner, setCurrentAligner] = useState(null);
  const [cases, setCases] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [mode, setMode] = useState("select");
  const [selection, setSelection] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [canvasSize, setCanvasSize] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });
  /** Used for the *next* strip (Mesial/Distal/Mesiodistal) click-place when that tool is active. */
  const [stripScaleForNextPlace, setStripScaleForNextPlace] = useState(1);
  /** Scale factor (same range as strip) for Comment, clips, etc. — next placement + selected icon. */
  const [iconScaleForNextPlace, setIconScaleForNextPlace] = useState(1);
  const stripScaleHistoryPushed = useRef(false);
  /** Comment caption on canvas: show when this attachment id is hovered (see pointermove hit-test). */
  const [commentCaptionHoverId, setCommentCaptionHoverId] = useState(null);
  /** Open `CommentPopup` for this attachment id (place flow + edit). */
  const [commentPopupAttachmentId, setCommentPopupAttachmentId] =
    useState(null);
  /**
   * Clipboard: `{ attachmentItems?, arrowItems?, items? }` — `items` legacy key for attachments only.
   * Each arrow: rel origin/target vs copy centroid.
   */
  const attachmentClipboardRef = useRef(null);
  const pasteGenerationRef = useRef(0);
  const lastEmittedSceneRef = useRef("");
  const skipNextSceneEmitRef = useRef(false);
  const onSceneChangeRef = useRef(onSceneChange);
  const pendingSceneEmitRef = useRef(null);

  /** Keep refs in sync during render so initialScene / unmount effects never read stale state. */
  casesRef.current = cases;
  attachmentsRef.current = attachments;

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  const flushSceneToParent = useCallback((payload, ser) => {
    lastEmittedSceneRef.current = ser;
    pendingSceneEmitRef.current = null;
    onSceneChangeRef.current?.(payload);
  }, []);

  useEffect(() => {
    const incoming = normalizeIncomingStrippingV2Scene(initialScene);
    const ser = serializeStrippingV2SceneContent(
      incoming.cases,
      incoming.attachments
    );
    if (ser === lastEmittedSceneRef.current) return;
    const localSer = serializeStrippingV2SceneContent(
      casesRef.current,
      attachmentsRef.current
    );
    /** Parent props can lag behind canvas edits (refetch race or debounced emit). */
    if (localSer !== ser) {
      if (
        lastEmittedSceneRef.current === "" &&
        localSer !== EMPTY_STRIPPING_V2_SCENE_SER
      ) {
        return;
      }
      if (lastEmittedSceneRef.current !== "") {
        return;
      }
    }
    skipNextSceneEmitRef.current = true;
    setCases(JSON.parse(JSON.stringify(incoming.cases)));
    setAttachments(JSON.parse(JSON.stringify(incoming.attachments)));
    setSelection(null);
    setSelectedModuleId(null);
    setInteraction(null);
    setIsDrawing(false);
    setCurrentAligner(null);
    historyRef.current = [];
    lastEmittedSceneRef.current = ser;
  }, [initialScene]);

  useEffect(() => {
    if (!onSceneChangeRef.current) return;
    if (skipNextSceneEmitRef.current) {
      skipNextSceneEmitRef.current = false;
      return;
    }
    const payload = {
      schemaVersion: 1,
      cases: JSON.parse(JSON.stringify(cases)),
      attachments: JSON.parse(JSON.stringify(attachments)),
    };
    const ser = serializeStrippingV2SceneContent(
      payload.cases,
      payload.attachments
    );
    if (ser === lastEmittedSceneRef.current) {
      pendingSceneEmitRef.current = null;
      return;
    }
    pendingSceneEmitRef.current = { payload, ser };
    const t = setTimeout(() => {
      const pending = pendingSceneEmitRef.current;
      if (!pending || pending.ser !== ser) return;
      flushSceneToParent(pending.payload, pending.ser);
    }, 150);
    return () => clearTimeout(t);
  }, [cases, attachments, flushSceneToParent]);

  /** Persist latest canvas state when leaving the editor before the debounce fires. */
  useEffect(() => {
    return () => {
      if (!onSceneChangeRef.current) return;
      const pending = pendingSceneEmitRef.current;
      if (pending) {
        flushSceneToParent(pending.payload, pending.ser);
        return;
      }
      const payload = {
        schemaVersion: 1,
        cases: JSON.parse(JSON.stringify(casesRef.current)),
        attachments: JSON.parse(JSON.stringify(attachmentsRef.current)),
      };
      const ser = serializeStrippingV2SceneContent(
        payload.cases,
        payload.attachments
      );
      if (ser === lastEmittedSceneRef.current) return;
      flushSceneToParent(payload, ser);
    };
  }, [flushSceneToParent]);

  const snapshotScene = useCallback(
    () => ({
      cases: JSON.parse(JSON.stringify(cases)),
      attachments: JSON.parse(JSON.stringify(attachments)),
      selection,
      mode,
      stripScaleForNextPlace,
      iconScaleForNextPlace,
    }),
    [
      attachments,
      cases,
      iconScaleForNextPlace,
      mode,
      selection,
      stripScaleForNextPlace,
    ]
  );

  const pushHistory = useCallback(() => {
    historyRef.current.push(snapshotScene());
    if (historyRef.current.length > 120) historyRef.current.shift();
  }, [snapshotScene]);

  const chips = useMemo(() => STEP_NUMBERS.map((n) => String(n)), []);
  const visibleModules = useMemo(() => {
    if (scope === "doctor") {
      return MODULES.filter(
        (m) => !STRIPPING_V2_COMPANY_ONLY_MODULE_IDS.includes(m.id)
      );
    }
    return MODULES;
  }, [scope]);

  useEffect(() => {
    if (scope !== "doctor" || !selectedModuleId) return;
    if (STRIPPING_V2_COMPANY_ONLY_MODULE_IDS.includes(selectedModuleId)) {
      setSelectedModuleId(null);
    }
  }, [scope, selectedModuleId]);

  const selectedArrow = useMemo(() => {
    if (selection?.type === "arrow") {
      return cases.find((item) => item.id === selection.id) || null;
    }
    if (
      selection?.type === "multi" &&
      selection.arrowIds.length === 1 &&
      selection.attachmentIds.length === 0
    ) {
      return cases.find((item) => item.id === selection.arrowIds[0]) || null;
    }
    return null;
  }, [cases, selection]);

  const isStripModuleId = useCallback(
    (moduleId) => STRIPPING_V2_ONLY_MODULE_IDS.includes(moduleId),
    []
  );

  const selectedAttachment = useMemo(() => {
    if (selection?.type === "attachment") {
      return attachments.find((a) => a.id === selection.id) ?? null;
    }
    if (
      selection?.type === "multi" &&
      selection.attachmentIds.length === 1 &&
      selection.arrowIds.length === 0
    ) {
      return (
        attachments.find((a) => a.id === selection.attachmentIds[0]) ?? null
      );
    }
    return null;
  }, [attachments, selection]);

  const soleAttachmentIdForRotate = useMemo(() => {
    if (selection?.type === "attachment") return selection.id;
    if (
      selection?.type === "multi" &&
      selection.attachmentIds.length === 1 &&
      selection.arrowIds.length === 0
    ) {
      return selection.attachmentIds[0];
    }
    return null;
  }, [selection]);

  /**
   * Multi-select (2+ arrows and/or attachments): one shared rotation handle;
   * rigid rotation around centroidForClipboard (same as mirror / copy).
   */
  const groupRotateContext = useMemo(() => {
    if (readOnly) return null;
    if (selection?.type !== "multi") return null;
    const arrowIds = selection.arrowIds ?? [];
    const attachmentIds = selection.attachmentIds ?? [];
    if (restrictedToDoctorOwnedEdits) {
      if (
        !selectionIsFullyDoctorOwned(cases, attachments, selection) ||
        arrowIds.length + attachmentIds.length < 2
      ) {
        return null;
      }
    } else if (arrowIds.length + attachmentIds.length < 2) {
      return null;
    }
    const cent = centroidForClipboard(
      cases,
      attachments,
      arrowIds,
      attachmentIds
    );
    if (!cent) return null;
    const { cx, cy } = cent;
    const meanAngle = combinedMeanAngleForRotateHandle(
      cases,
      attachments,
      arrowIds,
      attachmentIds
    );
    let d = ROTATION_HANDLE_OUTSET + STEP_BUBBLE_RADIUS;
    if (attachmentIds.length > 0) {
      const atts = attachmentIds
        .map((id) => attachments.find((a) => a.id === id))
        .filter(Boolean);
      if (atts.length > 0) {
        d = Math.max(...atts.map((a) => a.height / 2)) + ROTATION_HANDLE_OUTSET;
      }
    }
    return {
      arrowIds: [...arrowIds],
      attachmentIds: [...attachmentIds],
      centroidX: cx,
      centroidY: cy,
      handleX: cx + d * Math.sin(meanAngle),
      handleY: cy - d * Math.cos(meanAngle),
    };
  }, [attachments, cases, readOnly, restrictedToDoctorOwnedEdits, selection]);

  const selectedStripIsActive =
    selectedAttachment && isStripModuleId(selectedAttachment.moduleId);

  const selectedNonStripAttachment =
    selectedAttachment && !isStripModuleId(selectedAttachment.moduleId);

  const iconToolIsActive =
    Boolean(selectedModuleId) && !isStripModuleId(selectedModuleId);

  const multiUniformAttachmentScale = useMemo(
    () =>
      getMultiUniformAttachmentScaleReadout(
        selection,
        attachments,
        isStripModuleId
      ),
    [attachments, isStripModuleId, selection]
  );

  const commentPopupAttachment = useMemo(() => {
    if (commentPopupAttachmentId == null) return null;
    return attachments.find((a) => a.id === commentPopupAttachmentId) ?? null;
  }, [attachments, commentPopupAttachmentId]);

  useEffect(() => {
    if (commentPopupAttachmentId == null) return;
    const exists = attachments.some((a) => a.id === commentPopupAttachmentId);
    if (!exists) setCommentPopupAttachmentId(null);
  }, [attachments, commentPopupAttachmentId]);

  useEffect(() => {
    interactionRef.current = interaction;
  }, [interaction]);

  const stripToolIsActive =
    selectedModuleId && isStripModuleId(selectedModuleId);

  const stripScaleSliderValue = useMemo(() => {
    if (selectedStripIsActive && selectedAttachment) {
      const s = selectedAttachment.width / STRIP_ATTACHMENT_CARD_SIZE;
      return Math.min(STRIP_SCALE_MAX, Math.max(STRIP_SCALE_MIN, s));
    }
    if (selectedNonStripAttachment) {
      const s = selectedAttachment.width / ATTACHMENT_CARD_SIZE;
      return Math.min(STRIP_SCALE_MAX, Math.max(STRIP_SCALE_MIN, s));
    }
    if (multiUniformAttachmentScale) {
      return Math.min(
        STRIP_SCALE_MAX,
        Math.max(STRIP_SCALE_MIN, multiUniformAttachmentScale.value)
      );
    }
    if (stripToolIsActive) {
      return Math.min(
        STRIP_SCALE_MAX,
        Math.max(STRIP_SCALE_MIN, stripScaleForNextPlace)
      );
    }
    if (iconToolIsActive) {
      return Math.min(
        STRIP_SCALE_MAX,
        Math.max(STRIP_SCALE_MIN, iconScaleForNextPlace)
      );
    }
    return Math.min(
      STRIP_SCALE_MAX,
      Math.max(STRIP_SCALE_MIN, stripScaleForNextPlace)
    );
  }, [
    iconScaleForNextPlace,
    iconToolIsActive,
    multiUniformAttachmentScale,
    selectedAttachment,
    selectedNonStripAttachment,
    selectedStripIsActive,
    stripScaleForNextPlace,
    stripToolIsActive,
  ]);

  const stripScaleSliderEnabled =
    !readOnly &&
    (selectedStripIsActive ||
      selectedNonStripAttachment ||
      Boolean(multiUniformAttachmentScale) ||
      stripToolIsActive ||
      iconToolIsActive);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * BASE_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * BASE_HEIGHT,
    };
  }, []);

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const attachmentSizeForModuleId = useCallback(
    (moduleId) =>
      isStripModuleId(moduleId)
        ? stripPlacementPxForModule(moduleId, stripScaleForNextPlace)
        : Math.round(ATTACHMENT_CARD_SIZE * iconScaleForNextPlace),
    [iconScaleForNextPlace, isStripModuleId, stripScaleForNextPlace]
  );

  const getRotationHandleCenter = useCallback((a) => {
    const { halfH } = getStrippingV2AttachmentHitHalfExtents(a);
    const d = halfH + ROTATION_HANDLE_OUTSET;
    return {
      x: a.x + d * Math.sin(a.rotation),
      y: a.y - d * Math.cos(a.rotation),
    };
  }, []);

  const worldToLocal = (point, attachment) => {
    const dx = point.x - attachment.x;
    const dy = point.y - attachment.y;
    const cos = Math.cos(-attachment.rotation);
    const sin = Math.sin(-attachment.rotation);
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  };

  const hitTestAttachment = useCallback(
    (pos) => {
      for (let i = attachments.length - 1; i >= 0; i -= 1) {
        const attachment = attachments[i];
        const local = worldToLocal(pos, attachment);
        const { halfW, halfH } =
          getStrippingV2AttachmentHitHalfExtents(attachment);
        if (Math.abs(local.x) <= halfW && Math.abs(local.y) <= halfH) {
          return { attachment };
        }
      }
      return null;
    },
    [attachments]
  );

  const hitTestRotationHandle = useCallback(
    (pos) => {
      if (readOnly) return null;
      if (groupRotateContext) {
        const h = {
          x: groupRotateContext.handleX,
          y: groupRotateContext.handleY,
        };
        if (distance(pos, h) <= ROTATION_HANDLE_HIT_RADIUS) {
          return { mode: "group", ...groupRotateContext };
        }
      }
      if (soleAttachmentIdForRotate == null) return null;
      const a = attachments.find((x) => x.id === soleAttachmentIdForRotate);
      if (!a) return null;
      if (restrictedToDoctorOwnedEdits && !isDoctorOwnedSceneEntity(a)) {
        return null;
      }
      const h = getRotationHandleCenter(a);
      if (distance(pos, h) <= ROTATION_HANDLE_HIT_RADIUS)
        return { mode: "single", attachment: a };
      return null;
    },
    [
      attachments,
      getRotationHandleCenter,
      groupRotateContext,
      readOnly,
      restrictedToDoctorOwnedEdits,
      soleAttachmentIdForRotate,
    ]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    drawStrippingV2Scene(ctx, {
      dpr,
      image: imageRef.current,
      cases,
      selection,
      interaction,
      baseWidth: BASE_WIDTH,
      baseHeight: BASE_HEIGHT,
      stepBubbleRadius: STEP_BUBBLE_RADIUS,
      showEditorOverlays: true,
    });
  }, [cases, interaction, selection]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(BASE_WIDTH * dpr);
    canvas.height = Math.round(BASE_HEIGHT * dpr);
    setCanvasSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
    setCanvasVersion((v) => v + 1);
  }, []);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawRef.current();
    };
    img.onerror = () => {
      const off = document.createElement("canvas");
      off.width = BASE_WIDTH;
      off.height = BASE_HEIGHT;
      const ctx = off.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, off.width, off.height);
      ctx.fillStyle = "#7a8795";
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "center";
      ctx.fillText(i18n.t("strippingV2.sidebarTitle"), off.width / 2, 100);
      ctx.font = "18px Arial";
      ctx.fillText(
        i18n.t("strippingV2.prototypeMissingImage"),
        off.width / 2,
        150
      );
      const fallback = new Image();
      fallback.onload = () => {
        imageRef.current = fallback;
        drawRef.current();
      };
      fallback.src = off.toDataURL("image/png");
    };
    img.src = "/assets/strippingEmbeddedImage.png";
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    draw();
  }, [canvasVersion, draw]);

  const addAttachment = (x = 600, y = 350) => {
    const sz = attachmentSizeForModuleId(selectedModuleId);
    const next = {
      id: newEntityId(),
      x,
      y,
      width: sz,
      height: sz,
      rotation: 0,
      moduleId: selectedModuleId,
      ...(selectedModuleId === "comment" ? { commentText: "" } : {}),
      ...(restrictedToDoctorOwnedEdits
        ? { sceneOwner: SCENE_OWNER_DOCTOR }
        : {}),
    };
    setAttachments((prev) => [...prev, next]);
    setSelection({ type: "attachment", id: next.id });
    if (selectedModuleId === "comment") {
      setCommentPopupAttachmentId(next.id);
    }
  };

  const handleCommentPopupSave = (text) => {
    const id = commentPopupAttachmentId;
    if (!id) return;
    const trimmed = text.trim();
    pushHistory();
    if (!trimmed) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      setSelection((sel) =>
        sel?.type === "attachment" && sel.id === id ? null : sel
      );
    } else {
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, commentText: trimmed } : a))
      );
    }
    setCommentPopupAttachmentId(null);
  };

  const handleCommentPopupRemove = () => {
    const id = commentPopupAttachmentId;
    if (!id) return;
    pushHistory();
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setSelection((sel) =>
      sel?.type === "attachment" && sel.id === id ? null : sel
    );
    setCommentPopupAttachmentId(null);
  };

  const handleCommentPopupClose = useCallback(() => {
    const id = commentPopupAttachmentId;
    setCommentPopupAttachmentId(null);
    if (!id) return;
    const att = attachments.find((a) => a.id === id);
    const wasEmpty = !(att?.commentText || "").trim();
    if (wasEmpty) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      setSelection((sel) =>
        sel?.type === "attachment" && sel.id === id ? null : sel
      );
    }
  }, [commentPopupAttachmentId, attachments]);

  const handleCanvasDoubleClick = (e) => {
    if (readOnly) return;
    const pos = getPos(e);
    const hit = hitTestAttachment(pos);
    if (hit?.attachment?.moduleId === "comment") {
      if (
        restrictedToDoctorOwnedEdits &&
        !isDoctorOwnedSceneEntity(hit.attachment)
      ) {
        return;
      }
      e.preventDefault();
      setCommentPopupAttachmentId(hit.attachment.id);
    }
  };

  const collectGroupPanOrigins = (sel) => {
    const caseOrigins = {};
    const attOrigins = {};
    const cList = casesRef.current;
    const aList = attachmentsRef.current;
    if (sel?.type === "arrow") {
      const c = cList.find((x) => x.id === sel.id);
      if (c) {
        caseOrigins[c.id] = {
          origin: { ...c.origin },
          target: { ...c.target },
        };
      }
    } else if (sel?.type === "attachment") {
      const a = aList.find((x) => x.id === sel.id);
      if (a) attOrigins[a.id] = { x: a.x, y: a.y };
    } else if (sel?.type === "multi") {
      sel.arrowIds.forEach((id) => {
        const c = cList.find((x) => x.id === id);
        if (c) {
          caseOrigins[c.id] = {
            origin: { ...c.origin },
            target: { ...c.target },
          };
        }
      });
      sel.attachmentIds.forEach((id) => {
        const a = aList.find((x) => x.id === id);
        if (a) attOrigins[a.id] = { x: a.x, y: a.y };
      });
    }
    return { caseOrigins, attOrigins };
  };

  const selectArrowAtPointer = (c, arrowHitOrigin, pos) => {
    if (restrictedToDoctorOwnedEdits && !isDoctorOwnedSceneEntity(c)) {
      setSelectedModuleId(null);
      setSelection(null);
      return;
    }
    setSelectedModuleId(null);
    if (
      arrowHitOrigin &&
      selection?.type === "arrow" &&
      selection.id === c.id
    ) {
      setSelection(null);
      setMode("select");
      return;
    }
    if (selection && selectionHasArrow(selection, c.id)) {
      pushHistory();
      movementRef.current = { changed: false };
      setMode("select");
      const { caseOrigins, attOrigins } = collectGroupPanOrigins(selection);
      setInteraction({
        type: "groupPan",
        startX: pos.x,
        startY: pos.y,
        caseOrigins,
        attOrigins,
      });
      return;
    }
    setSelection({ type: "arrow", id: c.id });
    setMode("select");
  };

  const handlePointerDown = (e) => {
    if (readOnly) return;
    const pos = getPos(e);
    const handleHit = hitTestRotationHandle(pos);
    const attachmentHit = hitTestAttachment(pos);
    const { index: arrowIndex, hitOrigin: arrowHitOrigin } =
      hitTestArrowInteraction(pos, cases, selection);

    if (handleHit) {
      setSelectedModuleId(null);
      if (handleHit.mode === "group") {
        pushHistory();
        movementRef.current = { changed: false };
        setMode("select");
        const attachmentOrigins = {};
        handleHit.attachmentIds.forEach((id) => {
          const att = attachments.find((x) => x.id === id);
          if (att) {
            attachmentOrigins[id] = {
              x: att.x,
              y: att.y,
              rotation: att.rotation,
            };
          }
        });
        const caseOrigins = {};
        handleHit.arrowIds.forEach((id) => {
          const c = cases.find((x) => x.id === id);
          if (c) {
            caseOrigins[id] = {
              origin: { ...c.origin },
              target: { ...c.target },
            };
          }
        });
        setInteraction({
          type: "rotateGroup",
          centroidX: handleHit.centroidX,
          centroidY: handleHit.centroidY,
          startPointerAngle: Math.atan2(
            pos.y - handleHit.centroidY,
            pos.x - handleHit.centroidX
          ),
          attachmentOrigins,
          caseOrigins,
        });
        return;
      }
      const a = handleHit.attachment;
      setSelection({ type: "attachment", id: a.id });
      pushHistory();
      movementRef.current = { changed: false };
      setMode("select");
      setInteraction({
        type: "rotate",
        id: a.id,
        startPointerAngle: Math.atan2(pos.y - a.y, pos.x - a.x),
        startRotation: a.rotation,
      });
      return;
    }

    if (arrowIndex !== -1 && arrowHitOrigin) {
      selectArrowAtPointer(cases[arrowIndex], arrowHitOrigin, pos);
      return;
    }

    if (attachmentHit) {
      const a = attachmentHit.attachment;
      if (restrictedToDoctorOwnedEdits && !isDoctorOwnedSceneEntity(a)) {
        setSelectedModuleId(null);
        setSelection(null);
        return;
      }
      setSelectedModuleId(null);
      if (selection && selectionHasAttachment(selection, a.id)) {
        pushHistory();
        movementRef.current = { changed: false };
        setMode("select");
        const { caseOrigins, attOrigins } = collectGroupPanOrigins(selection);
        setInteraction({
          type: "groupPan",
          startX: pos.x,
          startY: pos.y,
          caseOrigins,
          attOrigins,
        });
        return;
      }
      setSelection({ type: "attachment", id: a.id });
      pushHistory();
      movementRef.current = { changed: false };
      setMode("select");
      setInteraction({
        type: "move",
        id: a.id,
        offsetX: pos.x - a.x,
        offsetY: pos.y - a.y,
      });
      return;
    }

    if (arrowIndex !== -1) {
      selectArrowAtPointer(cases[arrowIndex], arrowHitOrigin, pos);
      return;
    }

    if (selectedModuleId) {
      pushHistory();
      addAttachment(pos.x, pos.y);
      setMode("select");
      return;
    }

    // Box-select: no step chip + no palette tool → drag on empty canvas.
    // If a step chip is active, Shift+drag still starts a marquee instead of a new arrow.
    const startMarquee = () => {
      pushHistory();
      setSelection(null);
      setInteraction({
        type: "marquee",
        x0: pos.x,
        y0: pos.y,
        x1: pos.x,
        y1: pos.y,
      });
      setMode("select");
    };
    if (e.shiftKey || currentAligner == null) {
      startMarquee();
      return;
    }

    setSelection(null);
    pushHistory();
    setIsDrawing(true);
    setMode("draw");
    setCases((prev) => [
      ...prev,
      {
        id: newEntityId(),
        label: currentAligner ?? "1",
        origin: pos,
        target: pos,
        ...(restrictedToDoctorOwnedEdits
          ? { sceneOwner: SCENE_OWNER_DOCTOR }
          : {}),
      },
    ]);
  };

  const handlePointerMove = (e) => {
    const pos = getPos(e);

    if (!interaction && !isDrawing) {
      const hit = hitTestAttachment(pos);
      if (hit?.attachment?.moduleId === "comment") {
        setCommentCaptionHoverId(hit.attachment.id);
      } else {
        setCommentCaptionHoverId(null);
      }
    } else if (isDrawing) {
      setCommentCaptionHoverId(null);
    }

    if (readOnly) return;

    if (interaction?.type === "marquee") {
      setInteraction((prev) =>
        prev && prev.type === "marquee"
          ? { ...prev, x1: pos.x, y1: pos.y }
          : prev
      );
      setCanvasVersion((v) => v + 1);
      return;
    }

    if (interaction) {
      movementRef.current = { changed: true };
      if (interaction.type === "groupPan") {
        const dx = pos.x - interaction.startX;
        const dy = pos.y - interaction.startY;
        setCases((prev) =>
          prev.map((item) => {
            const o = interaction.caseOrigins[item.id];
            if (!o) return item;
            return {
              ...item,
              origin: {
                x: o.origin.x + dx,
                y: o.origin.y + dy,
              },
              target: {
                x: o.target.x + dx,
                y: o.target.y + dy,
              },
            };
          })
        );
        setAttachments((prev) =>
          prev.map((item) => {
            const o = interaction.attOrigins[item.id];
            if (!o) return item;
            return {
              ...item,
              x: o.x + dx,
              y: o.y + dy,
            };
          })
        );
        return;
      }
      if (interaction.type === "rotateGroup") {
        const now = Math.atan2(
          pos.y - interaction.centroidY,
          pos.x - interaction.centroidX
        );
        const delta = now - interaction.startPointerAngle;
        const cx = interaction.centroidX;
        const cy = interaction.centroidY;
        const cos = Math.cos(delta);
        const sin = Math.sin(delta);
        const attSnaps =
          interaction.attachmentOrigins ??
          (interaction.origins != null ? interaction.origins : {});
        const caseSnaps = interaction.caseOrigins ?? {};
        setAttachments((prev) =>
          prev.map((att) => {
            const o = attSnaps[att.id];
            if (!o) return att;
            const rx = o.x - cx;
            const ry = o.y - cy;
            return {
              ...att,
              x: cx + rx * cos - ry * sin,
              y: cy + rx * sin + ry * cos,
              rotation: o.rotation + delta,
            };
          })
        );
        setCases((prev) =>
          prev.map((c) => {
            const snap = caseSnaps[c.id];
            if (!snap) return c;
            const rotPoint = (p) => {
              const rx = p.x - cx;
              const ry = p.y - cy;
              return {
                x: cx + rx * cos - ry * sin,
                y: cy + rx * sin + ry * cos,
              };
            };
            return {
              ...c,
              origin: rotPoint(snap.origin),
              target: rotPoint(snap.target),
            };
          })
        );
        return;
      }
      setAttachments((prev) =>
        prev.map((item) => {
          if (item.id !== interaction.id) return item;
          if (interaction.type === "move") {
            return {
              ...item,
              x: pos.x - interaction.offsetX,
              y: pos.y - interaction.offsetY,
            };
          }
          if (interaction.type === "rotate") {
            const now = Math.atan2(pos.y - item.y, pos.x - item.x);
            const delta = now - interaction.startPointerAngle;
            return { ...item, rotation: interaction.startRotation + delta };
          }
          return item;
        })
      );
      return;
    }
    if (!isDrawing) return;
    setCases((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], target: pos };
      return next;
    });
  };

  const finishInteraction = () => {
    const prev = interactionRef.current;
    const drawingWasActive = isDrawing;

    if (prev?.type === "marquee") {
      const { x0, y0, x1, y1 } = prev;
      const w = Math.abs(x1 - x0);
      const h = Math.abs(y1 - y0);
      if (w < MARQUEE_MIN_SIDE_PX && h < MARQUEE_MIN_SIDE_PX) {
        setSelection(null);
      } else {
        let { arrowIds, attachmentIds } = buildMultiSelectionFromRect(
          casesRef.current,
          attachmentsRef.current,
          x0,
          y0,
          x1,
          y1
        );
        if (restrictedToDoctorOwnedEdits) {
          const f = filterRectSelectionToDoctorOwned(
            arrowIds,
            attachmentIds,
            casesRef.current,
            attachmentsRef.current
          );
          arrowIds = f.arrowIds;
          attachmentIds = f.attachmentIds;
        }
        setSelection(collapseSelectionFromMulti(arrowIds, attachmentIds));
      }
      setCanvasVersion((v) => v + 1);
      setInteraction(null);
      setIsDrawing(false);
      return;
    }

    setIsDrawing(false);
    setInteraction(null);

    if (movementRef.current.changed) {
      movementRef.current = { changed: false };
      setMode("select");
    }
    if (drawingWasActive) setMode("select");
  };

  const selectModule = (moduleId) => {
    const next = selectedModuleId === moduleId ? null : moduleId;
    if (next !== null) setSelection(null);
    setSelectedModuleId(next);
    setMode("select");
  };

  /** Picking a step clears palette tool and any selected canvas module. */
  const selectStepChip = (chip) => {
    setCurrentAligner((prev) => {
      if (prev !== chip) setSelection(null);
      return prev === chip ? null : chip;
    });
    setSelectedModuleId(null);
  };

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    if (
      restrictedToDoctorOwnedEdits &&
      !selectionIsFullyDoctorOwned(cases, attachments, selection)
    ) {
      return;
    }
    pushHistory();
    if (selection.type === "attachment") {
      setAttachments((prev) => prev.filter((item) => item.id !== selection.id));
    } else if (selection.type === "arrow") {
      setCases((prev) => prev.filter((item) => item.id !== selection.id));
    } else if (selection.type === "multi") {
      const arrowSet = new Set(selection.arrowIds);
      const attSet = new Set(selection.attachmentIds);
      setCases((prev) => prev.filter((item) => !arrowSet.has(item.id)));
      setAttachments((prev) => prev.filter((item) => !attSet.has(item.id)));
    }
    setSelection(null);
  }, [
    attachments,
    cases,
    pushHistory,
    restrictedToDoctorOwnedEdits,
    selection,
  ]);

  const copyAttachmentSelection = useCallback(() => {
    const attIds = getSelectedAttachmentIds(selection);
    const arrowIds = getSelectedArrowIds(selection);
    if (!attIds.length && !arrowIds.length) return false;
    if (
      restrictedToDoctorOwnedEdits &&
      !selectionIsFullyDoctorOwned(cases, attachments, selection)
    ) {
      return false;
    }
    const cent = centroidForClipboard(cases, attachments, arrowIds, attIds);
    if (!cent) return false;
    const { cx, cy } = cent;
    const attachmentItems = attIds
      .map((id) => attachments.find((x) => x.id === id))
      .filter(Boolean)
      .map((a) => ({
        moduleId: a.moduleId,
        width: a.width,
        height: a.height,
        rotation: a.rotation,
        commentText: a.commentText ?? "",
        relX: a.x - cx,
        relY: a.y - cy,
      }));
    const arrowItems = arrowIds
      .map((id) => cases.find((x) => x.id === id))
      .filter(Boolean)
      .map((c) => ({
        label: String(c.label ?? "1"),
        relOx: c.origin.x - cx,
        relOy: c.origin.y - cy,
        relTx: c.target.x - cx,
        relTy: c.target.y - cy,
      }));
    if (!attachmentItems.length && !arrowItems.length) return false;
    attachmentClipboardRef.current = { attachmentItems, arrowItems };
    return true;
  }, [attachments, cases, restrictedToDoctorOwnedEdits, selection]);

  const pasteAttachmentClipboard = useCallback(() => {
    const clip = attachmentClipboardRef.current;
    const attSrc = clip?.attachmentItems ?? clip?.items ?? [];
    const arrowSrc = clip?.arrowItems ?? [];
    if (!attSrc.length && !arrowSrc.length) return false;
    const allowed = new Set(visibleModules.map((m) => m.id));
    const items = attSrc.filter((it) => allowed.has(it.moduleId));
    if (attSrc.length > 0 && !items.length && !arrowSrc.length) return false;
    pushHistory();
    pasteGenerationRef.current += 1;
    const n = pasteGenerationRef.current;
    const off = n * PASTE_OFFSET_STEP;
    const cx = BASE_WIDTH * 0.42 + off;
    const cy = BASE_HEIGHT * 0.38 + off * 0.35;
    const newAttachmentIds = [];
    const newItems = items.map((item) => {
      const id = newEntityId();
      newAttachmentIds.push(id);
      return {
        id,
        moduleId: item.moduleId,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        x: cx + item.relX,
        y: cy + item.relY,
        ...(item.moduleId === "comment"
          ? { commentText: item.commentText }
          : {}),
        ...(restrictedToDoctorOwnedEdits
          ? { sceneOwner: SCENE_OWNER_DOCTOR }
          : {}),
      };
    });
    const newArrowIds = [];
    const newCases = arrowSrc.map((row) => {
      const id = newEntityId();
      newArrowIds.push(id);
      return {
        id,
        label: row.label,
        origin: { x: cx + row.relOx, y: cy + row.relOy },
        target: { x: cx + row.relTx, y: cy + row.relTy },
        ...(restrictedToDoctorOwnedEdits
          ? { sceneOwner: SCENE_OWNER_DOCTOR }
          : {}),
      };
    });
    setCases((prev) => [...prev, ...newCases]);
    setAttachments((prev) => [...prev, ...newItems]);
    const na = newArrowIds.length;
    const nb = newAttachmentIds.length;
    if (na === 1 && nb === 0) {
      setSelection({ type: "arrow", id: newArrowIds[0] });
    } else if (nb === 1 && na === 0) {
      setSelection({ type: "attachment", id: newAttachmentIds[0] });
    } else {
      setSelection({
        type: "multi",
        arrowIds: newArrowIds,
        attachmentIds: newAttachmentIds,
      });
    }
    return true;
  }, [pushHistory, restrictedToDoctorOwnedEdits, visibleModules]);

  const rotateSelectionAroundCentroidBy = useCallback(
    (deltaRad) => {
      const arrowIds = getSelectedArrowIds(selection);
      const attIds = getSelectedAttachmentIds(selection);
      if (!arrowIds.length && !attIds.length) return;
      if (
        restrictedToDoctorOwnedEdits &&
        !selectionIsFullyDoctorOwned(cases, attachments, selection)
      ) {
        return;
      }
      const cent = centroidForClipboard(cases, attachments, arrowIds, attIds);
      if (!cent) return;
      pushHistory();
      const { cx, cy } = cent;
      const cos = Math.cos(deltaRad);
      const sin = Math.sin(deltaRad);
      setAttachments((prev) =>
        prev.map((att) => {
          if (!attIds.includes(att.id)) return att;
          const rx = att.x - cx;
          const ry = att.y - cy;
          return {
            ...att,
            x: cx + rx * cos - ry * sin,
            y: cy + rx * sin + ry * cos,
            rotation: att.rotation + deltaRad,
          };
        })
      );
      setCases((prev) =>
        prev.map((c) => {
          if (!arrowIds.includes(c.id)) return c;
          const rotPoint = (p) => {
            const rx = p.x - cx;
            const ry = p.y - cy;
            return {
              x: cx + rx * cos - ry * sin,
              y: cy + rx * sin + ry * cos,
            };
          };
          return {
            ...c,
            origin: rotPoint(c.origin),
            target: rotPoint(c.target),
          };
        })
      );
    },
    [attachments, cases, pushHistory, restrictedToDoctorOwnedEdits, selection]
  );

  /** Mirror through vertical line x = cx (left–right flip). */
  const mirrorSelectionHorizontal = useCallback(() => {
    const attIds = getSelectedAttachmentIds(selection);
    const arrowIds = getSelectedArrowIds(selection);
    if (!attIds.length && !arrowIds.length) return;
    if (
      restrictedToDoctorOwnedEdits &&
      !selectionIsFullyDoctorOwned(cases, attachments, selection)
    ) {
      return;
    }
    const cent = centroidForClipboard(cases, attachments, arrowIds, attIds);
    if (!cent) return;
    const { cx } = cent;
    pushHistory();
    setAttachments((prev) =>
      prev.map((a) => {
        if (!attIds.includes(a.id)) return a;
        return {
          ...a,
          x: 2 * cx - a.x,
          y: a.y,
          rotation: normalizeAngleRad(Math.PI - a.rotation),
        };
      })
    );
    setCases((prev) =>
      prev.map((c) => {
        if (!arrowIds.includes(c.id)) return c;
        return {
          ...c,
          origin: { x: 2 * cx - c.origin.x, y: c.origin.y },
          target: { x: 2 * cx - c.target.x, y: c.target.y },
        };
      })
    );
  }, [
    attachments,
    cases,
    pushHistory,
    restrictedToDoctorOwnedEdits,
    selection,
  ]);

  /** Mirror through horizontal line y = cy (top–bottom flip). */
  const mirrorSelectionVertical = useCallback(() => {
    const attIds = getSelectedAttachmentIds(selection);
    const arrowIds = getSelectedArrowIds(selection);
    if (!attIds.length && !arrowIds.length) return;
    if (
      restrictedToDoctorOwnedEdits &&
      !selectionIsFullyDoctorOwned(cases, attachments, selection)
    ) {
      return;
    }
    const cent = centroidForClipboard(cases, attachments, arrowIds, attIds);
    if (!cent) return;
    const { cy } = cent;
    pushHistory();
    setAttachments((prev) =>
      prev.map((a) => {
        if (!attIds.includes(a.id)) return a;
        return {
          ...a,
          x: a.x,
          y: 2 * cy - a.y,
          rotation: normalizeAngleRad(-a.rotation),
        };
      })
    );
    setCases((prev) =>
      prev.map((c) => {
        if (!arrowIds.includes(c.id)) return c;
        return {
          ...c,
          origin: { x: c.origin.x, y: 2 * cy - c.origin.y },
          target: { x: c.target.x, y: 2 * cy - c.target.y },
        };
      })
    );
  }, [
    attachments,
    cases,
    pushHistory,
    restrictedToDoctorOwnedEdits,
    selection,
  ]);

  const updateSelectedArrowStep = (nextStep) => {
    if (!selection || selection.type !== "arrow" || !nextStep) return;
    const row = cases.find((item) => item.id === selection.id);
    if (restrictedToDoctorOwnedEdits && !isDoctorOwnedSceneEntity(row)) {
      return;
    }
    pushHistory();
    setCases((prev) =>
      prev.map((item) =>
        item.id === selection.id ? { ...item, label: String(nextStep) } : item
      )
    );
  };

  const undoLast = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    setCases(previous.cases);
    setAttachments(previous.attachments);
    setSelection(previous.selection);
    setMode(previous.mode);
    setStripScaleForNextPlace(
      typeof previous.stripScaleForNextPlace === "number"
        ? previous.stripScaleForNextPlace
        : 1
    );
    setIconScaleForNextPlace(
      typeof previous.iconScaleForNextPlace === "number"
        ? previous.iconScaleForNextPlace
        : 1
    );
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (readOnly) return;
      const mod = e.ctrlKey || e.metaKey;
      const focusedEditable = isEditableFocused(document.activeElement);

      if (e.key === "Escape") {
        if (commentPopupAttachmentId != null) {
          e.preventDefault();
          handleCommentPopupClose();
          return;
        }
        e.preventDefault();
        setInteraction(null);
        setIsDrawing(false);
        setMode("select");
        setCommentCaptionHoverId(null);
        setCurrentAligner(null);
        setSelectedModuleId(null);
        setSelection(null);
        return;
      }
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selection &&
        !focusedEditable
      ) {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (mod && (e.key === "c" || e.key === "C") && !focusedEditable) {
        if (copyAttachmentSelection()) {
          e.preventDefault();
        }
        return;
      }
      if (mod && (e.key === "v" || e.key === "V") && !focusedEditable) {
        if (pasteAttachmentClipboard()) {
          e.preventDefault();
        }
        return;
      }
      if (
        e.shiftKey &&
        !mod &&
        !focusedEditable &&
        (e.key === "h" || e.key === "H")
      ) {
        const attIds = getSelectedAttachmentIds(selection);
        const arrowIds = getSelectedArrowIds(selection);
        if (attIds.length || arrowIds.length) {
          e.preventDefault();
          mirrorSelectionHorizontal();
        }
        return;
      }
      if (
        e.shiftKey &&
        !mod &&
        !focusedEditable &&
        (e.key === "v" || e.key === "V")
      ) {
        const attIds = getSelectedAttachmentIds(selection);
        const arrowIds = getSelectedArrowIds(selection);
        if (attIds.length || arrowIds.length) {
          e.preventDefault();
          mirrorSelectionVertical();
        }
        return;
      }
      if (
        !focusedEditable &&
        !e.shiftKey &&
        (e.code === "BracketLeft" || e.code === "BracketRight")
      ) {
        const attIds = getSelectedAttachmentIds(selection);
        const arrowIds = getSelectedArrowIds(selection);
        if (attIds.length > 0 || arrowIds.length > 0) {
          e.preventDefault();
          rotateSelectionAroundCentroidBy(
            e.code === "BracketLeft" ? -ROTATE_STEP_RAD : ROTATE_STEP_RAD
          );
        }
        return;
      }
      if (
        !hideSteps &&
        !focusedEditable &&
        !mod &&
        !e.shiftKey &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        if (currentAligner != null) {
          const idx = chips.indexOf(currentAligner);
          if (idx !== -1) {
            if (e.key === "ArrowRight" && idx < chips.length - 1) {
              e.preventDefault();
              setCurrentAligner(chips[idx + 1]);
              setSelectedModuleId(null);
              setSelection(null);
              return;
            }
            if (e.key === "ArrowLeft" && idx > 0) {
              e.preventDefault();
              setCurrentAligner(chips[idx - 1]);
              setSelectedModuleId(null);
              setSelection(null);
              return;
            }
          }
        }
      }
      const z = e.key === "z" || e.key === "Z";
      if (!z || e.shiftKey) return;
      if (!mod) return;
      if (focusedEditable) return;
      e.preventDefault();
      undoLast();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    chips,
    commentPopupAttachmentId,
    copyAttachmentSelection,
    currentAligner,
    deleteSelection,
    handleCommentPopupClose,
    hideSteps,
    mirrorSelectionHorizontal,
    mirrorSelectionVertical,
    pasteAttachmentClipboard,
    readOnly,
    rotateSelectionAroundCentroidBy,
    selection,
    undoLast,
  ]);

  const beginStripScaleGesture = useCallback(() => {
    if (readOnly || !stripScaleSliderEnabled) return;
    if (!stripScaleHistoryPushed.current) {
      pushHistory();
      stripScaleHistoryPushed.current = true;
    }
  }, [readOnly, stripScaleSliderEnabled, pushHistory]);

  const endStripScaleGesture = useCallback(() => {
    stripScaleHistoryPushed.current = false;
  }, []);

  const handleStripScaleInput = useCallback(
    (nextScale) => {
      const clamped = Math.min(
        STRIP_SCALE_MAX,
        Math.max(STRIP_SCALE_MIN, nextScale)
      );
      if (
        selection?.type === "multi" &&
        selection.arrowIds.length === 0 &&
        selection.attachmentIds.length >= 2
      ) {
        const readout = getMultiUniformAttachmentScaleReadout(
          selection,
          attachments,
          isStripModuleId
        );
        if (readout) {
          const ids = selection.attachmentIds;
          if (readout.kind === "strip") {
            setAttachments((prev) =>
              prev.map((it) => {
                if (!ids.includes(it.id)) return it;
                const px = stripPlacementPxForModule(it.moduleId, clamped);
                return { ...it, width: px, height: px };
              })
            );
          } else {
            const px = Math.round(ATTACHMENT_CARD_SIZE * clamped);
            setAttachments((prev) =>
              prev.map((it) =>
                ids.includes(it.id) ? { ...it, width: px, height: px } : it
              )
            );
          }
          return;
        }
      }
      if (selection?.type === "attachment") {
        const att = attachments.find((a) => a.id === selection.id);
        if (att && isStripModuleId(att.moduleId)) {
          const px = stripPlacementPxForModule(att.moduleId, clamped);
          setAttachments((prev) =>
            prev.map((it) =>
              it.id === att.id ? { ...it, width: px, height: px } : it
            )
          );
          return;
        }
        if (att && !isStripModuleId(att.moduleId)) {
          const px = Math.round(ATTACHMENT_CARD_SIZE * clamped);
          setAttachments((prev) =>
            prev.map((it) =>
              it.id === att.id ? { ...it, width: px, height: px } : it
            )
          );
          return;
        }
      }
      if (
        selection?.type === "multi" &&
        selection.attachmentIds.length === 1 &&
        selection.arrowIds.length === 0
      ) {
        const att = attachments.find(
          (a) => a.id === selection.attachmentIds[0]
        );
        if (att && isStripModuleId(att.moduleId)) {
          const px = stripPlacementPxForModule(att.moduleId, clamped);
          setAttachments((prev) =>
            prev.map((it) =>
              it.id === att.id ? { ...it, width: px, height: px } : it
            )
          );
          return;
        }
        if (att && !isStripModuleId(att.moduleId)) {
          const px = Math.round(ATTACHMENT_CARD_SIZE * clamped);
          setAttachments((prev) =>
            prev.map((it) =>
              it.id === att.id ? { ...it, width: px, height: px } : it
            )
          );
          return;
        }
      }
      if (selectedModuleId && isStripModuleId(selectedModuleId)) {
        setStripScaleForNextPlace(clamped);
        return;
      }
      if (selectedModuleId && !isStripModuleId(selectedModuleId)) {
        setIconScaleForNextPlace(clamped);
      }
    },
    [attachments, isStripModuleId, selectedModuleId, selection]
  );

  const popupPositionForWorldPoint = useCallback(
    (wx, wy, popupMaxWidth = 220) => {
      const canvas = canvasRef.current;
      const viewport = viewportRef.current;
      if (!canvas || !viewport) return null;
      const canvasRect = canvas.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const x =
        (wx / BASE_WIDTH) * canvasRect.width +
        (canvasRect.left - viewportRect.left);
      const y =
        (wy / BASE_HEIGHT) * canvasRect.height +
        (canvasRect.top - viewportRect.top);
      return {
        left: Math.min(x + 12, viewportRect.width - popupMaxWidth),
        top: Math.max(8, y - 14),
      };
    },
    []
  );

  let arrowPopupStyle = null;
  if (selectedArrow) {
    arrowPopupStyle = popupPositionForWorldPoint(
      selectedArrow.origin.x,
      selectedArrow.origin.y
    );
  }

  let attachmentPopupStyle = null;
  if (selectedAttachment && !selectedArrow) {
    attachmentPopupStyle = popupPositionForWorldPoint(
      selectedAttachment.x,
      selectedAttachment.y,
      132
    );
  }

  return (
    <div className="dtg-v2-proto">
      <aside className="dtg-v2-sidebar">
        <p className="dtg-v2-title">{t("strippingV2.sidebarTitle")}</p>
        <p className="dtg-v2-subtitle">{t("strippingV2.sidebarSubtitle")}</p>
        {selection?.type === "multi" && (
          <div className="dtg-v2-selection-card">
            <div className="dtg-v2-selection-title">
              {t("strippingV2.itemsSelected", {
                count:
                  selection.arrowIds.length + selection.attachmentIds.length,
              })}
            </div>
            {!readOnly && (
              <div className="dtg-v2-row">
                <button
                  type="button"
                  className="dtg-v2-btn dtg-v2-btn-danger"
                  onClick={deleteSelection}
                >
                  {t("strippingV2.deleteSelected")}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="dtg-v2-section-title">
          {t("strippingV2.modulesToPlace")}
        </div>
        <div
          className={`dtg-v2-strip-scale ${stripScaleSliderEnabled ? "dtg-v2-strip-scale--active" : ""}`}
        >
          <div className="dtg-v2-strip-scale-title">
            {selectedStripIsActive ||
            multiUniformAttachmentScale?.kind === "strip" ||
            (stripToolIsActive &&
              !selectedAttachment &&
              !multiUniformAttachmentScale)
              ? t("strippingV2.stripScaleTitleStrip")
              : t("strippingV2.stripScaleTitleModule")}
          </div>
          <div className="dtg-v2-strip-scale-row">
            <span className="dtg-v2-strip-scale-end">
              {t("strippingV2.stripSmaller")}
            </span>
            <input
              type="range"
              className="dtg-v2-strip-scale-range"
              min={STRIP_SCALE_MIN}
              max={STRIP_SCALE_MAX}
              step={STRIP_SCALE_STEP}
              value={stripScaleSliderValue}
              onChange={(e) => handleStripScaleInput(Number(e.target.value))}
              onPointerDown={beginStripScaleGesture}
              onPointerUp={endStripScaleGesture}
              onPointerLeave={endStripScaleGesture}
              disabled={!stripScaleSliderEnabled}
              aria-valuemin={STRIP_SCALE_MIN}
              aria-valuemax={STRIP_SCALE_MAX}
              aria-valuenow={stripScaleSliderValue}
              aria-label={t("strippingV2.stripScaleAria")}
            />
            <span className="dtg-v2-strip-scale-end">
              {t("strippingV2.stripBigger")}
            </span>
          </div>
          <div className="dtg-v2-strip-scale-readout">
            {stripScaleSliderEnabled ? (
              <>
                <span className="dtg-v2-strip-scale-context">
                  {multiUniformAttachmentScale
                    ? t("strippingV2.stripReadoutMulti")
                    : selectedAttachment
                      ? t("strippingV2.stripReadoutSelected")
                      : stripToolIsActive || iconToolIsActive
                        ? t("strippingV2.stripReadoutNext")
                        : ""}
                </span>
                {Math.round(stripScaleSliderValue * 100)}%
              </>
            ) : null}
          </div>
        </div>
        <div className="dtg-v2-modules-grid">
          {visibleModules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              className={`dtg-v2-module-btn ${selectedModuleId === mod.id ? "is-active" : ""} ${
                STRIPPING_V2_ONLY_MODULE_IDS.includes(mod.id)
                  ? "dtg-v2-module-btn--strip"
                  : ""
              }`}
              onClick={() => selectModule(mod.id)}
              disabled={readOnly}
              style={{ "--mod-color": mod.color, "--mod-bg": mod.bg }}
            >
              <span className="dtg-v2-module-icon">
                <ModuleIcon
                  mod={mod}
                  svgSize={
                    STRIPPING_V2_ONLY_MODULE_IDS.includes(mod.id)
                      ? STRIP_PALETTE_ICON_FIXED
                      : MODULE_ICON_SVG_SIZE
                  }
                />
              </span>
              <span>{mod.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="dtg-v2-main">
        <div className="dtg-v2-main-header">
          <div className="dtg-v2-main-header-inner">
            {!hideSteps && (
              <div className="dtg-v2-main-header-steps">
                <div className="dtg-v2-section-title">
                  {t("strippingV2.stepNumbers")}
                </div>
                <div className="dtg-v2-chip-grid dtg-v2-chip-grid--header">
                  {chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={`dtg-v2-chip ${currentAligner != null && currentAligner === chip ? "is-active" : ""}`}
                      onClick={() => selectStepChip(chip)}
                      disabled={readOnly}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {typeof onPrintPreview === "function" && (
              <div className="dtg-v2-main-header-print">
                <button
                  type="button"
                  className="dtg-v2-btn dtg-v2-btn-print"
                  onClick={() =>
                    onPrintPreview({
                      schemaVersion: 1,
                      cases: JSON.parse(JSON.stringify(cases)),
                      attachments: JSON.parse(JSON.stringify(attachments)),
                    })
                  }
                >
                  <i className="fas fa-print" aria-hidden />
                  <span> {t("strippingV2.printPdf")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div
          ref={viewportRef}
          className="dtg-v2-canvas-viewport"
          onPointerLeave={() => setCommentCaptionHoverId(null)}
        >
          <canvas
            ref={canvasRef}
            className="dtg-v2-canvas"
            width={Math.round(BASE_WIDTH * (window.devicePixelRatio || 1))}
            height={Math.round(BASE_HEIGHT * (window.devicePixelRatio || 1))}
            style={{ width: canvasSize.width, height: canvasSize.height }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishInteraction}
            onPointerLeave={finishInteraction}
            onDoubleClick={handleCanvasDoubleClick}
          />
          <div
            className="dtg-v2-placed-layer"
            aria-hidden
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {attachments.map((a) => {
              const mod = MODULES.find((m) => m.id === a.moduleId);
              if (!mod) return null;
              const {
                svgSize: placedIconSvgSize,
                spanWidth: placedIconSpanWidth,
                spanHeight: placedIconSpanHeight,
                boxWidth: placedIconBoxWidth,
                boxHeight: placedIconBoxHeight,
                iconHeight,
              } = getStrippingV2PlacedIconLayout(a);
              const isStripPlaced = isStripModuleId(a.moduleId);
              const isSelected = selectionHasAttachment(selection, a.id);
              const h = getRotationHandleCenter(a);
              const placedPosStyle = {
                left: `${(a.x / BASE_WIDTH) * 100}%`,
                top: `${(a.y / BASE_HEIGHT) * 100}%`,
              };
              const placedTransform = `translate(-50%, -50%) rotate(${a.rotation}rad) translateY(${PLACED_ICON_OFFSET_Y}px)`;
              const commentHasText = (a.commentText || "").trim().length > 0;
              const commentCaptionVisible =
                a.moduleId === "comment" &&
                commentHasText &&
                (commentCaptionHoverId === a.id ||
                  selectionHasAttachment(selection, a.id));
              return (
                <Fragment key={a.id}>
                  <span
                    className={`dtg-v2-placed-icon${
                      isStripPlaced ? " dtg-v2-placed-icon--strip" : ""
                    }${
                      !isStripPlaced && isSelected
                        ? " dtg-v2-placed-icon--selected"
                        : ""
                    }`}
                    style={{
                      ...placedPosStyle,
                      width: placedIconSpanWidth,
                      height: placedIconSpanHeight,
                      fontSize: placedIconSvgSize,
                      transform: placedTransform,
                      "--mod-color": mod.color,
                    }}
                  >
                    <ModuleIcon mod={mod} svgSize={placedIconSvgSize} />
                  </span>
                  {isStripPlaced && isSelected && (
                    <span
                      className="dtg-v2-placed-hitbox dtg-v2-placed-hitbox--selected"
                      style={{
                        ...placedPosStyle,
                        width: placedIconBoxWidth,
                        height: placedIconBoxHeight,
                        transform: placedTransform,
                      }}
                    />
                  )}
                  {commentCaptionVisible && (
                    <span
                      className="dtg-v2-comment-caption"
                      style={{
                        left: `${(a.x / BASE_WIDTH) * 100}%`,
                        top: `${(a.y / BASE_HEIGHT) * 100}%`,
                        transform: `translate(-50%, calc(-50% + ${iconHeight / 2 + 12}px))`,
                      }}
                      title={a.commentText}
                    >
                      {(a.commentText || "").length > 48
                        ? `${(a.commentText || "").slice(0, 46)}…`
                        : a.commentText}
                    </span>
                  )}
                  {soleAttachmentIdForRotate != null &&
                    soleAttachmentIdForRotate === a.id && (
                      <span
                        className="dtg-v2-rotation-handle"
                        style={{
                          left: `${(h.x / BASE_WIDTH) * 100}%`,
                          top: `${(h.y / BASE_HEIGHT) * 100}%`,
                        }}
                      />
                    )}
                </Fragment>
              );
            })}
            {groupRotateContext && (
              <span
                className="dtg-v2-rotation-handle"
                style={{
                  left: `${(groupRotateContext.handleX / BASE_WIDTH) * 100}%`,
                  top: `${(groupRotateContext.handleY / BASE_HEIGHT) * 100}%`,
                }}
              />
            )}
          </div>
          {selectedArrow && arrowPopupStyle && (
            <div className="dtg-v2-arrow-popup" style={arrowPopupStyle}>
              <div className="dtg-v2-arrow-popup-title">
                {t("strippingV2.arrowActions")}
              </div>
              {hideSteps ? (
                <div className="dtg-v2-arrow-popup-row">
                  <span className="dtg-v2-arrow-step-readonly">
                    {t("strippingV2.arrowStepReadonly")} {selectedArrow.label}
                  </span>
                </div>
              ) : (
                <div className="dtg-v2-arrow-popup-row">
                  <label htmlFor="dtg-v2-arrow-step-select">
                    {t("strippingV2.modify")}
                  </label>
                  <select
                    id="dtg-v2-arrow-step-select"
                    className="dtg-v2-arrow-step-select"
                    value={selectedArrow.label}
                    onChange={(e) => updateSelectedArrowStep(e.target.value)}
                    disabled={readOnly}
                  >
                    {chips.map((chip) => (
                      <option key={chip} value={chip}>
                        {t("strippingV2.stepOption", { step: chip })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!readOnly && (
                <div className="dtg-v2-arrow-popup-footer">
                  <button
                    type="button"
                    className="dtg-v2-btn dtg-v2-btn-danger"
                    onClick={deleteSelection}
                  >
                    {t("strippingV2.delete")}
                  </button>
                </div>
              )}
            </div>
          )}
          {selectedAttachment &&
            !selectedArrow &&
            attachmentPopupStyle &&
            !readOnly && (
              <div
                className="dtg-v2-arrow-popup dtg-v2-arrow-popup--module"
                style={attachmentPopupStyle}
              >
                <div className="dtg-v2-arrow-popup-title">
                  {t("strippingV2.moduleActions")}
                </div>
                {selectedAttachment.moduleId === "comment" && (
                  <div className="dtg-v2-module-popup-body">
                    <button
                      type="button"
                      className="dtg-v2-btn"
                      onClick={() =>
                        setCommentPopupAttachmentId(selectedAttachment.id)
                      }
                    >
                      {t("strippingV2.editComment")}
                    </button>
                  </div>
                )}
                <div
                  className={`dtg-v2-arrow-popup-footer ${
                    selectedAttachment.moduleId !== "comment"
                      ? "dtg-v2-arrow-popup-footer--only"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="dtg-v2-btn dtg-v2-btn-danger"
                    onClick={deleteSelection}
                  >
                    {t("strippingV2.delete")}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {commentPopupAttachment && (
        <CommentPopup
          key={commentPopupAttachmentId}
          toothNum={0}
          subtitle={t("strippingV2.commentSubtitle", {
            step: currentAligner ?? "—",
          })}
          initialText={commentPopupAttachment.commentText ?? ""}
          hasExisting={
            (commentPopupAttachment.commentText || "").trim().length > 0
          }
          placeholder="Enter your clinical comment…"
          onSave={handleCommentPopupSave}
          onRemove={handleCommentPopupRemove}
          onClose={handleCommentPopupClose}
        />
      )}
    </div>
  );
}
