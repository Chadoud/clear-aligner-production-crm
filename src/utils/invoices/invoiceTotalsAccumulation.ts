import { getInvoiceClient } from "@/utils/invoices/index.js";
import { getPatientForInvoiceRef } from "@/services/patientDataService";
import {
  getInvoiceQuoteDisplay,
  ACCEPTED_QUOTE_DB_STATUSES,
} from "@/utils/invoices/quoteHelpers.js";
import type {
  InvoiceDto,
  InvoiceTotalsDto,
  PatientSummaryDto,
} from "@/types/invoice";

type InvoiceClientLike = {
  ref?: string | null;
};

/**
 * Mutates running totals for one invoice (same rules as Overview dashboard cards / donut).
 */
export function accumulateInvoiceFinancialTotals(
  totals: { paid: number; owed: number; pending: number },
  inv: InvoiceDto
): void {
  const patient = getPatientForInvoiceRef(
    (getInvoiceClient(inv) as InvoiceClientLike | null)?.ref ?? null,
    inv.case_id ?? null
  ) as PatientSummaryDto | null;
  const patientStatus =
    patient?.case_status != null ? Number(patient.case_status) : null;
  const isAcceptedQuote =
    getInvoiceQuoteDisplay(inv) &&
    patientStatus != null &&
    ACCEPTED_QUOTE_DB_STATUSES.includes(patientStatus);

  if (getInvoiceQuoteDisplay(inv) && !isAcceptedQuote) {
    totals.pending += Number(inv.totalPrice) || 0;
    return;
  }
  if (isAcceptedQuote) {
    totals.owed += Number(inv.totalPrice) || 0;
    return;
  }
  const t = Number(inv.totalPrice) || 0;
  const p = Math.min(Number(inv.amountPaid) || 0, t);
  totals.paid += p;
  totals.owed += Math.max(0, t - p);
}

export function computeInvoiceTotalsFromInvoices(
  invoices: InvoiceDto[]
): InvoiceTotalsDto {
  const totals = { paid: 0, owed: 0, pending: 0 };
  invoices.forEach((inv) => accumulateInvoiceFinancialTotals(totals, inv));
  return {
    totalPaid: totals.paid,
    totalLeft: totals.owed,
    totalPending: totals.pending,
    totalInvoiced: totals.paid + totals.owed + totals.pending,
  };
}
