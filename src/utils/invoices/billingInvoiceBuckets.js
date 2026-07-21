/**
 * Splits quote invoices into accepted vs pending (same rules as Overview billing table).
 */
import { ACCEPTED_QUOTE_DB_STATUSES } from "@/utils/invoices/quoteHelpers.js";

/**
 * @param {Array<{ case_id?: unknown }>} quoteInvoices
 * @param {(inv: object) => { case_status?: unknown } | null | undefined} getPatientForInvoice
 */
export function partitionQuoteInvoices(quoteInvoices, getPatientForInvoice) {
  const acceptedQuoteInvoices = quoteInvoices.filter((inv) => {
    const patient = getPatientForInvoice(inv);
    const status =
      patient?.case_status != null ? Number(patient.case_status) : null;
    return status != null && ACCEPTED_QUOTE_DB_STATUSES.includes(status);
  });
  const pendingQuoteInvoices = quoteInvoices.filter(
    (inv) => !acceptedQuoteInvoices.includes(inv)
  );
  return { acceptedQuoteInvoices, pendingQuoteInvoices };
}
