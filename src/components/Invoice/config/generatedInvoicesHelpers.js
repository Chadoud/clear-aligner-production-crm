/**
 * Helpers for GeneratedInvoices: overview stats and per-invoice row display.
 */

import {
  getInvoiceQuoteDisplay,
  QUOTE_STATUS_EN_ATTENTE,
  QUOTE_STATUS_IN_FABRICATION,
  DELIVERED_STATUS,
} from "@/utils/invoices/quoteHelpers.js";
import { uiStatusToDbStatus } from "@/utils/cases/index.js";
import { getInvoiceRef } from "@/utils/invoices/invoiceRef.js";
import {
  formatInvoiceDateForDisplay,
  roundToNearest5Cents,
} from "@/utils/invoices/invoiceFormatters.js";
import { formatTodayDDMMYYYY } from "@/utils/dates/dateUtils.js";
import { computeDownPayment } from "@/utils/invoices/paymentPlan.js";
import {
  normalizePaymentReceivedMap,
  getScheduledAmountForDisplayIndex,
  getCreditedAmountForDisplayIndex,
} from "@/utils/invoices/paymentReceivedPlan.js";
import { getFormattedDate } from "./receiptFormHelpers.js";

export function computeOverview(invoices) {
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let pendingCount = 0;
  let totalAmount = 0;
  let totalReceived = 0;
  let totalLeftToPay = 0;
  let totalPending = 0;

  const isAcceptedQuote = (inv) => {
    const total = Number(inv.totalPrice) || 0;
    const isQuote = getInvoiceQuoteDisplay(inv);
    const paid = sanitizeAmountPaid(inv);
    const isPaid =
      inv.isPaid != null
        ? Boolean(inv.isPaid)
        : total > 0 && paid >= total - 0.01;
    return !isQuote && !isPaid && total > 0;
  };

  invoices.forEach((inv) => {
    const total = Number(inv.totalPrice) || 0;
    const isQuote = getInvoiceQuoteDisplay(inv);
    if (isQuote && !isAcceptedQuote(inv)) {
      pendingCount += 1;
      totalPending += total;
      return;
    }
    if (isAcceptedQuote(inv)) {
      const paid = sanitizeAmountPaid(inv);
      const left = Math.max(0, total - paid);
      totalAmount += total;
      totalReceived += paid;
      totalLeftToPay += left;
      unpaidCount += 1;
      return;
    }

    const paid = sanitizeAmountPaid(inv);
    const isPaid =
      inv.isPaid != null
        ? Boolean(inv.isPaid)
        : total > 0 && paid >= total - 0.01;
    const left = isPaid ? 0 : Math.max(0, total - paid);

    totalAmount += total;
    totalReceived += isPaid ? total : paid;
    totalLeftToPay += left;

    if (isPaid) paidCount += 1;
    else if (paid > 0) partialCount += 1;
    else unpaidCount += 1;
  });

  return {
    paidCount,
    partialCount,
    unpaidCount,
    pendingCount,
    totalAmount,
    totalReceived,
    totalLeftToPay,
    totalPending,
  };
}

/**
 * Filter invoices by overview category for list display.
 * @param {Array<Object>} invoices
 * @param {"leftToPay"|"paid"|"pending"|null} filter - null = show all
 * @returns {Array<Object>}
 */
export function filterInvoicesByOverviewCategory(invoices, filter) {
  if (!Array.isArray(invoices) || !filter) return invoices;
  return invoices.filter((inv) => {
    const total = Number(inv.totalPrice) || 0;
    const isQuote = getInvoiceQuoteDisplay(inv);
    const paid = sanitizeAmountPaid(inv);
    const isPaid =
      inv.isPaid != null
        ? Boolean(inv.isPaid)
        : total > 0 && paid >= total - 0.01;
    const left = isPaid ? 0 : Math.max(0, total - paid);

    if (filter === "pending") return isQuote;
    if (filter === "paid") return isPaid;
    if (filter === "leftToPay") return !isQuote && !isPaid && left > 0;
    return true;
  });
}

