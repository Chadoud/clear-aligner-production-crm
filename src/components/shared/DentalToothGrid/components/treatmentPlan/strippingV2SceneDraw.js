/**
 * Shared 2D canvas drawing for Stripping & Attachments V2 (editor + print).
 * Keep geometry constants in sync with StrippingAttachmentsV2.jsx.
 */
export const STRIPPING_V2_SCENE_BASE_WIDTH = 436;
export const STRIPPING_V2_SCENE_BASE_HEIGHT = 680;
export const STRIPPING_V2_STEP_BUBBLE_RADIUS = 11;
/** Red step-arrow shaft (logical canvas px). */
export const STRIPPING_V2_ARROW_LINE_WIDTH = 2;
/** Red arrowhead size along the shaft from tip (logical px). */
export const STRIPPING_V2_ARROW_HEAD_LEN = 8;

/** Placed-module overlay sizing (keep in sync with StrippingAttachmentsV2.jsx). */
export const STRIPPING_V2_PLACED_ICON_SVG_SIZE = 28;
export const STRIPPING_V2_PLACED_ICON_HEIGHT =
  STRIPPING_V2_PLACED_ICON_SVG_SIZE * (27 / 20);
export const STRIPPING_V2_PLACED_ICON_PAD = 3;
export const STRIPPING_V2_STRIP_MESIODISTAL_ID = "strip-mesiodistal";
export const STRIPPING_V2_STRIP_MESIAL_ID = "strip-mesial";
export const STRIPPING_V2_STRIP_DISTAL_ID = "strip-distal";

export const STRIPPING_V2_STRIP_MODULE_IDS = [
  STRIPPING_V2_STRIP_MESIAL_ID,
  STRIPPING_V2_STRIP_DISTAL_ID,
  STRIPPING_V2_STRIP_MESIODISTAL_ID,
];

export function isStrippingV2StripModuleId(moduleId) {
  return STRIPPING_V2_STRIP_MODULE_IDS.includes(moduleId);
}

/**
 * HTML overlay + pointer hit box for a placed attachment.
 * Strip markers: icon at full card size; selection/hit use a tight glyph box.
 *
 * @param {{ moduleId: string; width: number; height: number }} attachment
 */
export function getStrippingV2PlacedIconLayout(attachment) {
  const isMesiodistal =
    attachment.moduleId === STRIPPING_V2_STRIP_MESIODISTAL_ID;
  const isStrip = isStrippingV2StripModuleId(attachment.moduleId);

  const pad = STRIPPING_V2_PLACED_ICON_PAD;
  const maxW = attachment.width - pad * 2;
  const maxH = attachment.height - pad * 2;
  const fitScale = Math.min(
    maxW / STRIPPING_V2_PLACED_ICON_SVG_SIZE,
    maxH / STRIPPING_V2_PLACED_ICON_HEIGHT
  );
  const iconWidth = STRIPPING_V2_PLACED_ICON_SVG_SIZE * fitScale;
  const iconHeight = STRIPPING_V2_PLACED_ICON_HEIGHT * fitScale;

  const base = {
    svgSize: iconWidth,
    spanWidth: iconWidth,
    spanHeight: iconHeight,
    iconHeight,
  };

  if (isStrip) {
    const boxWidth = Math.max(
      isMesiodistal ? 6 : 8,
      iconWidth * (isMesiodistal ? 0.28 : 0.38)
    );
    const boxHeight = Math.max(14, iconHeight * 0.72);
    return {
      ...base,
      boxWidth,
      boxHeight,
      hitWidth: boxWidth + 4,
      hitHeight: boxHeight + 4,
    };
  }

  return {
    ...base,
    boxWidth: iconWidth,
    boxHeight: iconHeight,
    hitWidth: iconWidth,
    hitHeight: iconHeight,
  };
}

/** Axis-aligned hit half-extents in attachment-local space (before rotation). */
export function getStrippingV2AttachmentHitHalfExtents(attachment) {
  const layout = getStrippingV2PlacedIconLayout(attachment);
  const w = layout.hitWidth ?? layout.spanWidth;
  const h = layout.hitHeight ?? layout.spanHeight;
  return { halfW: w / 2, halfH: h / 2 };
}

/** Legacy schema (`TreatmentPlanSchemaVisual`) size — guide lines are defined in this space. */
const LEGACY_SCHEMA_W = 600;
const LEGACY_SCHEMA_H = 473;

/**
 * Midline (vertical, shortened vs full legacy decoration) and upper/lower separator (horizontal)
 * in legacy SVG coords — horizontal is shifted up vs TreatmentPlanSchemaVisual for the V2 image.
 */
const LEGACY_MIDLINE_X = LEGACY_SCHEMA_W / 2 - 1;
/** Vertical midline segment (shorter than full 50→400 legacy span). Kept centered on y=225. */
const LEGACY_VERTICAL_Y1 = 115;
const LEGACY_VERTICAL_Y2 = 345;
/** Between upper/lower arches; lower y = higher on canvas (tuned for strippingEmbeddedImage). */
const LEGACY_HORIZONTAL_Y = 230;
/** Horizontal guide: shortened vs full arch width; legacy X range (600-wide space). */
const LEGACY_HORIZONTAL_X1 = 100;
const LEGACY_HORIZONTAL_X2 = 500;

