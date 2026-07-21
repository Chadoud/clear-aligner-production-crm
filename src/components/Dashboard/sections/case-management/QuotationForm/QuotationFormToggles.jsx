import ToggleLabel from "@/components/shared/ToggleLabel/ToggleLabel.jsx";
import { useTranslation } from "react-i18next";

/**
 * Toggles row: Quote, Scan Consultation (Direct only), Monthly Payment (Direct), Free.
 * Scan Consultation adds Analyse & consultation + Scan lines (crossed out) on the invoice.
 */
export default function QuotationFormToggles({
  brand,
  isQuote,
  onQuoteChange,
  showFreeServices,
  totalInvoiceFree,
  onScanConsultationChange,
  onFreeChange,
  monthlyPaymentEnabled,
  onMonthlyPaymentChange,
}) {
  const { t } = useTranslation();
  return (
    <div className="form-group form-toggles-row">
      <ToggleLabel
        label={t("quotation.toggleQuote")}
        checked={isQuote}
        onChange={onQuoteChange}
      />
      {brand !== "Lab" && (
        <ToggleLabel
          label={t("quotation.toggleScanConsultation")}
          checked={showFreeServices}
          onChange={onScanConsultationChange}
        />
      )}
      {brand === "Direct" && (
        <ToggleLabel
          label={t("quotation.toggleMonthlyPayment")}
          checked={monthlyPaymentEnabled}
          onChange={onMonthlyPaymentChange}
        />
      )}
      <ToggleLabel
        label={t("quotation.toggleFree")}
        checked={totalInvoiceFree}
        onChange={onFreeChange}
      />
    </div>
  );
}
