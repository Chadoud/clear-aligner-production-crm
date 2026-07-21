/**
 * Second PDF page: mobile app username (FirstName.LASTNAME.CaseRef) and password.
 */
import { getMobAppCredentialsDisplay } from "../invoices/mobAppCredentialsPage.js";
import { PDF_CONSTANTS } from "./pdfGeneratorHelpers.js";

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {object} data - Invoice payload
 */
export function drawMobAppCredentialsPage(doc, data) {
  const margin = PDF_CONSTANTS.MARGIN_MM;
  const maxW = doc.internal.pageSize.getWidth() - 2 * margin;
  let y = margin + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("Patient mobile app — access", margin, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const intro =
    "Use these credentials to sign in to the patient mobile application.";
  const introLines = doc.splitTextToSize(intro, maxW);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 10;

  const { username, password } = getMobAppCredentialsDisplay(data);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Username", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(username || "—", margin, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Password", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(password || "—", margin, y);
}
