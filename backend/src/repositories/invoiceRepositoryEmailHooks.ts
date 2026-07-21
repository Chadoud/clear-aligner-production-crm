/**
 * Post-invoice-update transactional emails (payment notifications).
 */
import {
  INVOICE_STATUS_QUOTE,
  INVOICE_STATUS_PAID,
} from "../constants/invoiceStatus.js";
import { DIRECT_CABINET_ID } from "../utils/brand.js";
import { isValidEmail } from "../services/email/smtp.js";

export function isQuotePayload(inv: Record<string, unknown>): boolean {
  return (
    Number(inv.invoiceStatus) === INVOICE_STATUS_QUOTE || inv.isQuote === true
  );
}

export function isFullyPaidPayload(inv: Record<string, unknown>): boolean {
  const total = Number(inv.totalPrice) || 0;
  if (total <= 0) return false;
  const paid = Number(inv.amountPaid) || 0;
  const st = Number(inv.invoiceStatus);
  if (st === INVOICE_STATUS_PAID) return true;
  return paid >= total - 0.01;
}

/** After invoice update: notify company when fully paid + notify Direct patient on any payment. */
export async function maybeSendInvoiceTransactionalEmails(
  existing: Record<string, unknown>,
  merged: Record<string, unknown>
): Promise<void> {
  const caseIdRaw = merged.case_id;
  const caseId =
    caseIdRaw != null && Number.isFinite(Number(caseIdRaw))
      ? Number(caseIdRaw)
      : null;
  if (caseId == null) return;

  const client = (merged.client ?? {}) as Record<string, unknown>;
  const patientDisplayName = String(client.name ?? "").trim() || "Patient";

  const {
    scheduleTransactionalEmail,
    sendInvoiceFullyPaidCompanyEmail,
    sendDirectPaymentReceivedEmail,
  } = await import("../services/email/transactional.js");
  const { getCabinetById } = await import("./cabinetRepository.js");

  const cabinetIdx = Number(merged.cabinet_id);
  const cabinet =
    Number.isFinite(cabinetIdx) && cabinetIdx > 0
      ? await getCabinetById(cabinetIdx)
      : null;
  const cabinetName =
    cabinet?.name?.trim() ||
    String(merged.cabinet_nom ?? "").trim() ||
    "Practice";

  // Company notification: invoice becomes fully paid
  if (!isFullyPaidPayload(existing) && isFullyPaidPayload(merged)) {
    const invoiceRef =
      merged.invoiceRef != null ? String(merged.invoiceRef) : null;
    const totalChf = Number(merged.totalPrice) || null;
    const isQuote = isQuotePayload(merged);
    scheduleTransactionalEmail("invoice_fully_paid_company", caseId, () =>
      sendInvoiceFullyPaidCompanyEmail({
        cabinetName,
        patientDisplayName,
        caseId,
        invoiceRef,
        totalChf,
        isQuote,
      })
    );
  }

  // Direct patient notification: any new payment recorded
  const cabinetNom = (cabinet?.name ?? "").toLowerCase();
  const isDirect =
    cabinetNom.includes("direct") || cabinetIdx === DIRECT_CABINET_ID;
  if (isDirect) {
    const prevPaid = Number(existing.amountPaid) || 0;
    const newPaid = Number(merged.amountPaid) || 0;
    const paymentAmount = newPaid - prevPaid;
    if (paymentAmount > 0.01) {
      const patientEmail = String(client.email ?? "").trim();
      if (patientEmail && isValidEmail(patientEmail)) {
        const totalPrice = Number(merged.totalPrice) || 0;
        const remaining = Math.max(0, totalPrice - newPaid);
        const invoiceRef =
          merged.invoiceRef != null ? String(merged.invoiceRef) : null;

        // Extract receipt PDF from update payload (generated frontend-side)
        let receiptPdfBuffer: Buffer | null = null;
        const b64raw = merged.receiptPdfBase64;
        if (typeof b64raw === "string" && b64raw.length > 0) {
          try {
            const buf = Buffer.from(b64raw, "base64");
            const magic = buf.subarray(0, 5).toString("ascii");
            if (buf.length > 20 && magic === "%PDF-") receiptPdfBuffer = buf;
          } catch {
            receiptPdfBuffer = null;
          }
        }

        scheduleTransactionalEmail("direct_payment_received", caseId, () =>
          sendDirectPaymentReceivedEmail({
            to: patientEmail,
            patientFullName: patientDisplayName,
            invoiceRef,
            paymentAmount,
            amountPaid: newPaid,
            totalPrice,
            remainingBalance: remaining,
            pdfBuffer: receiptPdfBuffer,
          })
        );
      }
    }
  }
}
