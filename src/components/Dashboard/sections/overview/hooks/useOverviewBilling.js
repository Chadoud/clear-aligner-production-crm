/**
 * Doctor billing table — row building, sort and expand only.
 * All invoice-level filtering (month, cabinet, status, search, amount) is
 * applied upstream in useOverviewInvoices; this hook receives pre-filtered
 * `scopedInvoices` and turns them into cabinet rows.
 */
import { useMemo, useCallback, useState, useEffect } from "react";
import { getInvoiceClient, isQuoteInvoice } from "@/utils/index.js";
import { getPatientForInvoiceRef } from "@/services/patientDataService";
import { buildBillingLineItem } from "@/utils/invoices/billingLineItem.js";
import { partitionQuoteInvoices } from "@/utils/invoices/billingInvoiceBuckets.js";
import {
  formatPanelDateMonthYear,
  getCabinetForInvoice,
  paymentOverviewComparableDate,
} from "../config/overviewHelpers";
import {
  getEffectiveCabinetNames,
  getCabinetDropdownOptionNames,
} from "../config/overviewCabinetFilterOptions";

function getPatientForInvoice(inv) {
  return getPatientForInvoiceRef(getInvoiceClient(inv)?.ref, inv.case_id);
}

function countUniqueCaseRefsForLineItems(lineItems, predicate) {
  const s = new Set();
  lineItems.forEach((item) => {
    const ref = String(item.caseRef ?? "").trim();
    if (!ref) return;
    if (predicate(item)) s.add(ref);
  });
  return s.size;
}

