/**
 * Header, invoice info, receipt block, treatment, QR payment, signature.
 * @module utils/pdf/pdfGeneratorInvoiceSections
 */

import { CONFIG } from "@/config/constants.js";
import {
  getFromSectionDateText,
  getSignatureDateText,
  formatCHF,
} from "../invoices/invoiceFormatters.js";
import { getInvoiceClient } from "../invoices/invoiceData.js";
import {
  formatBornOnLine,
  formatEmailLine,
  formatIdLine,
  formatMonthsCount,
  getInvoicePdfLabels,
} from "../invoices/invoicePdfLabels.js";
import { PDF_CONSTANTS, drawLogoImage } from "./pdfGeneratorHelpers.js";
import { getActiveUiLocale, getViewTitle } from "../invoices/documentTitles.js";
import { getInvoiceTitleType } from "../invoices/quoteHelpers.js";

function resolvePdfLocale(data) {
  return data?.uiLocale ?? getActiveUiLocale();
}

const LOGO_HEADER = { x: 20, y: 5, width: 40, height: 12 };

export const drawHeader = (
  doc,
  colors,
  logoPath,
  data,
  documentType = "invoice",
  logoImage = null
) => {
  const hasLogo = logoImage && logoImage.complete && logoImage.width;
  if (hasLogo) {
    drawLogoImage(
      doc,
      logoImage,
      LOGO_HEADER.x,
      LOGO_HEADER.y,
      LOGO_HEADER.width,
      LOGO_HEADER.height
    );
  } else {
    doc.setTextColor(...colors.TEAL);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const fallbackName =
      data?.brand === "Lab" ? "Lab" : CONFIG.INVOICE.COMPANY.NAME;
    doc.text(fallbackName, 20, 15);
  }

  doc.setFillColor(...colors.RED);
  doc.circle(73, 13, 2.5, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(73, 13, 1.2, "F");

  const titleType = getInvoiceTitleType(data, documentType);
  const title = getViewTitle(
    titleType,
    data?.brand,
    data?.uiLocale ?? getActiveUiLocale()
  );
  const titleY = hasLogo ? 24 : 35;
  doc.setFontSize(titleType === "receipt" ? 36 : 42);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.TEAL);
  doc.text(title, 20, titleY);

  const invoiceId = getInvoiceClient(data)?.ref || CONFIG.INVOICE.DEFAULT_ID;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.TEAL);
  doc.text(formatIdLine(invoiceId, resolvePdfLocale(data)), 170, 15);
};

