/**
 * Helpers for bidirectional sync between patient case_status and the last invoice.
 *
 * @module utils/invoices/patientInvoiceSyncHelpers
 */

import { formatTodayDDMMYYYY } from "../dates/dateUtils.js";

/** DB statuses that map to Quote (invoiceStatus: 1). */
const QUOTE_PATIENT_STATUSES = [3, 4, 6, 8, 10]; // case_study, en_attente, pause, no_follow_up, reactivation

/** DB statuses that map to Accepted / In fabrication (invoiceStatus: 2). */
const ACCEPTED_PATIENT_STATUSES = [1, 2, 5, 11]; // beware, in_fabrication, in_treatment

/** DB status for Delivered (invoiceStatus: 3, paid). Same as legacy "shipped" case_status in transactional emails. */
export const DELIVERED_DB_STATUS = 7;

/**
 * Get the most recent invoice for a patient.
 * Expects invoices sorted by created_at DESC (API order).
 * @param {Array<Object>} invoices - Patient's invoices (from filterInvoicesForPatient)
 * @returns {Object|null}
 */
export function getLastInvoiceForPatient(invoices) {
  if (!Array.isArray(invoices) || invoices.length === 0) return null;
  return invoices[0];
}

/**
 * Build paid-state updates for an invoice (when patient status = Delivered).
 * @param {Object} invoice
 * @returns {Object}
 */
function buildPaidUpdatesForInvoice(invoice) {
  const totalPrice = Number(invoice.totalPrice) || 0;
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const hasArrangement =
    invoice?.monthlyPaymentEnabled &&
    rows.length > 0 &&
    Number(invoice?.monthlyPaymentAmount) > 0;

  const paidDate = formatTodayDDMMYYYY();

  const updates = {
    amountPaid: totalPrice,
    remainingBalanceDue: 0,
    isPaid: true,
    paidDate,
    invoiceStatus: 3,
  };

  if (hasArrangement) {
    updates.downPaymentPaid = true;
    updates.paidMonthIndices = rows.map((_, i) => i);
    updates.paymentReceivedByDisplayIndex = {};
  }

  return updates;
}

/**
 * Given patient case_status (DB value), returns invoice updates for the last invoice.
 * Used when user changes patient status via dropdown — syncs last invoice to match.
 *
 * @param {number} dbStatus - case_status (e.g. 3, 4, 5, 7)
 * @param {Object} [invoice] - Required when dbStatus === 7 (Delivered) to build paid updates
 * @returns {{ invoiceStatus: number, isQuote: boolean, ... } | null} Updates object or null if no change needed
 */
export function getInvoiceUpdatesFromPatientStatus(dbStatus, invoice = null) {
  if (dbStatus == null || !Number.isFinite(Number(dbStatus))) return null;

  const status = Number(dbStatus);

  if (QUOTE_PATIENT_STATUSES.includes(status)) {
    const rows = invoice?.monthlyPaymentPlanRows || [];
    const updates = {
      invoiceStatus: 1,
      isQuote: true,
      amountPaid: 0,
      remainingBalanceDue: Number(invoice?.totalPrice) || 0,
      isPaid: false,
      paidDate: null,
    };
    if (rows.length > 0) {
      updates.downPaymentPaid = false;
      updates.paidMonthIndices = [];
      updates.paymentReceivedByDisplayIndex = {};
    }
    return updates;
  }

  if (ACCEPTED_PATIENT_STATUSES.includes(status)) {
    return {
      invoiceStatus: 2,
      isQuote: false,
    };
  }

  if (status === DELIVERED_DB_STATUS && invoice) {
    return buildPaidUpdatesForInvoice(invoice);
  }

  return null;
}

/** DB status for Reactivation. */
export const REACTIVATION_DB_STATUS = 10;

/**
 * Compute the next ref when entering Reactivation status.
 * "5677" → "5677-1"; "5677-1" → "5677-2"; "5677-2" → "5677-3".
 * @param {string} currentRef - Current patient ref
 * @returns {string}
 */
export function getNextReactivationRef(currentRef) {
  if (!currentRef || String(currentRef).trim() === "") return "";
  const ref = String(currentRef).trim();
  const match = ref.match(/^(.+)-(\d+)$/);
  const base = match ? match[1] : ref;
  const n = match ? parseInt(match[2], 10) : 0;
  return `${base}-${n + 1}`;
}

/**
 * Get reactivation count from ref (e.g. "5677-3" → 3).
 * @param {string} ref - Patient ref (e.g. "5677-3")
 * @returns {number} 0 if ref has no -n suffix
 */
export function getReactivationCount(ref) {
  if (!ref || String(ref).trim() === "") return 0;
  const match = String(ref)
    .trim()
    .match(/^(.+)-(\d+)$/);
  return match ? parseInt(match[2], 10) : 0;
}
