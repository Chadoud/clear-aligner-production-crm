import { useEffect } from "react";
import { createPortal } from "react-dom";
import DoctorBillPreview from "@/components/Invoice/DoctorBillPreview";
import InvoicePreviewPane from "@/components/Invoice/InvoicePreviewPane";
import IconButton from "@/components/shared/IconButton/IconButton";
import { formatCHF } from "@/utils/invoices/index.js";

export default function BillModal({
  modal,
  showBillPreview,
  billPreviewZoomed,
  generatedBlob,
  billGenerating = false,
  canGenerateBill = true,
  onClose,
  onZoomToggle,
  onPreviewBill,
  onBackToList,
  onPrint,
  onGenerateBill,
  onRemoveItem,
}) {
  useEffect(() => {
    if (!modal) return;
    document.body.classList.add("sa-print-doctor-bill-modal");
    return () => document.body.classList.remove("sa-print-doctor-bill-modal");
  }, [modal]);

  if (!modal) return null;

  return createPortal(
    <div
      id="doctorBillModal"
      className="doctors-billing-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctors-billing-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`doctors-billing-modal${showBillPreview ? " doctors-billing-modal--preview" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="doctors-billing-modal-header">
          <h2
            id="doctors-billing-modal-title"
            className="doctors-billing-modal-title"
          >
            {showBillPreview ? "Bill preview" : `Bill for ${modal.doctorName}`}
          </h2>
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-sm)",
              alignItems: "center",
            }}
          >
            {showBillPreview && (
              <button
                type="button"
                className="btn-zoom"
                onClick={onZoomToggle}
                title={billPreviewZoomed ? "Zoom out" : "Zoom in"}
                aria-label={billPreviewZoomed ? "Zoom out" : "Zoom in"}
              >
                <i
                  className={`fas ${billPreviewZoomed ? "fa-search-minus" : "fa-search-plus"}`}
                  aria-hidden
                />
              </button>
            )}
            <button
              type="button"
              className="doctors-billing-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="fas fa-times" aria-hidden />
            </button>
          </div>
        </div>
        {showBillPreview ? (
          <>
            <InvoicePreviewPane
              className="doctors-billing-modal-body-preview"
              isZoomed={billPreviewZoomed}
              onZoomToggle={onZoomToggle}
              deps={[modal?.doctorName, modal?.lineItems, modal?.billDate]}
            >
              <DoctorBillPreview
                doctorName={modal.doctorName}
                lineItems={modal.lineItems}
                billDate={modal.billDate}
              />
            </InvoicePreviewPane>
            <div className="doctors-billing-modal-footer">
              {generatedBlob ? (
                <>
                  <IconButton
                    variant="print"
                    icon="fas fa-print"
                    onClick={onPrint}
                    aria-label="Print bill PDF"
                  >
                    Print
                  </IconButton>
                  <IconButton
                    variant="secondary"
                    className="doctors-billing-btn-primary"
                    icon="fas fa-times"
                    onClick={onClose}
                  >
                    Close
                  </IconButton>
                </>
              ) : !modal.previewOnly && canGenerateBill ? (
                <>
                  <IconButton
                    variant="secondary"
                    icon="fas fa-arrow-left"
                    onClick={onBackToList}
                  >
                    Back to list
                  </IconButton>
                  <IconButton
                    variant="print"
                    icon="fas fa-print"
                    onClick={onPrint}
                    aria-label="Print bill PDF"
                  >
                    Print
                  </IconButton>
                  <IconButton
                    variant="secondary"
                    className="doctors-billing-btn-primary"
                    icon="far fa-file-pdf"
                    onClick={onGenerateBill}
                    disabled={billGenerating}
                    aria-busy={billGenerating}
                  >
                    {billGenerating ? "Generating…" : "Generate bill"}
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton
                    variant="print"
                    icon="fas fa-print"
                    onClick={onPrint}
                    aria-label="Print bill PDF"
                  >
                    Print
                  </IconButton>
                  <IconButton
                    variant="secondary"
                    className="doctors-billing-btn-primary"
                    icon="fas fa-times"
                    onClick={onClose}
                  >
                    Close
                  </IconButton>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="doctors-billing-modal-body">
              {canGenerateBill && (
                <p
                  style={{
                    marginBottom: "1rem",
                    fontSize: "0.875rem",
                    color: "var(--db-text-secondary)",
                  }}
                >
                  Remove any patient you do not want on this bill. Preview to
                  see the PDF in this popup, then generate; all listed
                  patients&apos; unpaid invoices will move to the billed tab.
                </p>
              )}
              {modal.lineItems.length === 0 ? (
                <p className="doctors-billing-empty">
                  {canGenerateBill
                    ? "No patients left. Add patients from the main list or close."
                    : "No patients in this bill."}
                </p>
              ) : (
                modal.lineItems.map((item, idx) => (
                  <div
                    key={
                      item.invoiceId ??
                      `${item.caseRef}-${item.invoiceRef ?? idx}`
                    }
                    className="doctors-billing-modal-line-item"
                  >
                    <span>
                      {item.patientName} · {item.caseRef}
                      {item.invoiceRef ? ` · ${item.invoiceRef}` : ""} ·{" "}
                      {formatCHF(item.amount)}
                    </span>
                    {canGenerateBill && (
                      <IconButton
                        variant="secondary"
                        icon="fas fa-times"
                        onClick={() => onRemoveItem(item)}
                        aria-label={`Remove ${item.patientName} from bill`}
                      >
                        Remove
                      </IconButton>
                    )}
                  </div>
                ))
              )}
              {modal.lineItems.length > 0 && (
                <p style={{ marginTop: "1rem", fontWeight: 600 }}>
                  Total:{" "}
                  {formatCHF(
                    modal.lineItems.reduce(
                      (s, i) => s + (Number(i.amount) || 0),
                      0
                    )
                  )}
                </p>
              )}
            </div>
            <div className="doctors-billing-modal-footer">
              <IconButton variant="cancel" onClick={onClose}>
                Cancel
              </IconButton>
              <IconButton
                variant="secondary"
                icon="far fa-eye"
                onClick={onPreviewBill}
                disabled={modal.lineItems.length === 0}
                aria-label="Preview bill in popup"
              >
                Preview
              </IconButton>
              <IconButton
                variant="print"
                icon="fas fa-print"
                onClick={onPrint}
                disabled={modal.lineItems.length === 0}
                aria-label="Print bill PDF"
              >
                Print
              </IconButton>
              {canGenerateBill && (
                <IconButton
                  variant="secondary"
                  className="doctors-billing-btn-primary"
                  icon="far fa-file-pdf"
                  onClick={onGenerateBill}
                  disabled={modal.lineItems.length === 0 || billGenerating}
                  aria-busy={billGenerating}
                >
                  {billGenerating ? "Generating…" : "Generate bill"}
                </IconButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