export const drawInvoiceInfo = (doc, data, config) => {
  const company = config.COMPANY;
  const client = getInvoiceClient(data);
  const locale = resolvePdfLocale(data);
  const labels = getInvoicePdfLabels(locale);
  const isLabDoctors = data.brand === "Lab" && data.doctorInfo;
  const colWidth = 60;
  const fromX = 20;
  const billToX = isLabDoctors ? 85 : 120;
  const patientX = isLabDoctors ? 150 : null;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(labels.from, fromX, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(company.ADDRESS, fromX, 54);
  doc.text(company.WEBSITE, fromX, 60);
  doc.text(company.PHONE, fromX, 66);
  doc.text(getFromSectionDateText(data?.generatedDate, locale), fromX, 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(labels.to, billToX, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let billToY = 54;
  const maxTextWidth = isLabDoctors ? colWidth - 5 : 75;
  if (isLabDoctors && data.doctorInfo) {
    if (data.doctorInfo.name) {
      const lines = doc.splitTextToSize(
        String(data.doctorInfo.name),
        maxTextWidth
      );
      lines.forEach((line) => {
        doc.text(line, billToX, billToY);
        billToY += 6;
      });
    }
    if (data.doctorInfo.address)
      (doc.text(data.doctorInfo.address, billToX, billToY), (billToY += 6));
    if (data.doctorInfo.phone)
      (doc.text(data.doctorInfo.phone, billToX, billToY), (billToY += 6));
    if (data.doctorInfo.email)
      doc.text(
        formatEmailLine(data.doctorInfo.email, locale),
        billToX,
        billToY
      );
  } else {
    if (client.name) {
      const nameLines = doc.splitTextToSize(String(client.name), maxTextWidth);
      nameLines.forEach((line) => {
        doc.text(line, billToX, billToY);
        billToY += 6;
      });
    }
    if (client.born)
      (doc.text(formatBornOnLine(client.born, locale), billToX, billToY),
        (billToY += 6));
    if (client.address)
      (doc.text(client.address, billToX, billToY), (billToY += 6));
    if (client.email)
      (doc.text(formatEmailLine(client.email, locale), billToX, billToY),
        (billToY += 6));
    if (client.phone) doc.text(client.phone, billToX, billToY);
  }

  if (patientX && isLabDoctors) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(labels.patient, patientX, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let patientY = 54;
    if (client.name) {
      const nameLines = doc.splitTextToSize(String(client.name), maxTextWidth);
      nameLines.forEach((line) => {
        doc.text(line, patientX, patientY);
        patientY += 6;
      });
    }
    if (client.born)
      (doc.text(formatBornOnLine(client.born, locale), patientX, patientY),
        (patientY += 6));
    if (client.address)
      (doc.text(client.address, patientX, patientY), (patientY += 6));
    if (client.email)
      (doc.text(formatEmailLine(client.email, locale), patientX, patientY),
        (patientY += 6));
    if (client.phone) doc.text(client.phone, patientX, patientY);
  }
};

export const drawReceiptPaymentSection = (doc, data, startY, colors) => {
  const locale = resolvePdfLocale(data);
  const labels = getInvoicePdfLabels(locale);
  const paymentAmount =
    data.receiptPaymentAmount !== undefined
      ? Number(data.receiptPaymentAmount)
      : Number(data.amountPaid) || 0;
  const paymentDate =
    data.receiptPaymentDate || data.paidDate || getFromSectionDateText();
  const total = Number(data.totalPrice) || 0;
  const remaining =
    data.receiptRemainingBalance !== undefined
      ? Number(data.receiptRemainingBalance)
      : Math.max(0, total - paymentAmount);

  doc.setDrawColor(...colors.TEAL);
  doc.setLineWidth(0.5);
  doc.line(20, startY - 4, 190, startY - 4);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.TEAL);
  doc.text(labels.receiptPaymentReceived, 20, startY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(formatCHF(paymentAmount), 120, startY + 6);

  doc.setFont("helvetica", "bold");
  doc.text(labels.receiptDate, 20, startY + 16);
  doc.setFont("helvetica", "normal");
  doc.text(paymentDate, 120, startY + 16);

  doc.setFont("helvetica", "bold");
  doc.text(labels.receiptRemainingBalance, 20, startY + 26);
  doc.setFont("helvetica", "normal");
  doc.text(
    remaining <= 0 ? labels.fullyPaid : formatCHF(remaining),
    120,
    startY + 26
  );
};

/**
 * Draw the receipt "PAYMENT RECEIVED" total footer, matching the HTML InvoicePreview
 * SimpleTotalRow + remaining-balance row.
 */
export const drawReceiptTotal = (doc, data, yPos, colors) => {
  const labels = getInvoicePdfLabels(resolvePdfLocale(data));
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const lineStartX = margin;
  const lineEndX = pageWidth - margin;
  const spacing = 8;
  const amountX = 150;

  const paymentAmount =
    data.receiptPaymentAmount !== undefined
      ? Number(data.receiptPaymentAmount)
      : Number(data.amountPaid) || 0;
  const totalPrice = Number(data.totalPrice) || 0;
  const remaining =
    data.receiptRemainingBalance !== undefined
      ? Number(data.receiptRemainingBalance)
      : Math.max(0, totalPrice - paymentAmount);

  doc.setDrawColor(...colors.TEAL);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, yPos - spacing, lineEndX, yPos - spacing);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.TEAL);
  doc.text(labels.paymentReceived, margin, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCHF(paymentAmount), amountX, yPos);

  doc.setDrawColor(...colors.TEAL);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, yPos + spacing, lineEndX, yPos + spacing);

  doc.setTextColor(0, 0, 0);

  if (remaining > 0.009) {
    const remainY = yPos + spacing + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.TEAL);
    doc.text(labels.remainingBalance, margin, remainY);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCHF(remaining), amountX, remainY);
  }
};

/** True when duration and/or steps should be drawn under TREATMENT. */
export const hasTreatmentMetadata = (data) => {
  const hasDur = Boolean(data?.treatmentDuration);
  const hasSteps =
    data?.treatmentSteps != null && String(data.treatmentSteps).trim() !== "";
  return hasDur || hasSteps;
};

