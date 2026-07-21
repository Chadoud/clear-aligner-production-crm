/**
 * Case lifecycle transactional emails (doctor + lab).
 */
import { sendHtmlMail, escapeHtml, LAB_NOTIFICATION_EMAIL } from "./smtp.js";
import { wrapHtmlEmail, emailP } from "./emailLayout.js";
import {
  _useLogoCid,
  brandWrapOptions,
  caseCtaCompany,
  caseCtaDoctorForBrand,
  logoAttachments,
  logoAttachmentsForBrand,
  hasLogoCidForBrand,
} from "./transactionalShared.js";

export async function sendNewCaseLabEmail(params: {
  cabinetName: string;
  patientDisplayName: string;
  caseId: number;
}): Promise<void> {
  const { cabinetName, patientDisplayName, caseId } = params;
  const subject = `New case added - ${cabinetName}(${patientDisplayName})`;
  const body =
    emailP("Hello,") +
    emailP(
      `<strong>Practice:</strong> ${escapeHtml(cabinetName)}<br/><strong>Patient:</strong> ${escapeHtml(patientDisplayName)}`
    ) +
    caseCtaCompany(caseId) +
    emailP(
      "A new case has been registered. Please log in to your CRM workspace to review it."
    );
  const html = wrapHtmlEmail({ bodyHtml: body, useLogoCid: _useLogoCid });

  await sendHtmlMail({
    to: LAB_NOTIFICATION_EMAIL,
    subject,
    html,
    attachments: logoAttachments(),
    logContext: { emailKind: "new_case_lab", caseId },
  });
}

export async function sendNewCaseDoctorEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  caseId: number;
  brand?: string;
}): Promise<void> {
  const { doctorEmail, cabinetName, caseId, brand = "Lab" } = params;
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Sir or Madam,";
  const subject = "New case registered";
  const body =
    emailP(greeting) +
    emailP("We have received your request and thank you for it.") +
    emailP("We will do our best to respond promptly.") +
    caseCtaDoctorForBrand(caseId, brand) +
    emailP("Thank you for your trust.");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    useLogoCid: hasLogoCidForBrand(brand),
    ...brandWrapOptions(brand),
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: logoAttachmentsForBrand(brand),
    logContext: { emailKind: "new_case_doctor", caseId },
  });
}

export async function sendCasePausedEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  patientDisplayName: string;
  caseId: number;
  brand?: string;
}): Promise<void> {
  const {
    doctorEmail,
    cabinetName,
    patientDisplayName,
    caseId,
    brand = "Lab",
  } = params;
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Sir or Madam,";
  const subject = "Order on hold";
  const body =
    emailP(greeting) +
    emailP(
      `Your order for <strong>${escapeHtml(patientDisplayName)}</strong> has been placed on hold.`
    ) +
    caseCtaDoctorForBrand(caseId, brand) +
    emailP("Please contact our team if you have any questions.") +
    emailP("Thank you for your trust.");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    useLogoCid: hasLogoCidForBrand(brand),
    ...brandWrapOptions(brand),
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: logoAttachmentsForBrand(brand),
    logContext: { emailKind: "case_paused", caseId },
  });
}

export async function sendCaseSansSuiteEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  patientDisplayName: string;
  caseId: number;
  brand?: string;
}): Promise<void> {
  const {
    doctorEmail,
    cabinetName,
    patientDisplayName,
    caseId,
    brand = "Lab",
  } = params;
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Sir or Madam,";
  const subject = "Order closed \u2014 no further action";
  const body =
    emailP(greeting) +
    emailP(
      `Your order for <strong>${escapeHtml(patientDisplayName)}</strong> has been closed with no further action.`
    ) +
    caseCtaDoctorForBrand(caseId, brand) +
    emailP("Please contact our team if you need to reach us.") +
    emailP("Thank you for your trust.");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    useLogoCid: hasLogoCidForBrand(brand),
    ...brandWrapOptions(brand),
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: logoAttachmentsForBrand(brand),
    logContext: { emailKind: "case_sans_suite", caseId },
  });
}

/** @deprecated Prefer sendCaseDeliveredCompanyEmail / billing-specific emails; kept for legacy callers if any. */
export async function sendOrderShippedEmail(params: {
  doctorEmail: string;
  cabinetName: string;
  patientDisplayName: string;
  caseId: number;
  brand?: string;
}): Promise<void> {
  const {
    doctorEmail,
    cabinetName,
    patientDisplayName,
    caseId,
    brand = "Lab",
  } = params;
  const greeting = cabinetName
    ? `Dear Dr. ${escapeHtml(cabinetName)},`
    : "Dear Sir or Madam,";
  const subject = "Order shipped";
  const body =
    emailP(greeting) +
    emailP(
      `Your order for <strong>${escapeHtml(patientDisplayName)}</strong> has been shipped.`
    ) +
    caseCtaDoctorForBrand(caseId, brand) +
    emailP("Thank you for your trust.");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    useLogoCid: hasLogoCidForBrand(brand),
    ...brandWrapOptions(brand),
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: logoAttachmentsForBrand(brand),
    logContext: { emailKind: "order_shipped", caseId },
  });
}

export async function sendCaseDeliveredCompanyEmail(params: {
  cabinetName: string;
  patientDisplayName: string;
  caseId: number;
}): Promise<void> {
  const { cabinetName, patientDisplayName, caseId } = params;
  const subject = `Case delivered \u2014 ${cabinetName}(${patientDisplayName})`;
  const body =
    emailP("Hello,") +
    emailP("A case was marked as <strong>Delivered</strong> in the CRM.") +
    emailP(
      `<strong>Practice:</strong> ${escapeHtml(cabinetName)}<br/><strong>Patient:</strong> ${escapeHtml(patientDisplayName)}`
    ) +
    caseCtaCompany(caseId) +
    emailP("Please log in to your CRM workspace for details.");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerSubtitle: "Case status",
    useLogoCid: _useLogoCid,
  });

  await sendHtmlMail({
    to: LAB_NOTIFICATION_EMAIL,
    subject,
    html,
    attachments: logoAttachments(),
    logContext: { emailKind: "case_delivered_company", caseId },
  });
}
