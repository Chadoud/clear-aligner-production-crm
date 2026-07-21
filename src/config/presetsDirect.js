/**
 * Direct treatment presets only.
 * Do not mix Lab / for-doctors presets here.
 *
 * @module config/presetsDirect
 */

import { SWISS_VAT_RATE } from "@/utils/invoices/vatBreakdown.js";

/** Service codes to clear when applying an Direct treatment preset. */
const DIRECT_SERVICES_TO_REMOVE = [
  "4.8000",
  "4.0970",
  "PANORAMIQUE",
  "TRAITEMENT_ALIGNEMENT",
  "4.1750",
  "0.1",
];

/** Invoice / form steps: 1 month of treatment = 2 steps (independent of 4.1750 aligner qty). */
const stepsFromMonths = (months) => months * 2;

/** Build a treatment preset from a spec. */
function createDirectPreset({ label, alignerCount, months, price }) {
  const id = `treatment-easy-${price}`;
  return {
    id,
    label,
    brand: "Direct",
    description: `Treatment: ${price} CHF for ${months} month${months > 1 ? "s" : ""}, ${alignerCount} Thermoformed aligner`,
    services: [
      { code: "4.8000", quantity: 1 },
      { code: "4.0970", quantity: 6 },
      { code: "PANORAMIQUE", quantity: 1 },
      { code: "4.1750", quantity: alignerCount },
      { code: "0.1", quantity: 1 },
    ],
    servicesToRemove: DIRECT_SERVICES_TO_REMOVE,
    totalPrice: { type: "custom", value: price },
    treatmentDuration: { type: "custom", value: months },
    treatmentSteps: { type: "custom", value: stepsFromMonths(months) },
    vatRate: SWISS_VAT_RATE,
  };
}

/**
 * [price CHF, months, alignerCount (4.1750 qty)].
 * Original anchors are kept; each missing full-hundred step between anchors is filled by
 * linear interpolation of months and aligner count (same approach as Lab hundreds).
 */
const TREATMENT_SPECS = [
  [1900, 6, 12],
  [2000, 6, 13], // interp 1900–2400
  [2100, 7, 14],
  [2200, 7, 15], // +1 aligner vs 2100 (linear round would duplicate 14)
  [2300, 8, 15],
  [2400, 8, 16],
  [2500, 9, 17], // interp 2400–2800
  [2600, 9, 18],
  [2700, 10, 19], // interp 2400–2800
  [2800, 10, 20],
  [2900, 10, 21], // interp 2800–3200
  [3000, 11, 21],
  [3100, 11, 22],
  [3200, 11, 22],
  [3300, 11, 23], // interp 3200–3500
  [3400, 12, 23],
  [3500, 12, 24],
  [3600, 12, 24],
  [3700, 13, 26],
  [3800, 14, 28],
  [3900, 30, 30],
  [4000, 30, 30],
];

const TREATMENT_PRESETS = Object.fromEntries(
  TREATMENT_SPECS.map(([price, months, alignerCount]) => [
    `treatment-easy-${price}`,
    createDirectPreset({
      label: String(price),
      alignerCount,
      months,
      price,
    }),
  ])
);

export const PRESETS_DIRECT = {
  ...TREATMENT_PRESETS,

  // SERVICES presets – for our Cabinet (Direct)
  "es-reactivation": {
    id: "es-reactivation",
    label: "reactivation",
    brand: "Direct",
    description: "Reactivation aligner and duplicate model",
    services: [
      { code: "4.0900", quantity: 1 },
      { code: "4.1750", quantity: 2 },
      { code: "0.1", quantity: 1 },
    ],
    servicesToRemove: ["4.0900", "4.1750", "0.1"],
    totalPrice: { type: "custom", value: 300 },
    treatmentDuration: null,
    treatmentSteps: null,
    vatRate: SWISS_VAT_RATE,
  },

  "es-contention": {
    id: "es-contention",
    label: "Retention",
    brand: "Direct",
    description: "Retention aligner and duplicate model",
    services: [
      { code: "4.0900", quantity: 1 },
      { code: "0091.1", quantity: 3 },
      { code: "0013.1", quantity: 2 },
    ],
    servicesToRemove: ["0091.1", "4.0900", "0013.1"],
    totalPrice: { type: "custom", value: 370 },
    treatmentDuration: null,
    treatmentSteps: null,
    vatRate: SWISS_VAT_RATE,
  },
  "es-fil-contention": {
    id: "es-fil-contention",
    label: "Retention wire",
    brand: "Direct",
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
    vatRate: SWISS_VAT_RATE,
  },
  "es-blanchiment": {
    id: "es-blanchiment",
    label: "Whitening",
    brand: "Direct",
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
    vatRate: SWISS_VAT_RATE,
  },
};