/** Y position for the services table: extra space when both duration and steps rows. */
export const getServicesTableStartYAfterTreatment = (data) => {
  if (!hasTreatmentMetadata(data)) return 85;
  const hasDur = Boolean(data?.treatmentDuration);
  const hasSteps =
    data?.treatmentSteps != null && String(data.treatmentSteps).trim() !== "";
  return 100 + (hasDur && hasSteps ? 8 : 0);
};

export const drawTreatmentSection = (doc, data, colors, isReceipt = false) => {
  const locale = resolvePdfLocale(data);
  const labels = getInvoicePdfLabels(locale);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const treatmentY = 85;

  // Draw lines above and below TREATMENT title
  doc.setDrawColor(...colors.TEAL);
  doc.setLineWidth(0.5);
  doc.line(margin, treatmentY - 6, pageWidth - margin, treatmentY - 6); // Line above
  doc.line(margin, treatmentY + 2, pageWidth - margin, treatmentY + 2); // Line below

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(isReceipt ? labels.treatmentPaid : labels.treatment, 20, treatmentY);

  const hasDuration = Boolean(data.treatmentDuration);
  const hasSteps =
    data.treatmentSteps != null && String(data.treatmentSteps).trim() !== "";

  if (!hasDuration && !hasSteps) return;

  let rowY = 93;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if (hasDuration) {
    doc.text(labels.duration, margin, rowY);
    doc.text(
      formatMonthsCount(data.treatmentDuration, locale),
      pageWidth - margin - 30,
      rowY
    );
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.5);
    doc.line(margin, rowY + 3, pageWidth - margin, rowY + 3);
    rowY += 8;
  }

  if (hasSteps) {
    doc.text(labels.steps, margin, rowY);
    doc.text(String(data.treatmentSteps).trim(), pageWidth - margin - 30, rowY);
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.5);
    doc.line(margin, rowY + 3, pageWidth - margin, rowY + 3);
  }
};

export const drawPaymentSection = (doc, data, qrCodeSectionImg, paymentY) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const availableWidth = PDF_CONSTANTS.PAGE_WIDTH_MM - 2 * margin;
  const maxImageHeight = pageHeight - margin - paymentY;

  if (qrCodeSectionImg && qrCodeSectionImg.complete) {
    try {
      const imageAspectRatio = qrCodeSectionImg.height / qrCodeSectionImg.width;
      let imageWidth = availableWidth;
      let imageHeight = imageWidth * imageAspectRatio;
      let drawY = paymentY;

      if (imageHeight > maxImageHeight) {
        doc.addPage();
        drawY = margin;
        const availableHeight = pageHeight - 2 * margin;
        imageHeight = Math.min(imageHeight, availableHeight);
        imageWidth = imageHeight / imageAspectRatio;
      }

      doc.addImage(
        qrCodeSectionImg,
        "PNG",
        margin,
        drawY,
        imageWidth,
        imageHeight
      );
    } catch (e) {
      console.error("Error adding QR code section image to PDF:", e);
      doc.setFontSize(8);
      doc.text("QR Code Payment Section", 20, paymentY);
    }
  } else {
    doc.setFontSize(8);
    doc.text("QR Code Payment Section (image not loaded)", 20, paymentY);
  }
};

export const drawSignatureSection = (
  doc,
  yPos,
  colors,
  isArrangement = false,
  locale
) => {
  const resolvedLocale = locale ?? getActiveUiLocale();
  const labels = getInvoicePdfLabels(resolvedLocale);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONSTANTS.MARGIN_MM;

  // Left side: Date & Place
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(getSignatureDateText(isArrangement, resolvedLocale), margin, yPos);

  // Right side: Signature
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const signatureLabelWidth = doc.getTextWidth(labels.signature);
  const signatureBoxX =
    pageWidth - margin - PDF_CONSTANTS.SIGNATURE_LABEL_SPACING;
  doc.text(labels.signature, signatureBoxX, yPos);

  // Draw signature box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(
    signatureBoxX + signatureLabelWidth + 5,
    yPos - 4,
    PDF_CONSTANTS.SIGNATURE_BOX_WIDTH,
    PDF_CONSTANTS.SIGNATURE_BOX_HEIGHT
  );
};
