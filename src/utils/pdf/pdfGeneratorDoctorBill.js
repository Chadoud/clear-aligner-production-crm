/**
 * Doctor bill PDF generation (custom layout per cycle).
 */
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { CONFIG, getBrandConfig } from "../../config/constants.js";
import {
  formatCHF,
  formatInvoiceDateForDisplay,
} from "../invoices/invoiceFormatters.js";
import { formatTodayDDMMYYYY } from "../dates/dateUtils.js";
import { getRawPatientByRef } from "../../services/patientDataService.js";
import { PDF_CONSTANTS, drawLogoImage } from "./pdfGeneratorHelpers.js";

function safeDoctorFileName(name) {
  if (name == null || String(name).trim() === "") return "doctor";
  return (
    String(name)
      .replace(/[,;]/g, " ")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .trim() || "doctor"
  );
}

function buildDoctorBillLineItems(cycle) {
  const lineItems = [];
  if (cycle?.items && cycle.items.length > 0) {
    cycle.items.forEach((it) => {
      const raw = getRawPatientByRef(it.caseRef);
      lineItems.push({
        patientName: raw?.name ?? it.patientName ?? "—",
        enteredDate:
          raw?.entered != null ? formatInvoiceDateForDisplay(raw.entered) : "—",
        caseRef: it.caseRef ?? "—",
        amount: Number(it.amount) || 0,
      });
    });
  } else if (cycle?.billableCaseRefs && cycle.billableCaseRefs.length > 0) {
    cycle.billableCaseRefs.forEach((ref) => {
      const raw = getRawPatientByRef(ref);
      lineItems.push({
        patientName: raw?.name ?? "—",
        enteredDate:
          raw?.entered != null ? formatInvoiceDateForDisplay(raw.entered) : "—",
        caseRef: ref ?? "—",
        amount: 0,
      });
    });
  }
  return lineItems;
}

function drawCustomDoctorBillLayout(doc, cycle, lineItems, colors, logoImage) {
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;
  const billId = `Bill-${cycle?.month || new Date().toISOString().slice(0, 7)}`;
  const issuedDate = formatTodayDDMMYYYY();
  const headerTopY = 12;

  if (logoImage && logoImage.complete && logoImage.width) {
    drawLogoImage(doc, logoImage, margin, headerTopY, 68, 16);
  } else {
    doc.setTextColor(...colors.TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Aligner CRM", margin, 22);
  }

  doc.setTextColor(33, 43, 84);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`ID: ${billId}`, rightX, 17, { align: "right" });
  doc.text(`Period: ${cycle?.month || "—"}`, rightX, 23, { align: "right" });
  doc.text(`Date: ${issuedDate}`, rightX, 29, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, 34, rightX, 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("DOCTOR BILL", margin, 42);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 47, contentWidth, 22, 2, 2, "FD");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", margin + 4, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const cabinetName = String(cycle?.doctorCabinet || "—");
  const billToName = doc.splitTextToSize(
    cabinetName.startsWith("Dr") ? cabinetName : `Dr. ${cabinetName}`,
    contentWidth - 10
  );
  billToName.slice(0, 2).forEach((line, idx) => {
    doc.text(line, margin + 4, 62 + idx * 5);
  });

  doc.autoTable({
    startY: 77,
    head: [["Patient name", "Ref", "Started at", "Amount"]],
    body:
      lineItems.length > 0
        ? lineItems.map((row) => [
            row.patientName ?? "—",
            row.caseRef ?? "—",
            issuedDate,
            formatCHF(Number(row.amount) || 0),
          ])
        : [["No line items", "—", "—", "—"]],
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
      lineColor: [221, 221, 221],
      lineWidth: { bottom: 0.2 },
      valign: "middle",
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 70, halign: "left" },
      1: { cellWidth: 30, halign: "left" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 40, halign: "right" },
    },
  });

  const totalY = (doc.lastAutoTable?.finalY || 95) + 12;
  doc.setDrawColor(...colors.TEAL);
  doc.setLineWidth(0.4);
  doc.line(margin, totalY, rightX, totalY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 43, 84);
  doc.setFontSize(14);
  doc.text("TOTAL", margin, totalY + 10);
  doc.text(formatCHF(Number(cycle?.totalAmount) || 0), rightX, totalY + 10, {
    align: "right",
  });
  doc.line(margin, totalY + 14, rightX, totalY + 14);
}

export function generateDoctorBillPDF(cycle, options = {}) {
  const { preview = false } = options;
  const brandConfig = getBrandConfig("Lab");
  const logoPath = brandConfig.LOGO
    ? brandConfig.LOGO.startsWith("/")
      ? brandConfig.LOGO
      : `/${brandConfig.LOGO}`
    : null;
  const logoImg = new Image();
  logoImg.crossOrigin = "anonymous";

  if (!logoPath) {
    generateDoctorBillWithImage(cycle, null, preview);
    return;
  }

  logoImg.src = logoPath;
  logoImg.onload = () => generateDoctorBillWithImage(cycle, logoImg, preview);
  logoImg.onerror = () => generateDoctorBillWithImage(cycle, null, preview);
}

export function previewDoctorBillPDF(cycle) {
  generateDoctorBillPDF(cycle, { preview: true });
}

function generateDoctorBillWithImage(cycle, logoImage, preview = false) {
  const doc = new jsPDF(
    CONFIG.PDF.ORIENTATION,
    CONFIG.PDF.UNIT,
    CONFIG.PDF.FORMAT
  );
  const brandConfig = getBrandConfig("Lab");
  const colors = brandConfig.COLORS;
  const lineItems = buildDoctorBillLineItems(cycle);
  drawCustomDoctorBillLayout(doc, cycle, lineItems, colors, logoImage);

  if (preview) {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener");
    if (w) setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  const safeName = safeDoctorFileName(cycle?.doctorCabinet);
  const monthStr = (cycle?.month || "").replace(/-/g, "");
  doc.save(`doctor_bill_${safeName}_${monthStr}_${Date.now()}.pdf`);
}
