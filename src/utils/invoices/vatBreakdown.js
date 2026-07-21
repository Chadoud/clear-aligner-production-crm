/**
 * VAT breakdown utilities — Swiss 8.1% inclusive convention.
 *
 * Lab billing uses the "inclusive" method:
 *   VAT = TTC × vatRate
 *   HT  = TTC − VAT
 *
 * @module utils/invoices/vatBreakdown
 */

/** Swiss standard VAT rate (8.1%) — applies to both Lab and Direct. */
export const SWISS_VAT_RATE = 0.081;

/** @deprecated Pre-2024 Swiss VAT; normalized by {@link resolveVatRate}. */
export const LEGACY_SWISS_VAT_RATE = 0.077;

/** @deprecated Use SWISS_VAT_RATE. Kept for backward compatibility. */
export const LAB_VAT_RATE = SWISS_VAT_RATE;

/**
 * Use current Swiss VAT when invoices still store the old 7.7% rate.
 * @param {number} rate
 * @returns {number}
 */
export function resolveVatRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (Math.abs(n - LEGACY_SWISS_VAT_RATE) < 0.00001) return SWISS_VAT_RATE;
  return n;
}

/**
 * Compute VAT breakdown from a TTC (all-inclusive) total.
 *
 * @param {number} totalTTC - Total including tax (CHF)
 * @param {number} vatRate  - VAT rate (0–1), e.g. 0.081 for 8.1%
 * @returns {{ totalHT: number, vatAmount: number, totalTTC: number }}
 */
export function computeVatBreakdown(totalTTC, vatRate) {
  const ttc = Number(totalTTC) || 0;
  const rate = resolveVatRate(vatRate);
  const vatAmount = Math.round(ttc * rate * 100) / 100;
  return { totalHT: ttc - vatAmount, vatAmount, totalTTC: ttc };
}
