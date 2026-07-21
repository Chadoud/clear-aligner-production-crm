/**
 * Invoice Formatters Utility
 *
 * Centralized formatting functions and constants for invoice display.
 * @module utils/invoices/invoiceFormatters
 */

import { formatDateDDMMYYYY, formatTodayDDMMYYYY } from "../dates/dateUtils.js";
import { getActiveUiLocale } from "./documentTitles.js";
import { getInvoicePdfLabels } from "./invoicePdfLabels.js";
import { parseInvoiceDateToLocalDate } from "./invoiceMonthKey.js";

const STEP = 0.05;

export const roundToNearest5Cents = (value) => {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) / STEP) * STEP;
};

/**
 * Stable string for CHF amount inputs (no float noise like 499.99999999999998).
 */
export function formatChfInputString(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const r = roundToNearest5Cents(n);
  return String(Number(r.toFixed(2)));
}

export const formatCHF = (value, options = {}) => {
  const { decimals = 2 } = options;
  if (value == null || Number.isNaN(Number(value))) {
    return decimals === 0 ? "0 CHF" : "0.00 CHF";
  }
  const rounded = roundToNearest5Cents(value);
  return (
    rounded.toLocaleString("de-CH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " CHF"
  );
};

/**
 * Format a date value as DD/MM/YYYY (day/month/year).
 * Parses DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, and ISO timestamps.
 */
export function formatDateEnGB(dateStr) {
  if (!dateStr) return formatTodayDDMMYYYY();
  try {
    const str = typeof dateStr === "string" ? dateStr.trim() : String(dateStr);
    if (/^0000-00-00/.test(str) || str === "0000-00-00") return "—";
    const d = parseInvoiceDateToLocalDate(str);
    if (!d) return "—";
    return formatDateDDMMYYYY(d) || "—";
  } catch {
    return "—";
  }
}

/**
 * Invoice table date: DD/MM/YYYY, or em dash when empty.
 */
export function formatInvoiceDateForDisplay(dateStr) {
  if (dateStr == null || String(dateStr).trim() === "") return "—";
  return formatDateEnGB(dateStr);
}

const EN_LABELS = getInvoicePdfLabels("en");

/** @deprecated Prefer getInvoicePdfLabels(locale) */
export const INVOICE_TEXTS = {
  DATE_PREFIX: EN_LABELS.datePrefix,
  DATE_AND_PLACE_PREFIX: EN_LABELS.dateAndPlacePrefix,
  PLACE_GENEVA: EN_LABELS.placeGeneva,
  SIGNATURE_LABEL: EN_LABELS.signature,
};

/**
 * Get the date text for the FROM section (invoice generation date).
 * @param {string} [generatedDate] - Invoice generation date (dd/mm/yyyy). Falls back to today if not provided.
 * @param {string} [locale]
 * @returns {string} e.g. "Date: 08/03/2026"
 */
export const getFromSectionDateText = (generatedDate, locale) => {
  const labels = getInvoicePdfLabels(locale ?? getActiveUiLocale());
  const dateStr =
    generatedDate && String(generatedDate).trim()
      ? formatDateEnGB(generatedDate)
      : formatTodayDDMMYYYY();
  return `${labels.datePrefix} ${dateStr}`;
};

/**
 * @param {boolean} [isArrangement]
 * @param {string} [locale]
 */
export const getSignatureDateText = (isArrangement = false, locale) => {
  const labels = getInvoicePdfLabels(locale ?? getActiveUiLocale());
  if (isArrangement) {
    return labels.dateAndPlacePrefix;
  }
  return `${labels.dateAndPlacePrefix} ${labels.placeGeneva}`;
};
