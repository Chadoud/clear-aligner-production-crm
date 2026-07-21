import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getInvoiceClient,
  getInvoiceTotalMismatch,
  formatCHF,
  roundToNearest5Cents,
} from "@/utils/index.js";
import { shouldAppendMobAppCredentialsPage } from "@/utils/invoices/mobAppCredentialsPage.js";
import { getMobAppPassword } from "@/utils/invoices/mobAppPasswordSession.js";
import { ensureMobAppPasswordForCase } from "@/utils/invoices/mobAppCredentialsAutoProvision.js";
import { useAuth } from "@/context/AuthContext";
import { buildInvoiceDownloadFilename } from "@/utils/pdf/index.js";
import InvoicePreview from "./InvoicePreview";
import InvoicePreviewPane from "./InvoicePreviewPane";
import InvoiceMobAppCredentialsPage from "./InvoiceMobAppCredentialsPage.jsx";
import { buildPaidItemsForReceiptDropdown } from "./config/generatedInvoicesHelpers";
import {
  getFormattedDate,
  getPaymentDateLabel,
} from "./config/receiptFormHelpers";
import IconButton from "@/components/shared/IconButton/IconButton";
import DocumentTypeSwitch from "./InvoiceModal/components/DocumentTypeSwitch";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { withTemporaryDocumentTitle } from "@/utils/print/withTemporaryDocumentTitle.js";
import "./InvoiceModal.css";

