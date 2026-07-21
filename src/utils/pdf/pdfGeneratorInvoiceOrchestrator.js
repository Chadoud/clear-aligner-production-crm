/**
 * Patient invoice / receipt / arrangement PDF orchestration.
 * @module utils/pdf/pdfGeneratorInvoiceOrchestrator
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { CONFIG, getBrandConfig } from "../../config/constants.js";
import { isPanoramiqueService } from "../../constants/index.js";
import { getInvoiceClient } from "../invoices/invoiceData.js";
import { PDF_CONSTANTS } from "./pdfGeneratorHelpers.js";
import { resolveBrandAssets } from "./sharedPdfConfig.js";
import { buildInvoiceDownloadFilename } from "./pdfGeneratorInvoiceFilename.js";
import { loadImage } from "./pdfGeneratorInvoiceImages.js";
import {
  drawHeader,
  drawInvoiceInfo,
  drawReceiptTotal,
  drawTreatmentSection,
  drawPaymentSection,
  drawSignatureSection,
  hasTreatmentMetadata,
  getServicesTableStartYAfterTreatment,
} from "./pdfGeneratorInvoiceSections.js";
import { drawServicesTable } from "./pdfGeneratorInvoiceTables.js";
import { drawTotal } from "./pdfGeneratorInvoiceTotals.js";
import { drawMobAppCredentialsPage } from "./pdfGeneratorMobAppCredentials.js";
import { shouldAppendMobAppCredentialsPage } from "../invoices/mobAppCredentialsPage.js";
import { getInvoicePdfLabels } from "../invoices/invoicePdfLabels.js";
import { getActiveUiLocale } from "../invoices/documentTitles.js";

/**
 * Generate PDF for invoice, arrangement plan, or receipt
 * @param {Object} data - Invoice/receipt data
 * @param {string} [documentType] - 'invoice' | 'arrangement' | 'receipt'
 */
export const generatePDF = (data, documentType = "invoice") => {
  const brand = data.brand || "Direct";
  const { qrCodeSectionPath, logoPath } = resolveBrandAssets(brand);

  Promise.all([
    loadImage(qrCodeSectionPath),
    logoPath ? loadImage(logoPath) : Promise.resolve(null),
  ])
    .then(([qrCodeSectionImg, logoImg]) => {
      generatePDFWithImage(data, qrCodeSectionImg, documentType, logoImg);
    })
    .catch((err) => console.error("[generatePDF] PDF generation failed:", err));
};

/**
 * Generate PDF and return as base64 string (for email attachment).
 * @param {Object} data - Invoice/receipt data
 * @param {string} [documentType] - 'invoice' | 'quote' | 'arrangement' | 'receipt'
 * @returns {Promise<string>} Pure base64 PDF data (no data URI prefix)
 */
export const generateInvoicePdfBase64 = (data, documentType = "invoice") => {
  const brand = data.brand || "Direct";
  const { qrCodeSectionPath, logoPath } = resolveBrandAssets(brand);

  return Promise.all([
    loadImage(qrCodeSectionPath),
    logoPath ? loadImage(logoPath) : Promise.resolve(null),
  ]).then(([qrCodeSectionImg, logoImg]) => {
    const dataUri = buildPDFDoc(
      data,
      qrCodeSectionImg,
      documentType,
      logoImg
    ).output("datauristring");
    // Strip the "data:application/pdf;base64," prefix
    const commaIdx = dataUri.indexOf(",");
    return commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
  });
};

/** Resolve the download-filename `type` token from documentType + data. */
function resolveDocType(data, documentType) {
  const hasPlanRows =
    Array.isArray(data?.monthlyPaymentPlanRows) &&
    data.monthlyPaymentPlanRows.length > 0;
  if (documentType === "receipt") return "receipt";
  if (
    documentType === "arrangement" ||
    (documentType === "invoice" && hasPlanRows)
  )
    return "arrangement";
  if (documentType === "quote") return "quote";
  return "invoice";
}

/**
 * Build the jsPDF document without triggering a download or export.
 * Shared by generatePDFWithImage (download) and generateInvoicePdfBase64 (email attachment).
 */
