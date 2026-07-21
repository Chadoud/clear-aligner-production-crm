/**
 * Quote invoice helpers.
 * Centralizes logic for invoice quote status (pending vs accounted).
 *
 * @module utils/invoices/quoteHelpers
 */

import { uiStatusToDbStatus } from "../cases/index.js";
import {
  INVOICE_STATUS_PAID,
  INVOICE_STATUS_QUOTE,
} from "./invoiceStatusConstants.js";

/** DB status for "Awaiting acceptance" (Quote ON). */
export const QUOTE_STATUS_EN_ATTENTE = uiStatusToDbStatus("en_attente");

/** DB status for "In fabrication" (accepted, before delivery date). */
export const QUOTE_STATUS_IN_FABRICATION = uiStatusToDbStatus("in_fabrication");

/** DB status for "In treatment" (after delivery date passed). */
export const QUOTE_STATUS_IN_TREATMENT = uiStatusToDbStatus("in_treatment");

/** DB statuses that mean "accepted" (quote OFF, case in progress). */
export const ACCEPTED_QUOTE_DB_STATUSES = [
  QUOTE_STATUS_IN_FABRICATION,
  QUOTE_STATUS_IN_TREATMENT,
].filter((s) => s != null);

/** DB status for "Delivered" (invoice paid). */
export const DELIVERED_STATUS = uiStatusToDbStatus("delivered");

/**
 * Returns true when the invoice is a quote (excluded from financial totals).
 * Uses numeric status (matches backend `isQuotePayload`) so string `"1"` from API/JSON still counts.
 * @param {Object} invoice
 * @returns {boolean}
 */
export function isQuoteInvoice(invoice) {
  const st = Number(invoice?.invoiceStatus);
  if (Number.isFinite(st) && st === INVOICE_STATUS_QUOTE) return true;
  return invoice?.isQuote === true || Number(invoice?.isQuote) === 1;
}

/**
 * Returns true when the invoice should display as "Quote" in the UI (toggle state).
 * Rules: Paid ON → never quote. Paid OFF + Quote ON → quote. Paid OFF + Quote OFF → fabrication.
 * @param {Object} invoice
 * @returns {boolean}
 */
export function getInvoiceQuoteDisplay(invoice) {
  const paid = Number(invoice?.amountPaid) || 0;
  if (paid > 0) return false;
  const st = Number(invoice?.invoiceStatus);
  const statusIsQuote = Number.isFinite(st) && st === INVOICE_STATUS_QUOTE;
  return statusIsQuote || invoice?.isQuote !== false;
}

/**
 * Returns true when the invoice has been paid (receipt-worthy).
 * Paid = lifecycle status PAID, or an explicit paid flag / recorded payment.
 * @param {Object} invoice
 * @returns {boolean}
 */
export function isInvoicePaid(invoice) {
  const st = Number(invoice?.invoiceStatus);
  if (Number.isFinite(st) && st === INVOICE_STATUS_PAID) return true;
  if (invoice?.isPaid === true) return true;
  return (Number(invoice?.amountPaid) || 0) > 0;
}

/**
 * Resolves the document type to use for the PDF/preview *title* based on the
 * invoice lifecycle: Quote → "quote", In fabrication → "invoice" (Bulletin/Report),
 * Paid → "receipt". Explicit non-invoice base types (receipt, arrangement, quote)
 * are preserved so layout-specific documents keep their own title.
 * @param {Object} invoice
 * @param {string} [baseType] - the requested/effective document type
 * @returns {string}
 */
export function getInvoiceTitleType(invoice, baseType = "invoice") {
  if (baseType && baseType !== "invoice") return baseType;
  if (isInvoicePaid(invoice)) return "receipt";
  if (getInvoiceQuoteDisplay(invoice)) return "quote";
  return "invoice";
}

/**
 * Returns the DB case_status to set when creating an invoice based on isQuote.
 * @param {boolean} isQuote
 * @returns {number|undefined}
 */
export function getQuoteTargetStatus(isQuote) {
  return isQuote === true
    ? QUOTE_STATUS_EN_ATTENTE
    : QUOTE_STATUS_IN_FABRICATION;
}
