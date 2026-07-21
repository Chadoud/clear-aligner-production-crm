/** Swiss standard VAT rate (8.1%). */
export const SWISS_VAT_RATE = 0.081;

const LEGACY_SWISS_VAT_RATE = 0.077;

/** Normalize stored invoices that still have the old 7.7% rate. */
export function resolveVatRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  if (Math.abs(rate - LEGACY_SWISS_VAT_RATE) < 0.00001) return SWISS_VAT_RATE;
  return rate;
}
