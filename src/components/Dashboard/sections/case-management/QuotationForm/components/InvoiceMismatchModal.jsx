/**
 * Modal shown when invoice total doesn't match sum of line items.
 */
import { useTranslation } from "react-i18next";
import { formatCHF } from "@/utils/invoices/invoiceFormatters.js";

export default function InvoiceMismatchModal({
  totalPrice,
  sumFromLines,
  onFixTotal,
  onContinueAnyway,
  onCancel,
}) {
  const { t } = useTranslation();
  return (
    <div
      className="invoice-mismatch-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-mismatch-title"
    >
      <div
        className="invoice-mismatch-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="invoice-mismatch-title" className="invoice-mismatch-title">
          {t("quotation.mismatchTitle")}
        </h2>
        <p className="invoice-mismatch-message">
          {t("quotation.mismatchMessage", {
            total: formatCHF(totalPrice),
            sum: formatCHF(sumFromLines),
          })}
        </p>
        <div className="invoice-mismatch-actions">
          <button
            type="button"
            className="invoice-mismatch-btn invoice-mismatch-btn-cancel"
            onClick={onCancel}
          >
            {t("quotation.mismatchCancel")}
          </button>
          <button
            type="button"
            className="invoice-mismatch-btn invoice-mismatch-btn-fix"
            onClick={onFixTotal}
          >
            {t("quotation.mismatchFixTotal")}
          </button>
          <button
            type="button"
            className="invoice-mismatch-btn invoice-mismatch-btn-continue"
            onClick={onContinueAnyway}
          >
            {t("quotation.mismatchContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
