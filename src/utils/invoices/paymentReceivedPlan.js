/**
 * Direct monthly arrangement: optional amount received per badge (displayIndex).
 * displayIndex 0 = down payment when present; 1..n = plan row index n-1.
 *
 * **Full segment:** month index in `paidMonthIndices` (or down payment flag). Optional
 * `paymentReceivedByDisplayIndex[key]` when received differs from scheduled.
 *
 * **Partial segment:** not yet in `paidMonthIndices` (or DP not paid), but
 * `paymentReceivedByDisplayIndex[key]` holds amount credited so far (0 < amount < scheduled).
 * @module utils/invoices/paymentReceivedPlan
 */

import { roundToNearest5Cents } from "@/utils/invoices/invoiceFormatters.js";

/**
 * @param {unknown} raw
 * @returns {Record<string, number>}
 */
export function normalizePaymentReceivedMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) out[String(k)] = roundToNearest5Cents(n);
  }
  return out;
}

/**
 * @param {Object} invoice
 * @returns {number}
 */
export function computePlanDownPaymentScheduled(invoice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const totalPrice = Number(invoice?.totalPrice) || 0;
  const sumInstalments = rows.reduce(
    (s, r) => s + (Number(r.amount) || monthlyAmount),
    0
  );
  return Math.max(0, totalPrice - sumInstalments);
}

/**
 * @param {Object} invoice
 * @param {number} displayIndex
 * @returns {number}
 */
export function getScheduledAmountForDisplayIndex(invoice, displayIndex) {
  if (displayIndex === 0) {
    return roundToNearest5Cents(computePlanDownPaymentScheduled(invoice));
  }
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const row = rows[displayIndex - 1];
  return roundToNearest5Cents(Number(row?.amount) || monthlyAmount);
}

/**
 * Amount credited for a badge (override from map or scheduled).
 * @param {Object} invoice
 * @param {number} displayIndex
 * @returns {number}
 */
export function getCreditedAmountForDisplayIndex(invoice, displayIndex) {
  const scheduled = getScheduledAmountForDisplayIndex(invoice, displayIndex);
  const map = normalizePaymentReceivedMap(
    invoice?.paymentReceivedByDisplayIndex
  );
  const rec = map[String(displayIndex)];
  if (rec != null && Number.isFinite(rec)) return roundToNearest5Cents(rec);
  return scheduled;
}
