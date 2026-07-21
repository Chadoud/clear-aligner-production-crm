import { useState, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  formatTodayDDMMYYYY,
  getDoctorBillDownloadFilename,
} from "@/utils/invoices/index.js";
import { generateDoctorBillPdfBlobFromData } from "@/utils/pdf/doctorBillHtmlToPdf.js";
import {
  markInvoicesBilledForCaseRefs,
  markInvoicesPaidForCaseRefs,
  unmarkInvoicesBilledForCaseRefs,
  unmarkInvoicesPaidForCaseRefs,
  notifyDoctorBillingGeneratedApi,
  notifyDoctorBillingPaidApi,
} from "@/services/invoiceDataService";
import { getBillingPeriodLabel } from "../config/constants";
import { isApiEnabled } from "@/config/api";
import { blobToBase64 } from "../utils/blobToBase64.js";
import { resolveCabinetIdForDoctorBill } from "../utils/resolveCabinetIdForDoctorBill.js";
import { getRawPatientByRef } from "@/services/patientDataService";
import { withTemporaryDocumentTitle } from "@/utils/print/withTemporaryDocumentTitle.js";
import { getBillingTablePatientSheetTab } from "@/constants/caseManagementTabs";

/**
 * @param {object} params
 * @param {string} params.selectedMonth
 * @param {{ from: string, to: string } | null} params.dateRange
 * @param {string} params.dateFrom
 * @param {string} params.dateTo
 * @param {unknown[]} params.allInvoices
 * @param {() => Promise<unknown>} params.refreshInvoices
 * @param {unknown} params.patientService
 * @param {(patient: unknown) => void} params.navigateToPatientSheet
 */