export function useOverviewBilling({
  invoices, // full unfiltered list — for cabinet options + getBillingState lookup
  scopedInvoices, // pre-filtered by all top-bar filters — drives row totals
  cabinetNamesForOverviewTable,
  /** When `"patients"`, sort numeric columns by patient counts instead of CHF. */
  dataMode = "invoices",
}) {
  const [expandedBillingRowIndices, setExpandedBillingRowIndices] = useState(
    new Set()
  );
  const [billingSort, setBillingSort] = useState({
    sortBy: "doctorName",
    sortOrder: "asc",
  });

  /** Cabinet names: API list + any extra found in all invoices (table row order). */
  const effectiveCabinetNames = useMemo(
    () => getEffectiveCabinetNames(invoices, cabinetNamesForOverviewTable),
    [invoices, cabinetNamesForOverviewTable]
  );

  /** Doctor/Cabinet multi-select — real names only (no synthetic "Unassigned"). */
  const cabinetOptionsForFilter = useMemo(
    () => getCabinetDropdownOptionNames(invoices, cabinetNamesForOverviewTable),
    [invoices, cabinetNamesForOverviewTable]
  );

  /**
   * Cabinet rows — built from the pre-filtered `scopedInvoices` so totals and
   * sub-rows always match whatever filters are active in the top bar.
   */
  const doctorBillingRows = useMemo(() => {
    const UNASSIGNED_KEY = "\0Unassigned";
    const cabinetNames = [...effectiveCabinetNames, UNASSIGNED_KEY];

    return cabinetNames.map((doctorName) => {
      const isUnassigned = doctorName === UNASSIGNED_KEY;
      const cabinetInvoices = scopedInvoices.filter((inv) => {
        const cab = getCabinetForInvoice(inv);
        return isUnassigned ? !cab : cab === doctorName;
      });

      const confirmedInvoices = cabinetInvoices.filter(
        (inv) => !isQuoteInvoice(inv)
      );
      const quoteInvoices = cabinetInvoices.filter((inv) =>
        isQuoteInvoice(inv)
      );
      const { acceptedQuoteInvoices, pendingQuoteInvoices } =
        partitionQuoteInvoices(quoteInvoices, getPatientForInvoice);

      let owed = 0;
      let paid = 0;
      /** Latest invoice/quote date in this cabinet (from `generatedDate`, not patient `entered`). */
      let latestInvoiceDate = null;
      const lineItems = [];
      const pendingLineItems = [];

      const pushLine = (
        invList,
        { isQuote, addToOwed, targetList, isPendingQuote = false }
      ) => {
        invList.forEach((inv) => {
          const client = getInvoiceClient(inv);
          const patient = getPatientForInvoice(inv);
          const total = Number(inv.totalPrice) || 0;
          const amountPaid = Number(inv.amountPaid) || 0;
          if (!isQuote) {
            paid += amountPaid;
            owed += Math.max(0, total - amountPaid);
          } else if (addToOwed) {
            owed += total;
          }
          const d = paymentOverviewComparableDate(inv, patient);
          if (d && (!latestInvoiceDate || d > latestInvoiceDate))
            latestInvoiceDate = d;
          targetList.push(
            buildBillingLineItem(inv, patient, client, {
              isQuote,
              isPendingQuote,
            })
          );
        });
      };

      pushLine(confirmedInvoices, {
        isQuote: false,
        addToOwed: false,
        targetList: lineItems,
      });
      pushLine(acceptedQuoteInvoices, {
        isQuote: true,
        addToOwed: true,
        targetList: lineItems,
      });
      pushLine(pendingQuoteInvoices, {
        isQuote: true,
        addToOwed: false,
        targetList: pendingLineItems,
        isPendingQuote: true,
      });

      const latestInvoiceDateDisplay = latestInvoiceDate
        ? formatPanelDateMonthYear(
            `${latestInvoiceDate.getDate()}/${latestInvoiceDate.getMonth() + 1}/${latestInvoiceDate.getFullYear()}`
          )
        : "—";

      const pending = pendingQuoteInvoices.reduce(
        (sum, inv) => sum + (Number(inv.totalPrice) || 0),
        0
      );

      const owedCount = countUniqueCaseRefsForLineItems(
        lineItems,
        (item) => Number(item.amount) > Number(item.amountPaid)
      );
      const paidCount = countUniqueCaseRefsForLineItems(lineItems, (item) => {
        const t = Number(item.amount) || 0;
        const p = Number(item.amountPaid) || 0;
        return t > 0 && p >= t;
      });
      const pendingCount = countUniqueCaseRefsForLineItems(
        pendingLineItems,
        () => true
      );

      return {
        doctorName: isUnassigned ? "Unassigned" : doctorName,
        owed,
        paid,
        pending,
        owedCount,
        paidCount,
        pendingCount,
        lineItems,
        pendingLineItems,
        latestInvoiceDateDisplay,
      };
    });
  }, [scopedInvoices, effectiveCabinetNames]);

  /** getBillingState uses full `invoices` to resolve state regardless of active filters. */
  const getBillingState = useCallback(
    (_doctorName, caseRef, _patient, item) => {
      if (item?.amount != null && item?.amountPaid != null) {
        if (item?.isPendingQuote) return "Pending";
        const total = Number(item.amount) || 0;
        const amountPaid = Number(item.amountPaid) || 0;
        if (total > 0 && amountPaid >= total) return "Paid";
        if (amountPaid > 0) return "Partially paid";
        return "Left to pay";
      }
      const refStr = String(caseRef || "").trim();
      const inv = invoices.find((i) => {
        const r = getInvoiceClient(i)?.ref;
        return r != null && String(r).trim() === refStr;
      });
      if (!inv) return "—";
      if (isQuoteInvoice(inv)) return "Pending";
      const total = Number(inv.totalPrice) || 0;
      const amountPaid = Number(inv.amountPaid) || 0;
      if (total > 0 && amountPaid >= total) return "Paid";
      if (amountPaid > 0) return "Partially paid";
      return "Left to pay";
    },
    [invoices]
  );

  const toggleBillingDoctor = useCallback((rowIndex) => {
    setExpandedBillingRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }, []);

  const handleBillingSort = useCallback((column) => {
    setBillingSort((prev) => {
      if (prev.sortBy === column) {
        return {
          ...prev,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      return { sortBy: column, sortOrder: "asc" };
    });
  }, []);

  const sortedDoctorBillingRows = useMemo(() => {
    const withIndex = doctorBillingRows.map((row, originalIndex) => ({
      row,
      originalIndex,
    }));
    const key = billingSort.sortBy;
    const order = billingSort.sortOrder === "asc" ? 1 : -1;

    const numericSortValue = (row) => {
      if (dataMode === "patients") {
        if (key === "owed") return Number(row.owedCount) || 0;
        if (key === "paid") return Number(row.paidCount) || 0;
        if (key === "pending") return Number(row.pendingCount) || 0;
      }
      if (key === "pending") return Number(row.pending ?? 0) || 0;
      return Number(row[key]) || 0;
    };

    withIndex.sort((a, b) => {
      if (key === "doctorName") {
        const va = (a.row.doctorName || "").toString().toLowerCase();
        const vb = (b.row.doctorName || "").toString().toLowerCase();
        return order * va.localeCompare(vb);
      }
      return order * (numericSortValue(a.row) - numericSortValue(b.row));
    });
    return withIndex;
  }, [doctorBillingRows, billingSort, dataMode]);

  /** Hide rows where all amounts are 0 and no sub-items — naturally pruned by pre-filtering. */
  const filteredDoctorBillingRows = useMemo(() => {
    return sortedDoctorBillingRows.filter(
      ({ row }) =>
        Number(row.owed) > 0 ||
        Number(row.paid) > 0 ||
        Number(row.pending ?? 0) > 0
    );
  }, [sortedDoctorBillingRows]);

  // Auto-expand all visible rows whenever the visible set changes.
  const expandedIndicesKey = useMemo(
    () =>
      filteredDoctorBillingRows
        .map(({ originalIndex }) => originalIndex)
        .sort((a, b) => a - b)
        .join(","),
    [filteredDoctorBillingRows]
  );

  useEffect(() => {
    setExpandedBillingRowIndices(
      new Set(
        filteredDoctorBillingRows.map(({ originalIndex }) => originalIndex)
      )
    );
    // expandedIndicesKey is a stable primitive that prevents the infinite loop
    // that would occur if filteredDoctorBillingRows were listed directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedIndicesKey]);

  return {
    getBillingState,
    filteredDoctorBillingRows,
    expandedBillingRowIndices,
    toggleBillingDoctor,
    billingSort,
    handleBillingSort,
    cabinetOptionsForFilter,
  };
}
