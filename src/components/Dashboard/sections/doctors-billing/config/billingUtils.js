/**
 * Billing utility functions for the Doctors Billing page.
 * Groups invoice line items by doctor/cabinet and filters by month or date range.
 * Only invoices with quote toggle OFF (confirmed, not quotes) are included.
 * Direct cabinet is excluded from doctor billing.
 */

function isDirectCabinet(name) {
  return String(name ?? "")
    .toLowerCase()
    .includes("direct");
}
import {
  getInvoiceClient,
  getClientRef,
  getInvoiceRef,
  isQuoteInvoice,
} from "@/utils/invoices/index.js";
import { invoiceDateToMonthKey } from "@/utils/invoices/invoiceMonthKey.js";
import { getRawPatientByRef } from "@/services/patientDataService";
import { getCabinetForInvoice } from "@/components/Dashboard/sections/overview/config/overviewHelpers";

/**
 * Check whether an invoice date falls within a month or date range.
 * @param {string} invoiceDate - Raw date string from invoice
 * @param {string} selectedMonth - "all" | "YYYY-MM" | "daterange"
 * @param {{ from: string, to: string }|null} dateRange
 */
function matchesFilter(invoiceDate, selectedMonth, dateRange) {
  if (selectedMonth === "all") return true;
  if (selectedMonth === "daterange") {
    if (!dateRange?.from || !dateRange?.to || !invoiceDate) return false;
    const ym = invoiceDateToMonthKey(invoiceDate);
    if (!ym) return false;
    return ym >= dateRange.from.slice(0, 7) && ym <= dateRange.to.slice(0, 7);
  }
  return invoiceDateToMonthKey(invoiceDate) === selectedMonth;
}

/**
 * Build billing groups from invoices, filtered by payment and generation states.
 * @param {string} selectedMonth
 * @param {Array<Object>} invoices - Invoice array (from useInvoiceData().allInvoices)
 * @param {{ from: string, to: string }|null} dateRange
 * @param {"unpaid"|"paid"|"all"} paymentState
 * @param {"generated"|"not_generated"|"all"} generationState
 * @returns {Array<{ doctorName: string, lineItems: Array, totalAmount: number }>}
 */
function buildBillingGroups(
  selectedMonth,
  invoices,
  dateRange,
  paymentState,
  generationState = "all"
) {
  if (!Array.isArray(invoices)) return [];

  const groups = new Map(); // doctorName → { lineItems, totalAmount }

  for (const inv of invoices) {
    if (isQuoteInvoice(inv)) continue;

    const invoiceDate = inv.generatedDate ?? "";
    if (!matchesFilter(invoiceDate, selectedMonth, dateRange)) continue;

    const total = Number(inv.totalPrice) || 0;
    const paid = Math.min(Number(inv.amountPaid) || 0, total);
    const isPaid = total > 0 && paid >= total;
    const isGenerated =
      String(inv.doctorBillGeneratedAt ?? "").trim().length > 0;

    if (paymentState === "paid" && !isPaid) continue;
    if (paymentState === "unpaid" && isPaid) continue;
    if (generationState === "generated" && !isGenerated) continue;
    if (generationState === "not_generated" && isGenerated) continue;

    const client = getInvoiceClient(inv);
    const ref = getClientRef(client) ?? "";
    const patient = ref ? getRawPatientByRef(ref) : null;

    const cab = getCabinetForInvoice(inv);
    const doctorName =
      cab && String(cab).trim() ? String(cab).trim() : "Unassigned";
    if (isDirectCabinet(doctorName)) continue;

    const patientName = patient?.name ?? client?.name ?? "Unknown";
    const entered = patient?.entered ?? "";
    const billingStatus = isPaid ? "paid" : isGenerated ? "billed" : "to_bill";

    if (!groups.has(doctorName)) {
      groups.set(doctorName, { doctorName, lineItems: [], totalAmount: 0 });
    }
    const group = groups.get(doctorName);
    group.lineItems.push({
      caseRef: ref,
      invoiceRef: getInvoiceRef(inv),
      invoiceId: inv.id,
      patientName,
      entered,
      invoiceDate,
      amount: total,
      doctorBillGeneratedAt: inv.doctorBillGeneratedAt ?? null,
      paidDate: inv.paidDate ?? null,
      billingStatus,
    });
    group.totalAmount += total;
  }

  return [...groups.values()].sort((a, b) =>
    a.doctorName.localeCompare(b.doctorName)
  );
}

/**
 * Get doctors with unbilled (unpaid invoice) patients for the given period.
 */
export function getDoctorBillingByMonth(
  selectedMonth,
  invoices,
  dateRange = null
) {
  return buildBillingGroups(
    selectedMonth,
    invoices,
    dateRange,
    "unpaid",
    "not_generated"
  );
}

/**
 * Get doctors with billed-but-unpaid patients for the given period.
 */
export function getDoctorBilledByMonth(
  selectedMonth,
  invoices,
  dateRange = null
) {
  return buildBillingGroups(
    selectedMonth,
    invoices,
    dateRange,
    "unpaid",
    "generated"
  );
}

/**
 * Get doctors with paid patients for the given period.
 */
export function getDoctorPaidByMonth(
  selectedMonth,
  invoices,
  dateRange = null
) {
  return buildBillingGroups(
    selectedMonth,
    invoices,
    dateRange,
    "paid",
    "generated"
  );
}

const BILLING_STATUS_SORT = { to_bill: 0, billed: 1, paid: 2 };

/**
 * Merge doctor groups by name (line items are disjoint across to-bill / billed / paid buckets).
 * @param {Array<Array<{ doctorName: string, lineItems: unknown[], totalAmount: number }>>} groupLists
 */
function mergeBillingGroupsByDoctor(groupLists) {
  const map = new Map();
  for (const groups of groupLists) {
    for (const g of groups ?? []) {
      const name = g.doctorName;
      if (!map.has(name)) {
        map.set(name, {
          doctorName: name,
          lineItems: [],
          totalAmount: 0,
        });
      }
      const acc = map.get(name);
      for (const item of g.lineItems ?? []) {
        acc.lineItems.push(item);
      }
      acc.totalAmount += Number(g.totalAmount) || 0;
    }
  }
  for (const g of map.values()) {
    g.lineItems.sort((a, b) => {
      const sa = BILLING_STATUS_SORT[a?.billingStatus] ?? 9;
      const sb = BILLING_STATUS_SORT[b?.billingStatus] ?? 9;
      if (sa !== sb) return sa - sb;
      return String(a?.patientName ?? "").localeCompare(
        String(b?.patientName ?? "")
      );
    });
  }
  return [...map.values()].sort((a, b) =>
    a.doctorName.localeCompare(b.doctorName)
  );
}

/**
 * Doctors with any billing-relevant invoices in the period: to bill, billed, or paid.
 */
export function getDoctorBillingAllByMonth(
  selectedMonth,
  invoices,
  dateRange = null
) {
  return mergeBillingGroupsByDoctor([
    getDoctorBillingByMonth(selectedMonth, invoices, dateRange),
    getDoctorBilledByMonth(selectedMonth, invoices, dateRange),
    getDoctorPaidByMonth(selectedMonth, invoices, dateRange),
  ]);
}
