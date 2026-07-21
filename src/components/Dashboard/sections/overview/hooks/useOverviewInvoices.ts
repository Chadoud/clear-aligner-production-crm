/**
 * Invoice data and totals for Overview dashboard.
 * Single source of truth: all top-bar filters (month, cabinet, status, search,
 * amount) are applied here so every consumer — cards, donut, payment table —
 * stays automatically in sync.
 */
import { useMemo } from "react";
import { filterInvoicesByVisiblePatients } from "@/services/invoiceDataService";
import {
  parseInvoiceDateToMonth,
  parseInvoiceDateToISO,
  computeInvoiceTotals,
  getCabinetForInvoice,
} from "../config/overviewHelpers";
import { getCabinetDropdownOptionNames } from "../config/overviewCabinetFilterOptions";
import { enteredToMonthKey } from "@/utils/index.js";
import { isQuoteInvoice } from "@/utils/invoices/quoteHelpers.js";
import { getInvoiceClient } from "@/utils/invoices/index.js";
import { getPatientForInvoiceRef } from "@/services/patientDataService";
import { caseStatusToUiId, CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";
import type { InvoiceDto } from "@/types/invoice";

type StatusFilter = {
  leftToPay: boolean;
  paid: boolean;
  pending: boolean;
};

type UseOverviewInvoicesInput = {
  allInvoices: InvoiceDto[];
  scope: "doctor" | "company";
  patients: Array<{ entered?: string | null }>;
  /** Company: cabinet names from API (order) — used to build filter option list + “all selected” logic. */
  cabinetNamesForOverviewTable?: string[];
  /** Controlled from index.jsx — all filter values below. */
  selectedMonth?: string; // "all" | "YYYY-MM" | "daterange"
  dateFrom?: string; // "YYYY-MM-DD" — used only when selectedMonth === "daterange"
  dateTo?: string; // "YYYY-MM-DD" — used only when selectedMonth === "daterange"
  cabinetFilter?: Set<string> | null;
  statusFilter?: StatusFilter;
  amountMin?: string | number;
  amountMax?: string | number;
  /** Case status filter: map of uiStatusId → visible. null / all-true = no filter. */
  caseStatusFilter?: Record<string, boolean> | null;
};

export function useOverviewInvoices({
  allInvoices,
  scope,
  patients,
  cabinetNamesForOverviewTable = [],
  selectedMonth = "all",
  dateFrom = "",
  dateTo = "",
  cabinetFilter = null,
  statusFilter,
  amountMin = "",
  amountMax = "",
  caseStatusFilter = null,
}: UseOverviewInvoicesInput) {
  /** Scope-gate: doctors only see their own patients' invoices. */
  const invoices = useMemo(() => {
    if (scope === "doctor") {
      return filterInvoicesByVisiblePatients(
        allInvoices,
        patients
      ) as InvoiceDto[];
    }
    return allInvoices;
  }, [allInvoices, scope, patients]);

  /** Same strings as the Doctor/Cabinet dropdown (no "Unassigned"). */
  const cabinetDropdownOptionNames = useMemo(
    () =>
      scope === "company"
        ? getCabinetDropdownOptionNames(invoices, cabinetNamesForOverviewTable)
        : [],
    [invoices, cabinetNamesForOverviewTable, scope]
  );

  /** Month options: last 24 months + any month in data. */
  const invoiceMonthOptions = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }
    invoices.forEach((inv: InvoiceDto) => {
      const m = parseInvoiceDateToMonth(inv.generatedDate ?? null);
      if (m) months.add(m);
    });
    patients.forEach((p) => {
      const m = enteredToMonthKey(p.entered ?? "");
      if (m) months.add(m);
    });
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [invoices, patients]);

  /**
   * Fully-filtered invoice set.
   * All filter dimensions applied here so every dashboard consumer
   * (cards, donut, payment table rows) uses an identical view of the data.
   */
  const scopedInvoices = useMemo(() => {
    const minVal = Number(amountMin);
    const maxVal = Number(amountMax);
    const sf = statusFilter;
    const allStatusActive = !sf || (sf.leftToPay && sf.paid && sf.pending);

    // Pre-compute whether case status filter is actually active.
    const allCaseStatusActive =
      !caseStatusFilter ||
      CASE_STATUS_OPTIONS.every((o) => caseStatusFilter[o.id] !== false);

    return invoices.filter((inv: InvoiceDto) => {
      // ── 1. Date filter ────────────────────────────────────────────────────
      if (selectedMonth !== "all") {
        const genDate = (inv as Record<string, unknown>).generatedDate as
          | string
          | null
          | undefined;
        if (selectedMonth === "daterange") {
          // Day-precision range — only active once both bounds are set.
          if (dateFrom || dateTo) {
            const isoDate = parseInvoiceDateToISO(genDate);
            if (!isoDate) return false;
            if (dateFrom && isoDate < dateFrom) return false;
            if (dateTo && isoDate > dateTo) return false;
          }
        } else {
          // Single month match.
          const invoiceMonth = parseInvoiceDateToMonth(genDate);
          if (invoiceMonth !== selectedMonth) return false;
        }
      }

      // ── 2. Cabinet multi-select (no "Unassigned" in UI — invoices without a
      // resolved cabinet only pass when every named dropdown option is selected.)
      if (
        scope === "company" &&
        cabinetFilter !== null &&
        cabinetFilter.size > 0
      ) {
        const cab = getCabinetForInvoice(inv);
        const allNamedOptionsSelected =
          cabinetDropdownOptionNames.length > 0 &&
          cabinetDropdownOptionNames.every((name) => cabinetFilter!.has(name));
        if (!cab) {
          if (!allNamedOptionsSelected) return false;
        } else if (!cabinetFilter.has(cab)) {
          return false;
        }
      }

      // ── 3. Payment status ──────────────────────────────────────────────────
      if (!allStatusActive && sf) {
        const isQuote = isQuoteInvoice(inv);
        if (isQuote) {
          if (!sf.pending) return false;
        } else {
          const total = Number(inv.totalPrice) || 0;
          const amtPaid = Number(inv.amountPaid) || 0;
          const isFullyPaid = total > 0 && amtPaid >= total;
          const hasOutstanding = Math.max(0, total - amtPaid) > 0;
          if (isFullyPaid && !sf.paid) return false;
          if (hasOutstanding && !sf.leftToPay) return false;
          // zero-total edge case — treat as paid
          if (!isFullyPaid && !hasOutstanding && !sf.paid) return false;
        }
      }

      // ── 4 & 5. Amount range ────────────────────────────────────────────────
      const invTotal = Number(inv.totalPrice) || 0;
      if (!Number.isNaN(minVal) && minVal > 0 && invTotal < minVal)
        return false;
      if (!Number.isNaN(maxVal) && maxVal > 0 && invTotal > maxVal)
        return false;

      // ── 6. Case status filter ──────────────────────────────────────────────
      if (!allCaseStatusActive && caseStatusFilter) {
        const client = getInvoiceClient(inv) as { ref?: string | null } | null;
        const patient = getPatientForInvoiceRef(
          client?.ref ?? null,
          (inv as { case_id?: number | null }).case_id ?? null
        ) as { case_status?: number; case_notif?: number } | null;
        if (!patient) return false;
        const uiId = caseStatusToUiId(patient.case_status);
        if (caseStatusFilter[uiId] === false) return false;
      }

      return true;
    });
  }, [
    invoices,
    selectedMonth,
    dateFrom,
    dateTo,
    cabinetFilter,
    statusFilter,
    amountMin,
    amountMax,
    scope,
    cabinetDropdownOptionNames,
    caseStatusFilter,
  ]);

  const totals = useMemo(
    () => computeInvoiceTotals(scopedInvoices),
    [scopedInvoices]
  );

  return {
    invoices,
    scopedInvoices,
    invoiceMonthOptions,
    totals,
  };
}
