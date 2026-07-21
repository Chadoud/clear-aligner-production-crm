/**
 * Doctor billing and invoice-paid transactional emails.
 */
import { sendHtmlMail, escapeHtml, LAB_NOTIFICATION_EMAIL } from "./smtp.js";
import { wrapHtmlEmail, emailP, labLogoOrTitleHtml } from "./emailLayout.js";
import { emailPrimaryButtonHtml, emailSecondaryLinkLine } from "./emailCta.js";
import { crmDoctorDoctorsBillingUrl } from "./emailLinks.js";
import {
  _useLogoCid,
  brandWrapOptions,
  caseCtaCompany,
  logoAttachments,
  logoAttachmentsForBrand,
  hasLogoCidForBrand,
} from "./transactionalShared.js";
import type { Attachment } from "nodemailer/lib/mailer/index.js";
import { formatGeneratedDateForDisplay } from "../../utils/doctorBillingReminderDates.js";
import { brandDisplayName } from "../../utils/brandLabels.js";

export type DoctorBillingEmailRow = {
  patientName: string;
  caseRef?: string;
  invoiceRef?: string;
  amount?: number | null;
  invoiceDate?: string;
};

function formatChfEmail(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "\u2014";
  return `${Number(n).toFixed(2)} CHF`;
}

function buildDoctorBillHeaderInnerHtml(
  billMonthLabel: string,
  useLogoCid: boolean,
  brand = "Lab"
): string {
  const monthEsc = escapeHtml(billMonthLabel);
  const display = brandDisplayName(brand);
  const logoBlock = labLogoOrTitleHtml(useLogoCid, display);
  return `${logoBlock}
<p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#0f172a;line-height:1.35;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">New bill for ${monthEsc}</p>`;
}

function buildDoctorBillingPatientsTableHtml(
  rows: DoctorBillingEmailRow[]
): string {
  const head = `<tr>
<th style="padding:11px 12px;text-align:left;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Patient</th>
<th style="padding:11px 12px;text-align:left;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Ref</th>
<th style="padding:11px 12px;text-align:left;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Invoice</th>
<th style="padding:11px 12px;text-align:left;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Date</th>
<th style="padding:11px 12px;text-align:right;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Amount</th>
</tr>`;
  const bodyRows = rows
    .map((r) => {
      const name = escapeHtml(String(r.patientName ?? "").trim() || "\u2014");
      const ref = escapeHtml(String(r.caseRef ?? "").trim() || "\u2014");
      const inv = escapeHtml(String(r.invoiceRef ?? "").trim() || "\u2014");
      const dt = escapeHtml(formatGeneratedDateForDisplay(r.invoiceDate));
      const amt = escapeHtml(formatChfEmail(r.amount ?? null));
      return `<tr>
<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#334155;">${name}</td>
<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#334155;">${ref}</td>
<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#334155;font-family:ui-monospace,monospace;">${inv}</td>
<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#334155;">${dt}</td>
<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;font-weight:600;">${amt}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:8px 0 20px;">${head}${bodyRows}</table>`;
}

function pdfFilenameForBill(billMonthLabel: string): string {
  const safe =
    billMonthLabel.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") ||
    "bill";
  return `Doctor_Bill_${safe}.pdf`;
}

/**
 * Doctor bill email: logo header, "New bill for {month}", patient table, attached PDF.
 */
export async function sendDoctorBillingGeneratedEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  billMonthLabel: string;
  lineItems: DoctorBillingEmailRow[];
  pdfBuffer?: Buffer | null;
  caseId?: number;
  brand?: string;
}): Promise<void> {
  const {
    doctorEmail,
    cabinetName,
    billMonthLabel,
    lineItems,
    pdfBuffer,
    caseId,
    brand = "Lab",
  } = params;

  const isDirect = brand === "Direct";
  const useLogoCid = hasLogoCidForBrand(brand);
  const attachments: Attachment[] = logoAttachmentsForBrand(brand);

  if (pdfBuffer && pdfBuffer.length > 0) {
    attachments.push({
      filename: pdfFilenameForBill(billMonthLabel),
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }

  const tableHtml = buildDoctorBillingPatientsTableHtml(lineItems);
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Dr.,";

  let body: string;
  if (isDirect) {
    body =
      emailP(greeting) +
      emailP(
        "A new bill has been generated for your practice. Details are in the table below; the same document is attached as a PDF (identical to the printable bill)."
      ) +
      tableHtml +
      emailP("Thank you for your trust.");
  } else {
    const billingUrl = crmDoctorDoctorsBillingUrl();
    const billingCta =
      emailPrimaryButtonHtml(billingUrl, "Open Doctors billing") +
      emailSecondaryLinkLine(billingUrl);
    body =
      emailP(greeting) +
      emailP(
        "A new bill has been generated for your practice in the CRM. Details are in the table below; the same document is attached as a PDF (identical to the printable bill)."
      ) +
      billingCta +
      tableHtml +
      emailP(
        "Please sign in to your CRM client area to view history and manage invoices."
      ) +
      emailP("Thank you for your trust.");
  }

  const subject = `New bill \u2014 ${billMonthLabel}`;
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerTitle: "New bill",
    headerSubtitle: "",
    customHeaderInnerHtml: buildDoctorBillHeaderInnerHtml(
      billMonthLabel,
      useLogoCid,
      brand
    ),
    includeDefaultSignOff: true,
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
    logContext: { emailKind: "doctor_billing_generated", caseId },
  });
}