const InvoiceModal = ({
  data,
  onClose,
  onConfirm,
  initialDocumentType,
  confirmLabel,
  printOnOpen = false,
  printKey = 0,
}) => {
  const { user } = useAuth();
  /** From API after ensureMobAppPasswordForCase (username may be null when password came from session only). */
  const [provisionedCredentials, setProvisionedCredentials] = useState(null);
  const [credentialsProvisioning, setCredentialsProvisioning] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [previewDocumentType, setPreviewDocumentType] = useState(
    initialDocumentType || "invoice"
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef(null);
  const hasArrangementPlan =
    Array.isArray(data?.monthlyPaymentPlanRows) &&
    data.monthlyPaymentPlanRows.length > 0;

  const isLab = data?.brand === "Lab";

  const totalPrice = Number(data?.totalPrice) || 0;
  const currentAmountPaid = Number(data?.amountPaid) || 0;

  const paidItemsOptions = buildPaidItemsForReceiptDropdown(data);
  const paymentDateOptions = paidItemsOptions;
  const selectedPaidOption = paidItemsOptions.find((o) =>
    paymentDate.startsWith(o.value.slice(0, 7))
  );
  const paymentDateLabel =
    selectedPaidOption?.label ?? getPaymentDateLabel(paymentDate);

  useEffect(() => {
    const docType = initialDocumentType || "invoice";
    const effectiveDocType =
      isLab && docType === "receipt" ? "invoice" : docType;
    if (
      effectiveDocType === "invoice" ||
      effectiveDocType === "arrangement" ||
      effectiveDocType === "receipt"
    ) {
      setPreviewDocumentType(
        hasArrangementPlan || effectiveDocType !== "arrangement"
          ? effectiveDocType
          : "invoice"
      );
    }
  }, [data, initialDocumentType, hasArrangementPlan, isLab]);

  useEffect(() => {
    if (!hasArrangementPlan && previewDocumentType === "arrangement") {
      setPreviewDocumentType("invoice");
    }
  }, [hasArrangementPlan, previewDocumentType]);

  useEffect(() => {
    if (!data) return;
    document.body.classList.add("sa-print-invoice-modal");
    return () => {
      document.body.classList.remove("sa-print-invoice-modal");
    };
  }, [data]);

  // Auto-provision app password for PDF (session → POST → force if needed).
  useEffect(() => {
    setProvisionedCredentials(null);
    if (user?.role !== "company") {
      setCredentialsProvisioning(false);
      return;
    }
    const caseId = data?.case_id ?? data?.caseId;
    if (!caseId) {
      setCredentialsProvisioning(false);
      return;
    }
    const status = Number(data?.invoiceStatus);
    const isActiveInvoice = status === 2 || status === 3;
    if (!isActiveInvoice) {
      setCredentialsProvisioning(false);
      return;
    }

    if (getMobAppPassword(caseId)) {
      setCredentialsProvisioning(false);
      return;
    }

    if (
      String(data?.case_mob_app_password ?? "").trim() &&
      String(data?.case_username ?? "").trim()
    ) {
      setCredentialsProvisioning(false);
      return;
    }

    let cancelled = false;
    setCredentialsProvisioning(true);
    ensureMobAppPasswordForCase(caseId, data)
      .then((creds) => {
        if (cancelled || !creds?.password) return;
        setProvisionedCredentials({
          username: creds.username ?? undefined,
          password: creds.password,
        });
      })
      .finally(() => {
        if (!cancelled) setCredentialsProvisioning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data, user?.role]);

  useEffect(() => {
    if (isLab && previewDocumentType === "receipt") {
      setPreviewDocumentType("invoice");
    }
  }, [isLab, previewDocumentType]);

  const showReceiptOption = !isLab && (currentAmountPaid > 0 || data?.isPaid);

  useEffect(() => {
    if (!showReceiptOption && previewDocumentType === "receipt") {
      setPreviewDocumentType("invoice");
    }
  }, [showReceiptOption, previewDocumentType]);

  // When switching to Receipt, init payment amount and date from first paid item.
  useEffect(() => {
    if (previewDocumentType !== "receipt" || !data) return;
    const paidOpts = buildPaidItemsForReceiptDropdown(data);
    if (paidOpts.length > 0) {
      setPaymentAmount(
        roundToNearest5Cents(paidOpts[0].amount ?? 0).toFixed(2)
      );
      setPaymentDate(paidOpts[0].value);
    } else {
      setPaymentAmount("");
      setPaymentDate("");
    }
  }, [previewDocumentType, data]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(e.target)
      ) {
        setDateDropdownOpen(false);
      }
    };
    if (dateDropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dateDropdownOpen]);

  const previewDocumentTypeRef = useRef(previewDocumentType);
  previewDocumentTypeRef.current = previewDocumentType;
  const paymentAmountRef = useRef(paymentAmount);
  paymentAmountRef.current = paymentAmount;
  const paymentDateRef = useRef(paymentDate);
  paymentDateRef.current = paymentDate;

  /** Opened from invoice list: user already confirmed total mismatch there — print after layout. */
  useEffect(() => {
    if (!printOnOpen || !data) return;
    const invoiceData = data;
    const t = window.setTimeout(() => {
      const pdt = previewDocumentTypeRef.current;
      const receiptPaymentAmt = Number(paymentAmountRef.current) || 0;
      const receiptData =
        pdt === "receipt"
          ? {
              ...invoiceData,
              amountPaid: Number(invoiceData?.amountPaid) || 0,
              receiptPaymentAmount: receiptPaymentAmt,
              receiptPaymentDate: getFormattedDate(paymentDateRef.current),
              receiptDocumentsExistingPayment: true,
            }
          : invoiceData;
      const dataToUse = pdt === "receipt" ? receiptData : invoiceData;
      const client = getInvoiceClient(dataToUse);
      const safeName = String(client?.name || "client").replace(/\s+/g, "_");
      const type =
        pdt === "receipt"
          ? "receipt"
          : pdt === "arrangement"
            ? "arrangement"
            : "invoice";
      const filename = buildInvoiceDownloadFilename(
        type,
        safeName,
        client?.ref
      );
      withTemporaryDocumentTitle(filename, () => window.print());
    }, 400);
    return () => window.clearTimeout(t);
    // Re-run when opening print for another invoice (id) or new printKey; avoid
    // listing full `data` so parent re-renders don’t reschedule print.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- data?.id + printKey scope the effect
  }, [printOnOpen, printKey, data?.id]);

  if (!data) return null;

  // Build the enriched invoice data used for the credentials page:
  // session password > provisioned credentials > raw data.
  const caseIdForCreds = data?.case_id ?? data?.caseId;
  const sessionPassword = getMobAppPassword(caseIdForCreds);
  const credentialUser =
    provisionedCredentials?.username != null &&
    String(provisionedCredentials.username).trim() !== ""
      ? provisionedCredentials.username
      : data?.case_username;
  const credentialsBase =
    credentialUser != null && String(credentialUser).trim() !== ""
      ? { ...data, case_username: credentialUser }
      : data;
  const credentialsPassword =
    sessionPassword ??
    provisionedCredentials?.password ??
    data?.case_mob_app_password ??
    null;
  const credentialsData = credentialsPassword
    ? { ...credentialsBase, mob_app_password_once: credentialsPassword }
    : credentialsBase;

  const receiptPaymentAmt = Number(paymentAmount) || 0;
  const receiptData =
    previewDocumentType === "receipt"
      ? {
          ...data,
          amountPaid: currentAmountPaid,
          receiptPaymentAmount: receiptPaymentAmt,
          receiptPaymentDate: getFormattedDate(paymentDate),
          receiptDocumentsExistingPayment: true,
        }
      : data;

  // Use credentialsData so the page appears even when case_username came from
  // the async provision-credentials response rather than the stored invoice payload.
  const showMobAppCredentialsPage =
    previewDocumentType === "invoice" &&
    shouldAppendMobAppCredentialsPage(credentialsData, "invoice");

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const printWithDefaultFilename = (filename) => {
    withTemporaryDocumentTitle(filename, () => window.print());
  };

  const doPrintOrDownload = () => {
    const dataToUse = previewDocumentType === "receipt" ? receiptData : data;
    const client = getInvoiceClient(dataToUse);
    const safeName = String(client?.name || "client").replace(/\s+/g, "_");
    const type =
      previewDocumentType === "receipt"
        ? "receipt"
        : previewDocumentType === "arrangement"
          ? "arrangement"
          : "invoice";
    const filename = buildInvoiceDownloadFilename(type, safeName, client?.ref);
    printWithDefaultFilename(filename);
  };

  const handlePrint = () => {
    const dataToExport = previewDocumentType === "receipt" ? receiptData : data;
    if (previewDocumentType === "invoice") {
      const mismatch = getInvoiceTotalMismatch(dataToExport);
      if (mismatch.mismatch) {
        setConfirmExportOpen(true);
        return;
      }
    }
    doPrintOrDownload();
  };

  const handleZoomToggle = (e) => {
    e?.stopPropagation?.();
    setIsZoomed((z) => !z);
  };

  return createPortal(
    <div
      className="modal"
      id="invoiceModal"
      style={{ display: "flex" }}
      onClick={(e) => e.target.id === "invoiceModal" && onClose()}
    >
      <div className="modal-content invoice-modal-content">
        <div className="modal-header">
          <h2>Invoice preview</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn-zoom"
              onClick={handleZoomToggle}
              title={isZoomed ? "Zoom Out" : "Zoom In"}
            >
              <i
                className={`fas ${isZoomed ? "fa-search-minus" : "fa-search-plus"}`}
              ></i>
            </button>
            <button className="modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div className="invoice-modal-summary" aria-live="polite">
          <span className="invoice-modal-summary-client">
            {getInvoiceClient(data)?.name || "—"}
          </span>
          <span className="invoice-modal-summary-total">
            {formatCHF(totalPrice)} total
          </span>
        </div>
        <DocumentTypeSwitch
          previewDocumentType={previewDocumentType}
          onDocumentTypeChange={setPreviewDocumentType}
          hasArrangementPlan={hasArrangementPlan}
          showReceiptOption={!isLab && (currentAmountPaid > 0 || data?.isPaid)}
        />

        {previewDocumentType === "receipt" && !isLab && (
          <div className="invoice-modal-receipt-form">
            {paidItemsOptions.length === 0 ? (
              <p className="receipt-form-empty-hint">
                Mark at least one payment as paid on the invoice card (Down
                payment or a month) to view and print receipts.
              </p>
            ) : (
              <div className="receipt-form-row">
                <div
                  className="receipt-form-group receipt-form-group--date-dropdown"
                  ref={dateDropdownRef}
                >
                  <label id="invoice-modal-payment-date-label">
                    Select receipt to view
                  </label>
                  <div
                    className="custom-dropdown-wrap custom-date-dropdown"
                    aria-expanded={dateDropdownOpen}
                    aria-haspopup="listbox"
                    role="combobox"
                  >
                    <button
                      type="button"
                      className="custom-dropdown-trigger"
                      onClick={() => setDateDropdownOpen((o) => !o)}
                      aria-label="Select receipt"
                    >
                      <span className="custom-dropdown-trigger-text">
                        {paymentDateLabel}
                      </span>
                      <i
                        className={`fas fa-chevron-down custom-dropdown-chevron ${dateDropdownOpen ? "custom-dropdown-chevron-open" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {dateDropdownOpen && (
                      <ul
                        className="custom-dropdown-menu"
                        role="listbox"
                        aria-label="Select receipt"
                      >
                        {paymentDateOptions.map((opt) => (
                          <li key={opt.value} role="option">
                            <button
                              type="button"
                              className={`custom-dropdown-item ${paymentDate.startsWith(opt.value.slice(0, 7)) ? "custom-dropdown-item--selected" : ""}`}
                              onClick={() => {
                                setPaymentDate(opt.value);
                                if (opt.amount != null) {
                                  setPaymentAmount(
                                    roundToNearest5Cents(opt.amount).toFixed(2)
                                  );
                                }
                                setDateDropdownOpen(false);
                              }}
                            >
                              {opt.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <InvoicePreviewPane
          className="modal-body"
          isZoomed={isZoomed}
          onZoomToggle={handleZoomToggle}
          deps={[data, previewDocumentType, showMobAppCredentialsPage]}
        >
          <>
            <InvoicePreview
              data={receiptData}
              documentType={previewDocumentType}
            />
            {showMobAppCredentialsPage ? (
              <InvoiceMobAppCredentialsPage
                data={credentialsData}
                isCredentialsProvisioning={credentialsProvisioning}
              />
            ) : null}
          </>
        </InvoicePreviewPane>
        <div className="modal-footer modal-footer--actions">
          <IconButton variant="cancel" onClick={onClose}>
            Cancel
          </IconButton>
          <IconButton
            variant="print"
            icon="fas fa-print"
            onClick={handlePrint}
            title="Print"
            aria-label="Print invoice"
          >
            Print
          </IconButton>
          {confirmLabel !== "Close" ? (
            <IconButton
              variant="primary"
              className="btn-confirm-save"
              onClick={handleConfirm}
            >
              {confirmLabel ?? "Confirm & save"}
            </IconButton>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirmExportOpen}
        title="Invoice total mismatch"
        message="The invoice total does not match the sum of line items. Print anyway?"
        confirmLabel="Print anyway"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onCancel={() => setConfirmExportOpen(false)}
        onConfirm={() => {
          doPrintOrDownload();
          setConfirmExportOpen(false);
        }}
      />
    </div>,
    document.body
  );
};

export default InvoiceModal;
