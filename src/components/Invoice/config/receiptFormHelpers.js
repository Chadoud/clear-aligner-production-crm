/**
 * Shared helpers for receipt form (payment date options, format).
 * Used by InvoiceModal and ReceiptGenerationModal.
 */

import { formatDateEnGB } from "@/utils/invoices/index.js";
import { computeDownPayment } from "@/utils/invoices/paymentPlan.js";
import {
  ENGLISH_FULL_MONTH_NAMES,
  formatMonthYearEnFull,
} from "@/utils/dates/englishFullMonthNames";

export const MONTH_NAMES = ENGLISH_FULL_MONTH_NAMES;

export function dueDateToValue(dueDateStr) {
  if (!dueDateStr) return null;
  const parts = String(dueDateStr).split("/");
  if (parts.length !== 3) return null;
  const [, month, year] = parts;
  const m = month.padStart(2, "0");
  const y = year.trim();
  return `${y}-${m}-01`;
}

export function buildPaymentDateOptions(invoice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const amountPaid = Number(invoice?.amountPaid) || 0;

  if (rows.length > 0 && monthlyAmount > 0) {
    const totalPrice = Number(invoice?.totalPrice) || 0;
    const downPayment = computeDownPayment(totalPrice, rows, monthlyAmount);
    const instalmentsPaid = Math.max(0, amountPaid - downPayment);
    const paidMonthsCount = Math.min(
      rows.length,
      Math.floor(instalmentsPaid / monthlyAmount + 0.001)
    );
    const unpaidRows = rows.slice(paidMonthsCount);
    return unpaidRows.map((row) => {
      const value =
        dueDateToValue(row.dueDate) || `${new Date().getFullYear()}-01-01`;
      return { value, label: row.monthLabel };
    });
  }

  const now = new Date();
  const options = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      label: formatMonthYearEnFull(d),
    });
  }
  return options;
}

/**
 * Build payment date options for receipt generation: only months that have been paid.
 * Used when generating receipts for arrangement invoices — the dropdown shows only paid months.
 * When down payment exists but no instalments paid yet, returns a single "Down payment" option.
 * @returns {{ value: string, label: string, amount: number }[]}
 */
export function buildPaidMonthsPaymentDateOptions(invoice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const amountPaid = Number(invoice?.amountPaid) || 0;
  const totalPrice = Number(invoice?.totalPrice) || 0;

  if (rows.length === 0 || monthlyAmount <= 0) return [];

  const downPayment = computeDownPayment(totalPrice, rows, monthlyAmount);
  const instalmentsPaid = Math.max(0, amountPaid - downPayment);
  const paidMonthsCount = Math.min(
    rows.length,
    Math.floor(instalmentsPaid / monthlyAmount + 0.001)
  );

  // Down payment only (no instalment months paid yet)
  if (paidMonthsCount === 0 && amountPaid > 0) {
    const today = new Date();
    const value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return [{ value, label: "Down payment", amount: amountPaid }];
  }

  const paidRows = rows.slice(0, paidMonthsCount);
  return paidRows.map((row) => {
    const value =
      dueDateToValue(row.dueDate) || `${new Date().getFullYear()}-01-01`;
    return {
      value,
      label: row.monthLabel,
      amount: Number(row.amount) || monthlyAmount,
    };
  });
}

/**
 * Build payment date options as past months only (for choosing which month the receipt is for).
 * @param {number} [monthCount=24] - Number of past months to include (from current month going back).
 * @returns {{ value: string, label: string }[]}
 */
export function buildPastPaymentDateOptions(monthCount = 24) {
  const now = new Date();
  const options = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const label = formatMonthYearEnFull(d);
    options.push({ value, label });
  }
  return options;
}

export function getFormattedDate(dateStr) {
  return formatDateEnGB(dateStr);
}

export function getPaymentDateLabel(paymentDate) {
  try {
    const [y, m, d] = (paymentDate || "").split("-");
    const monthNum = parseInt(m, 10);
    if (y && monthNum >= 1 && monthNum <= 12) {
      const dayNum = parseInt(d, 10);
      if (dayNum >= 1 && dayNum <= 31) {
        return `${dayNum} ${MONTH_NAMES[monthNum - 1]} ${y}`;
      }
      return `${MONTH_NAMES[monthNum - 1]} ${y}`;
    }
  } catch {
    // ignore
  }
  return "Select date";
}
