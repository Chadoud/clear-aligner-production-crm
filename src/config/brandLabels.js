/**
 * Neutral display labels for dual catalog keys.
 * Internal brand keys stay "Lab" | "Direct" for catalog/DB mapping.
 */

/** @param {string} [brand] */
export function brandDisplayName(brand) {
  if (brand === "Direct") return "Direct";
  return "Lab";
}

/** Sign-off / contact section label for emails. */
export function brandCustomerServiceName(brand) {
  return `${brandDisplayName(brand)} Customer Service`;
}

export const PRODUCT_DISPLAY_NAME = "Aligner CRM";
