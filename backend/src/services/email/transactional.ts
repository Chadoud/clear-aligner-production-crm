/**
 * Transactional emails (English). Templates use shared HTML layout + contact block.
 * Re-exports domain modules for a stable public API.
 */
export {
  sendNewCaseLabEmail,
  sendNewCaseDoctorEmail,
  sendCasePausedEmail,
  sendCaseSansSuiteEmail,
  sendOrderShippedEmail,
  sendCaseDeliveredCompanyEmail,
} from "./transactionalCase.js";
export {
  sendDoctorBillingGeneratedEmail,
  sendDoctorBillingPaidEmail,
  sendDoctorBillingReminderEmail,
  type DoctorBillingEmailRow,
  sendInvoiceFullyPaidCompanyEmail,
  sendDirectFirstPaymentEmail,
  sendDirectPaymentReceivedEmail,
} from "./transactionalBilling.js";
export { sendDiscussionReplyNotificationEmail } from "./transactionalDiscussion.js";
export { scheduleTransactionalEmail } from "./transactionalSchedule.js";
