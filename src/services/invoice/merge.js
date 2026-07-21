/**
 * Local migration helpers: stable ids and invoice refs (localStorage only).
 * @module services/invoiceDataServiceMerge
 */

import { parseInvoiceRefNumber } from "@/utils/invoices/index.js";
import { uuidv4 } from "@/utils/shared/uuid.js";

/**
 * Ensure each invoice has a unique id (for precise matching).
 * @param {Array<Object>} invoices
 * @returns {{ data: Array<Object>, changed: boolean }}
 */
export function ensureInvoiceIds(invoices) {
  let changed = false;
  const data = invoices.map((inv) => {
    if (inv.id) return inv;
    changed = true;
    return { ...inv, id: uuidv4() };
  });
  return { data, changed };
}

/**
 * Ensure each invoice has a unique invoiceRef (localStorage migration only).
 * @param {Array<Object>} invoices
 * @returns {{ data: Array<Object>, changed: boolean }}
 */
export function ensureInvoiceRefs(invoices) {
  const needRef = invoices.filter((inv) => !inv.invoiceRef?.trim());
  if (needRef.length === 0) return { data: invoices, changed: false };
  const max = invoices.reduce((m, inv) => {
    const n = parseInvoiceRefNumber(inv.invoiceRef);
    return n > m ? n : m;
  }, 0);
  let next = max + 1;
  const data = invoices.map((inv) => {
    if (inv.invoiceRef?.trim()) return inv;
    return { ...inv, invoiceRef: `INV-${String(next++).padStart(4, "0")}` };
  });
  return { data, changed: true };
}
