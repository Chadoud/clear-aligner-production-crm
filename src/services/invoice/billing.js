/**
 * Doctors billing: mark billed / paid on invoices and sync patient status.
 * @module services/invoiceDataServiceBilling
 */

import {
  formatTodayDDMMYYYY,
  getInvoiceClient,
  getClientRef,
  getInvoiceRef,
} from "@/utils/invoices/index.js";
import { safeTrim } from "@/utils/shared/index.js";
import {
  DELIVERED_STATUS,
  QUOTE_STATUS_IN_FABRICATION,
  isQuoteInvoice,
} from "@/utils/invoices/quoteHelpers.js";
import { updatePatientByRef } from "../patientDataService.js";
import { loadInvoices } from "./loadSave.js";
import { updateInvoice } from "./crud.js";
import { normalizeIdentityValue } from "./matching.js";

/**
 * Build paid-state updates to mark an invoice as fully paid.
 * Handles both plain invoices and those with monthly payment arrangements.
 */
function buildPaidUpdates(invoice, totalPrice) {
  const rows = invoice?.monthlyPaymentPlanRows || [];
  const hasMonthlyPlan =
    invoice?.monthlyPaymentEnabled &&
    rows.length > 0 &&
    Number(invoice?.monthlyPaymentAmount) > 0;

  const paidDate = formatTodayDDMMYYYY();

  if (hasMonthlyPlan) {
    const paidMonthIndices = rows.map((_, i) => i);
    return {
      amountPaid: totalPrice,
      remainingBalanceDue: 0,
      paidDate,
      downPaymentPaid: true,
      paidMonthIndices,
      paymentReceivedByDisplayIndex: {},
      invoiceStatus: 3,
    };
  }

  return {
    amountPaid: totalPrice,
    remainingBalanceDue: 0,
    paidDate,
    invoiceStatus: 3,
  };
}

/**
 * Mark patient invoices as billed (doctor bill generated) for the given line items.
 * @returns {Promise<number>}
 */
export const markInvoicesBilledForCaseRefs = async (lineItems) => {
  if (!lineItems || lineItems.length === 0) return 0;
  const batchDoctorBillStamp = formatTodayDDMMYYYY();
  const invoices = await loadInvoices();
  let updated = 0;
  for (const item of lineItems) {
    const ref = safeTrim(item.caseRef);
    const name = safeTrim(item.patientName);
    const itemInvoiceRef = safeTrim(item.invoiceRef);
    const itemInvoiceId = safeTrim(item.invoiceId);
    if (!ref && !name && !itemInvoiceId) continue;
    const target = invoices.find((inv) => {
      if (isQuoteInvoice(inv)) return false;
      // Skip invoices that have already been stamped with a bill date
      const isAlreadyBilled =
        String(inv.doctorBillGeneratedAt ?? "").trim().length > 0;
      if (isAlreadyBilled) return false;
      if (itemInvoiceId && inv.id) {
        if (String(inv.id).trim() === itemInvoiceId) return true;
      }
      if (itemInvoiceRef) {
        const invRef = String(getInvoiceRef(inv) || "").trim();
        if (invRef && itemInvoiceRef === invRef) return true;
      }
      const client = getInvoiceClient(inv) || {};
      const invRef = normalizeIdentityValue(client.ref);
      const invName = normalizeIdentityValue(client.name);
      const targetRef = normalizeIdentityValue(ref);
      const targetName = normalizeIdentityValue(name);
      if (targetRef && invRef && invRef === targetRef) return true;
      if (targetName && invName && invName === targetName) return true;
      return false;
    });
    if (target) {
      await updateInvoice(
        {
          id: target.id,
          clientRef: getInvoiceClient(target)?.ref,
          clientName: getInvoiceClient(target)?.name,
          generatedDate: target.generatedDate,
          totalPrice: target.totalPrice,
        },
        {
          doctorBillGeneratedAt:
            target.doctorBillGeneratedAt || batchDoctorBillStamp,
        }
      );
      updated += 1;
      const next = await loadInvoices();
      invoices.length = 0;
      invoices.push(...next);
    }
  }
  return updated;
};

/**
 * Unmark patient invoices as billed (doctor bill no longer generated).
 * @returns {Promise<number>}
 */
export const unmarkInvoicesBilledForCaseRefs = async (lineItems) => {
  if (!lineItems || lineItems.length === 0) return 0;
  const invoices = await loadInvoices();
  let updated = 0;
  for (const item of lineItems) {
    const ref = safeTrim(item.caseRef);
    const name = safeTrim(item.patientName);
    const itemInvoiceRef = safeTrim(item.invoiceRef);
    const itemInvoiceId = safeTrim(item.invoiceId);
    if (!ref && !name && !itemInvoiceId) continue;
    const billed = invoices.find((inv) => {
      if (isQuoteInvoice(inv)) return false;
      const hasBilledFlag =
        String(inv.doctorBillGeneratedAt ?? "").trim().length > 0;
      if (!hasBilledFlag) return false;
      if (itemInvoiceId && inv.id) {
        if (String(inv.id).trim() === itemInvoiceId) return true;
      }
      if (itemInvoiceRef) {
        const invRef = String(getInvoiceRef(inv) || "").trim();
        if (invRef && itemInvoiceRef === invRef) return true;
      }
      const client = getInvoiceClient(inv) || {};
      const invRef = normalizeIdentityValue(client.ref);
      const invName = normalizeIdentityValue(client.name);
      const targetRef = normalizeIdentityValue(ref);
      const targetName = normalizeIdentityValue(name);
      if (targetRef && invRef && invRef === targetRef) return true;
      if (targetName && invName && invName === targetName) return true;
      return false;
    });
    if (billed) {
      await updateInvoice(
        {
          id: billed.id,
          clientRef: getInvoiceClient(billed)?.ref,
          clientName: getInvoiceClient(billed)?.name,
          generatedDate: billed.generatedDate,
          totalPrice: billed.totalPrice,
        },
        { doctorBillGeneratedAt: null }
      );
      updated += 1;
      const next = await loadInvoices();
      invoices.length = 0;
      invoices.push(...next);
    }
  }
  return updated;
};