/** DB status for "Case study" (no invoices or back to quotation phase). */
const CASE_STUDY_DB_STATUS = uiStatusToDbStatus("case_study");

/**
 * Derives the target case_status for a patient from their invoices.
 * Delivered only when ALL invoices are paid.
 * Awaiting acceptance when ANY invoice is a quote (even if others are paid).
 * In fabrication when no quotes and not all paid.
 * When all invoices are deleted, reverts to Case study.
 * @param {Array<Object>} invoices - Patient's invoices (filtered)
 * @returns {number|null} DB case_status or null if no change needed
 */
export function getTargetStatusFromMostRecentInvoice(invoices) {
  if (!Array.isArray(invoices)) return null;
  if (invoices.length === 0 && CASE_STUDY_DB_STATUS != null) {
    return CASE_STUDY_DB_STATUS;
  }
  if (invoices.length === 0) return null;

  const allPaid = invoices.every((inv) => {
    const total = Number(inv.totalPrice) || 0;
    const paid = sanitizeAmountPaid(inv);
    const isPaid =
      inv.isPaid != null
        ? Boolean(inv.isPaid)
        : total > 0 && paid >= total - 0.01;
    return isPaid;
  });
  if (allPaid && DELIVERED_STATUS != null) {
    return DELIVERED_STATUS;
  }

  // If any invoice is a quote, status is Awaiting acceptance (even if others are paid)
  const hasAnyQuote = invoices.some((inv) => getInvoiceQuoteDisplay(inv));
  if (hasAnyQuote && QUOTE_STATUS_EN_ATTENTE != null) {
    return QUOTE_STATUS_EN_ATTENTE;
  }
  if (QUOTE_STATUS_IN_FABRICATION != null) {
    return QUOTE_STATUS_IN_FABRICATION;
  }
  return null;
}

/**
 * Derives display fields for one invoice row (status, payment line).
 * When explicit paid state exists, uses computed amount to avoid drift.
 */
function sanitizeAmountPaid(inv) {
  const rows = inv?.monthlyPaymentPlanRows || [];
  const hasArrangement = rows.length > 0;
  if (hasArrangement && !inv?.monthlyPaymentEnabled) return 0;

  const paymentReceivedMap = normalizePaymentReceivedMap(
    inv?.paymentReceivedByDisplayIndex
  );
  const hasPartialReceived = Object.values(paymentReceivedMap).some(
    (v) => Number(v) > 0.001
  );

  // Use explicit paid state when available for accurate display (includes partial-only maps)
  const hasExplicitPaidState =
    hasArrangement &&
    (hasPartialReceived ||
      (Array.isArray(inv?.paidMonthIndices) &&
        (typeof inv?.downPaymentPaid === "boolean" ||
          inv?.downPaymentPaid === 0 ||
          inv?.downPaymentPaid === 1)));
  if (hasExplicitPaidState) {
    const state = getPaidStateFromInvoice(inv);
    return computeAmountPaidFromPaidState(state);
  }

  let paid = roundToNearest5Cents(Number(inv?.amountPaid) || 0);
  if (paid < 0.01) return 0;
  if (hasArrangement && paid > 0 && paid < 1) {
    const total = Number(inv?.totalPrice) || 0;
    const monthlyAmount = Number(inv?.monthlyPaymentAmount) || 0;
    const downPayment = computeDownPayment(total, rows, monthlyAmount);
    if (paid < downPayment) return 0;
  }
  return paid;
}