const buildPDFDoc = (
  data,
  qrCodeSectionImg,
  documentType = "invoice",
  logoImg = null
) => {
  const doc = new jsPDF(
    CONFIG.PDF.ORIENTATION,
    CONFIG.PDF.UNIT,
    CONFIG.PDF.FORMAT
  );
  const config = CONFIG.INVOICE;
  const brand = data.brand || "Direct";
  const brandConfig = getBrandConfig(brand);
  const colors = brandConfig.COLORS;
  const isReceipt = documentType === "receipt";
  const docType = resolveDocType(data, documentType);
  const isArrangement = docType === "arrangement";
  const pdfLocale = data?.uiLocale ?? getActiveUiLocale();
  const pdfLabels = getInvoicePdfLabels(pdfLocale);

  drawHeader(doc, colors, brandConfig.LOGO, data, documentType, logoImg);
  drawInvoiceInfo(doc, data, config);

  if (isReceipt) {
    if (hasTreatmentMetadata(data)) {
      drawTreatmentSection(doc, data, colors, true);
    }

    const startY = getServicesTableStartYAfterTreatment(data);
    drawServicesTable(doc, data, colors, startY);

    const finalY = doc.lastAutoTable.finalY + 15;
    drawReceiptTotal(doc, data, finalY, colors);

    const hasPanoramique =
      brand === "Direct" && data.services?.some(isPanoramiqueService);
    if (hasPanoramique) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const margin = PDF_CONSTANTS.MARGIN_MM;
      const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;
      doc.text(
        doc.splitTextToSize(pdfLabels.panoramiqueNote, maxWidth),
        margin,
        finalY + 22
      );
    }
  } else {
    if (hasTreatmentMetadata(data)) {
      drawTreatmentSection(doc, data, colors);
    }

    const startY = getServicesTableStartYAfterTreatment(data);
    drawServicesTable(doc, data, colors, startY);

    const finalY = doc.lastAutoTable.finalY + 15;
    drawTotal(doc, data, finalY, colors);

    const hasPanoramique =
      brand === "Direct" && data.services?.some(isPanoramiqueService);
    if (hasPanoramique) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const margin = PDF_CONSTANTS.MARGIN_MM;
      const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;
      doc.text(
        doc.splitTextToSize(pdfLabels.panoramiqueNote, maxWidth),
        margin,
        finalY + 18
      );
    }

    const paymentY = finalY + 42;
    if (documentType === "invoice" && brand === "Direct") {
      drawPaymentSection(doc, data, qrCodeSectionImg, paymentY);
    }

    if (isArrangement) {
      if (qrCodeSectionImg?.complete && documentType === "invoice") {
        const imageWidth =
          PDF_CONSTANTS.PAGE_WIDTH_MM - 2 * PDF_CONSTANTS.MARGIN_MM;
        const imageHeight =
          imageWidth * (qrCodeSectionImg.height / qrCodeSectionImg.width);
        drawSignatureSection(
          doc,
          paymentY + imageHeight + 20,
          colors,
          true,
          pdfLocale
        );
      } else {
        const signatureY =
          documentType === "arrangement" ? paymentY + 10 : paymentY + 30;
        drawSignatureSection(doc, signatureY, colors, true, pdfLocale);
      }
    }
  }

  if (shouldAppendMobAppCredentialsPage(data, documentType)) {
    doc.addPage();
    drawMobAppCredentialsPage(doc, data);
  }

  return doc;
};

/**
 * Generate PDF with loaded image and trigger browser download.
 * @param {Object} data
 * @param {HTMLImageElement|null} qrCodeSectionImg
 * @param {string} documentType - 'invoice' | 'arrangement' | 'receipt'
 * @param {HTMLImageElement|null} [logoImg] - Preloaded logo for header
 */
const generatePDFWithImage = (
  data,
  qrCodeSectionImg,
  documentType = "invoice",
  logoImg = null
) => {
  const doc = buildPDFDoc(data, qrCodeSectionImg, documentType, logoImg);
  const client = getInvoiceClient(data);
  const safeName = String(client?.name || "client").replace(/\s+/g, "_");
  const fileName = buildInvoiceDownloadFilename(
    resolveDocType(data, documentType),
    safeName,
    client?.ref
  );
  doc.save(fileName);
};