/**
 * Doctor bill paid email: sent when a billed doctor group is marked as fully paid.
 * Includes all patient rows in the email table (no patient-level email fan-out).
 */
export async function sendDoctorBillingPaidEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  billMonthLabel: string;
  lineItems: DoctorBillingEmailRow[];
  caseId?: number;
  brand?: string;
}): Promise<void> {
  const {
    doctorEmail,
    cabinetName,
    billMonthLabel,
    lineItems,
    caseId,
    brand = "Lab",
  } = params;

  const useLogoCid = hasLogoCidForBrand(brand);
  const attachments: Attachment[] = logoAttachmentsForBrand(brand);
  const tableHtml = buildDoctorBillingPatientsTableHtml(lineItems);
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Dr.,";

  const body =
    emailP(greeting) +
    emailP(
      "Your billed patient invoices have been marked as <strong>fully paid</strong> in the CRM. Details are listed below."
    ) +
    tableHtml +
    emailP("Thank you for your trust.");

  const subject = `Bill paid — ${billMonthLabel}`;
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerTitle: "Bill paid",
    headerSubtitle: "",
    customHeaderInnerHtml: `${labLogoOrTitleHtml(useLogoCid, brandDisplayName(brand))}
<p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#0f172a;line-height:1.35;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">Bill paid for ${escapeHtml(billMonthLabel)}</p>`,
    includeDefaultSignOff: true,
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
    logContext: { emailKind: "doctor_billing_paid", caseId },
  });
}

/**
 * Cron: payment reminder on the 15th of the month after the bill period, if still unpaid.
 * One email per bill batch (same cabinet + doctor_bill_generated_at stamp).
 */
export async function sendDoctorBillingReminderEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  billMonthLabel: string;
  lineItems: DoctorBillingEmailRow[];
  caseId?: number;
  brand?: string;
}): Promise<void> {
  const {
    doctorEmail,
    cabinetName,
    billMonthLabel,
    lineItems,
    caseId,
    brand = "Lab",
  } = params;

  const isDirect = brand === "Direct";
  const useLogoCid = hasLogoCidForBrand(brand);
  const attachments: Attachment[] = logoAttachmentsForBrand(brand);
  const tableHtml = buildDoctorBillingPatientsTableHtml(lineItems);
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Dr.,";

  const billEsc = escapeHtml(billMonthLabel);
  const logoBlock = labLogoOrTitleHtml(useLogoCid, brandDisplayName(brand));
  const headerInner = `${logoBlock}
<p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#0f172a;line-height:1.35;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">Payment reminder: ${billEsc}</p>`;

  let body: string;
  if (isDirect) {
    body =
      emailP(greeting) +
      emailP(
        `This is a friendly reminder that the following bill for <strong>${billEsc}</strong> remains outstanding. Details are listed below.`
      ) +
      tableHtml +
      emailP("Thank you for your trust.");
  } else {
    const billingUrl = crmDoctorDoctorsBillingUrl();
    const billingCta =
      emailPrimaryButtonHtml(billingUrl, "Open Doctors billing") +
      emailSecondaryLinkLine(billingUrl);
    body =
      emailP(greeting) +
      emailP(
        `This is a reminder that the following bill for <strong>${billEsc}</strong> is still unpaid in the CRM. Details are listed below.`
      ) +
      billingCta +
      tableHtml +
      emailP(
        "Please sign in to your CRM client area to settle or review your invoices."
      ) +
      emailP("Thank you for your trust.");
  }

  const subject = `Reminder — unpaid bill — ${billMonthLabel}`;
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerTitle: "Payment reminder",
    headerSubtitle: "",
    customHeaderInnerHtml: headerInner,
    includeDefaultSignOff: true,
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
    logContext: { emailKind: "doctor_billing_reminder", caseId },
  });
}

