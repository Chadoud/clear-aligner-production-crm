import {
  invoiceDateToMonthKey,
  parseInvoiceDateToLocalDate,
} from "@/utils/invoices/invoiceMonthKey.js";
import { ENGLISH_SHORT_MONTH_NAMES as MONTH_NAMES } from "@/utils/dates/englishShortMonthNames";

// ── Date-to-month-key parsing ─────────────────────────────────────────────────

export function parseInvoiceDateToMonth(
  dateText: string | null | undefined
): string {
  return invoiceDateToMonthKey(dateText) || "";
}

/**
 * Parse an invoice date string into ISO format "YYYY-MM-DD" for day-precision
 * range comparisons. Supports DD/MM/YYYY, YYYY-MM-DD and Date-parseable strings.
 */
export function parseInvoiceDateToISO(
  dateText: string | null | undefined
): string {
  if (!dateText) return "";
  const txt = String(dateText).trim();
  const slash = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${month}-${day}`;
  }
  const iso = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Human-readable date formatting ───────────────────────────────────────────

function formatLocalDatePanel(d: Date, withTime: boolean): string {
  const day = d.getDate();
  const monthStr = MONTH_NAMES[d.getMonth()] ?? "";
  const y = d.getFullYear();
  if (withTime) return `${day} ${monthStr} ${y} 10:27`;
  return `${day} ${monthStr} ${y}`;
}

export function formatPanelDate(
  entered: string | null | undefined,
  withTime = true
): string {
  if (!entered) return "—";
  const parts = String(entered).split("/");
  if (parts.length !== 3) {
    const parsed = parseInvoiceDateToLocalDate(entered);
    if (parsed) return formatLocalDatePanel(parsed, withTime);
    return String(entered);
  }
  const [day, month, year] = parts;
  const m = parseInt(month, 10);
  const monthStr = MONTH_NAMES[m - 1] || month;
  const y = year.length === 2 ? `20${year}` : year;
  if (withTime) return `${parseInt(day, 10)} ${monthStr} ${y} 10:27`;
  return `${parseInt(day, 10)} ${monthStr} ${y}`;
}

/** Month and year only (e.g. "Mar 2026") — for doctor/cabinet rows. */
export function formatPanelDateMonthYear(
  entered: string | null | undefined
): string {
  if (!entered) return "—";
  const parts = String(entered).split("/");
  if (parts.length !== 3) {
    const parsed = parseInvoiceDateToLocalDate(entered);
    if (parsed) {
      const monthStr = MONTH_NAMES[parsed.getMonth()] ?? "";
      return `${monthStr} ${parsed.getFullYear()}`;
    }
    return String(entered);
  }
  const [, month, year] = parts;
  const m = parseInt(month, 10);
  const monthStr = MONTH_NAMES[m - 1] || month;
  const y = year.length === 2 ? `20${year}` : year;
  return `${monthStr} ${y}`;
}
