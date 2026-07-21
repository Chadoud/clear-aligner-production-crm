/**
 * Lab / for-doctors treatment presets only.
 * Do not mix Direct presets here.
 *
 * @module config/presetsLab
 */

import { LAB_VAT_RATE } from "@/utils/invoices/vatBreakdown.js";

/** Service codes to clear when applying a treatment preset (lab + aligner services). */
const TREATMENT_SERVICES_TO_REMOVE = [
  "TRAITEMENT_ALIGNEMENT",
  "0.1",
  "012",
  "091",
];

/** Build a treatment preset from a spec. */
function treatmentPreset(price, months, qty012, qty091) {
  const id = `treatment-${price}`;
  /** Thermoformed / invoice steps: 1 month of treatment = 2 steps. */
  const alignerCount = months * 2;
  return {
    id,
    label: String(price),
    brand: "Lab",
    description: `Treatment: ${price} CHF for ${months} month${months > 1 ? "s" : ""}, ${alignerCount} Thermoformed aligner`,
    services: [
      { code: "0.1", quantity: 1 },
      { code: "012", quantity: qty012 },
      { code: "091", quantity: qty091 },
    ],
    servicesToRemove: TREATMENT_SERVICES_TO_REMOVE,
    totalPrice: { type: "custom", value: price },
    treatmentDuration: { type: "custom", value: months },
    treatmentSteps: { type: "custom", value: alignerCount },
    vatRate: LAB_VAT_RATE,
  };
}

/**
 * Preset quantities calibrated so that service lines (Modèle + Attelle) fit within
 * the HT (before-tax) portion of the preset price: HT = price × (1 − 8.1%).
 * The Laboratory service line (code 0.1) absorbs the remainder automatically.
 *
 * Formula per preset:
 *   HT = price × 0.923
 *   max_qty091 = floor((HT − qty012 × 22.20) / 74.925)
 *
 * Rows at each full hundred CHF (300–2300) between former anchors are filled by
 * linear interpolation of months and qty091 between the neighbouring anchor rows.
 */
const TREATMENT_SPECS = [
  [70, 1, 1, 0], // HT=64.61  | Lab=64.61
  [100, 1, 1, 0], // HT=92.30  | Modèle=22.20 | Lab=70.10
  [200, 1, 2, 1], // HT=184.60 | Modèle=44.40 + Attelle=74.93 | Lab=65.27
  [300, 1, 2, 2], // interp 200–500
  [400, 2, 2, 3], // interp 200–500
  [500, 2, 2, 4], // HT=461.50 | Modèle=44.40 + Attelle=299.70 | Lab=117.40
  [600, 3, 2, 6], // interp 500–800
  [700, 3, 2, 7], // interp 500–800
  [800, 4, 2, 9], // HT=738.40 | Modèle=44.40 + Attelle=674.33 | Lab=19.68
  [900, 5, 2, 10], // interp 800–1000
  [1000, 5, 2, 11], // HT=923.00 | Modèle=44.40 + Attelle=824.18 | Lab=54.43
  [1100, 6, 2, 13], // interp 1000–1200
  [1200, 6, 2, 14], // HT=1107.60| Modèle=44.40 + Attelle=1048.95| Lab=14.25
  [1300, 7, 2, 15], // interp 1200–1400
  [1400, 7, 2, 16], // HT=1292.20| Modèle=44.40 + Attelle=1198.80| Lab=49.00
  [1500, 8, 2, 18], // interp 1400–1600
  [1600, 8, 2, 19], // HT=1476.80| Modèle=44.40 + Attelle=1423.58| Lab=8.83
  [1700, 9, 2, 20], // interp 1600–1800
  [1800, 9, 2, 21], // HT=1661.40| Modèle=44.40 + Attelle=1573.43| Lab=43.58
  [1900, 10, 2, 23], // interp 1800–2000
  [2000, 10, 2, 24], // HT=1846.00| Modèle=44.40 + Attelle=1798.20| Lab=3.40
  [2100, 11, 2, 25], // interp 2000–2200
  [2200, 11, 2, 26], // HT=2030.60| Modèle=44.40 + Attelle=1948.05| Lab=38.15
  [2300, 12, 2, 27], // interp 2200–2400
  [2400, 12, 2, 28], // HT=2215.20| Modèle=44.40 + Attelle=2097.90| Lab=72.90
];

const TREATMENT_PRESETS = Object.fromEntries(
  TREATMENT_SPECS.map(([price, months, qty012, qty091]) => [
    `treatment-${price}`,
    treatmentPreset(price, months, qty012, qty091),
  ])
);

export const PRESETS_LAB = {
  ...TREATMENT_PRESETS,

  // ______________SERVICES presets – for doctors/cabinets (Lab)______________

  "sa-reactivation": {
    id: "sa-reactivation",
    label: "reactivation",
    brand: "Lab",
    description: "Reactivation aligner and duplicate model",
    services: [
      { code: "091", quantity: 3 },
      { code: "0.1", quantity: 1 },
    ],
    servicesToRemove: ["091", "0.1"],
    totalPrice: { type: "custom", value: 300 },
    treatmentDuration: null,
    treatmentSteps: null,
  },

  "sa-contention": {
    id: "sa-contention",
    label: "Retention",
    brand: "Lab",
    description: "Retention aligner and duplicate model",
    services: [
      { code: "0091.1", quantity: 2 },
      { code: "0013.1", quantity: 0 },
      { code: "0.1", quantity: 1 },
    ],
    servicesToRemove: ["0091.1", "0013.1", "0.1"],
    totalPrice: { type: "custom", value: 200 },
    treatmentDuration: null,
    treatmentSteps: null,
  },
  "sa-fil-contention": {
    id: "sa-fil-contention",
    label: "Retention wire",
    brand: "Lab",
    description: "Retention with metal wire, bonding and external lab",
    services: [
      { code: "4.8490", quantity: 2 },
      { code: "4.8720", quantity: 12 },
      { code: "0.1", quantity: 1 },
    ],
    servicesToRemove: ["4.8490", "4.8720", "0.1"],
    totalPrice: { type: "custom", value: 600 },
    treatmentDuration: null,
    treatmentSteps: null,
  },
  "sa-blanchiment": {
    id: "sa-blanchiment",
    label: "Whitening",
    brand: "Lab",
    description: "Whitening service with lab",
    services: [
      {
        code: "BLANCHIMENT",
        quantity: 1,
        custom: true,
        service: "Whitening",
        vpt: "---",
        points: 220,
      },
      { code: "0.1", quantity: 1, points: 100 },
    ],
    servicesToRemove: ["BLANCHIMENT", "0.1"],
    totalPrice: { type: "custom", value: 320 },
    treatmentDuration: null,
    treatmentSteps: null,
  },
};
