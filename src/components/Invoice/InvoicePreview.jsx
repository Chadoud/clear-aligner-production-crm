/**
 * InvoicePreview Component
 *
 * Displays a preview of the invoice with all services, pricing, and payment information.
 *
 * @module components/Invoice/InvoicePreview
 */

import { useTranslation } from "react-i18next";
import { CONFIG, getBrandConfig, getBrandHex } from "@/config/constants.js";
import { useResolvedDoctorInfo } from "@/hooks/useResolvedDoctorInfo.js";
import { getActiveUiLocale } from "@/utils/invoices/documentTitles.js";
import {
  formatBornOnLine,
  formatEmailLine,
  formatMonthsCount,
  getInvoicePdfLabels,
} from "@/utils/invoices/invoicePdfLabels.js";
import { isPanoramiqueService } from "@/constants/index.js";
import {
  getFromSectionDateText,
  formatInvoiceDateForDisplay,
  formatCHF,
  getInvoiceClient,
  buildInvoiceTableRows,
  calculateInvoiceTotal,
} from "@/utils/index.js";
import { getViewTitle } from "./InvoicePreview/config/documentTypes";
import { getInvoiceTitleType } from "@/utils/invoices/quoteHelpers.js";
import SimpleTotalRow from "./InvoicePreview/components/SimpleTotalRow";
import VatTotalRows from "./InvoicePreview/components/VatTotalRows";
import {
  resolveVatRate,
  SWISS_VAT_RATE,
} from "@/utils/invoices/vatBreakdown.js";
import SignatureSection from "./InvoicePreview/components/SignatureSection";
import PaymentSection from "./InvoicePreview/components/PaymentSection";
import InvoiceDocumentHeader from "./InvoiceDocumentHeader.jsx";
import "./InvoicePreview.css";

