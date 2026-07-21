/**
 * GeneratedInvoices Component
 *
 * Displays a list of all generated invoices with options to view, download, or delete them.
 *
 * @module components/Invoice/GeneratedInvoices
 */

import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { safeLogError } from "@/utils/safeLogError";
import { useDashboard } from "@/context/DashboardContext";
import InvoicePreview from "./InvoicePreview";
import InvoiceModal from "./InvoiceModal";
import InvoiceMobAppCredentialsPage from "./InvoiceMobAppCredentialsPage.jsx";
import { shouldAppendMobAppCredentialsPage } from "@/utils/invoices/mobAppCredentialsPage.js";
import { ensureMobAppPasswordForCase } from "@/utils/invoices/mobAppCredentialsAutoProvision.js";
import {
  getMobAppPassword,
  storeMobAppPassword,
} from "@/utils/invoices/mobAppPasswordSession.js";
import { generatePDF } from "@/utils/pdf/index.js";
import {
  formatTodayDDMMYYYY,
  getInvoiceTotalMismatch,
  formatCHF,
  INVOICE_STATUS_QUOTE,
} from "@/utils/index.js";
import { resolveDoctorInfoForInvoice } from "@/data/cabinets";
import { usePatientService } from "@/hooks";
import { useDashboardInvoiceData } from "@/context/InvoiceDataContext";
import { filterInvoicesForPatient } from "@/services/invoiceDataService";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import { VIEW_MODE_LIST, VIEW_MODE_PREVIEW } from "@/constants/invoiceFilters";
import {
  computeOverview,
  filterInvoicesByOverviewCategory,
} from "./config/generatedInvoicesHelpers";
import { useGeneratedInvoicesSync } from "./hooks/useGeneratedInvoicesSync";
import GeneratedInvoicesOverview from "./components/GeneratedInvoicesOverview";
import InvoiceList from "./components/InvoiceList";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import "./GeneratedInvoices.css";

