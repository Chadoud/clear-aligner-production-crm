/**
 * Custom Hook: useInvoiceData
 *
 * Provides invoice data management functionality with automatic loading and filtering.
 * When VITE_USE_API=true, fetches from backend; otherwise uses localStorage.
 *
 * @module hooks/useInvoiceData
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useInvoiceService } from "./useInvoiceService.js";
import {
  formatTodayDDMMYYYY,
  getInvoiceClient,
} from "@/utils/invoices/index.js";
import { safeTrim } from "@/utils/shared/index.js";
import { safeLogError } from "@/utils/safeLogError";
import { withUiLocale } from "@/utils/invoices/documentTitles.js";
import { generateInvoicePdfBase64 } from "@/utils/pdf/pdfGeneratorInvoiceOrchestrator.js";
import { generateInvoiceHtmlPdfBase64FromData } from "@/utils/pdf/doctorBillHtmlToPdf.js";

/**
 * Custom hook for invoice data management
 * @param {Object} patient - Current patient object (optional). When null, invoices = allInvoices.
 * @param {boolean} enabled - When false, skips the initial fetch (e.g. when auth token not ready).
 * @returns {Object} Invoice data and handlers
 */
export const useInvoiceData = (patient = null, enabled = true) => {
  const { service: invoiceService, loading: serviceLoading } =
    useInvoiceService();
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serviceLoading) {
      setLoading(true);
    }
  }, [serviceLoading]);

  const loadOpts = useMemo(
    () =>
      patient?.case_id != null && Number.isFinite(patient.case_id)
        ? { caseId: patient.case_id }
        : {},
    [patient?.case_id]
  );

  const loadIdRef = useRef(0);

  const doLoad = useCallback(async () => {
    if (!invoiceService) return;
    const thisLoadId = (loadIdRef.current += 1);
    setLoading(true);
    try {
      const invoices = await invoiceService.loadInvoices(loadOpts);
      if (thisLoadId !== loadIdRef.current) return;
      setAllInvoices(invoices);
    } catch (err) {
      safeLogError(err, "refreshInvoices failed");
    } finally {
      if (thisLoadId === loadIdRef.current) setLoading(false);
    }
  }, [invoiceService, loadOpts]);

  const refreshInvoices = useCallback(async () => {
    await doLoad();
  }, [doLoad]);

  useEffect(() => {
    if (enabled) {
      doLoad();
    } else {
      setLoading(true);
    }
  }, [enabled, doLoad]);

  // When patient is null: allInvoices. When patient has case_id: server already filtered. Else: filter by ref/name.
  const invoices = useMemo(() => {
    if (!invoiceService) return [];
    if (!patient) return allInvoices;
    if (patient.case_id != null && Number.isFinite(patient.case_id)) {
      return allInvoices;
    }
    const name = safeTrim(patient?.name);
    const ref = safeTrim(patient?.ref);
    if (!name && !ref) return [];
    return invoiceService.filterInvoicesByPatient(allInvoices, name, ref);
  }, [allInvoices, patient, invoiceService]);

  const addNewInvoice = useCallback(
    async (invoice) => {
      if (invoiceService) {
        setLoading(true);
        try {
          const updated = await invoiceService.addInvoice(invoice);
          setAllInvoices(updated);
        } finally {
          setLoading(false);
        }
      }
    },
    [invoiceService]
  );

  const toggleInvoicePaidStatus = useCallback(
    async (invoice, updates = {}) => {
      if (!invoiceService) return;
      // Always use invoice id when available — required for correct targeting when multiple invoices share the same patient
      const id = invoice?.id != null ? String(invoice.id).trim() : "";
      const matchCriteria =
        id !== ""
          ? { id }
          : (() => {
              const client = getInvoiceClient(invoice) || {};
              return {
                clientRef: client.ref,
                clientName: client.name,
                generatedDate: invoice.generatedDate,
                totalPrice: invoice.totalPrice,
                invoiceRef: invoice.invoiceRef,
              };
            })();

      // For Direct patients: attach a receipt PDF when a new payment is recorded
      const isDirect = invoice?.brand === "Direct";
      const prevPaid = Number(invoice?.amountPaid) || 0;
      const nextPaid = Number(updates.amountPaid);
      const paymentIncreased =
        Number.isFinite(nextPaid) && nextPaid > prevPaid + 0.01;
      if (isDirect && paymentIncreased) {
        const paymentAmount = nextPaid - prevPaid;
        const receiptData = {
          ...invoice,
          ...updates,
          amountPaid: nextPaid,
          receiptPaymentAmount: paymentAmount,
          receiptPaymentDate: formatTodayDDMMYYYY(),
          receiptDocumentsExistingPayment: false,
        };
        try {
          // Prefer HTML capture from the same InvoicePreview used by print preview,
          // so emailed receipts are pixel-identical to on-screen preview.
          updates.receiptPdfBase64 = await generateInvoiceHtmlPdfBase64FromData(
            receiptData,
            "receipt"
          );
        } catch {
          try {
            // Fallback to jsPDF builder if HTML capture fails.
            updates.receiptPdfBase64 = await generateInvoicePdfBase64(
              withUiLocale(receiptData),
              "receipt"
            );
          } catch {
            // Non-fatal — email still sends without PDF attachment
          }
        }
      }

      // Optimistic update: apply changes immediately so the Paid toggle turns on right away
      if (id !== "") {
        setAllInvoices((prev) =>
          prev.map((inv) =>
            inv?.id != null && String(inv.id).trim() === id
              ? { ...inv, ...updates }
              : inv
          )
        );
      }

      try {
        const updatedInvoice = await invoiceService.updateInvoice(
          matchCriteria,
          updates
        );
        if (Array.isArray(updatedInvoice)) {
          setAllInvoices(updatedInvoice);
          return updatedInvoice;
        }
        if (updatedInvoice && typeof updatedInvoice === "object") {
          const updatedId =
            updatedInvoice.id != null ? String(updatedInvoice.id).trim() : id;
          setAllInvoices((prev) =>
            prev.map((inv) =>
              inv?.id != null && String(inv.id).trim() === updatedId
                ? { ...inv, ...updatedInvoice }
                : inv
            )
          );
          return updatedInvoice;
        }
        await refreshInvoices();
        return updatedInvoice;
      } catch (err) {
        await refreshInvoices();
        throw err;
      }
    },
    [invoiceService, refreshInvoices]
  );

  const removeInvoice = useCallback(
    async (invoice) => {
      if (!invoiceService) return;
      const client = getInvoiceClient(invoice) || {};
      const hasId = invoice.id != null && String(invoice.id).trim() !== "";
      const matchCriteria = hasId
        ? { id: String(invoice.id).trim() }
        : {
            clientRef: client.ref,
            clientName: client.name,
            generatedDate: invoice.generatedDate,
            totalPrice: invoice.totalPrice,
            invoiceRef: invoice.invoiceRef,
          };

      // Optimistic update: remove from list immediately so the card disappears
      if (invoice.id != null) {
        setAllInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id));
      }

      try {
        const updated = await invoiceService.deleteInvoice(matchCriteria);
        setAllInvoices(updated);
      } catch (err) {
        const opts =
          patient?.case_id != null && Number.isFinite(patient.case_id)
            ? { caseId: patient.case_id }
            : {};
        const restored = await invoiceService.loadInvoices(opts);
        setAllInvoices(restored);
        throw err;
      }
    },
    [invoiceService, patient]
  );

  return {
    invoices,
    allInvoices,
    loading,
    refreshInvoices,
    addInvoice: addNewInvoice,
    updateInvoice: toggleInvoicePaidStatus,
    deleteInvoice: removeInvoice,
  };
};
