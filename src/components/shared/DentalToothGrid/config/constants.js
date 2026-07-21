/**
 * DentalToothGrid constants: tooth arrays, gap keys, step numbers, striping options,
 * and FDI positions for the treatment plan schema overlay.
 */

export const UPPER_Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
export const UPPER_Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_Q4 = [48, 47, 46, 45, 44, 43, 42, 41];
export const LOWER_Q3 = [31, 32, 33, 34, 35, 36, 37, 38];

export const UPPER_GAP_KEYS = [
  "U18-17",
  "U17-16",
  "U16-15",
  "U15-14",
  "U14-13",
  "U13-12",
  "U12-11",
  "U11-21",
  "U21-22",
  "U22-23",
  "U23-24",
  "U24-25",
  "U25-26",
  "U26-27",
  "U27-28",
];
export const LOWER_GAP_KEYS = [
  "L48-47",
  "L47-46",
  "L46-45",
  "L45-44",
  "L44-43",
  "L43-42",
  "L42-41",
  "L41-31",
  "L31-32",
  "L32-33",
  "L33-34",
  "L34-35",
  "L35-36",
  "L36-37",
  "L37-38",
];
export const STRIPPING_GAP_KEYS = [...UPPER_GAP_KEYS, ...LOWER_GAP_KEYS];

export const STEP_NUMBERS = [
  1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31,
];

export const STRIPING_OPTIONS = [
  { id: "mesial", label: "M 0.1", short: "M" },
  { id: "distal", label: "D 0.1", short: "D" },
  { id: "mesio-distal", label: "MD 0.2", short: "M-D" },
];
export const STRIPING_MAP = Object.fromEntries(
  STRIPING_OPTIONS.map((s) => [s.id, s])
);

/** Schema image dimensions (strippingPlanSchema.png) */
export const DTG_SVG_W = 600;
export const DTG_SVG_H = 473;

/** Arc centres for radial gap direction when angle is omitted */
export const UPPER_ARC_CTR = { x: 300, y: 172 };
export const LOWER_ARC_CTR = { x: 300, y: 301 };

/**
 * Per-gap SVG position and direction. x,y = midpoint between adjacent teeth.
 * angle = degrees from vertical; length/boff = span from gap to first bubble (px).
 */
export const FDI_GAP_SVG = {
  // Upper right quadrant
  "U18-17": { x: 212, y: 208, angle: -85, length: 110 },
  "U17-16": { x: 218, y: 175, angle: -84, length: 252 },
  "U16-15": { x: 225, y: 142, angle: -80, length: 372 },
  "U15-14": { x: 230, y: 122, angle: -65 },
  "U14-13": { x: 239, y: 101, angle: -55 },
  "U13-12": { x: 254, y: 84, angle: -35 },
  "U12-11": { x: 273, y: 73, angle: -20, length: 304 },
  //Middle Upper
  "U11-21": { x: 298.9, y: 62, length: 300 },
  // Upper left quadrant
  "U21-22": { x: 328, y: 67, length: 304 },
  "U22-23": { x: 346, y: 82, angle: 36 },
  "U23-24": { x: 358, y: 101, angle: 48 },
  "U24-25": { x: 370, y: 120, angle: 70 },
  "U25-26": { x: 379, y: 142, angle: 84, length: 372 },
  "U26-27": { x: 385, y: 173, angle: 84, length: 252 },
  "U27-28": { x: 390, y: 206, angle: 85, length: 110 },
  // Lower left quadrant
  "L48-47": { x: 212, y: 282, angle: -90, length: 110 },
  "L47-46": { x: 215, y: 315, angle: -84, length: 252 },
  "L46-45": { x: 225, y: 349, angle: -80, length: 372 },
  "L45-44": { x: 235, y: 369, angle: -65 },
  "L44-43": { x: 248, y: 385, angle: -55 },
  "L43-42": { x: 265, y: 399, angle: -35 },
  "L42-41": { x: 280, y: 409, angle: -20, length: 304 },
  // Middle Lower
  "L41-31": { x: 298.8, y: 410, length: 300 },
  // Lower right quadrant
  "L31-32": { x: 318, y: 409, angle: 14, length: 304 },
  "L32-33": { x: 334, y: 400, angle: 40 },
  "L33-34": { x: 350, y: 387, angle: 60 },
  "L34-35": { x: 365, y: 370, angle: 69 },
  "L35-36": { x: 375, y: 348, angle: 84, length: 372 },
  "L36-37": { x: 387, y: 315, angle: 85, length: 250 },
  "L37-38": { x: 390, y: 281, angle: 90, length: 110 },
};
