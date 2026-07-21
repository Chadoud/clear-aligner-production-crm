/**
 * Switch between Invoice / Arrangement Plan / Receipt in the invoice modal.
 */
export default function DocumentTypeSwitch({
  previewDocumentType,
  onDocumentTypeChange,
  hasArrangementPlan,
  showReceiptOption,
}) {
  return (
    <div className="invoice-preview-switch">
      <button
        type="button"
        className={`preview-switch-btn ${previewDocumentType === "invoice" ? "active" : ""}`}
        onClick={() => onDocumentTypeChange("invoice")}
      >
        Invoice
      </button>
      {hasArrangementPlan && (
        <button
          type="button"
          className={`preview-switch-btn ${previewDocumentType === "arrangement" ? "active" : ""}`}
          onClick={() => onDocumentTypeChange("arrangement")}
        >
          Arrangement Plan
        </button>
      )}
      {showReceiptOption && (
        <button
          type="button"
          className={`preview-switch-btn ${previewDocumentType === "receipt" ? "active" : ""}`}
          onClick={() => onDocumentTypeChange("receipt")}
        >
          Receipt
        </button>
      )}
    </div>
  );
}
