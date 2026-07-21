/**
 * Shared header for patient invoice and doctor bill HTML previews.
 * Uses the generic inline SVG mark (html2canvas-friendly) for every brand key.
 */

import { CONFIG, getBrandHex } from "@/config/constants.js";
import BrandMark from "@/components/shared/BrandMark/BrandMark.jsx";
import {
  INVOICE_BRAND_LOGO_HEIGHT_PX,
  INVOICE_BRAND_LOGO_MAX_WIDTH_PX,
} from "./config/invoiceBrandLogo.js";
import { getActiveUiLocale } from "@/utils/invoices/documentTitles.js";
import { formatIdLine } from "@/utils/invoices/invoicePdfLabels.js";

/**
 * @param {object} props
 * @param {string} props.brand
 * @param {string} props.title
 * @param {string} [props.idSuffix]
 */
export default function InvoiceDocumentHeader({ brand, title, idSuffix = "" }) {
  const brandColorHex = getBrandHex(brand);
  const idLabel = formatIdLine(idSuffix, getActiveUiLocale());

  return (
    <div className="invoice-header">
      <div className="invoice-header-top">
        <div className="invoice-logo">
          <BrandMark
            height={INVOICE_BRAND_LOGO_HEIGHT_PX}
            className="logo-image logo-image--lab"
            textColor={brandColorHex}
            ariaLabel={CONFIG.INVOICE.COMPANY.NAME}
            style={{
              maxWidth: INVOICE_BRAND_LOGO_MAX_WIDTH_PX,
            }}
          />
        </div>
        <div className="invoice-id">{idLabel}</div>
      </div>
      <div className="invoice-title">{title}</div>
    </div>
  );
}
