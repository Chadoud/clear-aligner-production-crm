/**
 * Second A4 page for invoice PDF / print: mobile app login credentials.
 *
 * Credentials via getMobAppCredentialsDisplay; parent enriches `data` with
 * mob_app_password_once (session or auto-provisioned).
 */
import { CONFIG, getBrandHex } from "@/config/constants.js";
import { getInvoiceClient } from "@/utils/index.js";
import { getActiveUiLocale } from "@/utils/invoices/documentTitles.js";
import { getInvoicePdfLabels } from "@/utils/invoices/invoicePdfLabels.js";
import { getMobAppCredentialsDisplay } from "@/utils/invoices/mobAppCredentialsPage.js";
import InvoiceDocumentHeader from "./InvoiceDocumentHeader.jsx";
import "./InvoiceMobAppCredentialsPage.css";

export default function InvoiceMobAppCredentialsPage({
  data,
  /** While the modal is fetching / force-provisioning a password */
  isCredentialsProvisioning = false,
}) {
  const uiLocale = getActiveUiLocale();
  const labels = getInvoicePdfLabels(uiLocale);
  const brand = data?.brand || "Direct";
  const brandColorHex = getBrandHex(brand);
  const client = getInvoiceClient(data);
  const { username, password } = getMobAppCredentialsDisplay(data);

  const passwordAvailable = password !== "" && password != null;

  return (
    <div
      className="invoice-preview invoice-preview--mob-app-credentials"
      data-brand={brand}
      style={{ "--brand-color": brandColorHex }}
    >
      <div className="invoice-container">
        <InvoiceDocumentHeader
          brand={brand}
          title={labels.mobAppAccessTitle}
          idSuffix={client?.ref || CONFIG.INVOICE.DEFAULT_ID}
        />
        <div className="mob-app-creds-page">
          <p className="mob-app-creds-page-intro">{labels.mobAppIntro}</p>
          <div className="mob-app-creds-page-block">
            <h3 className="mob-app-creds-page-label">{labels.username}</h3>
            <p className="mob-app-creds-page-value mob-app-creds-page-value--mono">
              {username || "—"}
            </p>
          </div>
          <div className="mob-app-creds-page-block">
            <h3 className="mob-app-creds-page-label">{labels.password}</h3>
            {isCredentialsProvisioning ? (
              <p className="mob-app-creds-page-value mob-app-creds-page-value--muted no-print">
                {labels.mobAppProvisioning}
              </p>
            ) : passwordAvailable ? (
              <p className="mob-app-creds-page-value mob-app-creds-page-value--mono">
                {password}
              </p>
            ) : (
              <p className="mob-app-creds-page-value mob-app-creds-page-value--muted">
                —
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
