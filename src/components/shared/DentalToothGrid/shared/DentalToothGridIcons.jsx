/**
 * SVG icons and module definitions for DentalToothGrid.
 * MODULES reference SvgIcon components defined here.
 */

function ToothShapeSvg({ size = 18 }) {
  return (
    <svg
      viewBox="0 0 20 26"
      width={size}
      height={size * 1.3}
      fill="none"
      aria-hidden
    >
      <path
        d="M3 7 C3 3 17 3 17 7 L16 18 C15.5 20 4.5 20 4 18 Z"
        fill="#faf7f0"
        stroke="#c8c2b4"
        strokeWidth="1.3"
      />
      <rect
        x="7"
        y="18"
        width="6"
        height="8"
        rx="3"
        fill="#e8e0d0"
        stroke="#c8c2b4"
        strokeWidth="1.2"
      />
    </svg>
  );
}

/** Short clinical root marker (contrasts with full-length ToothShapeSvg root). */
function RacineCourteSvg({ size = 18 }) {
  return (
    <svg
      viewBox="0 0 20 26"
      width={size}
      height={size * 1.3}
      fill="none"
      aria-hidden
    >
      <path
        d="M3 7 C3 3 17 3 17 7 L16 16 C15.5 18 4.5 18 4 16 L4 15 C4 13 15 13 15 11 L16 9 Z"
        fill="#faf7f0"
        stroke="#94a3b8"
        strokeWidth="1.3"
      />
      <rect
        x="7"
        y="18"
        width="6"
        height="5"
        rx="2"
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export function StrippingToothSvg({ size = 18 }) {
  return <ToothShapeSvg size={size} />;
}

export function StrippingOptionIcon({ optionId }) {
  const showLeft = optionId === "mesial" || optionId === "mesio-distal";
  const showRight = optionId === "distal" || optionId === "mesio-distal";
  return (
    <span className="dtg-stripping-option-icon" aria-hidden>
      {showLeft && (
        <span className="dtg-stripping-line dtg-stripping-line--left" />
      )}
      <StrippingToothSvg size={18} />
      {showRight && (
        <span className="dtg-stripping-line dtg-stripping-line--right" />
      )}
    </span>
  );
}

/** Single blue block (holding clip); uses `currentColor` for module tint. */
export function HoldingClipSvg({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
      <rect x="5" y="7" width="14" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Shared strip marker typography — mesial, distal, mesiodistal must stay in sync. */
const STRIP_GLYPH_VIEW_SIZE = 24;
const STRIP_GLYPH_CENTER_X = 12;
const STRIP_GLYPH_BASELINE_Y = 19.5;
const STRIP_GLYPH_FONT_SIZE = 22;

function StripBracketGlyphSvg({ size = 18, glyph }) {
  return (
    <svg
      viewBox={`0 0 ${STRIP_GLYPH_VIEW_SIZE} ${STRIP_GLYPH_VIEW_SIZE}`}
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      <text
        x={STRIP_GLYPH_CENTER_X}
        y={STRIP_GLYPH_BASELINE_Y}
        textAnchor="middle"
        fontSize={STRIP_GLYPH_FONT_SIZE}
        fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="700"
        fill="currentColor"
      >
        {glyph}
      </text>
    </svg>
  );
}

function StripBracketMesialSvg({ size = 18 }) {
  return <StripBracketGlyphSvg size={size} glyph="[" />;
}

function StripBracketDistalSvg({ size = 18 }) {
  return <StripBracketGlyphSvg size={size} glyph="]" />;
}

function StripBracketMesiodistalSvg({ size = 18 }) {
  return <StripBracketGlyphSvg size={size} glyph="|" />;
}

/** Two blue blocks (rotation clip); uses `currentColor` for module tint. */
export function ClipRotationSvg({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
      <rect x="3" y="6" width="7" height="12" rx="1.5" fill="currentColor" />
      <rect x="14" y="6" width="7" height="12" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** Warning triangle + exclamation; uses `currentColor` for fill (orange in MODULES). */
function CommentWarningSvg({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
      <path
        d="M12 3L2.5 20h19L12 3z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M12 8.5v5.2M12 17.2h.01"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ModuleIcon({ mod, svgSize }) {
  if (mod.SvgIcon) return <mod.SvgIcon size={svgSize} />;
  return <i className={mod.icon} aria-hidden />;
}

/** Shown only in Stripping & Attachments (New); excluded from tooth schema palette. */
export const STRIPPING_V2_ONLY_MODULE_IDS = [
  "strip-mesial",
  "strip-distal",
  "strip-mesiodistal",
];

/**
 * Stripping v2 sidebar: modules only the lab (company) may add.
 * Doctors get all other MODULES entries (rhizalyze, extraction, comment, etc.).
 */
export const STRIPPING_V2_COMPANY_ONLY_MODULE_IDS = [
  "holding-clip",
  "clip-rotation",
  ...STRIPPING_V2_ONLY_MODULE_IDS,
];

export const MODULES = [
  {
    id: "rhizalyze",
    label: "Rhizalyze roots",
    sublabel: "'precaution'",
    icon: "fas fa-tooth",
    color: "#f59e0b",
    bg: "#fef3c7",
  },
  {
    id: "racine-courte",
    label: "Racine courte",
    sublabel: "",
    SvgIcon: RacineCourteSvg,
    color: "#0d9488",
    bg: "#ccfbf1",
  },
  {
    id: "extraction",
    label: "With extraction",
    sublabel: "",
    icon: "fas fa-times-circle",
    color: "#ef4444",
    bg: "#fee2e2",
  },
  {
    id: "comment",
    label: "Comment",
    sublabel: "",
    SvgIcon: CommentWarningSvg,
    color: "#ea580c",
    bg: "#ffedd5",
  },
  {
    id: "lock",
    label: "Implant",
    sublabel: "",
    icon: "fas fa-lock",
    color: "#8b5cf6",
    bg: "#ede9fe",
  },
  {
    id: "holding-clip",
    label: "Holding clip",
    sublabel: "",
    SvgIcon: HoldingClipSvg,
    color: "#2563eb",
    bg: "#dbeafe",
  },
  {
    id: "clip-rotation",
    label: "Rotation clip",
    sublabel: "",
    SvgIcon: ClipRotationSvg,
    color: "#2563eb",
    bg: "#e0e7ff",
  },
  {
    id: "strip-mesial",
    label: "Mesial",
    sublabel: "",
    SvgIcon: StripBracketMesialSvg,
    color: "#0f766e",
    bg: "#ccfbf1",
  },
  {
    id: "strip-distal",
    label: "Distal",
    sublabel: "",
    SvgIcon: StripBracketDistalSvg,
    color: "#0369a1",
    bg: "#e0f2fe",
  },
  {
    id: "strip-mesiodistal",
    label: "Mesiodistal",
    sublabel: "",
    SvgIcon: StripBracketMesiodistalSvg,
    color: "#5b21b6",
    bg: "#ede9fe",
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.id, m]));