const GeneratedInvoices = ({ patient }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const { scope, setSelectedPatient } = useDashboard();
  const canManageInvoices = scope === "company";
  const {
    allInvoices,
    loading,
    refreshInvoices,
    updateInvoice,
    deleteInvoice,
  } = useDashboardInvoiceData();
  const { service: patientService } = usePatientService();

  const invoices = useMemo(
    () => filterInvoicesForPatient(allInvoices, patient),
    [allInvoices, patient]
  );

  const overview = useMemo(
    () => ({
      ...computeOverview(invoices),
      invoiceCount: invoices.length,
    }),
    [invoices]
  );

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODE_LIST);
  const [previewDocumentType, setPreviewDocumentType] = useState("invoice");
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoiceListFilter, setInvoiceListFilter] = useState(null);
  const [invoiceUpdateTrigger, setInvoiceUpdateTrigger] = useState(0);
  const [toggleConfirm, setToggleConfirm] = useState(null);
  const [previewProvisionedCredentials, setPreviewProvisionedCredentials] =
    useState(null);
  const [previewCredentialsProvisioning, setPreviewCredentialsProvisioning] =
    useState(false);

  useGeneratedInvoicesSync({
    invoices,
    patient,
    patientService,
    setSelectedPatient,
    refreshInvoices,
    invoiceUpdateTrigger,
  });

  // Reset view state when patient changes
  useEffect(() => {
    if (patient) {
      setViewMode(VIEW_MODE_LIST);
      setSelectedInvoice(null);
      setPreviewDocumentType("invoice");
      setInvoiceModal(null);
      setInvoiceListFilter(null);
      setPreviewProvisionedCredentials(null);
      setPreviewCredentialsProvisioning(false);
    }
  }, [patient, patient?.name, patient?.ref]);

  // Auto-provision mob-app password for inline invoice preview (same as InvoiceModal).
  useEffect(() => {
    setPreviewProvisionedCredentials(null);
    if (viewMode !== VIEW_MODE_PREVIEW || !selectedInvoice) {
      setPreviewCredentialsProvisioning(false);
      return;
    }
    if (!canManageInvoices) {
      setPreviewCredentialsProvisioning(false);
      return;
    }
    if (!shouldAppendMobAppCredentialsPage(selectedInvoice, "invoice")) {
      setPreviewCredentialsProvisioning(false);
      return;
    }
    const caseId = selectedInvoice.case_id ?? selectedInvoice.caseId;
    if (!caseId) {
      setPreviewCredentialsProvisioning(false);
      return;
    }
    const status = Number(selectedInvoice.invoiceStatus);
    const isActiveInvoice = status === 2 || status === 3;
    if (!isActiveInvoice) {
      setPreviewCredentialsProvisioning(false);
      return;
    }
    if (getMobAppPassword(caseId)) {
      setPreviewCredentialsProvisioning(false);
      return;
    }

    if (
      String(selectedInvoice.case_mob_app_password ?? "").trim() &&
      String(selectedInvoice.case_username ?? "").trim()
    ) {
      setPreviewCredentialsProvisioning(false);
      return;
    }

    let cancelled = false;
    setPreviewCredentialsProvisioning(true);
    ensureMobAppPasswordForCase(caseId, selectedInvoice)
      .then((creds) => {
        if (cancelled || !creds?.password) return;
        setPreviewProvisionedCredentials({
          username: creds.username ?? undefined,
          password: creds.password,
        });
      })
      .finally(() => {
        if (!cancelled) setPreviewCredentialsProvisioning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, canManageInvoices, selectedInvoice]);

  const previewInvoiceForExport = useMemo(() => {
    if (!selectedInvoice) return null;
    if (previewDocumentType !== "invoice") return selectedInvoice;
    if (!shouldAppendMobAppCredentialsPage(selectedInvoice, "invoice")) {
      return selectedInvoice;
    }
    const caseId = selectedInvoice.case_id ?? selectedInvoice.caseId;
    const sessionPassword = getMobAppPassword(caseId);
    const credentialUser =
      previewProvisionedCredentials?.username != null &&
      String(previewProvisionedCredentials.username).trim() !== ""
        ? previewProvisionedCredentials.username
        : selectedInvoice.case_username;
    const credentialsBase =
      credentialUser != null && String(credentialUser).trim() !== ""
        ? { ...selectedInvoice, case_username: credentialUser }
        : selectedInvoice;
    const credentialsPassword =
      sessionPassword ??
      previewProvisionedCredentials?.password ??
      selectedInvoice.case_mob_app_password ??
      null;
    return credentialsPassword
      ? { ...credentialsBase, mob_app_password_once: credentialsPassword }
      : credentialsBase;
  }, [selectedInvoice, previewDocumentType, previewProvisionedCredentials]);

  const showMobAppCredentialsInPreview =
    previewDocumentType === "invoice" &&
    previewInvoiceForExport &&
    shouldAppendMobAppCredentialsPage(previewInvoiceForExport, "invoice");

  const handleDownload = async (invoice, documentType) => {
    const resolved = await resolveDoctorInfoForInvoice(invoice);
    const mismatch = getInvoiceTotalMismatch(resolved);
    if (mismatch.mismatch) {
      const msg = `The total (${mismatch.totalPrice.toFixed(2)} CHF) doesn't match the sum of line items (${mismatch.sumFromLines.toFixed(2)} CHF). Export PDF anyway?`;
      if (!window.confirm(msg)) return;
    }
    const docType =
      documentType === "invoice" &&
      resolved.invoiceStatus === INVOICE_STATUS_QUOTE
        ? "quote"
        : (documentType ??
          (resolved.invoiceStatus === INVOICE_STATUS_QUOTE
            ? "quote"
            : "invoice"));
    generatePDF(resolved, docType);
  };

  /** List action: open preview modal and trigger system print (same output as Print in modal). */
  const handlePrintFromList = async (invoice) => {
    const resolved = await resolveDoctorInfoForInvoice(invoice);
    const mismatch = getInvoiceTotalMismatch(resolved);
    if (mismatch.mismatch) {
      const msg = `The total (${mismatch.totalPrice.toFixed(2)} CHF) doesn't match the sum of line items (${mismatch.sumFromLines.toFixed(2)} CHF). Print anyway?`;
      if (!window.confirm(msg)) return;
    }
    setInvoiceModal({
      data: resolved,
      initialDocumentType: "invoice",
      printOnOpen: true,
      printKey: Date.now(),
    });
  };

  const handleDeleteClick = (invoice, clientName) => {
    setDeleteConfirm({ invoice, clientName });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm === null || isDeleting) return;
    const invoiceToDelete = deleteConfirm.invoice;
    if (!invoiceToDelete) {
      setDeleteConfirm(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete);
    } catch (err) {
      safeLogError(err, "Delete invoice failed");
    } finally {
      setDeleteConfirm(null);
      setIsDeleting(false);
      // Increment trigger so useGeneratedInvoicesSync resets its dedup guard
      // and re-runs the patient-status sync after the invoice list settles.
      setInvoiceUpdateTrigger((t) => t + 1);
    }
  };

  const handleBackToList = () => {
    setViewMode(VIEW_MODE_LIST);
    setSelectedInvoice(null);
    setPreviewDocumentType("invoice");
  };

  const handlePaidToggleRequest = (invoice, newIsPaid) => {
    setToggleConfirm({
      type: "paid",
      invoice,
      newValue: newIsPaid,
      title: newIsPaid ? "Mark as Paid" : "Mark as Unpaid",
      message: newIsPaid
        ? "Mark this invoice as paid? Payment status will be updated."
        : "Mark this invoice as unpaid? Payment status will be reset.",
    });
  };

  const handleQuoteToggleRequest = (invoice, newIsQuote) => {
    setToggleConfirm({
      type: "quote",
      invoice,
      newValue: newIsQuote,
      title: newIsQuote ? "Switch to Quote" : "Switch to Accepted",
      message: newIsQuote
        ? "Switch this invoice to Quote mode? Payment status will be reset."
        : "Switch this invoice to Accepted/Fabrication mode?",
    });
  };

  const handleToggleConfirm = async () => {
    if (!toggleConfirm) return;
    const { invoice, newValue, type } = toggleConfirm;
    setToggleConfirm(null);
    if (type === "paid") {
      await handlePaidToggle(invoice, newValue);
    } else if (type === "quote") {
      await handleQuoteToggle(invoice, newValue);
    }
  };

  const handlePaidToggle = async (invoice, newIsPaid) => {
    const total = Number(invoice.totalPrice) || 0;
    const rows = invoice?.monthlyPaymentPlanRows || [];
    const hasArrangement = rows.length > 0;
    const updates = {
      amountPaid: newIsPaid ? total : 0,
      remainingBalanceDue: newIsPaid ? 0 : total,
      isPaid: newIsPaid,
      paidDate: newIsPaid ? formatTodayDDMMYYYY() : null,
      invoiceStatus: newIsPaid ? 3 : 2,
    };
    if (hasArrangement) {
      updates.downPaymentPaid = newIsPaid;
      updates.paidMonthIndices = newIsPaid ? rows.map((_, i) => i) : [];
      updates.paymentReceivedByDisplayIndex = {};
    }
    try {
      const result = await updateInvoice(invoice, updates);
      if (result?.mob_app_password_once) {
        storeMobAppPassword(
          invoice.case_id ?? invoice.caseId,
          result.mob_app_password_once
        );
      }
      setInvoiceUpdateTrigger((t) => t + 1);
    } catch (err) {
      safeLogError(err, "Paid toggle failed");
      toast.error(err?.message || t("errors.generic"));
    }
  };

  const handleMonthlyPaymentToggle = async (invoice, newEnabled) => {
    await updateInvoice(invoice, { monthlyPaymentEnabled: newEnabled });
    setInvoiceUpdateTrigger((t) => t + 1);
  };

  const handleQuoteToggle = async (invoice, newIsQuote) => {
    const updates = {
      invoiceStatus: newIsQuote ? 1 : 2,
      isQuote: newIsQuote,
    };
    const rows = invoice?.monthlyPaymentPlanRows || [];
    if (newIsQuote) {
      const total = Number(invoice.totalPrice) || 0;
      updates.amountPaid = 0;
      updates.remainingBalanceDue = total;
      updates.isPaid = false;
      updates.paidDate = null;
      if (rows.length > 0) {
        updates.downPaymentPaid = false;
        updates.paidMonthIndices = [];
        updates.paymentReceivedByDisplayIndex = {};
      }
    }
    try {
      const result = await updateInvoice(invoice, updates);
      if (result?.mob_app_password_once) {
        storeMobAppPassword(
          invoice.case_id ?? invoice.caseId,
          result.mob_app_password_once
        );
      }
      setInvoiceUpdateTrigger((t) => t + 1);
    } catch (err) {
      safeLogError(err, "Quote toggle failed");
      toast.error(err?.message || t("errors.generic"));
    }
  };

  const hasPatientIdentity = Boolean(
    patient &&
    ((patient.case_id != null && Number.isFinite(patient.case_id)) ||
      (patient.ref && String(patient.ref).trim()) ||
      (patient.name && String(patient.name).trim()))
  );

  if (!hasPatientIdentity) {
    return (
      <div className="generated-invoices-container">
        <div className="empty-state">
          <LoadingDonut size="md" message="Loading patient context..." />
          <p>Please wait before viewing this patient&apos;s invoices.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="generated-invoices-container">
        <div className="empty-state">
          <LoadingDonut size="md" message="Loading invoices..." />
        </div>
      </div>
    );
  }

  if (viewMode === VIEW_MODE_PREVIEW && selectedInvoice) {
    return (
      <div className="generated-invoices-container">
        <div className="invoice-preview-header">
          <button className="btn-back" onClick={handleBackToList}>
            <i className="fas fa-arrow-left"></i> Back to List
          </button>
          <h2>
            {previewDocumentType === "receipt"
              ? "Receipt Preview"
              : previewDocumentType === "arrangement"
                ? "Payment Arrangement Preview"
                : "Invoice Preview"}
          </h2>
        </div>
        <div className="invoice-preview-content">
          <InvoicePreview
            data={selectedInvoice}
            documentType={previewDocumentType}
          />
          {showMobAppCredentialsInPreview && (
            <InvoiceMobAppCredentialsPage
              data={previewInvoiceForExport}
              isCredentialsProvisioning={previewCredentialsProvisioning}
            />
          )}
        </div>
        <div className="invoice-preview-actions">
          <button
            className="btn-download"
            onClick={() =>
              handleDownload(
                previewInvoiceForExport ?? selectedInvoice,
                previewDocumentType
              )
            }
          >
            <i className="fas fa-download"></i> Download PDF
          </button>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="generated-invoices-container">
        <div className="empty-state">
          <i className="fas fa-file-invoice"></i>
          <h3>No invoices yet</h3>
          <p>Generated invoices will appear here.</p>
          <p className="empty-state-cta">
            Create one from the <strong>Invoice</strong> tab above after
            selecting a case.
          </p>
        </div>
      </div>
    );
  }

  const filteredInvoices = filterInvoicesByOverviewCategory(
    invoices,
    invoiceListFilter
  );

  return (
    <div className="generated-invoices-container">
      <div className="invoices-header">
        <h2>Generated Invoices</h2>
      </div>

      <GeneratedInvoicesOverview
        overview={overview}
        formatCHF={formatCHF}
        scope={scope}
        activeFilter={invoiceListFilter}
        onFilterChange={setInvoiceListFilter}
      />

      <InvoiceList
        invoices={filteredInvoices}
        formatCHF={formatCHF}
        canManageInvoices={canManageInvoices}
        updateInvoice={updateInvoice}
        onPrint={handlePrintFromList}
        onDeleteClick={handleDeleteClick}
        onViewClick={(invoice, initialDocumentType) =>
          setInvoiceModal({
            data: invoice,
            initialDocumentType: initialDocumentType || "invoice",
          })
        }
        onQuoteToggle={handleQuoteToggleRequest}
        onPaidToggle={handlePaidToggleRequest}
        onMonthlyPaymentToggle={handleMonthlyPaymentToggle}
      />

      {invoiceModal && (
        <InvoiceModal
          data={invoiceModal.data}
          initialDocumentType={invoiceModal.initialDocumentType}
          confirmLabel="Close"
          printOnOpen={Boolean(invoiceModal.printOnOpen)}
          printKey={invoiceModal.printKey ?? 0}
          onClose={() => setInvoiceModal(null)}
          onConfirm={() => setInvoiceModal(null)}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          clientName={deleteConfirm.clientName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}

      <ConfirmDialog
        open={!!toggleConfirm}
        title={toggleConfirm?.title ?? "Confirm"}
        message={toggleConfirm?.message ?? ""}
        confirmLabel="Yes"
        cancelLabel="Cancel"
        onConfirm={handleToggleConfirm}
        onCancel={() => setToggleConfirm(null)}
      />
    </div>
  );
};

export default GeneratedInvoices;
