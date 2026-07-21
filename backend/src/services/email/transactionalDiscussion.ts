/**
 * Case discussion / reply notification emails.
 */
import { sendHtmlMail, escapeHtml, LAB_NOTIFICATION_EMAIL } from "./smtp.js";
import { wrapHtmlEmail, emailP } from "./emailLayout.js";
import {
  _useLogoCid,
  caseCtaCompany,
  caseCtaDoctor,
  logoAttachments,
} from "./transactionalShared.js";

export async function sendDiscussionReplyNotificationEmail(params: {
  notifyLab: boolean;
  cabinetName: string;
  patientDisplayName: string;
  doctorEmail: string;
  caseId: number;
}): Promise<void> {
  const { notifyLab, cabinetName, patientDisplayName, doctorEmail, caseId } =
    params;

  if (notifyLab) {
    const subject = `New message - ${cabinetName}(${patientDisplayName})`;
    const body =
      emailP("Hello,") +
      emailP("A new message has been posted for a case.") +
      emailP(
        `<strong>Practice:</strong> ${escapeHtml(cabinetName)}<br/><strong>Patient:</strong> ${escapeHtml(patientDisplayName)}`
      ) +
      caseCtaCompany(caseId) +
      emailP("Please log in to your CRM workspace to read it.");
    const html = wrapHtmlEmail({
      bodyHtml: body,
      headerSubtitle: "Discussion",
      useLogoCid: _useLogoCid,
    });

    await sendHtmlMail({
      to: LAB_NOTIFICATION_EMAIL,
      subject,
      html,
      attachments: logoAttachments(),
      logContext: { emailKind: "reply_notify_lab", caseId },
    });
    return;
  }

  const subject = "New message";
  const body =
    emailP("Dear Sir or Madam,") +
    emailP("You have a new message about your order.") +
    caseCtaDoctor(caseId) +
    emailP("Please sign in to your client area to read it.") +
    emailP("Thank you for your trust.");
  const html = wrapHtmlEmail({
    bodyHtml: body,
    headerSubtitle: "Discussion",
    useLogoCid: _useLogoCid,
  });

  await sendHtmlMail({
    to: doctorEmail,
    toName: cabinetName,
    subject,
    html,
    attachments: logoAttachments(),
    logContext: { emailKind: "reply_notify_doctor", caseId },
  });
}