export function getInvoiceRowDisplay(invoice, formatCHF, getInvoiceClient) {
  const date = invoice.generatedDate
    ? formatInvoiceDateForDisplay(invoice.generatedDate)
    : formatTodayDDMMYYYY();
  const client = getInvoiceClient(invoice);
  const clientName = client?.name || "Unknown Client";
  const total = Number(invoice.totalPrice) || 0;
  const paid = sanitizeAmountPaid(invoice);
  // Derive isPaid when not stored (API returns amountPaid but not isPaid)
  const isPaid =
    invoice.isPaid != null
      ? Boolean(invoice.isPaid)
      : total > 0 && paid >= total - 0.01;
  const left = isPaid ? 0 : Math.max(0, total - paid);
  const brand = invoice.brand || "Direct";

  const isQuote = getInvoiceQuoteDisplay(invoice);
  // "Accepted" = this invoice was accepted (isQuote=false) and not yet paid.
  // Each invoice displays its own state; toggling one does not affect another.
  const isAcceptedQuote = !isQuote && !isPaid && total > 0;
  const isDoctorBillGenerated =
    String(invoice?.doctorBillGeneratedAt ?? "").trim().length > 0;
  /** Doctor monthly bill applies to Lab invoices only; Direct patients pay directly. */
  const showBillingStage = brand !== "Direct";
  const billingStage = isPaid
    ? "paid"
    : isQuote
      ? "to_bill"
      : isDoctorBillGenerated
        ? "billed"
        : "to_bill";
  const billingStageLabel =
    billingStage === "paid"
      ? "Paid"
      : billingStage === "billed"
        ? "Billed"
        : "To bill";
  const statusKind = isAcceptedQuote
    ? "in_treatment"
    : isQuote
      ? "quote"
      : isPaid
        ? "paid"
        : paid > 0
          ? "partial"
          : "unpaid";
  // Each invoice shows its own state: Quote OFF + Paid OFF = "In fabrication" (never patient-level status)
  const statusLabel = isAcceptedQuote
    ? "In fabrication"
    : isQuote
      ? "Quote"
      : isPaid
        ? "Fully paid"
        : paid > 0
          ? "Partially paid"
          : "Pending";
  const formatCardAmount = (amount) => formatCHF(amount, { decimals: 0 });
  const paymentLine = isAcceptedQuote
    ? `${formatCardAmount(total)} left to pay`
    : isQuote
      ? `${formatCardAmount(total)} pending`
      : isPaid
        ? `${formatCardAmount(total)} — fully paid`
        : paid > 0
          ? `${formatCardAmount(total)} total · ${formatCardAmount(paid)} paid · ${formatCardAmount(left)} left`
          : `${formatCardAmount(total)} to pay`;

  return {
    date,
    clientName,
    invoiceRef: isQuote ? "QUOTE" : getInvoiceRef(invoice),
    total,
    paid,
    isPaid,
    left,
    brand,
    statusKind,
    statusLabel,
    paymentLine,
    isQuote,
    isAcceptedQuote,
    showBillingStage,
    billingStage,
    billingStageLabel,
  };
}

/**
 * Get explicit paid state from invoice. Uses stored values when present,
 * otherwise derives from amountPaid (assumes sequential payments).
 */
function getPaidStateFromInvoice(invoice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const totalPrice = Number(invoice?.totalPrice) || 0;
  const sumInstalments = rows.reduce(
    (s, r) => s + (Number(r.amount) || monthlyAmount),
    0
  );
  const downPayment = Math.max(0, totalPrice - sumInstalments);

  const dp = invoice?.downPaymentPaid;
  const paymentReceived = normalizePaymentReceivedMap(
    invoice?.paymentReceivedByDisplayIndex
  );
  const hasPartialReceived = Object.values(paymentReceived).some(
    (v) => Number(v) > 0.001
  );
  const hasExplicit =
    hasPartialReceived ||
    (Array.isArray(invoice?.paidMonthIndices) &&
      (typeof dp === "boolean" || dp === 0 || dp === 1));
  if (hasExplicit) {
    return {
      downPaymentPaid: dp === true || dp === 1,
      paidMonthIndices: Array.isArray(invoice?.paidMonthIndices)
        ? [...invoice.paidMonthIndices]
        : [],
      downPayment,
      rows,
      monthlyAmount,
      paymentReceived,
    };
  }

  // Derive from amountPaid (sequential: down payment first, then months in order)
  let remaining = roundToNearest5Cents(Number(invoice?.amountPaid) || 0);
  const downPaymentPaid = remaining >= downPayment;
  if (downPaymentPaid) remaining -= downPayment;
  const paidMonthIndices = [];
  for (let i = 0; i < rows.length; i++) {
    const amt = roundToNearest5Cents(Number(rows[i].amount) || monthlyAmount);
    if (remaining >= amt - 0.01) {
      paidMonthIndices.push(i);
      remaining -= amt;
    } else break;
  }
  return {
    downPaymentPaid,
    paidMonthIndices,
    downPayment,
    rows,
    monthlyAmount,
    paymentReceived,
  };
}

