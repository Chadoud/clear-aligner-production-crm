import type {
  InvoiceDto,
  InvoiceTotalsDto,
  PatientSummaryDto,
} from "@/types/invoice";
import { computeInvoiceTotalsFromInvoices } from "@/utils/invoices/invoiceTotalsAccumulation.js";
import { getInvoiceClient } from "@/utils/invoices/index.js";
import { getPatientForInvoiceRef } from "@/services/patientDataService";
import {
  getInvoiceQuoteDisplay,
  ACCEPTED_QUOTE_DB_STATUSES,
} from "@/utils/invoices/quoteHelpers.js";

// ── Invoice totals ────────────────────────────────────────────────────────────

/** Compute paid/left/pending totals from invoices. */
export function computeInvoiceTotals(invoices: InvoiceDto[]): InvoiceTotalsDto {
  return computeInvoiceTotalsFromInvoices(invoices);
}

// ── Patient / case totals ─────────────────────────────────────────────────────

type InvoiceClientLike = {
  ref?: string | null;
};

export interface PatientTotalsDto {
  /** Unique cases with at least one left-to-pay / accepted-quote invoice (overlapping). */
  owedCount: number;
  /** Unique cases with at least one fully paid confirmed invoice (overlapping). */
  paidCount: number;
  /** Unique cases with at least one pending quote (overlapping). */
  pendingCount: number;
  /** Mutually exclusive — worst bucket: owed > paid > pending. */
  exclusiveOwed: number;
  exclusivePaid: number;
  exclusivePending: number;
  exclusiveTotal: number;
}

/** Dedup key for a case across invoices (shared with scoped case-status counts). */
export function invoiceCaseDedupKey(inv: InvoiceDto): string {
  if (inv.case_id != null) return `case:${inv.case_id}`;
  const ref = (getInvoiceClient(inv) as InvoiceClientLike | null)?.ref;
  if (ref != null && String(ref).trim() !== "")
    return `ref:${String(ref).trim()}`;
  return `unknown:${String(inv.id ?? "noid")}`;
}

type CaseAgg = {
  hasPendingQuote: boolean;
  hasOwed: boolean;
  hasPaidConfirmed: boolean;
};

function classifyInvoice(inv: InvoiceDto): CaseAgg {
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
    return { hasPendingQuote: true, hasOwed: false, hasPaidConfirmed: false };
  }
  if (isAcceptedQuote) {
    return { hasPendingQuote: false, hasOwed: true, hasPaidConfirmed: false };
  }
  const t = Number(inv.totalPrice) || 0;
  const p = Math.min(Number(inv.amountPaid) || 0, t);
  const hasLeft = t > p;
  const fullyPaid = t > 0 && p >= t;
  return {
    hasPendingQuote: false,
    hasOwed: hasLeft,
    hasPaidConfirmed: fullyPaid,
  };
}

/**
 * Patient counts from invoices (same classification rules as {@link computeInvoiceTotals}).
 */
export function computePatientTotals(invoices: InvoiceDto[]): PatientTotalsDto {
  const byCase = new Map<string, CaseAgg>();

  for (const inv of invoices) {
    const key = invoiceCaseDedupKey(inv);
    const c = classifyInvoice(inv);
    const prev = byCase.get(key) ?? {
      hasPendingQuote: false,
      hasOwed: false,
      hasPaidConfirmed: false,
    };
    byCase.set(key, {
      hasPendingQuote: prev.hasPendingQuote || c.hasPendingQuote,
      hasOwed: prev.hasOwed || c.hasOwed,
      hasPaidConfirmed: prev.hasPaidConfirmed || c.hasPaidConfirmed,
    });
  }

  let owedCount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let exclusiveOwed = 0;
  let exclusivePaid = 0;
  let exclusivePending = 0;

  for (const agg of byCase.values()) {
    if (agg.hasOwed) owedCount += 1;
    if (agg.hasPaidConfirmed) paidCount += 1;
    if (agg.hasPendingQuote) pendingCount += 1;

    if (agg.hasOwed) exclusiveOwed += 1;
    else if (agg.hasPaidConfirmed) exclusivePaid += 1;
    else if (agg.hasPendingQuote) exclusivePending += 1;
  }

  const exclusiveTotal = exclusiveOwed + exclusivePaid + exclusivePending;

  return {
    owedCount,
    paidCount,
    pendingCount,
    exclusiveOwed,
    exclusivePaid,
    exclusivePending,
    exclusiveTotal,
  };
}
