/**
 * Doctors billing: month labels and display helpers.
 */

import { ENGLISH_SHORT_MONTH_NAMES } from "@/utils/dates/englishShortMonthNames";
import { parseInvoiceDateToLocalDate } from "@/utils/invoices/invoiceMonthKey.js";

export const MONTH_LABELS = ENGLISH_SHORT_MONTH_NAMES;

/**
 * Format "YYYY-MM" as "Mon YYYY" for month select options.
 */
export function formatMonthOption(ym) {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split("-");
  const monthNum = parseInt(m, 10);
  const monthName = MONTH_LABELS[monthNum - 1] ?? m;
  return `${monthName} ${y}`;
}

/**
 * Build month options for the billing month select (All + past 24 months).
 */
export function buildMonthOptions() {
  const options = [{ value: "all", label: "All" }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: ym, label: formatMonthOption(ym) });
  }
  return options;
}

function formatDdMmYyyy(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Min–max invoice dates from bill line items (email "New bill for …").
 * @param {Array<{ invoiceDate?: string }>} lineItems
 * @returns {string | null}
 */
export function getBillingPeriodLabelFromLineItems(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return null;
  const dates = [];
  for (const row of lineItems) {
    const d = parseInvoiceDateToLocalDate(row?.invoiceDate);
    if (d) dates.push(d);
  }
  if (dates.length === 0) return null;
  let min = dates[0];
  let max = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const t = dates[i].getTime();
    if (t < min.getTime()) min = dates[i];
    if (t > max.getTime()) max = dates[i];
  }
  const a = formatDdMmYyyy(min);
  const b = formatDdMmYyyy(max);
  if (a === b) return a;
  return `${a} – ${b}`;
}

/**
 * Label for doctor-bill period (email subject/header), aligned with billing filters.
 * When `lineItems` are provided, uses earliest–latest invoice date in the bill
 * (so "All" filter does not show "All periods" in the email).
 * @param {string} selectedMonth
 * @param {{ from: string, to: string } | null} dateRange
 * @param {string} dateFrom
 * @param {string} dateTo
 * @param {Array<{ invoiceDate?: string }> | undefined} [lineItems]
 */
export function getBillingPeriodLabel(
  selectedMonth,
  dateRange,
  dateFrom,
  dateTo,
  lineItems
) {
  const fromItems = getBillingPeriodLabelFromLineItems(lineItems);
  if (fromItems) return fromItems;

  if (selectedMonth === "all") return "All periods";
  if (selectedMonth === "daterange") {
    const from = dateRange?.from ?? dateFrom;
    const to = dateRange?.to ?? dateTo;
    if (from && to) return `${from} – ${to}`;
    return "Date range";
  }
  return formatMonthOption(selectedMonth);
}