/**
 * Compute amountPaid from explicit paid state.
 */
export function computeAmountPaidFromPaidState(paidState) {
  const received = paidState.paymentReceived || {};
  const rows = paidState.rows || [];
  const monthlyAmount = Number(paidState.monthlyAmount) || 0;
  const down = Number(paidState.downPayment) || 0;
  const EPS = 0.01;
  let sum = 0;

  if (down > EPS) {
    if (paidState.downPaymentPaid) {
      const key = "0";
      const rec = received[key];
      const dp =
        rec != null && Number.isFinite(rec)
          ? roundToNearest5Cents(rec)
          : roundToNearest5Cents(down);
      sum += dp;
    } else {
      const rec = received["0"];
      if (rec != null && Number.isFinite(rec) && rec > EPS) {
        sum += roundToNearest5Cents(Math.min(Number(rec), down));
      }
    }
  }

  for (const i of paidState.paidMonthIndices) {
    const key = String(i + 1);
    const rec = received[key];
    const row = rows[i];
    const scheduled = roundToNearest5Cents(
      Number(row?.amount) || monthlyAmount
    );
    const amt =
      rec != null && Number.isFinite(rec)
        ? roundToNearest5Cents(rec)
        : scheduled;
    sum += amt;
  }

  for (let i = 0; i < rows.length; i++) {
    if (paidState.paidMonthIndices.includes(i)) continue;
    const key = String(i + 1);
    const rec = received[key];
    if (rec == null || !Number.isFinite(rec) || rec <= EPS) continue;
    const row = rows[i];
    const scheduled = roundToNearest5Cents(
      Number(row?.amount) || monthlyAmount
    );
    sum += roundToNearest5Cents(Math.min(Number(rec), scheduled));
  }

  return roundToNearest5Cents(sum);
}

/**
 * Merge invoice with instalment payment fields (for synthetic reads after allocation).
 * @param {Object} invoice
 * @param {Object} patch
 * @returns {Object}
 */
function mergeInvoicePaymentState(invoice, patch) {
  return {
    ...invoice,
    downPaymentPaid: patch.downPaymentPaid,
    paidMonthIndices: patch.paidMonthIndices,
    paymentReceivedByDisplayIndex: patch.paymentReceivedByDisplayIndex,
  };
}

/**
 * Apply a lump sum from the first unpaid segment (down payment, then plan rows in order).
 * Partial progress is stored in `paymentReceivedByDisplayIndex` until a segment is fully covered.
 *
 * @param {Object} invoice
 * @param {number} lumpAmountChf
 * @returns {{
 *   downPaymentPaid: boolean,
 *   paidMonthIndices: number[],
 *   paymentReceivedByDisplayIndex: Record<string, number>,
 *   amountPaid: number,
 *   remainingBalanceDue: number,
 *   isPaid: boolean,
 *   invoiceStatus: number,
 *   paidDate: string | null,
 *   allocationBreakdown: { label: string, amount: number }[],
 * }}
 */
