/**
 * One-off: send a sample doctor billing reminder email (same template as cron).
 * Usage: npx tsx scripts/preview-doctor-billing-reminder-email.ts recipient@example.com
 * Requires SMTP_* in backend/.env (including SMTP_PASSWORD).
 */
import "../src/config.js";
import { getTransport } from "../src/services/email/smtp.js";
import { sendDoctorBillingReminderEmail } from "../src/services/email/transactionalBilling.js";

void (async () => {
  const to = process.argv[2]?.trim();
  if (!to) {
    console.error(
      "Usage: npx tsx scripts/preview-doctor-billing-reminder-email.ts recipient@example.com"
    );
    process.exit(1);
  }

  if (!getTransport()) {
    console.error("SMTP not configured (set SMTP_* in backend/.env).");
    process.exit(1);
  }

  await sendDoctorBillingReminderEmail({
    doctorEmail: to,
    cabinetName: "Preview Cabinet",
    billMonthLabel: "01/01/2026 – 31/01/2026",
    lineItems: [
      {
        patientName: "Jane Doe",
        caseRef: "CASE-REF-001",
        invoiceRef: "INV-2026-042",
        amount: 450.5,
        invoiceDate: "15/01/2026",
      },
      {
        patientName: "John Smith",
        caseRef: "CASE-REF-002",
        invoiceRef: "INV-2026-043",
        amount: 320,
        invoiceDate: "27/01/2026",
      },
    ],
    brand: "Lab",
  });

  console.log(`Reminder preview sent to ${to} (check inbox / spam).`);
})();
