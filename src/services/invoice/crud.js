/**
 * Add / update / delete invoices (API or localStorage).
 * @module services/invoiceDataServiceCrud
 */

import {
  formatTodayDDMMYYYY,
  getInvoiceClient,
  generateNextInvoiceRef,
  hasMonthlyArrangementPlan,
} from "@/utils/invoices/index.js";
import {
  getQuoteTargetStatus,
  isQuoteInvoice,
} from "@/utils/invoices/quoteHelpers.js";
import { generateInvoiceHtmlPdfBase64FromData } from "@/utils/pdf/doctorBillHtmlToPdf.js";
import {
  createInvoiceApi,
  updateInvoiceApi,
  deleteInvoiceApi,
} from "@/repositories/InvoiceRepository.js";
import { isApiEnabled } from "@/config/api.js";
import { updatePatientByRef, getPatientByName } from "../patientDataService.js";
import { loadInvoices, saveInvoices } from "./loadSave.js";
import { invoiceMatchesCriteria } from "./matching.js";
import { getPatientRefFromClient } from "./patientRef.js";
import { withUiLocale } from "@/utils/invoices/documentTitles.js";
import { generateInvoicePdfBase64 } from "@/utils/pdf/pdfGeneratorInvoiceOrchestrator.js";
import { uuidv4 } from "@/utils/shared/uuid.js";

/**
 * Add a new invoice
 * @param {Object} invoice - Invoice object to add (include cabinet_id when company user)
 * @returns {Promise<Array<Object>>} Updated array of invoices
 */
export const addInvoice = async (invoice) => {
  const existing = await loadInvoices();
  const invoiceRef = invoice.invoiceRef || generateNextInvoiceRef(existing);
  const invoiceWithDate = {
    ...invoice,
    id: invoice.id || uuidv4(),
    invoiceRef,
    generatedDate: invoice.generatedDate || formatTodayDDMMYYYY(),
    doctorBillGeneratedAt: invoice.doctorBillGeneratedAt ?? null,
  };

  if (isApiEnabled) {
    const isQuote = isQuoteInvoice(invoice);
    // Prefer the html2canvas PDF captured from the live modal (pixel-identical to Print).
    // Fall back to programmatic jsPDF for headless paths (e.g. ActionButtons reactivation).
    let pdfBase64 = invoice.pdfBase64 ?? null;
    if (!pdfBase64) {
      try {
        pdfBase64 = await generateInvoicePdfBase64(
          withUiLocale(invoiceWithDate),
          isQuote ? "quote" : "invoice"
        );
      } catch {
        // Non-fatal: email still sends without PDF attachment
      }
    }
    let arrangementPdfBase64 = invoice.arrangementPdfBase64 ?? null;
    if (
      isQuote &&
      hasMonthlyArrangementPlan(invoiceWithDate) &&
      !arrangementPdfBase64
    ) {
      try {
        arrangementPdfBase64 = await generateInvoiceHtmlPdfBase64FromData(
          withUiLocale(invoiceWithDate),
          "arrangement"
        );
      } catch {
        try {
          arrangementPdfBase64 = await generateInvoicePdfBase64(
            withUiLocale(invoiceWithDate),
            "arrangement"
          );
        } catch {
          // Non-fatal: quote email still sends without arrangement PDF
        }
      }
    }
    // Strip PDF fields before persisting — backend reads them for email, never stores them
    const invoicePayload = { ...invoiceWithDate };
    delete invoicePayload.pdfBase64;
    delete invoicePayload.arrangementPdfBase64;
    await createInvoiceApi({
      ...invoicePayload,
      ...(pdfBase64 ? { pdfBase64 } : {}),
      ...(arrangementPdfBase64 ? { arrangementPdfBase64 } : {}),
    });
    const invoices = await loadInvoices();
    // When quote toggle on: "Awaiting acceptance"; when off: "In production"
    const targetStatus = getQuoteTargetStatus(isQuote);
    if (targetStatus != null) {
      const ref = getPatientRefFromClient(
        getInvoiceClient(invoice) || {},
        getPatientByName
      );
      if (ref) {
        await updatePatientByRef(ref, { case_status: targetStatus });
      }
    }
    return invoices;
  }

  const invoices = await loadInvoices();
  invoices.unshift(invoiceWithDate);
  await saveInvoices(invoices);

  // When quote toggle on: "Awaiting acceptance"; when off: "In production"
  const targetStatusLocal = getQuoteTargetStatus(isQuoteInvoice(invoice));
  if (targetStatusLocal != null) {
    const ref = getPatientRefFromClient(
      getInvoiceClient(invoice) || {},
      getPatientByName
    );
    if (ref) {
      await updatePatientByRef(ref, { case_status: targetStatusLocal });
    }
  }

  return invoices;
};

/**
 * Update an invoice by matching criteria.
 * When API is enabled, id is required — each invoice must be updated by its unique id.
 * @param {Object} matchCriteria - Must include { id } when API enabled
 * @param {Object} updates
 * @returns {Promise<Array<Object>>} Updated array of invoices
 */
export const updateInvoice = async (matchCriteria, updates) => {
  const criteriaId =
    matchCriteria?.id != null ? String(matchCriteria.id).trim() : "";
  if (isApiEnabled && criteriaId !== "") {
    const updated = await updateInvoiceApi(criteriaId, updates);
    return updated ?? undefined;
  }
  const invoices = await loadInvoices();
  const matched = invoices.find((inv) =>
    invoiceMatchesCriteria(inv, matchCriteria)
  );
  if (!matched) return invoices;

  if (isApiEnabled && matched.id) {
    const updated = await updateInvoiceApi(String(matched.id).trim(), updates);
    return updated ?? undefined;
  }

  const updated = invoices.map((inv) =>
    invoiceMatchesCriteria(inv, matchCriteria) ? { ...inv, ...updates } : inv
  );
  await saveInvoices(updated);
  return updated;
};

/**
 * Delete an invoice by matching criteria.
 * @param {Object} matchCriteria
 * @returns {Promise<Array<Object>>} Updated array of invoices
 */
export const deleteInvoice = async (matchCriteria) => {
  const invoices = await loadInvoices();
  const matched = invoices.find((inv) =>
    invoiceMatchesCriteria(inv, matchCriteria)
  );
  if (!matched) return invoices;

  if (isApiEnabled && matched.id) {
    await deleteInvoiceApi(matched.id);
    return loadInvoices();
  }

  const updated = invoices.filter(
    (inv) => !invoiceMatchesCriteria(inv, matchCriteria)
  );
  await saveInvoices(updated);
  return updated;
};
