/**
 * Line-item shape for payment overview doctor rows (sub-rows).
 */
import { getInvoiceRef, formatInvoiceDateForDisplay } from "@/utils/index.js";

/**
 * @param {Object} inv
 * @param {Object|null} patient
 * @param {Object|null} client
 * @param {{ isQuote?: boolean, isPendingQuote?: boolean }} opts
 */
export function buildBillingLineItem(
  inv,
  patient,
  client,
  { isQuote = false, isPendingQuote = false } = {}
) {
  const caseRef = client?.ref ?? "";
  return {
    caseRef,
    caseId: inv.case_id ?? patient?.case_id ?? null,
    invoiceRef: isQuote ? getInvoiceRef(inv) || "QUOTE" : getInvoiceRef(inv),
    generatedDate: inv.generatedDate ?? null,
    createdAt: inv.createdAt ?? null,
    name: patient?.name ?? client?.name ?? undefined,
    amount: Number(inv.totalPrice) || 0,
    amountPaid: isQuote ? 0 : Number(inv.amountPaid) || 0,
    label: inv.generatedDate
      ? `${isQuote ? "Quote" : "Invoice"} ${formatInvoiceDateForDisplay(inv.generatedDate)}`
      : isQuote
        ? "Quote"
        : "Invoice",
    isPendingQuote,
  };
}