function receiptRow(label: string, valueHtml: string): string {
  return `<tr>
<td style="padding:10px 14px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;white-space:nowrap;">${escapeHtml(label)}</td>
<td style="padding:10px 14px;border:1px solid #e2e8f0;font-size:15px;color:#0f172a;">${valueHtml}</td>
</tr>`;
}

/**
 * Direct patient thank-you email sent when a quote is accepted and transitions to in-fabrication.
 * Contains a payment receipt (reference, amount paid, total, date) in the email body.
 */
export async function sendDirectFirstPaymentEmail(params: {
  to: string;
  patientFullName: string;
  invoiceRef: string | null;
  amountPaid: number;
  totalPrice: number;
  treatmentDuration?: string | null;
  paymentDate?: string;
}): Promise<void> {
  const {
    to,
    patientFullName,
    invoiceRef,
    amountPaid,
    totalPrice,
    treatmentDuration,
    paymentDate = new Date().toLocaleDateString("en-GB"),
  } = params;

  const useLogoCid = hasLogoCidForBrand("Direct");
  const attachments: Attachment[] = logoAttachmentsForBrand("Direct");

  const rows: string[] = [];
  if (invoiceRef?.trim()) {
    rows.push(receiptRow("Reference", escapeHtml(invoiceRef.trim())));
  }
  if (treatmentDuration?.trim()) {
    rows.push(
      receiptRow("Treatment duration", escapeHtml(treatmentDuration.trim()))
    );
  }
  rows.push(receiptRow("Payment date", escapeHtml(paymentDate)));
  rows.push(
    receiptRow(
      "Amount paid",
      `<strong style="color:#16a34a;">${escapeHtml(formatChfEmail(amountPaid))}</strong>`
    )
  );
  rows.push(receiptRow("Total amount", escapeHtml(formatChfEmail(totalPrice))));

  const table = `<table role="presentation" style="border-collapse:collapse;margin:0 0 20px;width:100%;max-width:440px;">${rows.join("")}</table>`;

  const name = escapeHtml(patientFullName || "Patient");
  const body =
    emailP(`Dear ${name},`) +
    emailP(
      "Thank you for accepting your treatment plan and for your first payment — your treatment journey has officially begun!"
    ) +
    emailP("Please find below your payment receipt:") +
    table +
    emailP(
      "Our team will get to work right away. We will contact you as soon as your aligners have been manufactured and are ready for pick-up or delivery."
    ) +
    emailP(
      "If you have any questions in the meantime, please don't hesitate to reach out to us at the contact details below."
    ) +
    emailP("We look forward to seeing your smile transform!");

  const ref = invoiceRef?.trim() || "";
  const subject = ref
    ? `Direct — Thank you for your payment — ${ref}`
    : "Direct — Thank you for your payment";

  const html = wrapHtmlEmail({
    bodyHtml: body,
    signOffName: "Direct Customer Service",
    headerTitle: "Direct",
    headerSubtitle: "Payment confirmed ✓",
    useLogoCid,
    ...brandWrapOptions("Direct"),
  });

  await sendHtmlMail({
    to,
    toName: patientFullName || undefined,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
    logContext: { emailKind: "direct_first_payment" },
  });
}

/**
 * Direct patient payment receipt email — sent each time a new payment is recorded
 * (i.e. amountPaid increases). Distinct from sendDirectFirstPaymentEmail which fires
 * on quote → fabrication transition; this covers all subsequent instalment payments.
 */
