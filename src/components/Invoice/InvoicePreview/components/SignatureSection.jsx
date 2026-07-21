import { getActiveUiLocale } from "@/utils/invoices/documentTitles.js";
import { getInvoicePdfLabels } from "@/utils/invoices/invoicePdfLabels.js";
import { getSignatureDateText } from "@/utils/index.js";

export default function SignatureSection({
  isArrangement = false,
  locale = getActiveUiLocale(),
}) {
  const labels = getInvoicePdfLabels(locale);
  const dateText = getSignatureDateText(isArrangement, locale);
  return (
    <div className="invoice-signature-section">
      <div className="invoice-signature-left">{dateText}</div>
      <div className="invoice-signature-right">
        <span className="invoice-signature-label">{labels.signature}</span>
        <div className="invoice-signature-box" />
      </div>
    </div>
  );
}