export function allocateLumpToInstalments(invoice, lumpAmountChf) {
  const totalPrice = Number(invoice?.totalPrice) || 0;
  const EPS = 0.01;
  let remaining = roundToNearest5Cents(Number(lumpAmountChf) || 0);
  const state0 = getPaidStateFromInvoice(invoice);
  const currentPaid = computeAmountPaidFromPaidState(state0);
  const cap = Math.max(0, roundToNearest5Cents(totalPrice - currentPaid));
  remaining = Math.min(remaining, cap);

  const breakdown = [];
  if (remaining <= EPS) {
    const cleaned = {
      ...normalizePaymentReceivedMap(invoice?.paymentReceivedByDisplayIndex),
    };
    for (const k of Object.keys(cleaned)) {
      if (cleaned[k] <= EPS) delete cleaned[k];
    }
    const synthetic = mergeInvoicePaymentState(invoice, {
      downPaymentPaid: state0.downPaymentPaid,
      paidMonthIndices: [...state0.paidMonthIndices].sort((a, b) => a - b),
      paymentReceivedByDisplayIndex: cleaned,
    });
    const finalState = getPaidStateFromInvoice(synthetic);
    const amountPaid = computeAmountPaidFromPaidState(finalState);
    const remainingBalanceDue = Math.max(0, totalPrice - amountPaid);
    const isPaid = amountPaid >= totalPrice - EPS;
    return {
      downPaymentPaid: state0.downPaymentPaid,
      paidMonthIndices: [...state0.paidMonthIndices].sort((a, b) => a - b),
      paymentReceivedByDisplayIndex: cleaned,
      amountPaid,
      remainingBalanceDue,
      isPaid,
      invoiceStatus: isPaid ? 3 : 2,
      paidDate: isPaid ? formatTodayDDMMYYYY() : (invoice?.paidDate ?? null),
      allocationBreakdown: breakdown,
    };
  }

  let downPaymentPaid = state0.downPaymentPaid;
  let paidMonthIndices = [...state0.paidMonthIndices].sort((a, b) => a - b);
  const paymentReceivedByDisplayIndex = {
    ...normalizePaymentReceivedMap(invoice?.paymentReceivedByDisplayIndex),
  };
  const rows = state0.rows;
  const downPayment = state0.downPayment;
  const monthlyAmount = state0.monthlyAmount;

  const scheduledForMonth = (i) =>
    roundToNearest5Cents(Number(rows[i]?.amount) || monthlyAmount);

  const applyToSegment = (displayIndex, scheduled) => {
    if (scheduled <= EPS) return false;
    const key = String(displayIndex);
    let already = 0;
    if (displayIndex === 0) {
      if (downPaymentPaid) return false;
      already = roundToNearest5Cents(
        Number(paymentReceivedByDisplayIndex[key]) || 0
      );
    } else {
      const mi = displayIndex - 1;
      if (paidMonthIndices.includes(mi)) return false;
      already = roundToNearest5Cents(
        Number(paymentReceivedByDisplayIndex[key]) || 0
      );
    }
    already = Math.min(already, scheduled);
    const capacity = Math.max(0, roundToNearest5Cents(scheduled - already));
    if (capacity < EPS) return false;
    const apply = roundToNearest5Cents(Math.min(remaining, capacity));
    if (apply <= EPS) return false;
    remaining = roundToNearest5Cents(remaining - apply);
    const newTotal = roundToNearest5Cents(already + apply);
    if (newTotal >= scheduled - EPS) {
      if (displayIndex === 0) {
        downPaymentPaid = true;
        delete paymentReceivedByDisplayIndex[key];
        breakdown.push({ label: "Down payment", amount: apply });
      } else {
        const mi = displayIndex - 1;
        if (!paidMonthIndices.includes(mi)) {
          paidMonthIndices.push(mi);
          paidMonthIndices.sort((a, b) => a - b);
        }
        delete paymentReceivedByDisplayIndex[key];
        breakdown.push({
          label: rows[mi]?.monthLabel || `Month ${mi + 1}`,
          amount: apply,
        });
      }
    } else {
      paymentReceivedByDisplayIndex[key] = newTotal;
      const label =
        displayIndex === 0
          ? "Down payment (partial)"
          : `${rows[displayIndex - 1]?.monthLabel || `Month ${displayIndex}`} (partial)`;
      breakdown.push({ label, amount: apply });
    }
    return true;
  };

  while (remaining > EPS) {
    const startRem = remaining;
    if (downPayment > EPS && !downPaymentPaid) {
      applyToSegment(0, downPayment);
    }
    for (let i = 0; i < rows.length; i++) {
      if (!paidMonthIndices.includes(i)) {
        applyToSegment(i + 1, scheduledForMonth(i));
      }
    }
    if (rows.length > 0 && paidMonthIndices.length === rows.length) {
      downPaymentPaid = true;
    }
    if (remaining >= startRem - EPS) break;
  }

  const cleaned = {};
  for (const [k, v] of Object.entries(paymentReceivedByDisplayIndex)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > EPS) cleaned[k] = roundToNearest5Cents(n);
  }

  const synthetic = mergeInvoicePaymentState(invoice, {
    downPaymentPaid,
    paidMonthIndices,
    paymentReceivedByDisplayIndex: cleaned,
  });
  const finalState = getPaidStateFromInvoice(synthetic);
  const amountPaid = computeAmountPaidFromPaidState(finalState);
  const remainingBalanceDue = Math.max(0, totalPrice - amountPaid);
  const isPaid = amountPaid >= totalPrice - EPS;

  return {
    downPaymentPaid,
    paidMonthIndices,
    paymentReceivedByDisplayIndex: cleaned,
    amountPaid,
    remainingBalanceDue,
    isPaid,
    invoiceStatus: isPaid ? 3 : 2,
    paidDate: isPaid ? formatTodayDDMMYYYY() : (invoice?.paidDate ?? null),
    allocationBreakdown: breakdown,
  };
}

