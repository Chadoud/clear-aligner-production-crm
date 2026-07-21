/**
 * Invoice Data Utilities
 *
 * Utilities for preparing invoice data from form state.
 *
 * @module utils/invoices/invoiceData
 */

import {
  calculateServicesSumExcludingLab,
  calculateLabPrice,
} from "../calculations/priceCalculations.js";
import { formatMonthYearEnFull } from "../dates/englishFullMonthNames";

/**
 * Normalized accessor for invoice client (supports legacy clientInfo).
 * @param {Object} invoice - Invoice object
 * @returns {Object} Client object (name, ref, born, address, email, phone, etc.)
 */
export const getInvoiceClient = (invoice) => {
  if (!invoice) return {};
  return invoice.client ?? invoice.clientInfo ?? {};
};

/**
 * Get trimmed client ref, or null if empty/missing.
 * @param {Object} client - Client object
 * @returns {string|null}
 */
export const getClientRef = (client) => {
  const ref = client?.ref;
  if (ref == null) return null;
  const s = String(ref).trim();
  return s === "" ? null : s;
};

const roundCurrency = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Build monthly payment plan rows (instalments only; down payment is separate amountPaid).
 * @param {number} totalPrice - Total treatment price
 * @param {number} amountPaid - Down payment / amount already paid (CHF)
 * @param {number} numberOfMonths - Number of monthly instalments
 * @returns {{ rows: Array<{ monthLabel: string, dueDate: string, amount: number }>, numberOfMonthlyPayments: number, monthlyPaymentAmount: number }}
 */
/** True when the invoice/quote includes a monthly payment arrangement table. */
export function hasMonthlyArrangementPlan(invoice) {
  return (
    Array.isArray(invoice?.monthlyPaymentPlanRows) &&
    invoice.monthlyPaymentPlanRows.length > 0
  );
}

export function buildMonthlyPaymentPlanRows(
  totalPrice,
  amountPaid,
  numberOfMonths
) {
  const total = roundCurrency(totalPrice);
  const paid = Math.max(0, roundCurrency(Number(amountPaid) || 0));
  const remaining = Math.max(0, total - paid);
  const numMonths = Math.max(1, Math.floor(Number(numberOfMonths) || 1));
  if (remaining <= 0 || numMonths <= 0) {
    return { rows: [], numberOfMonthlyPayments: 0, monthlyPaymentAmount: 0 };
  }
  const amount = roundCurrency(remaining / numMonths);
  const lastMonthAmount = Math.max(
    0,
    roundCurrency(remaining - amount * (numMonths - 1))
  );
  const rows = [];
  const now = new Date();
  for (let i = 0; i < numMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const monthLabel = formatMonthYearEnFull(d);
    const dueDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const rowAmount = i < numMonths - 1 ? amount : lastMonthAmount;
    rows.push({ monthLabel, dueDate, amount: rowAmount });
  }
  return {
    rows,
    numberOfMonthlyPayments: rows.length,
    monthlyPaymentAmount: amount,
  };
}

/**
 * Lab treatment invoices require an explicit duration (months).
 * @returns {string|null} Error message or null if valid
 */
export function validateLabTreatmentDuration({
  brand,
  showTreatmentDuration,
  treatmentDuration,
}) {
  if (brand !== "Lab") return null;
  if (showTreatmentDuration === false) return null;
  const dur = parseInt(String(treatmentDuration ?? ""), 10);
  if (!Number.isFinite(dur) || dur < 1 || dur > 36) {
    return "Treatment duration (1–36 months) is required for Lab treatment invoices.";
  }
  return null;
}

/**
 * Prepare invoice data from form state
 */
export const prepareInvoiceData = ({
  clientInfo,
  brand,
  showFreeServices,
  treatmentDuration,
  treatmentSteps,
  totalPrice,
  selectedServices,
  getServiceByCode,
  isQuote = true, // Maps to invoiceStatus: 1 (quote) or 2 (in_fabrication)
  monthlyPaymentEnabled = false,
  amountPaid = 0,
  numberOfMonthsForPayment = 0,
  vatRate = 0,
}) => {
  const finalTotalPrice = parseFloat(totalPrice) || 0;
  const effectiveVatRate = Number(vatRate) || 0;
  const allServicesExceptLabSum =
    calculateServicesSumExcludingLab(selectedServices);
  const hasLabService = selectedServices.some((s) => s.code === "0.1");
  const labPrice = hasLabService
    ? calculateLabPrice(finalTotalPrice, selectedServices, effectiveVatRate)
    : 0;
  const paid = Math.max(0, roundCurrency(Number(amountPaid) || 0));
  const remainingBalanceDue = roundCurrency(
    Math.max(0, finalTotalPrice - paid)
  );

  const numMonths = Math.max(
    1,
    Math.floor(Number(numberOfMonthsForPayment) || 1)
  );
  const downPaymentForPlan =
    monthlyPaymentEnabled && brand === "Direct" ? paid : 0;
  const { rows: planRows, monthlyPaymentAmount: planAmount } =
    monthlyPaymentEnabled && brand === "Direct" && numMonths > 0
      ? buildMonthlyPaymentPlanRows(
          finalTotalPrice,
          downPaymentForPlan,
          numMonths
        )
      : { rows: [], numberOfMonthlyPayments: 0, monthlyPaymentAmount: 0 };

  const trimmedSteps =
    treatmentSteps === "" || treatmentSteps == null
      ? ""
      : String(treatmentSteps).trim();
  const treatmentStepsOut = trimmedSteps === "" ? undefined : trimmedSteps;

  return {
    client: clientInfo,
    doctorInfo: null, // Resolved from cabinet_id when rendering; no longer stored
    brand,
    showFreeServices,
    treatmentDuration,
    ...(treatmentStepsOut !== undefined
      ? { treatmentSteps: treatmentStepsOut }
      : {}),
    totalPrice: finalTotalPrice,
    // Card toggle: on when form had it on during creation
    monthlyPaymentEnabled:
      monthlyPaymentEnabled && brand === "Direct" && planRows.length > 0,
    // Down payment only accounted when user clicks the badge on the invoice card
    amountPaid: planRows.length > 0 ? 0 : paid,
    remainingBalanceDue,
    numberOfMonthlyPayments: planRows.length,
    monthlyPaymentAmount: planAmount,
    monthlyPaymentPlanRows: planRows,
    services: selectedServices.map((s) => {
      let vpt = s.vpt;
      let points = parseFloat(s.points);
      let point_value = s.point_value ?? 1;
      if (getServiceByCode) {
        const catalog = getServiceByCode(s.code);
        if (catalog) {
          if (vpt == null) vpt = catalog.vpt;
          if (points == null || Number.isNaN(points) || points === 0)
            points = parseFloat(catalog.points);
          if (point_value == null) point_value = catalog.point_value ?? 1;
        }
      }
      return {
        code: s.code,
        service: s.service,
        vpt: vpt,
        points: Number.isFinite(points) ? points : 0,
        point_value: Number.isFinite(point_value) ? point_value : 1,
        quantity: s.quantity,
      };
    }),
    labPrice,
    labPricesSum: allServicesExceptLabSum,
    invoiceStatus: isQuote ? 1 : 2,
    isQuote,
    ...(effectiveVatRate > 0 ? { vatRate: effectiveVatRate } : {}),
  };
};