export default function InvoicePreview({ data, documentType = "invoice" }) {
  useTranslation("pdf");
  const uiLocale = getActiveUiLocale();
  const labels = getInvoicePdfLabels(uiLocale);
  const { data: resolvedData } = useResolvedDoctorInfo(data);
  const dataToUse = resolvedData ?? data;
  const config = CONFIG.INVOICE;
  const brand = dataToUse?.brand || "Direct";
  const brandConfig = getBrandConfig(brand);
  const isReceipt = documentType === "receipt";
  const isArrangement = documentType === "arrangement";

  const viewTitle = getViewTitle(
    getInvoiceTitleType(dataToUse, documentType),
    brand,
    uiLocale
  );

  const vatRate = resolveVatRate(Number(dataToUse?.vatRate) || SWISS_VAT_RATE);

  const invoiceRows = buildInvoiceTableRows({
    services: dataToUse?.services,
    brand,
    showFreeServices: dataToUse?.showFreeServices,
    labPrice: dataToUse?.labPrice,
    totalPrice: dataToUse?.totalPrice,
    vatRate,
  });

  const calculatedTotal = calculateInvoiceTotal({
    services: dataToUse?.services,
    labPrice: dataToUse?.labPrice,
  });

  const totalFromData = Number(dataToUse?.totalPrice);
  const totalToShow =
    dataToUse?.totalPrice !== undefined &&
    dataToUse?.totalPrice !== "" &&
    !Number.isNaN(totalFromData)
      ? totalFromData
      : calculatedTotal;
  const amountPaid = Math.max(0, Number(dataToUse?.amountPaid) || 0);

  const receiptPaymentAmount =
    dataToUse?.receiptPaymentAmount !== undefined
      ? Math.max(0, Number(dataToUse?.receiptPaymentAmount) || 0)
      : isReceipt
        ? amountPaid || totalToShow
        : null;
  const receiptPaymentDate =
    dataToUse?.receiptPaymentDate || dataToUse?.paidDate;
  // When receiptDocumentsExistingPayment: receipt documents an already-recorded payment, remaining = total − amountPaid
  const receiptRemainingBalance =
    receiptPaymentAmount != null
      ? dataToUse?.receiptDocumentsExistingPayment
        ? Math.max(0, totalToShow - amountPaid)
        : Math.max(0, totalToShow - amountPaid - receiptPaymentAmount)
      : null;

  const fixedServicesCount =
    brand === "Direct" && dataToUse?.showFreeServices !== false ? 2 : 0;
  const panoramiqueCount = (dataToUse?.services || []).some(
    isPanoramiqueService
  )
    ? 1
    : 0;
  const totalServices =
    invoiceRows.length + fixedServicesCount + panoramiqueCount;
  const serviceFontSize =
    totalServices > 8 ? "8px" : totalServices > 5 ? "9px" : "10px";

  const brandColorHex = getBrandHex(brand);
  const qrSectionPath =
    brandConfig.QR_CODE_SECTION || CONFIG.ASSETS.QR_CODE_SECTION;
  const client = getInvoiceClient(dataToUse);

  const fromDate =
    isReceipt && receiptPaymentDate
      ? getFromSectionDateText(receiptPaymentDate, uiLocale)
      : getFromSectionDateText(dataToUse?.generatedDate, uiLocale);

  const renderTotalSection = () => {
    if (isReceipt) {
      const amount =
        receiptPaymentAmount != null ? receiptPaymentAmount : totalToShow;
      return <SimpleTotalRow label={labels.paymentReceived} amount={amount} />;
    }
    if (isArrangement) {
      return (
        <SimpleTotalRow label={labels.total} amount={totalToShow} showTtc />
      );
    }
    if (vatRate > 0) {
      return <VatTotalRows totalTTC={totalToShow} vatRate={vatRate} />;
    }
    return <SimpleTotalRow label={labels.total} amount={totalToShow} />;
  };

  return (
    <div
      className="invoice-preview"
      data-brand={brand}
      style={{ "--brand-color": brandColorHex }}
    >
      <div className="invoice-container">
        <InvoiceDocumentHeader
          brand={brand}
          title={viewTitle}
          idSuffix={client?.ref || CONFIG.INVOICE.DEFAULT_ID}
        />

        <div
          className={
            brand === "Lab" && dataToUse?.doctorInfo
              ? "invoice-info-section invoice-info-section--three-cols"
              : "invoice-info-section"
          }
        >
          <div className="invoice-from">
            <h3>{labels.from}</h3>
            <p>{config.COMPANY.ADDRESS}</p>
            <p>{config.COMPANY.WEBSITE}</p>
            <p>{config.COMPANY.PHONE}</p>
            <p>{fromDate}</p>
          </div>
          {brand === "Lab" && dataToUse?.doctorInfo ? (
            <>
              <div className="invoice-bill-to">
                <h3>{labels.to}</h3>
                {dataToUse.doctorInfo?.name && (
                  <p>{dataToUse.doctorInfo.name}</p>
                )}
                {dataToUse.doctorInfo?.address && (
                  <p>{dataToUse.doctorInfo.address}</p>
                )}
                {dataToUse.doctorInfo?.phone && (
                  <p>{dataToUse.doctorInfo.phone}</p>
                )}
                {dataToUse.doctorInfo?.email && (
                  <p>{formatEmailLine(dataToUse.doctorInfo.email, uiLocale)}</p>
                )}
              </div>
              <div className="invoice-patient">
                <h3>{labels.patient}</h3>
                {client?.name && <p>{client.name}</p>}
                {client?.born && (
                  <p>{formatBornOnLine(client.born, uiLocale)}</p>
                )}
                {client?.address && <p>{client.address}</p>}
                {client?.email && (
                  <p>{formatEmailLine(client.email, uiLocale)}</p>
                )}
                {client?.phone && <p>{client.phone}</p>}
              </div>
            </>
          ) : (
            <div className="invoice-bill-to">
              <h3>{labels.to}</h3>
              {client?.name && <p>{client.name}</p>}
              {client?.born && <p>{formatBornOnLine(client.born, uiLocale)}</p>}
              {client?.address && <p>{client.address}</p>}
              {client?.email && (
                <p>{formatEmailLine(client.email, uiLocale)}</p>
              )}
              {client?.phone && <p>{client.phone}</p>}
            </div>
          )}
        </div>

        {!isArrangement ? (
          <div className="invoice-treatment-section">
            <h3>{isReceipt ? labels.treatmentPaid : labels.treatment}</h3>
            {dataToUse?.treatmentDuration && (
              <div className="treatment-duration-row">
                <span className="duration-label">{labels.duration}</span>
                <span className="duration-value">
                  {formatMonthsCount(dataToUse.treatmentDuration, uiLocale)}
                </span>
              </div>
            )}
            {dataToUse?.treatmentSteps != null &&
              String(dataToUse.treatmentSteps).trim() !== "" && (
                <div className="treatment-duration-row">
                  <span className="duration-label">{labels.steps}</span>
                  <span className="duration-value">
                    {String(dataToUse.treatmentSteps).trim()}
                  </span>
                </div>
              )}

            <table
              className="invoice-table invoice-table--patient"
              style={{ "--service-font-size": serviceFontSize }}
            >
              <thead>
                <tr>
                  <th>{labels.tableQty}</th>
                  <th>{labels.tableCode}</th>
                  <th>{labels.tableDescription}</th>
                  <th>{labels.tableVpt}</th>
                  <th>{labels.tablePoints}</th>
                  <th>{labels.tableTotalPoints}</th>
                  <th>{labels.tableTotal}</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((row, index) => (
                  <tr key={`${row.code}-${index}`}>
                    <td>{row.quantity}</td>
                    <td>{row.code}</td>
                    <td>{row.service}</td>
                    <td>{row.vpt}</td>
                    <td>{row.points}</td>
                    <td>{row.totalPoints}</td>
                    <td>
                      <span className={row.crossed ? "price-crossed" : ""}>
                        {row.total}
                        {row.showPanoramiqueNote && brand === "Direct" && (
                          <sup className="invoice-panoramique-asterisk">*</sup>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {renderTotalSection()}

            {brand === "Direct" &&
              (dataToUse?.services || []).some(isPanoramiqueService) && (
                <p className="invoice-panoramique-note">
                  {labels.panoramiqueNote}
                </p>
              )}

            {isReceipt &&
              receiptRemainingBalance != null &&
              receiptRemainingBalance > 0 && (
                <div className="invoice-remaining-balance">
                  <div>{labels.remainingBalance}</div>
                  <div className="invoice-total-right">
                    <strong>{formatCHF(receiptRemainingBalance)}</strong>
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div className="invoice-treatment-section">
            <h3>{labels.arrangementSection}</h3>

            <table className="invoice-table arrangement-summary-table">
              <tbody>
                {(() => {
                  const rows = dataToUse?.monthlyPaymentPlanRows || [];
                  const monthlyAmount =
                    Number(dataToUse?.monthlyPaymentAmount) || 0;
                  const sumInstalments =
                    rows.length > 0 && monthlyAmount > 0
                      ? rows.reduce(
                          (s, r) => s + (Number(r.amount) || monthlyAmount),
                          0
                        )
                      : 0;
                  const downPayment = Math.max(0, totalToShow - sumInstalments);
                  const arrangementRemaining = Math.max(
                    0,
                    totalToShow - downPayment
                  );
                  return (
                    <>
                      <tr>
                        <td>{labels.estimatedTreatmentDuration}</td>
                        <td>
                          {formatMonthsCount(
                            dataToUse?.treatmentDuration || 0,
                            uiLocale
                          )}
                        </td>
                      </tr>
                      {dataToUse?.treatmentSteps != null &&
                        String(dataToUse.treatmentSteps).trim() !== "" && (
                          <tr>
                            <td>{labels.steps}</td>
                            <td>{String(dataToUse.treatmentSteps).trim()}</td>
                          </tr>
                        )}
                      <tr>
                        <td>{labels.treatmentPrice}</td>
                        <td>{formatCHF(totalToShow)}</td>
                      </tr>
                      <tr>
                        <td>{labels.numberOfMonthlyPayments}</td>
                        <td>{dataToUse?.numberOfMonthlyPayments || 0}</td>
                      </tr>
                      <tr>
                        <td>{labels.downPayment}</td>
                        <td>{formatCHF(downPayment)}</td>
                      </tr>
                      <tr>
                        <td>{labels.remainingBalanceDue}</td>
                        <td>{formatCHF(arrangementRemaining)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>

            <table
              className={`invoice-table arrangement-plan-table ${(dataToUse?.monthlyPaymentPlanRows || []).length > 15 ? "arrangement-plan-table--compact" : ""}`.trim()}
            >
              <thead>
                <tr>
                  <th>{labels.monthlyPayment}</th>
                  <th>{labels.dueDate}</th>
                  <th>{labels.amount}</th>
                </tr>
              </thead>
              <tbody>
                {(dataToUse?.monthlyPaymentPlanRows || []).map((row, index) => (
                  <tr key={`${row.monthLabel}-${index}`}>
                    <td>{row.monthLabel}</td>
                    <td>{formatInvoiceDateForDisplay(row.dueDate)}</td>
                    <td>{formatCHF(Number(row.amount || 0))}</td>
                  </tr>
                ))}
                {(!dataToUse?.monthlyPaymentPlanRows ||
                  dataToUse?.monthlyPaymentPlanRows.length === 0) && (
                  <tr>
                    <td colSpan={3}>{labels.noMonthlyRows}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {isReceipt ? null : isArrangement ? (
          <SignatureSection isArrangement locale={uiLocale} />
        ) : brand === "Direct" ? (
          <PaymentSection qrSectionPath={qrSectionPath} />
        ) : null}
      </div>
    </div>
  );
}