export function useDoctorsBillingBillWorkflow({
  selectedMonth,
  dateRange,
  dateFrom,
  dateTo,
  allInvoices,
  refreshInvoices,
  patientService,
  navigateToPatientSheet,
}) {
  const [modal, setModal] = useState(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [billPreviewZoomed, setBillPreviewZoomed] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState(null);
  const [reverseConfirmGroup, setReverseConfirmGroup] = useState(null);
  const [payConfirmGroup, setPayConfirmGroup] = useState(null);
  const [billGenerating, setBillGenerating] = useState(false);
  const [markPaidSending, setMarkPaidSending] = useState(false);
  const [reverseBillingBusy, setReverseBillingBusy] = useState(false);
  const billGenerateInFlightRef = useRef(false);

  const openPreview = useCallback(
    (doctorName, lineItems, previewOnly = false) => {
      // Re-preview of an existing bill: show the date the bill was generated,
      // not today. All line items in a billed batch share the same stamp.
      const existingBillDate = previewOnly
        ? (lineItems
            .map((it) => it?.doctorBillGeneratedAt)
            .find((d) => typeof d === "string" && d.trim().length > 0) ?? null)
        : null;
      setModal({
        doctorName,
        lineItems: [...lineItems],
        previewOnly: !!previewOnly,
        billDate: existingBillDate,
      });
      if (previewOnly) setShowBillPreview(true);
    },
    []
  );

  const removeFromModal = useCallback((item) => {
    setModal((m) =>
      m
        ? {
            ...m,
            lineItems: m.lineItems.filter((i) => {
              if (item.invoiceId && i.invoiceId)
                return i.invoiceId !== item.invoiceId;
              if (item.invoiceRef && i.invoiceRef)
                return i.invoiceRef !== item.invoiceRef;
              return !(
                i.caseRef === item.caseRef &&
                i.amount === item.amount &&
                i.invoiceDate === item.invoiceDate
              );
            }),
          }
        : null
    );
  }, []);

  const handlePreviewBill = useCallback(() => {
    if (!modal || modal.lineItems.length === 0) return;
    setShowBillPreview(true);
  }, [modal]);

  const closeBillPreview = useCallback(() => {
    setShowBillPreview(false);
    setBillPreviewZoomed(false);
  }, []);

  const closeModal = useCallback(() => {
    setShowBillPreview(false);
    setModal(null);
    setBillPreviewZoomed(false);
    setGeneratedBlob(null);
  }, []);

  const handleBillPreviewZoomToggle = useCallback(() => {
    setBillPreviewZoomed((z) => !z);
  }, []);

  const handleGenerateBill = useCallback(async () => {
    if (billGenerateInFlightRef.current) return;
    if (!modal || modal.lineItems.length === 0) return;

    flushSync(() => {
      billGenerateInFlightRef.current = true;
      setBillGenerating(true);
    });

    const generationDate = formatTodayDDMMYYYY();
    const snapshot = {
      doctorName: modal.doctorName,
      lineItems: [...modal.lineItems],
      billDate: generationDate,
    };

    closeModal();

    let blob;
    try {
      blob = await generateDoctorBillPdfBlobFromData(snapshot, {
        waitForIdMs: 10000,
        windowWidth: 1400,
        windowHeight: 2200,
      });
    } catch (e) {
      console.error("Doctor bill HTML snapshot failed:", e);
      window.alert("Could not generate the doctor bill PDF. Please try again.");
      billGenerateInFlightRef.current = false;
      setBillGenerating(false);
      return;
    }

    const billMonthLabel = getBillingPeriodLabel(
      selectedMonth,
      dateRange,
      dateFrom,
      dateTo,
      snapshot.lineItems
    );
    const cabinetId = resolveCabinetIdForDoctorBill(
      snapshot.lineItems,
      allInvoices,
      snapshot.doctorName
    );

    try {
      await markInvoicesBilledForCaseRefs(snapshot.lineItems);
      await refreshInvoices();

      if (
        isApiEnabled &&
        (cabinetId == null || !Number.isFinite(Number(cabinetId)))
      ) {
        console.warn(
          "Doctor billing email skipped: could not resolve cabinet_id (invoice.cabinet_id or cabinet list)."
        );
      }

      if (
        isApiEnabled &&
        cabinetId != null &&
        Number.isFinite(Number(cabinetId))
      ) {
        try {
          const pdf_base64 = await blobToBase64(blob);
          await notifyDoctorBillingGeneratedApi({
            cabinet_id: Number(cabinetId),
            bill_month_label: billMonthLabel,
            line_items: snapshot.lineItems.map((i) => ({
              patientName: i.patientName,
              caseRef: i.caseRef,
              invoiceRef: i.invoiceRef,
              amount: i.amount,
              invoiceDate: i.invoiceDate,
            })),
            pdf_base64,
          });
        } catch (e) {
          console.warn("Doctor billing email notify failed:", e);
        }
      }
    } finally {
      billGenerateInFlightRef.current = false;
      setBillGenerating(false);
    }
  }, [
    modal,
    closeModal,
    refreshInvoices,
    allInvoices,
    selectedMonth,
    dateRange,
    dateFrom,
    dateTo,
  ]);

  const handlePrint = useCallback(async () => {
    const filename =
      showBillPreview && modal?.doctorName != null
        ? await getDoctorBillDownloadFilename(modal.doctorName)
        : document.title;
    withTemporaryDocumentTitle(filename, () => window.print());
  }, [showBillPreview, modal?.doctorName]);

  const handleReverseBill = useCallback(async () => {
    if (!reverseConfirmGroup) return;
    flushSync(() => setReverseBillingBusy(true));
    try {
      if (reverseConfirmGroup.reverseType === "billed") {
        await unmarkInvoicesBilledForCaseRefs(reverseConfirmGroup.lineItems);
      } else {
        await unmarkInvoicesPaidForCaseRefs(reverseConfirmGroup.lineItems);
      }
      await refreshInvoices();
    } finally {
      setReverseBillingBusy(false);
      setReverseConfirmGroup(null);
    }
  }, [reverseConfirmGroup, refreshInvoices]);

  const handleMarkPaid = useCallback(async () => {
    if (!payConfirmGroup) return;
    const { doctorName, lineItems } = payConfirmGroup;
    const billMonthLabel = getBillingPeriodLabel(
      selectedMonth,
      dateRange,
      dateFrom,
      dateTo,
      lineItems
    );
    const cabinetId = resolveCabinetIdForDoctorBill(
      lineItems,
      allInvoices,
      doctorName
    );

    flushSync(() => setMarkPaidSending(true));
    try {
      await markInvoicesPaidForCaseRefs(payConfirmGroup.lineItems);
      await refreshInvoices();

      if (
        isApiEnabled &&
        cabinetId != null &&
        Number.isFinite(Number(cabinetId))
      ) {
        try {
          await notifyDoctorBillingPaidApi({
            cabinet_id: Number(cabinetId),
            bill_month_label: billMonthLabel,
            line_items: lineItems.map((i) => ({
              patientName: i.patientName,
              caseRef: i.caseRef,
              invoiceRef: i.invoiceRef,
              amount: i.amount,
              invoiceDate: i.invoiceDate,
            })),
          });
        } catch (e) {
          console.warn("Doctor billing paid notify failed:", e);
        }
      }
    } finally {
      setMarkPaidSending(false);
      setPayConfirmGroup(null);
    }
  }, [
    payConfirmGroup,
    refreshInvoices,
    selectedMonth,
    dateRange,
    dateFrom,
    dateTo,
    allInvoices,
  ]);

  const handlePatientRowClick = useCallback(
    (item) => {
      const patient = patientService?.getRawPatientByRef?.(item.caseRef) ??
        getRawPatientByRef(item.caseRef) ?? {
          ref: item.caseRef,
          name: item.patientName,
        };
      if (patient?.ref || patient?.case_id != null) {
        navigateToPatientSheet(patient, {
          tab: getBillingTablePatientSheetTab(),
        });
      }
    },
    [patientService, navigateToPatientSheet]
  );

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  return {
    modal,
    showBillPreview,
    billPreviewZoomed,
    generatedBlob,
    billGenerating,
    markPaidSending,
    reverseBillingBusy,
    reverseConfirmGroup,
    setReverseConfirmGroup,
    payConfirmGroup,
    setPayConfirmGroup,
    openPreview,
    removeFromModal,
    handlePreviewBill,
    closeBillPreview,
    closeModal,
    handleBillPreviewZoomToggle,
    handleGenerateBill,
    handlePrint,
    handleReverseBill,
    handleMarkPaid,
    handlePatientRowClick,
  };
}
