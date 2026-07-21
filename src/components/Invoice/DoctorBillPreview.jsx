/**
 * DoctorBillPreview – HTML preview of doctor invoice (same look as patient InvoicePreview).
 * Renders in the modal without PDF viewer chrome; uses shared invoice CSS.
 */

import { useMemo, useState, useEffect } from "react";
import {
  CONFIG,
  getBrandHex,
  getDoctorBillingQrPath,
} from "@/config/constants.js";
import { getDoctorInfoForInvoice } from "@/data/cabinets.js";
import {
  getFromSectionDateText,
  formatCHF,
  formatInvoiceDateForDisplay,
  getDoctorInvoiceIdForPreview,
} from "@/utils/index.js";
import { getActiveUiLocale } from "@/utils/invoices/documentTitles.js";
import {
  formatEmailLine,
  getInvoicePdfLabels,
} from "@/utils/invoices/invoicePdfLabels.js";
import InvoiceDocumentHeader from "./InvoiceDocumentHeader.jsx";
import VatTotalRows from "./InvoicePreview/components/VatTotalRows.jsx";
import { LAB_VAT_RATE } from "@/utils/invoices/vatBreakdown.js";
import "./InvoicePreview.css";
import "./DoctorBillPreview.css";

const config = CONFIG.INVOICE;

function normalizeAssetPath(path) {
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
}

export default function DoctorBillPreview({ doctorName, lineItems, billDate }) {
  const [refId, setRefId] = useState("");
  const uiLocale = getActiveUiLocale();
  const labels = getInvoicePdfLabels(uiLocale);
  const doctorInfo = useMemo(
    () => getDoctorInfoForInvoice(doctorName ?? ""),
    [doctorName]
  );
  const qrSectionPath = useMemo(
    () => normalizeAssetPath(getDoctorBillingQrPath(doctorName)),
    [doctorName]
  );
  const totalAmount = (lineItems || []).reduce(
    (s, row) => s + (Number(row.amount) || 0),
    0
  );

  useEffect(() => {
    let cancelled = false;
    getDoctorInvoiceIdForPreview(doctorName ?? "")
      .then((id) => {
        if (!cancelled) setRefId(id ?? "");
      })
      .catch(() => {
        if (!cancelled) setRefId("");
      });
    return () => {
      cancelled = true;
    };
  }, [doctorName]);
  const displayName = (() => {
    const name = doctorInfo?.name || doctorName;
    return name ? (name.startsWith("Dr") ? name : `Dr. ${name}`) : "";
  })();
  return (
    <div
      className="invoice-preview invoice-preview--doctor"
      data-brand="Lab"
      style={{ "--brand-color": getBrandHex("Lab") }}
    >
      <div className="invoice-container">
        <InvoiceDocumentHeader
          brand="Lab"
          title={labels.doctorBillTitle}
          idSuffix={refId}
        />

        <div className="invoice-info-section">
          <div className="invoice-from">
            <h3>{labels.from}</h3>
            <p>{config.COMPANY.ADDRESS}</p>
            <p>{config.COMPANY.WEBSITE}</p>
            <p>{config.COMPANY.PHONE}</p>
            <p>{getFromSectionDateText(billDate, uiLocale)}</p>
          </div>
          <div className="invoice-bill-to">
            <h3>{labels.to}</h3>
            {displayName && <p>{displayName}</p>}
            {doctorInfo?.address && <p>{doctorInfo.address}</p>}
            {doctorInfo?.phone && <p>{doctorInfo.phone}</p>}
            {doctorInfo?.email && (
              <p>{formatEmailLine(doctorInfo.email, uiLocale)}</p>
            )}
          </div>
        </div>

        <div className="invoice-treatment-section">
          <h3>{labels.treatment}</h3>
          <table
            className="invoice-table invoice-table--doctor"
            style={{ "--service-font-size": "10px" }}
          >
            <thead>
              <tr>
                <th>{labels.patientName}</th>
                <th>{labels.ref}</th>
                <th>{labels.invoiceDate}</th>
                <th>{labels.amount}</th>
              </tr>
            </thead>
            <tbody>
              {(lineItems || []).length === 0 ? (
                <tr>
                  <td colSpan={4}>{labels.noPatients}</td>
                </tr>
              ) : (
                (lineItems || []).map((row, index) => (
                  <tr key={`${row.caseRef}-${index}`}>
                    <td>{row.patientName ?? "—"}</td>
                    <td>
                      {row.caseRef != null && row.caseRef !== ""
                        ? String(row.caseRef)
                        : "—"}
                    </td>
                    <td>{formatInvoiceDateForDisplay(row.invoiceDate)}</td>
                    <td>{formatCHF(Number(row.amount) || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <VatTotalRows totalTTC={totalAmount} vatRate={LAB_VAT_RATE} />

          <div className="invoice-payment-section">
            {qrSectionPath && (
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
                  e.target.src = getDoctorBillingQrPath(doctorName);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
