import { formatCHF } from "@/utils/index.js";
import { getActiveUiLocale } from "@/utils/invoices/documentTitles.js";
import { getVatLabels } from "@/utils/invoices/vatLabels.js";
import { computeVatBreakdown } from "@/utils/invoices/vatBreakdown.js";

/**
 * VAT breakdown total section: Subtotal excl. VAT / VAT / TOTAL incl. VAT
 *
 * Used when the invoice has a vatRate (e.g. Lab treatment invoices).
 * The TTC total is the fixed preset price; HT and VAT are derived from it.
 *
 * @param {Object} props
 * @param {number} props.totalTTC - Total including tax (CHF)
 * @param {number} props.vatRate  - VAT rate, e.g. 0.081
 */
export default function VatTotalRows({ totalTTC, vatRate }) {
  const {
    totalHT,
    vatAmount,
    totalTTC: ttc,
  } = computeVatBreakdown(totalTTC, vatRate);
  const vatPct = (vatRate * 100).toFixed(1);
  const labels = getVatLabels(getActiveUiLocale());

  return (
    <div className="invoice-vat-section">
      <div className="invoice-total invoice-total--ht">
        <div>
          <span>{labels.subtotalExclVat}</span>
        </div>
        <div className="invoice-total-right">
          <span>{formatCHF(totalHT)}</span>
        </div>
      </div>
      <div className="invoice-total invoice-total--tva">
        <div>
          <span>{labels.formatVatLine(vatPct)}</span>
        </div>
        <div className="invoice-total-right">
          <span>{formatCHF(vatAmount)}</span>
        </div>
      </div>
      <div className="invoice-total invoice-total--ttc">
        <div>
          <strong>{labels.totalInclVat}</strong>
        </div>
        <div className="invoice-total-right">
          <strong>{formatCHF(ttc)}</strong>
        </div>
      </div>
    </div>
  );
}
