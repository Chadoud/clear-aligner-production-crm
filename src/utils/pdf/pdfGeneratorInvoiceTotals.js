/**
 * VAT / TOTAL blocks for patient and related PDFs.
 * @module utils/pdf/pdfGeneratorInvoiceTotals
 */

import { formatCHF } from "../invoices/invoiceFormatters.js";
import { calculateInvoiceTotal } from "../invoices/invoiceServiceHelpers.js";
import {
  computeVatBreakdown,
  resolveVatRate,
  SWISS_VAT_RATE,
} from "../invoices/vatBreakdown.js";
import { PDF_CONSTANTS } from "./pdfGeneratorHelpers.js";
import { getActiveUiLocale } from "../invoices/documentTitles.js";
import { getInvoicePdfLabels } from "../invoices/invoicePdfLabels.js";
import { getVatLabels } from "../invoices/vatLabels.js";

/**
 * Draw a VAT breakdown block: Subtotal excl. VAT / VAT (x%) / TOTAL incl. VAT.
 * Used by both the patient invoice and doctor bill PDF generators.
 *
 * @param {import("jspdf").jsPDF} doc
 * @param {number} totalTTC  - Total including tax (CHF)
 * @param {number} vatRate   - VAT rate, e.g. 0.081
 * @param {number} yPos      - Starting Y position (mm)
 * @param {number[]} colors  - Brand TEAL colour as [r, g, b]
 */
export const drawVatTotal = (doc, totalTTC, vatRate, yPos, colors, locale) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const lineStartX = margin;
  const lineEndX = pageWidth - margin;
  const spacing = 8;
  const amountX = 150;

  const { totalHT, vatAmount } = computeVatBreakdown(totalTTC, vatRate);
  const vatPct = (vatRate * 100).toFixed(1);
  const labels = getVatLabels(locale ?? getActiveUiLocale());

  doc.setDrawColor(colors[0], colors[1], colors[2]);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, yPos - spacing, lineEndX, yPos - spacing);

  let currentY = yPos;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(labels.subtotalExclVat, margin, currentY);
  doc.text(formatCHF(totalHT), amountX, currentY);
  currentY += 6;

  doc.text(labels.formatVatLine(vatPct), margin, currentY);
  doc.text(formatCHF(vatAmount), amountX, currentY);
  currentY += 6;

  doc.setDrawColor(colors[0], colors[1], colors[2]);
  doc.setLineWidth(0.3);
  doc.line(margin + 80, currentY - 1, lineEndX, currentY - 1);
  currentY += 4;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors[0], colors[1], colors[2]);
  doc.text(labels.totalInclVat, margin, currentY);

  doc.setTextColor(0, 0, 0);
  doc.text(formatCHF(totalTTC), amountX, currentY);

  doc.setDrawColor(colors[0], colors[1], colors[2]);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, currentY + spacing, lineEndX, currentY + spacing);

  doc.setTextColor(0, 0, 0);
};

export const drawTotal = (doc, data, yPos, colors) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const lineStartX = margin;
  const lineEndX = pageWidth - margin;
  const spacing = 8;
  const amountX = 150;

  const calculatedTotal = calculateInvoiceTotal({
    services: data.services,
    labPrice: data.labPrice,
  });
  const totalFromData = Number(data.totalPrice);
  const totalToShow =
    data.totalPrice !== undefined &&
    data.totalPrice !== "" &&
    !Number.isNaN(totalFromData)
      ? totalFromData
      : calculatedTotal;

  const vatRate = resolveVatRate(Number(data.vatRate) || SWISS_VAT_RATE);
  const labels = getInvoicePdfLabels(data?.uiLocale ?? getActiveUiLocale());

  if (vatRate > 0) {
    drawVatTotal(
      doc,
      totalToShow,
      vatRate,
      yPos,
      colors.TEAL,
      data?.uiLocale ?? getActiveUiLocale()
    );
    return;
  }

  doc.setDrawColor(colors.TEAL[0], colors.TEAL[1], colors.TEAL[2]);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, yPos - spacing, lineEndX, yPos - spacing);

  const currentY = yPos;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.TEAL[0], colors.TEAL[1], colors.TEAL[2]);
  doc.text(labels.total, margin, currentY);

  doc.setTextColor(0, 0, 0);
  doc.text(formatCHF(totalToShow), amountX, currentY);

  doc.setDrawColor(colors.TEAL[0], colors.TEAL[1], colors.TEAL[2]);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, currentY + spacing, lineEndX, currentY + spacing);

  doc.setTextColor(0, 0, 0);
};

/** Draw TOTAL block with a single amount (e.g. for doctor invoice). Same style as patient invoice: TOTAL left, amount right-aligned. */
// eslint-disable-next-line no-unused-vars -- legacy helper retained from monolithic pdfGeneratorInvoice
const drawTotalAmount = (doc, totalAmount, yPos, colors) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const lineStartX = margin;
  const lineEndX = pageWidth - margin;
  const spacing = 8;
  const amount = Number(totalAmount) || 0;

  doc.setDrawColor(colors.TEAL[0], colors.TEAL[1], colors.TEAL[2]);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, yPos - spacing, lineEndX, yPos - spacing);

  const currentY = yPos;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.TEAL[0], colors.TEAL[1], colors.TEAL[2]);
  doc.text("TOTAL", margin, currentY);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(formatCHF(amount), lineEndX, currentY, { align: "right" });

  doc.setDrawColor(colors.TEAL[0], colors.TEAL[1], colors.TEAL[2]);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, currentY + spacing, lineEndX, currentY + spacing);
  doc.setTextColor(0, 0, 0);
};
