/**
 * Email service — SMTP via nodemailer (see SMTP_* / FROM_EMAIL in backend/.env).
 * Invoice + auth mail use shared smtp helpers; transactional case/reply emails live in ./email/transactional.js.
 */
import { logger } from "../logger.js";
import {
  sendHtmlMail,
  escapeHtml,
  getTransport,
  isValidEmail,
} from "./email/smtp.js";
import { wrapHtmlEmail, emailP } from "./email/emailLayout.js";
import {
  emailPrimaryButtonHtml,
  emailSecondaryLinkLine,
} from "./email/emailCta.js";
import type { Attachment } from "nodemailer/lib/mailer/index.js";
import {
  logoAttachmentsForBrand,
  hasLogoCidForBrand,
} from "./email/transactionalShared.js";
import {
  brandCustomerServiceName,
  brandDisplayName,
} from "../utils/brandLabels.js";

// Generic brand mark for non-catalog-specific emails (password reset/changed)
import { buildBrandLogoAttachment } from "./email/emailAssets.js";
const _labLogo: Attachment | null = buildBrandLogoAttachment();

export {
  LAB_NOTIFICATION_EMAIL,
  sendHtmlMail,
  escapeHtml,
  getTransport,
  isValidEmail,
  maskEmailForLog,
  FROM_EMAIL,
  FROM_NAME,
} from "./email/smtp.js";

export {
  sendNewCaseLabEmail,
  sendNewCaseDoctorEmail,
  sendCasePausedEmail,
  sendCaseSansSuiteEmail,
  sendOrderShippedEmail,
  sendDoctorBillingGeneratedEmail,
  sendDoctorBillingPaidEmail,
  sendDoctorBillingReminderEmail,
  type DoctorBillingEmailRow,
  sendInvoiceFullyPaidCompanyEmail,
  sendDirectFirstPaymentEmail,
  sendCaseDeliveredCompanyEmail,
  sendDiscussionReplyNotificationEmail,
  scheduleTransactionalEmail,
} from "./email/transactional.js";

export { formatPatientDisplayName } from "./email/patientDisplay.js";