/**
 * Human-readable lines for modal preview (same rules as {@link allocateLumpToInstalments}).
 * @param {Object} invoice
 * @param {number} lumpAmountChf
 * @returns {string[]}
 */
export function getLumpAllocationPreviewLines(invoice, lumpAmountChf) {
  const r = allocateLumpToInstalments(invoice, lumpAmountChf);
  if (!r.allocationBreakdown?.length) return [];
  return r.allocationBreakdown.map(
    (b) => `${b.label}: ${b.amount.toFixed(2)} CHF`
  );
}

/**
 * Build payment date options for receipt dropdown: only paid items (down payment + paid months).
 * Uses explicit paid state. For plain invoices (no arrangement), returns one option when amountPaid > 0.
 * Returns [] when nothing is paid.
 * @returns {{ value: string, label: string, amount?: number }[]}
 */
export function buildPaidItemsForReceiptDropdown(invoice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const amountPaid = roundToNearest5Cents(Number(invoice?.amountPaid) || 0);

  if (
    rows.length === 0 ||
    monthlyAmount <= 0 ||
    !invoice?.monthlyPaymentEnabled
  ) {
    if (amountPaid > 0) {
      const today = new Date();
      const value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      return [{ value, label: "Payment", amount: amountPaid }];
    }
    return [];
  }

  const state = getPaidStateFromInvoice(invoice);
  const totalPrice = Number(invoice?.totalPrice) || 0;
  const sumInstalments = rows.reduce(
    (s, r) => s + (Number(r.amount) || monthlyAmount),
    0
  );
  const downPayment = Math.max(0, totalPrice - sumInstalments);
  const EPS = 0.01;
  const options = [];

  if (downPayment > 0 && state.downPaymentPaid) {
    const today = new Date();
    const value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    options.push({
      value,
      label: "Down payment",
      amount: getCreditedAmountForDisplayIndex(invoice, 0),
    });
  }

  for (const i of state.paidMonthIndices) {
    const row = rows[i];
    if (!row) continue;
    const value = (() => {
      const parts = String(row.dueDate || "").split("/");
      if (parts.length === 3) {
        const [, month, year] = parts;
        return `${year.trim()}-${month.padStart(2, "0")}-01`;
      }
      return `${new Date().getFullYear()}-01-01`;
    })();
    options.push({
      value,
      label: row.monthLabel || `Month ${i + 1}`,
      amount: getCreditedAmountForDisplayIndex(invoice, i + 1),
    });
  }

  const recv = normalizePaymentReceivedMap(
    invoice?.paymentReceivedByDisplayIndex
  );
  if (downPayment > 0 && !state.downPaymentPaid) {
    const p = roundToNearest5Cents(Number(recv["0"]) || 0);
    if (p > EPS && p < downPayment - EPS) {
      const today = new Date();
      const value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      options.push({
        value,
        label: "Down payment (partial)",
        amount: p,
      });
    }
  }
  for (let i = 0; i < rows.length; i++) {
    if (state.paidMonthIndices.includes(i)) continue;
    const key = String(i + 1);
    const p = roundToNearest5Cents(Number(recv[key]) || 0);
    const sched = roundToNearest5Cents(
      Number(rows[i]?.amount) || monthlyAmount
    );
    if (p > EPS && p < sched - EPS) {
      const row = rows[i];
      const value = (() => {
        const parts = String(row.dueDate || "").split("/");
        if (parts.length === 3) {
          const [, month, year] = parts;
          return `${year.trim()}-${month.padStart(2, "0")}-01`;
        }
        return `${new Date().getFullYear()}-01-01`;
      })();
      options.push({
        value,
        label: `${row.monthLabel || `Month ${i + 1}`} (partial)`,
        amount: p,
      });
    }
  }

  return options;
}

