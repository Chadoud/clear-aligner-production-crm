import { formatCHF } from "@/utils/index.js";

/** Single total line (no HT/VAT breakdown). */
export default function SimpleTotalRow({ label, amount, showTtc = false }) {
  return (
    <div className="invoice-total">
      <div>
        <strong>{label}</strong>
      </div>
      <div className="invoice-total-right">
        <strong>{formatCHF(Number(amount))}</strong>
        {showTtc && <span className="invoice-ttc"> TTC</span>}
      </div>
    </div>
  );
}