export async function sendDirectPaymentReceivedEmail(params: {
  to: string;
  patientFullName: string;
  invoiceRef: string | null;
  paymentAmount: number;
  amountPaid: number;
  totalPrice: number;
  remainingBalance: number;
  paymentDate?: string;
  pdfBuffer?: Buffer | null;
}): Promise<void> {
  const {
    to,
    patientFullName,
    invoiceRef,
    paymentAmount,
    amountPaid,
    totalPrice,
    remainingBalance,
    paymentDate = new Date().toLocaleDateString("en-GB"),
    pdfBuffer,
  } = params;

  const useLogoCid = hasLogoCidForBrand("Direct");
  const attachments: Attachment[] = logoAttachmentsForBrand("Direct");
  const isFullyPaid = remainingBalance <= 0.01;

  const rows: string[] = [];
  if (invoiceRef?.trim()) {
    rows.push(receiptRow("Reference", escapeHtml(invoiceRef.trim())));
  }
  rows.push(receiptRow("Payment date", escapeHtml(paymentDate)));
  rows.push(
    receiptRow(
      "Amount paid",
      `<strong style="color:#16a34a;">${escapeHtml(formatChfEmail(paymentAmount))}</strong>`
    )
  );
  rows.push(
    receiptRow("Total paid to date", escapeHtml(formatChfEmail(amountPaid)))
  );
  rows.push(receiptRow("Total amount", escapeHtml(formatChfEmail(totalPrice))));
  if (!isFullyPaid) {
    rows.push(
      receiptRow(
        "Remaining balance",
        `<strong>${escapeHtml(formatChfEmail(remainingBalance))}</strong>`
      )
    );
  }

  const table = `<table role="presentation" style="border-collapse:collapse;margin:0 0 20px;width:100%;max-width:440px;">${rows.join("")}</table>`;

  const name = escapeHtml(patientFullName || "Patient");
  const closingLine = isFullyPaid
    ? emailP(
        "Your treatment is now <strong>fully paid</strong>. Thank you! We will proceed with the next steps and keep you informed."
      )
    : emailP(
        "Your next instalment will be due according to your payment plan. If you have any questions, don't hesitate to contact us."
      );

  const body =
    emailP(`Dear ${name},`) +
    emailP("We have received your payment. Please find your receipt below:") +
    table +
    closingLine +
    emailP("Thank you for your trust in our Direct catalog!");

  const ref = invoiceRef?.trim() || "";
  const subject = ref
    ? `Direct — Payment received — ${ref}`
    : "Direct — Payment received";

  const html = wrapHtmlEmail({
    bodyHtml: body,
    signOffName: "Direct Customer Service",
    headerTitle: "Direct",
    headerSubtitle: isFullyPaid ? "Payment complete ✓" : "Payment received ✓",
    useLogoCid,
    ...brandWrapOptions("Direct"),
  });

  if (pdfBuffer && pdfBuffer.length > 0) {
    const filename = ref ? `receipt_${ref}.pdf` : `receipt_direct.pdf`;
    attachments.push({
      filename,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }

  await sendHtmlMail({
    to,
    toName: patientFullName || undefined,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
    logContext: { emailKind: "direct_payment_received" },
  });
}

export async function sendInvoiceFullyPaidCompanyEmail(params: {
  cabinetName: string;
  patientDisplayName: string;
  caseId: number;
  invoiceRef?: string | null;
  totalChf?: number | null;
  isQuote?: boolean;
}): Promise<void> {
  const {
    cabinetName,
    patientDisplayName,
    caseId,
    invoiceRef,
    totalChf,
    isQuote = false,
  } = params;

  const docLabel = isQuote ? "Quote" : "Invoice";
  const refLabel = isQuote ? "Quote reference" : "Invoice reference";

  const rows: string[] = [];
  if (invoiceRef?.trim()) {
    rows.push(
      `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>${escapeHtml(refLabel)}</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(invoiceRef.trim())}</td></tr>`
    );
  }
  if (totalChf != null && Number.isFinite(totalChf)) {
    rows.push(
      `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Amount</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(Number(totalChf).toFixed(2))} CHF</td></tr>`
    );
  }
  const table =
    rows.length > 0
      ? `<table role="presentation" style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:400px;">${rows.join("")}</table>`
      : "";

  const body =
    emailP("Hello,") +
    emailP(
      `A ${docLabel.toLowerCase()} has been marked as <strong>fully paid</strong> in the CRM.`
    ) +
    emailP(
      `<strong>Practice:</strong> ${escapeHtml(cabinetName)}<br/><strong>Patient:</strong> ${escapeHtml(patientDisplayName)}`
    ) +
    table +
    caseCtaCompany(caseId) +
    emailP("Please log in to your CRM workspace for details.");

  const subject = `${docLabel} paid \u2014 ${cabinetName}(${patientDisplayName})`;
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerSubtitle: "Billing notification",
    useLogoCid: _useLogoCid,
  });

  await sendHtmlMail({
    to: LAB_NOTIFICATION_EMAIL,
    subject,
    html,
    attachments: logoAttachments(),
    logContext: {
      emailKind: isQuote
        ? "quote_fully_paid_company"
        : "invoice_fully_paid_company",
      caseId,
    },
  });
}
