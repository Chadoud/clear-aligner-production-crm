/**
 * Doctor invoice PDF generation (Lab template: header, BILL TO, table, total, QR).
 */
import { jsPDF } from "jspdf";
import {
  generateDoctorInvoiceId,
  getDoctorInvoiceIdForPreview,
} from "../invoices/doctorInvoiceId.js";
import {
  CONFIG,
  getBrandConfig,
  getDoctorBillingQrPath,
} from "../../config/constants.js";
import { resolveAssetPath } from "./sharedPdfConfig.js";
import {
  drawHeader,
  drawInvoiceInfo,
  drawDoctorInvoiceTable,
  drawVatTotal,
  drawPaymentSection,
} from "./pdfGeneratorInvoice.js";
import { getActiveUiLocale, withUiLocale } from "../invoices/documentTitles.js";
import { LAB_VAT_RATE } from "../invoices/vatBreakdown.js";

export function generateDoctorInvoicePDF(
  doctorCabinet,
  lineItems,
  options = {}
) {
  const brandConfig = getBrandConfig("Lab");
  const logoPath = resolveAssetPath(brandConfig.LOGO);
  const qrPathRaw = getDoctorBillingQrPath(doctorCabinet);
  const qrPath = resolveAssetPath(qrPathRaw);

  const preview = Boolean(options?.preview);
  const getBlob = options?.getBlob;
  const doctorInfo = options?.doctorInfo ?? null;
  const runWithImages = async (qrImg, logoImage) => {
    await generateDoctorInvoiceWithImage(
      doctorCabinet,
      lineItems,
      qrImg,
      logoImage,
      { preview, getBlob, doctorInfo }
    );
  };

  const logoImg = new Image();
  logoImg.crossOrigin = "anonymous";
  const loadQrAndRun = (logoImage) => {
    if (!qrPath) {
      void runWithImages(null, logoImage);
      return;
    }
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.src = qrPath;
    qrImg.onload = () => void runWithImages(qrImg, logoImage);
    qrImg.onerror = () => void runWithImages(null, logoImage);
  };

  if (!logoPath) {
    loadQrAndRun(null);
    return;
  }
  logoImg.src = logoPath;
  logoImg.onload = () => loadQrAndRun(logoImg);
  logoImg.onerror = () => loadQrAndRun(null);
}

export function generateDoctorInvoicePDFAsBlob(doctorCabinet, lineItems) {
  return new Promise((resolve) => {
    generateDoctorInvoicePDF(doctorCabinet, lineItems, { getBlob: resolve });
  });
}

async function generateDoctorInvoiceWithImage(
  doctorCabinet,
  lineItems,
  qrCodeSectionImg,
  logoImage,
  options = {}
) {
  const {
    preview = false,
    getBlob,
    doctorInfo: optionsDoctorInfo,
    refId: optionsRefId,
    usePreviewId = false,
  } = options;
  const refId =
    optionsRefId ??
    (usePreviewId
      ? await getDoctorInvoiceIdForPreview(doctorCabinet || "")
      : await generateDoctorInvoiceId(doctorCabinet || ""));
  const doc = new jsPDF(
    CONFIG.PDF.ORIENTATION,
    CONFIG.PDF.UNIT,
    CONFIG.PDF.FORMAT
  );
  const config = CONFIG.INVOICE;
  const brandConfig = getBrandConfig("Lab");
  const colors = brandConfig.COLORS;
  const uiLocale = getActiveUiLocale();
  const data = withUiLocale({
    brand: "Lab",
    client: { name: doctorCabinet || "—", ref: refId },
    doctorInfo: optionsDoctorInfo ?? null,
  });

  drawHeader(doc, colors, brandConfig.LOGO, data, "invoice", logoImage);
  drawInvoiceInfo(doc, data, config);

  const startY = 85;
  drawDoctorInvoiceTable(doc, lineItems, colors, startY, uiLocale);

  const totalAmount = (lineItems || []).reduce(
    (s, row) => s + (Number(row.amount) || 0),
    0
  );
  const finalY = doc.lastAutoTable.finalY + 15;
  drawVatTotal(
    doc,
    totalAmount,
    LAB_VAT_RATE,
    finalY,
    colors.TEAL,
    getActiveUiLocale()
  );

  const paymentY = finalY + 58;
  if (qrCodeSectionImg) {
    drawPaymentSection(doc, data, qrCodeSectionImg, paymentY);
  }

  const blob = doc.output("blob");
  if (getBlob) {
    const result = getBlob(blob);
    if (result && typeof result.then === "function") {
      await result;
    }
    return;
  }
  if (preview) {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener");
    if (w) setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  const safeName = String(doctorCabinet || "doctor").replace(/\s+/g, "_");
  doc.save(`doctor_invoice_${safeName}_${Date.now()}.pdf`);
}
