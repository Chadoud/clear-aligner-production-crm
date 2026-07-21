/**
 * Services and doctor-invoice tables for patient PDFs.
 * @module utils/pdf/pdfGeneratorInvoiceTables
 */

import {
  buildInvoiceTableRows,
  rowToPdfFormat,
} from "../invoices/invoiceServiceHelpers.js";
import { PDF_CONSTANTS } from "./pdfGeneratorHelpers.js";
import { formatCHF } from "../invoices/invoiceFormatters.js";
import { getActiveUiLocale } from "../invoices/documentTitles.js";
import { getInvoicePdfLabels } from "../invoices/invoicePdfLabels.js";

export const drawServicesTable = (doc, data, colors, startY = 100) => {
  const brand = data.brand || "Direct";
  const labels = getInvoicePdfLabels(data?.uiLocale ?? getActiveUiLocale());

  // Build invoice rows using shared helper (services have point_value per service)
  const invoiceRows = buildInvoiceTableRows({
    services: data.services,
    brand,
    showFreeServices: data.showFreeServices,
    labPrice: data.labPrice,
    totalPrice: data.totalPrice,
    vatRate: data.vatRate,
  });

  // Convert to PDF table format (objects with dataKeys for correct column mapping)
  const tableData = invoiceRows.map((row) => {
    const pdfRow = rowToPdfFormat(row);
    if (row.showPanoramiqueNote && brand === "Direct") {
      pdfRow.total = (pdfRow.total || "") + " *";
    }
    return pdfRow;
  });

  const tableWidth = PDF_CONSTANTS.PAGE_WIDTH_MM - 2 * PDF_CONSTANTS.MARGIN_MM;
  doc.autoTable({
    startY: startY,
    tableWidth,
    margin: { left: PDF_CONSTANTS.MARGIN_MM, right: PDF_CONSTANTS.MARGIN_MM },
    columns: [
      { header: labels.tableQuantity, dataKey: "quantity" },
      { header: labels.tableCode, dataKey: "code" },
      { header: labels.tableService, dataKey: "service" },
      { header: labels.tableVpt, dataKey: "vpt" },
      { header: labels.tablePoints, dataKey: "points" },
      { header: labels.tableTotalPoints, dataKey: "totalPoints" },
      { header: labels.tableTotal, dataKey: "total" },
    ],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: colors.LIGHT_GREEN,
      textColor: colors.TEAL,
      fontStyle: "bold",
      fontSize: 10,
      cellPadding: 4,
      lineColor: colors.TEAL,
      lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      lineColor: [255, 255, 255],
      lineWidth: 0,
      valign: "middle",
    },
    styles: {
      fontSize: 8,
      cellPadding: 1,
      lineColor: [255, 255, 255],
      lineWidth: 0,
    },
    columnStyles: {
      quantity: { cellWidth: 18, halign: "left" },
      code: { cellWidth: 24, halign: "left" },
      service: { cellWidth: 54, halign: "left", overflow: "linebreak" },
      vpt: { cellWidth: 12, halign: "left", overflow: "ellipsize" },
      points: { cellWidth: 14, halign: "right", overflow: "ellipsize" },
      totalPoints: { cellWidth: 22, halign: "right", overflow: "ellipsize" },
      total: { cellWidth: 26, halign: "right", overflow: "ellipsize" },
    },
    didDrawCell: (data) => {
      // Draw strikethrough for Total column only for crossed-out (free) services
      if (
        data.column.dataKey === "total" &&
        data.row.index < invoiceRows.length
      ) {
        const isFreeService = invoiceRows[data.row.index]?.crossed === true;

        if (isFreeService) {
          const cell = data.cell;
          const cellCenterY = cell.y + cell.height / 2;

          // Get the text content and calculate its width
          const text = cell.text[0]?.text || "";
          doc.setFontSize(7); // Match the body font size
          doc.setFont("helvetica", "normal");
          const textWidth = doc.getTextWidth(text);

          // Calculate starting position (right-aligned text)
          const padding = 2;
          const startX = cell.x + cell.width - textWidth - padding;
          const endX = cell.x + cell.width - padding;

          // Draw blue line through the middle of the text only
          doc.setDrawColor(...colors.TEAL);
          doc.setLineWidth(0.3);
          doc.line(startX, cellCenterY, endX, cellCenterY);
        }
      }
    },
  });
};

/** Doctor invoice table: Patient name | Ref | Amount. Same visual style as patient invoice services table. */
export const drawDoctorInvoiceTable = (
  doc,
  lineItems,
  colors,
  startY = 85,
  locale
) => {
  const labels = getInvoicePdfLabels(locale ?? getActiveUiLocale());
  const tableData =
    lineItems && lineItems.length > 0
      ? lineItems.map((row) => [
          row.patientName || "—",
          row.caseRef != null && row.caseRef !== "" ? String(row.caseRef) : "—",
          formatCHF(Number(row.amount) || 0),
        ])
      : [[labels.noPatients, "—", "—"]];

  doc.autoTable({
    startY,
    head: [[labels.patientName, labels.ref, labels.amount]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: colors.LIGHT_GREEN,
      textColor: colors.TEAL,
      fontStyle: "bold",
      fontSize: 10,
      cellPadding: 4,
      lineColor: colors.TEAL,
      lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      lineColor: [255, 255, 255],
      lineWidth: 0,
      valign: "middle",
    },
    styles: {
      fontSize: 8,
      cellPadding: 1,
      lineColor: [255, 255, 255],
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 65, halign: "left" },
      1: { cellWidth: 45, halign: "left" },
      2: { cellWidth: 60, halign: "right" },
    },
  });
};