/**
 * Derive receipts from paid invoice state. Used for display instead of manual receipt creation.
 * Returns [{ date, amount }] for each paid item (down payment, months).
 * @returns {{ date: string, amount: number }[]}
 */
export function buildReceiptsFromPaidState(invoice) {
  const opts = buildPaidItemsForReceiptDropdown(invoice);
  return opts.map((o) => ({
    date: getFormattedDate(o.value),
    amount: Number(o.amount) || 0,
  }));
}

/**
 * Apply a receipt amount to unpaid badges in order. Returns updated paid state.
 */
export function applyReceiptToPaidState(invoice, amountToAdd) {
  const alloc = allocateLumpToInstalments(invoice, amountToAdd);
  return getPaidStateFromInvoice(
    mergeInvoicePaymentState(invoice, {
      downPaymentPaid: alloc.downPaymentPaid,
      paidMonthIndices: alloc.paidMonthIndices,
      paymentReceivedByDisplayIndex: alloc.paymentReceivedByDisplayIndex,
    })
  );
}

/**
 * Toggle a badge (displayIndex: 0 = Down payment, 1..n = month 0..n-1).
 * @param {Object} [options]
 * @param {number} [options.receivedAmount] — when marking paid (pending→paid), amount received (CHF); rounded to 5 rp.
 * Returns { downPaymentPaid, paidMonthIndices, amountPaid, remainingBalanceDue, isPaid, paymentReceivedByDisplayIndex }.
 * When all months are paid, auto-sets downPaymentPaid so the invoice becomes fully paid.
 */
export function toggleMonthPaid(invoice, displayIndex, options = {}) {
  const { receivedAmount } = options;
  const state = getPaidStateFromInvoice(invoice);
  const totalPrice = Number(invoice?.totalPrice) || 0;
  const rows = state.rows;

  const prevPaid =
    displayIndex === 0
      ? state.downPaymentPaid
      : state.paidMonthIndices.includes(displayIndex - 1);

  if (displayIndex === 0) {
    state.downPaymentPaid = !state.downPaymentPaid;
  } else {
    const monthIndex = displayIndex - 1;
    const idx = state.paidMonthIndices.indexOf(monthIndex);
    if (idx >= 0) {
      state.paidMonthIndices.splice(idx, 1);
    } else {
      state.paidMonthIndices.push(monthIndex);
      state.paidMonthIndices.sort((a, b) => a - b);
    }
    // When all months are paid, auto-mark down payment so invoice becomes fully paid
    if (rows.length > 0 && state.paidMonthIndices.length === rows.length) {
      state.downPaymentPaid = true;
    }
  }

  const nowPaid =
    displayIndex === 0
      ? state.downPaymentPaid
      : state.paidMonthIndices.includes(displayIndex - 1);

  const scheduled = getScheduledAmountForDisplayIndex(invoice, displayIndex);
  const paymentReceivedByDisplayIndex = {
    ...normalizePaymentReceivedMap(invoice?.paymentReceivedByDisplayIndex),
  };
  const key = String(displayIndex);
  if (prevPaid && !nowPaid) {
    delete paymentReceivedByDisplayIndex[key];
  } else if (!prevPaid && nowPaid) {
    const raw =
      receivedAmount != null && Number.isFinite(Number(receivedAmount))
        ? Number(receivedAmount)
        : scheduled;
    const toStore = roundToNearest5Cents(raw);
    if (Math.abs(toStore - scheduled) > 0.01) {
      paymentReceivedByDisplayIndex[key] = toStore;
    } else {
      delete paymentReceivedByDisplayIndex[key];
    }
  }

  state.paymentReceived = normalizePaymentReceivedMap(
    paymentReceivedByDisplayIndex
  );

  const amountPaid = computeAmountPaidFromPaidState(state);
  const remainingBalanceDue = Math.max(0, totalPrice - amountPaid);
  const isPaid = amountPaid >= totalPrice - 0.01;

  return {
    downPaymentPaid: state.downPaymentPaid,
    paidMonthIndices: state.paidMonthIndices,
    amountPaid,
    remainingBalanceDue,
    isPaid,
    paymentReceivedByDisplayIndex,
  };
}