function buildInvoiceHtml(
  payload: Record<string, unknown>,
  brand: "Direct" | "Lab",
  salutation: string,
  cta?: { href: string; label: string } | null,
  isQuote?: boolean
): string {
  const client = (payload.client ?? payload.clientInfo ?? {}) as Record<
    string,
    unknown
  >;
  const name =
    [client?.name, client?.firstName, client?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Client";
  const ref = String(payload.invoiceRef ?? payload.invoice_ref ?? "—");
  const total = Number(payload.totalPrice ?? payload.total_price ?? 0);
  const totalStr = Number.isFinite(total) ? `${total.toFixed(2)} CHF` : "—";
  const brandName = brandDisplayName(brand);
  const docKind = isQuote ? "quote" : "invoice";
  const docKindCap = isQuote ? "Quote" : "Invoice";

  const detailTable = `<table role="presentation" style="border-collapse:collapse;margin:4px 0 8px;width:100%;max-width:420px;">
<tr><td style="padding:10px 14px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;">Reference</td><td style="padding:10px 14px;border:1px solid #e2e8f0;font-size:15px;color:#0f172a;">${escapeHtml(ref)}</td></tr>
<tr><td style="padding:10px 14px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;">Client</td><td style="padding:10px 14px;border:1px solid #e2e8f0;font-size:15px;color:#0f172a;">${escapeHtml(String(name))}</td></tr>
<tr><td style="padding:10px 14px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;">Total amount</td><td style="padding:10px 14px;border:1px solid #e2e8f0;font-size:15px;color:#0f172a;font-weight:600;">${escapeHtml(totalStr)}</td></tr>
</table>`;

  const ctaBlock = cta?.href
    ? emailPrimaryButtonHtml(cta.href, cta.label) +
      emailSecondaryLinkLine(cta.href)
    : "";

  const body =
    emailP(`${escapeHtml(salutation)},`) +
    emailP(
      `Please find below the details of your <strong>${escapeHtml(brandName)}</strong> ${docKind}.`
    ) +
    detailTable +
    ctaBlock +
    emailP("Thank you for your trust.");

  return wrapHtmlEmail({
    bodyHtml: body,
    signOffName: brandCustomerServiceName(brand),
    headerTitle: brandName,
    headerSubtitle: `${docKindCap} notification`,
    useLogoCid: hasLogoCidForBrand(brand),
  });
}

/**
 * Send invoice or quote notification email.
 * Does nothing if SMTP_PASSWORD is unset or recipient is invalid.
 * Never throws — logs errors so invoice creation is never blocked.
 * @param cta - Optional deep link: doctor → patient case sheet; Direct patient → pass null (no button).
 * @param pdfBuffer - Optional PDF buffer to attach to the email.
 * @param arrangementPdfBuffer - Optional payment arrangement plan PDF (quotes with monthly plan).
 */
export async function sendInvoiceEmail(
  to: string,
  recipientName: string,
  payload: Record<string, unknown>,
  brand: "Direct" | "Lab",
  salutation: string,
  cta?: { href: string; label: string } | null,
  pdfBuffer?: Buffer | null,
  arrangementPdfBuffer?: Buffer | null
): Promise<void> {
  if (!getTransport()) return;

  if (!isValidEmail(to)) {
    logger.warn(
      { to, recipientName },
      "Invoice email skipped: invalid recipient"
    );
    return;
  }

  const INVOICE_STATUS_QUOTE = 1;
  const isQuote =
    Number(payload.invoice_status ?? payload.invoiceStatus) ===
      INVOICE_STATUS_QUOTE || payload.isQuote === true;

  const brandName = brandDisplayName(brand);
  const docKind = isQuote ? "Quote" : "Invoice";
  const ref = String(payload.invoiceRef ?? payload.invoice_ref ?? "").trim();
  const subject = ref
    ? `${docKind} ${brandName} - ${recipientName} - ${ref}`
    : `${docKind} ${brandName} - ${recipientName}`;
  const html = buildInvoiceHtml(payload, brand, salutation, cta, isQuote);

  const logoAtts = logoAttachmentsForBrand(brand);
  const pdfAtts: Attachment[] = [];
  if (pdfBuffer) {
    pdfAtts.push({
      filename: `${docKind.toLowerCase()}_${ref || recipientName}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }
  if (isQuote && arrangementPdfBuffer) {
    pdfAtts.push({
      filename: `arrangement_${ref || recipientName}.pdf`,
      content: arrangementPdfBuffer,
      contentType: "application/pdf",
    });
  }

  await sendHtmlMail({
    to,
    toName: recipientName,
    subject,
    html,
    attachments: [...logoAtts, ...pdfAtts],
    logContext: { emailKind: isQuote ? "quote" : "invoice" },
  });
}

/** Password reset email — contains reset link. @returns whether SMTP sent successfully */
export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  resetUrl: string
): Promise<boolean> {
  if (!getTransport()) return false;

  if (!isValidEmail(to)) {
    logger.warn({ to }, "Password reset email skipped: invalid recipient");
    return false;
  }

  const subject = "Aligner CRM: reset your password";
  const body =
    emailP(`${escapeHtml(displayName || "Hello")},`) +
    emailP(
      "We received a request to reset the password for your Aligner CRM account."
    ) +
    emailP(
      "If you made this request, use the button below to choose a new password:"
    ) +
    emailPrimaryButtonHtml(resetUrl, "Reset my password") +
    emailSecondaryLinkLine(resetUrl) +
    emailP(
      "If you did <strong>not</strong> request a password reset, you can safely ignore this email."
    ) +
    emailP("Thank you,<br/><strong>Aligner CRM Support</strong>");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerSubtitle: "Account security",
    includeDefaultSignOff: false,
    useLogoCid: Boolean(_labLogo),
  });

  return sendHtmlMail({
    to,
    toName: displayName || undefined,
    subject,
    html,
    attachments: _labLogo ? [_labLogo] : [],
    logContext: { emailKind: "password_reset" },
  });
}

/** Password changed notification — security email. */
export async function sendPasswordChangedEmail(
  to: string,
  displayName: string
): Promise<void> {
  if (!getTransport()) return;

  if (!isValidEmail(to)) {
    logger.warn({ to }, "Password changed email skipped: invalid recipient");
    return;
  }

  const subject = "Your Aligner CRM password was changed";
  const body =
    emailP(`${escapeHtml(displayName || "Hello")},`) +
    emailP(
      "This is a confirmation that the password for your Aligner CRM account has just been changed."
    ) +
    emailP("If you made this change, no further action is required.") +
    emailP(
      "If you did <strong>not</strong> make this change, please contact us immediately using the contact details below."
    ) +
    emailP("Thank you,<br/><strong>Aligner CRM Support</strong>");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerSubtitle: "Account security",
    includeDefaultSignOff: false,
    useLogoCid: Boolean(_labLogo),
  });

  await sendHtmlMail({
    to,
    toName: displayName || undefined,
    subject,
    html,
    attachments: _labLogo ? [_labLogo] : [],
    logContext: { emailKind: "password_changed" },
  });
}
