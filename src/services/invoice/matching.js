/**
 * Invoice matching for update/delete and patient filters.
 * @module services/invoiceDataServiceMatching
 */

import { getInvoiceClient } from "@/utils/invoices/index.js";
import { safeTrim } from "@/utils/shared/index.js";

export const normalizeMatchValue = (v) => safeTrim(v, "").toLowerCase();

export const normalizeIdentityValue = (value) =>
  value != null ? String(value).trim().toLowerCase() : "";

/**
 * Returns true when the invoice matches the criteria.
 * Prefers id for exact matching; fallback uses clientRef/name, date, price, invoiceRef.
 * @param {Object} invoice
 * @param {Object} matchCriteria
 */
export const invoiceMatchesCriteria = (invoice, matchCriteria) => {
  const criteriaId = matchCriteria.id;
  if (criteriaId != null && String(criteriaId).trim() !== "") {
    const invId = invoice.id;
    if (invId != null) {
      return String(invId).trim() === String(criteriaId).trim();
    }
  }
  const client = getInvoiceClient(invoice) || {};
  const invoiceRef = normalizeMatchValue(client.ref);
  const invoiceName = normalizeMatchValue(client.name);
  const matchRef = normalizeMatchValue(matchCriteria.clientRef);
  const matchName = normalizeMatchValue(matchCriteria.clientName);

  const identityMatch =
    matchRef && invoiceRef
      ? invoiceRef === matchRef
      : matchName && invoiceName
        ? invoiceName === matchName
        : false;

  const dateMatch =
    invoice.generatedDate ===
    (matchCriteria.generatedDate ?? invoice.generatedDate);
  const priceMatch =
    invoice.totalPrice === (matchCriteria.totalPrice ?? invoice.totalPrice);

  const invoiceRefMatch =
    matchCriteria.invoiceRef != null && matchCriteria.invoiceRef !== ""
      ? String(invoice.invoiceRef || "").trim() ===
        String(matchCriteria.invoiceRef).trim()
      : true;

  return identityMatch && dateMatch && priceMatch && invoiceRefMatch;
};
