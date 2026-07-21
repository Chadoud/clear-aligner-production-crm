/**
 * Invoice reference utilities — unique human-readable ref per invoice (e.g. INV-0001).
 * @module utils/invoices/invoiceRef
 */

const PREFIX = "INV-";
const REF_REGEX = /^INV-(\d+)$/i;

/**
 * Parse numeric part from invoiceRef (INV-0001 → 1).
 * @param {string} ref
 * @returns {number}
 */
export function parseInvoiceRefNumber(ref) {
  if (!ref || typeof ref !== "string") return 0;
  const m = ref.trim().match(REF_REGEX);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Generate next invoice ref from existing invoices.
 * @param {Array<Object>} invoices
 * @returns {string} e.g. "INV-0001"
 */
export function generateNextInvoiceRef(invoices) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return `${PREFIX}0001`;
  }
  const max = invoices.reduce((m, inv) => {
    const n = parseInvoiceRefNumber(inv.invoiceRef);
    return n > m ? n : m;
  }, 0);
  return `${PREFIX}${String(max + 1).padStart(4, "0")}`;
}

/**
 * Get display ref for an invoice (invoiceRef or fallback).
 * @param {Object} invoice
 * @returns {string}
 */
export function getInvoiceRef(invoice) {
  const ref = invoice?.invoiceRef;
  if (ref && typeof ref === "string" && ref.trim()) return ref.trim();
  if (invoice?.id)
    return `${PREFIX}${String(invoice.id).slice(0, 8).toUpperCase()}`;
  return "—";
}