/**
 * Returns monthly overview for arrangement invoices (which months are paid vs pending).
 * Includes a "Down payment" badge before the first month when downPayment > 0.
 * Uses explicit paid state (downPaymentPaid, paidMonthIndices) when available.
 * @returns {{ hasMonthlyPlan: boolean, months: Array<{ monthLabel: string, isPaid: boolean, dueDate?: string, amount?: number, isDownPayment?: boolean, displayIndex?: number }> } | null}
 */
export function getMonthlyOverview(invoice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const monthlyAmount = Number(invoice?.monthlyPaymentAmount) || 0;
  const totalPrice = Number(invoice?.totalPrice) || 0;

  if (
    rows.length === 0 ||
    monthlyAmount <= 0 ||
    !invoice?.monthlyPaymentEnabled
  )
    return null;

  const sumInstalments = rows.reduce(
    (s, r) => s + (Number(r.amount) || monthlyAmount),
    0
  );
  const downPayment = Math.max(0, totalPrice - sumInstalments);
  const state = getPaidStateFromInvoice(invoice);

  const months = rows.map((row, index) => {
    const displayIndex = index + 1;
    const scheduled = Number(row.amount) || monthlyAmount;
    const isPaid = state.paidMonthIndices.includes(index);
    const credited = getCreditedAmountForDisplayIndex(invoice, displayIndex);
    const receivedToward = roundToNearest5Cents(
      Number(state.paymentReceived[String(displayIndex)]) || 0
    );
    const EPS = 0.01;
    const isPartial =
      !isPaid && receivedToward > EPS && receivedToward < scheduled - EPS;
    const paidFraction = isPaid
      ? 1
      : isPartial
        ? Math.min(1, Math.max(0, receivedToward / scheduled))
        : 0;
    return {
      monthLabel: row.monthLabel || `Month ${index + 1}`,
      isPaid,
      dueDate: row.dueDate,
      amount: scheduled,
      creditedAmount:
        isPaid && Math.abs(credited - scheduled) > 0.01 ? credited : undefined,
      isDownPayment: false,
      displayIndex,
      isPartial,
      paidFraction,
      receivedTowardInstalment: isPartial ? receivedToward : undefined,
    };
  });

  if (downPayment > 0) {
    const isDpPaid = state.downPaymentPaid;
    const dpCredited = getCreditedAmountForDisplayIndex(invoice, 0);
    const dpRecv = roundToNearest5Cents(
      Number(state.paymentReceived["0"]) || 0
    );
    const EPS = 0.01;
    const isDpPartial = !isDpPaid && dpRecv > EPS && dpRecv < downPayment - EPS;
    const dpPaidFraction = isDpPaid
      ? 1
      : isDpPartial
        ? Math.min(1, Math.max(0, dpRecv / downPayment))
        : 0;
    months.unshift({
      monthLabel: "Down payment",
      isPaid: isDpPaid,
      dueDate: null,
      amount: downPayment,
      creditedAmount:
        isDpPaid && Math.abs(dpCredited - downPayment) > 0.01
          ? dpCredited
          : undefined,
      isDownPayment: true,
      displayIndex: 0,
      isPartial: isDpPartial,
      paidFraction: dpPaidFraction,
      receivedTowardInstalment: isDpPartial ? dpRecv : undefined,
    });
  }

  return { hasMonthlyPlan: true, months };
}