/**
 * Mark patient invoices as paid for the given line items.
 * Called from the "Mark as paid" action in doctors billing.
 * @returns {Promise<number>}
 */
export const markInvoicesPaidForCaseRefs = async (lineItems) => {
  if (!lineItems || lineItems.length === 0) return 0;
  const invoices = await loadInvoices();
  let updated = 0;
  for (const item of lineItems) {
    const ref = safeTrim(item.caseRef);
    const name = safeTrim(item.patientName);
    const itemInvoiceRef = safeTrim(item.invoiceRef);
    const itemInvoiceId = safeTrim(item.invoiceId);
    if (!ref && !name && !itemInvoiceId) continue;
    const unpaid = invoices.find((inv) => {
      if (isQuoteInvoice(inv)) return false;
      const total = Number(inv.totalPrice) || 0;
      const paid = Number(inv.amountPaid) || 0;
      const isUnpaid = total > 0 && paid < total && !inv.isPaid;
      if (!isUnpaid) return false;
      if (itemInvoiceId && inv.id) {
        if (String(inv.id).trim() === itemInvoiceId) return true;
      }
      if (itemInvoiceRef) {
        const invRef = String(getInvoiceRef(inv) || "").trim();
        if (invRef && itemInvoiceRef === invRef) return true;
      }
      const client = getInvoiceClient(inv) || {};
      const invRef = normalizeIdentityValue(client.ref);
      const invName = normalizeIdentityValue(client.name);
      const targetRef = normalizeIdentityValue(ref);
      const targetName = normalizeIdentityValue(name);
      if (targetRef && invRef && invRef === targetRef) return true;
      if (targetName && invName && invName === targetName) return true;
      return false;
    });
    if (unpaid) {
      const totalPrice = Number(unpaid.totalPrice) || 0;
      const updates = buildPaidUpdates(unpaid, totalPrice);
      await updateInvoice(
        {
          id: unpaid.id,
          clientRef: getInvoiceClient(unpaid)?.ref,
          clientName: getInvoiceClient(unpaid)?.name,
          generatedDate: unpaid.generatedDate,
          totalPrice: unpaid.totalPrice,
        },
        updates
      );
      const patientRef = ref || getClientRef(getInvoiceClient(unpaid));
      if (patientRef && DELIVERED_STATUS != null) {
        await updatePatientByRef(patientRef, {
          case_status: DELIVERED_STATUS,
          skip_status_email: true,
        });
      }
      updated += 1;
      // Reload for next iteration
      const next = await loadInvoices();
      invoices.length = 0;
      invoices.push(...next);
    }
  }
  return updated;
};

/**
 * Unmark patient invoices as paid for the given line items.
 * @returns {Promise<number>}
 */
export const unmarkInvoicesPaidForCaseRefs = async (lineItems) => {
  if (!lineItems || lineItems.length === 0) return 0;
  const invoices = await loadInvoices();
  let updated = 0;
  for (const item of lineItems) {
    const ref = safeTrim(item.caseRef);
    const name = safeTrim(item.patientName);
    const itemInvoiceRef = safeTrim(item.invoiceRef);
    const itemInvoiceId = safeTrim(item.invoiceId);
    if (!ref && !name && !itemInvoiceId) continue;
    const paidInv = invoices.find((inv) => {
      if (isQuoteInvoice(inv)) return false;
      const total = Number(inv.totalPrice) || 0;
      const paid = Number(inv.amountPaid) || 0;
      const isPaid = total > 0 && paid >= total - 0.01;
      if (!isPaid) return false;
      if (itemInvoiceId && inv.id) {
        if (String(inv.id).trim() === itemInvoiceId) return true;
      }
      if (itemInvoiceRef) {
        const invRef = String(getInvoiceRef(inv) || "").trim();
        if (invRef && itemInvoiceRef === invRef) return true;
      }
      const client = getInvoiceClient(inv) || {};
      const invRef = normalizeIdentityValue(client.ref);
      const invName = normalizeIdentityValue(client.name);
      const targetRef = normalizeIdentityValue(ref);
      const targetName = normalizeIdentityValue(name);
      if (targetRef && invRef && invRef === targetRef) return true;
      if (targetName && invName && invName === targetName) return true;
      return false;
    });
    if (paidInv) {
      const totalPrice = Number(paidInv.totalPrice) || 0;
      await updateInvoice(
        {
          id: paidInv.id,
          clientRef: getInvoiceClient(paidInv)?.ref,
          clientName: getInvoiceClient(paidInv)?.name,
          generatedDate: paidInv.generatedDate,
          totalPrice: paidInv.totalPrice,
        },
        {
          isPaid: false,
          amountPaid: 0,
          remainingBalanceDue: totalPrice,
          paidDate: null,
          downPaymentPaid: false,
          paidMonthIndices: [],
          paymentReceivedByDisplayIndex: {},
          invoiceStatus: 2,
        }
      );
      const patientRef = ref || getClientRef(getInvoiceClient(paidInv));
      if (patientRef && QUOTE_STATUS_IN_FABRICATION != null) {
        await updatePatientByRef(patientRef, {
          case_status: QUOTE_STATUS_IN_FABRICATION,
        });
      }
      updated += 1;
      const next = await loadInvoices();
      invoices.length = 0;
      invoices.push(...next);
    }
  }
  return updated;
};
