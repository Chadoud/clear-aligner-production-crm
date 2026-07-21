/**
 * SVG markup matching panel ModuleIcon / DentalToothGridIcons.
 * Used to rasterize module icons onto the New-mode canvas so they match the sidebar.
 */

const TOOTH_BASE = `
  <path d="M3 7 C3 3 17 3 17 7 L16 18 C15.5 20 4.5 20 4 18 Z" fill="#faf7f0" stroke="#c8c2b4" stroke-width="1.3"/>
  <rect x="7" y="18" width="6" height="8" rx="3" fill="#e8e0d0" stroke="#c8c2b4" stroke-width="1.2"/>
`;

/** 2× pixel size for sharper canvas scaling; viewBox includes 1px bottom bleed. */
const SVG_WRAP = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 27" width="40" height="54">${inner}</svg>`;

const MODULE_SVG_INNER = {
  rhizalyze: `
    ${TOOTH_BASE}
    <path d="M8 6 L10 4 L12 6 L11 10 L9 10 Z" fill="#f59e0b" stroke="#d97706" stroke-width="0.8"/>
  `,
  extraction: `
    ${TOOTH_BASE}
    <circle cx="10" cy="11" r="5" fill="none" stroke="#ef4444" stroke-width="1.2"/>
    <path d="M7 8 L13 14 M13 8 L7 14" stroke="#ef4444" stroke-width="1.3" stroke-linecap="round"/>
  `,
  comment: `
    ${TOOTH_BASE}
    <path d="M5 5 h8 a1.5 1.5 0 0 1 1.5 1.5 v3 a1.5 1.5 0 0 1 -1.5 1.5 h-5 l-2 2 v-2 h-1 a1.5 1.5 0 0 1 -1.5 -1.5 v-3 A1.5 1.5 0 0 1 5 5 z" fill="#dbeafe" stroke="#3b82f6" stroke-width="0.9"/>
    <circle cx="7.5" cy="8.5" r="0.6" fill="#3b82f6"/>
    <circle cx="10" cy="8.5" r="0.6" fill="#3b82f6"/>
    <circle cx="12.5" cy="8.5" r="0.6" fill="#3b82f6"/>
  `,
  lock: `
    ${TOOTH_BASE}
    <rect x="7" y="9" width="6" height="5" rx="1" fill="#ede9fe" stroke="#8b5cf6" stroke-width="1"/>
    <path d="M8 9 V7.5 a2 2 0 0 1 4 0 V9" fill="none" stroke="#8b5cf6" stroke-width="1"/>
  `,
  "holding-clip": `
    <rect x="4" y="9" width="12" height="9" rx="2" fill="#2563eb"/>
  `,
  "clip-rotation": `
    <rect x="2" y="7" width="6" height="13" rx="1.5" fill="#2563eb"/>
    <rect x="12" y="7" width="6" height="13" rx="1.5" fill="#2563eb"/>
  `,
};

export function getModuleSvgDataUrl(moduleId) {
  const inner = MODULE_SVG_INNER[moduleId] || MODULE_SVG_INNER.rhizalyze;
  const svg = SVG_WRAP(inner);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