/**
 * @param {number} baseWidth
 * @param {number} baseHeight
 * @returns {{ midlineX: number; verticalY1: number; verticalY2: number; horizontalY: number; horizontalX1: number; horizontalX2: number }}
 */
export function getStrippingV2GuideLineLayout(baseWidth, baseHeight) {
  const sx = baseWidth / LEGACY_SCHEMA_W;
  const sy = baseHeight / LEGACY_SCHEMA_H;
  return {
    midlineX: LEGACY_MIDLINE_X * sx,
    verticalY1: LEGACY_VERTICAL_Y1 * sy,
    verticalY2: LEGACY_VERTICAL_Y2 * sy,
    horizontalY: LEGACY_HORIZONTAL_Y * sy,
    horizontalX1: LEGACY_HORIZONTAL_X1 * sx,
    horizontalX2: LEGACY_HORIZONTAL_X2 * sx,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   dpr: number;
 *   image: CanvasImageSource;
 *   cases: Array<{ id: unknown; label: string; origin: { x: number; y: number }; target: { x: number; y: number } }>;
 *   selection?: { type: string; id?: unknown; arrowIds?: unknown[] } | null;
 *   interaction?: { type: string; x0?: number; y0?: number; x1?: number; y1?: number } | null;
 *   baseWidth?: number;
 *   baseHeight?: number;
 *   stepBubbleRadius?: number;
 *   showEditorOverlays?: boolean;
 * }} opts
 */
export function drawStrippingV2Scene(ctx, opts) {
  const {
    dpr,
    image,
    cases,
    selection = null,
    interaction = null,
    baseWidth = STRIPPING_V2_SCENE_BASE_WIDTH,
    baseHeight = STRIPPING_V2_SCENE_BASE_HEIGHT,
    stepBubbleRadius = STRIPPING_V2_STEP_BUBBLE_RADIUS,
    showEditorOverlays = true,
  } = opts;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, baseWidth, baseHeight);
  ctx.drawImage(image, 0, 0, baseWidth, baseHeight);

  {
    const {
      midlineX,
      verticalY1,
      verticalY2,
      horizontalY,
      horizontalX1,
      horizontalX2,
    } = getStrippingV2GuideLineLayout(baseWidth, baseHeight);
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(midlineX, verticalY1);
    ctx.lineTo(midlineX, verticalY2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(horizontalX1, horizontalY);
    ctx.lineTo(horizontalX2, horizontalY);
    ctx.stroke();
    ctx.restore();
  }

  (cases || []).forEach((c) => {
    const headLen = STRIPPING_V2_ARROW_HEAD_LEN;
    const angle = Math.atan2(c.target.y - c.origin.y, c.target.x - c.origin.x);
    ctx.strokeStyle = "#e53935";
    ctx.lineWidth = STRIPPING_V2_ARROW_LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(c.origin.x, c.origin.y);
    ctx.lineTo(c.target.x, c.target.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.target.x, c.target.y);
    ctx.lineTo(
      c.target.x - headLen * Math.cos(angle - Math.PI / 6),
      c.target.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      c.target.x - headLen * Math.cos(angle + Math.PI / 6),
      c.target.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "#e53935";
    ctx.fill();

    const labelNum = Number(c.label) - 1;
    const hue = (labelNum * 137) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(c.origin.x, c.origin.y, stepBubbleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.label, c.origin.x, c.origin.y);
  });

  if (!showEditorOverlays) return;

  const drawArrowOriginRing = (ox, oy) => {
    ctx.save();
    ctx.strokeStyle = "rgba(15, 111, 255, 0.85)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(ox, oy, stepBubbleRadius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  if (selection?.type === "arrow") {
    const sel = cases.find((c) => c.id === selection.id);
    if (sel) drawArrowOriginRing(sel.origin.x, sel.origin.y);
  } else if (selection?.type === "multi") {
    selection.arrowIds.forEach((id) => {
      const c = cases.find((x) => x.id === id);
      if (c) drawArrowOriginRing(c.origin.x, c.origin.y);
    });
  }

  if (interaction?.type === "marquee") {
    const mx0 = Math.min(interaction.x0, interaction.x1);
    const my0 = Math.min(interaction.y0, interaction.y1);
    const mw = Math.abs(interaction.x1 - interaction.x0);
    const mh = Math.abs(interaction.y1 - interaction.y0);
    ctx.save();
    ctx.strokeStyle = "rgba(15, 111, 255, 0.75)";
    ctx.fillStyle = "rgba(15, 111, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(mx0, my0, mw, mh);
    ctx.strokeRect(mx0, my0, mw, mh);
    ctx.restore();
  }
}
