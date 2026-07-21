/**
 * Neutral display labels for dual catalog keys.
 * Internal brand keys stay "Lab" | "Direct" for catalog/DB mapping.
 */

export const PRODUCT_DISPLAY_NAME = "Aligner CRM";

export function brandDisplayName(brand?: string | null): "Lab" | "Direct" {
  if (brand === "Direct") return "Direct";
  return "Lab";
}

export function brandCustomerServiceName(brand?: string | null): string {
  return `${brandDisplayName(brand)} Customer Service`;
}
