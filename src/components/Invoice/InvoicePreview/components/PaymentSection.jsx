import { CONFIG } from "@/config/constants";

export default function PaymentSection({ qrSectionPath }) {
  return (
    <div className="invoice-payment-section">
      <img
        src={qrSectionPath}
        alt="QR Code Payment Section"
        className="qr-code-section-image"
        onError={(e) => {
          if (e.target.dataset.fallbackApplied === "true") {
            e.target.style.display = "none";
            return;
          }
          e.target.dataset.fallbackApplied = "true";
          e.target.src = CONFIG.ASSETS.QR_CODE_SECTION;
        }}
      />
    </div>
  );
}
