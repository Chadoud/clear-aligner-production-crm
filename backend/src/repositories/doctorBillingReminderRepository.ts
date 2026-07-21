/**
 * Queries and updates for doctor bill payment reminder emails.
 */
import { mysqlQuery } from "../infrastructure/db/mysql/client.js";
import { INVOICE_STATUS_QUOTE } from "../constants/invoiceStatus.js";
import { DIRECT_CABINET_ID } from "../utils/brand.js";
import { ensureTable } from "./invoiceSchema.js";

export interface ReminderCandidateRow {
  id: string;
  case_id: number | null;
  generated_date: string | null;
  doctor_bill_generated_at: string | null;
  doctor_bill_reminder_sent_at: string | null;
  total_price: number | null;
  amount_paid: number | null;
  invoice_ref: string | null;
  cabinet_idx: number | null;
  case_prenom: string | null;
  case_nom: string | null;
  case_ref: string | null;
  cabinet_nom: string | null;
  cabinet_email: string | null;
}

export async function fetchDoctorBillingReminderCandidates(): Promise<
  ReminderCandidateRow[]
> {
  await ensureTable();
  return mysqlQuery<ReminderCandidateRow>(
    `SELECT i.id, i.case_id, i.generated_date, i.doctor_bill_generated_at, i.doctor_bill_reminder_sent_at,
            i.total_price, i.amount_paid, i.invoice_ref,
            c.cabinet_idx, c.case_prenom, c.case_nom, c.case_ref, cab.cabinet_nom, cab.cabinet_email
     FROM tbl_invoices i
     INNER JOIN tbl_case c ON c.case_id = i.case_id
     LEFT JOIN tbl_cabinet cab ON cab.cabinet_id = c.cabinet_idx
     WHERE i.doctor_bill_generated_at IS NOT NULL
       AND TRIM(COALESCE(i.doctor_bill_reminder_sent_at, '')) = ''
       AND IFNULL(i.invoice_status, 2) != ?
       AND (c.cabinet_idx IS NULL OR c.cabinet_idx != ?)
       AND (
         i.amount_paid IS NULL OR i.total_price IS NULL
         OR CAST(i.amount_paid AS DECIMAL(12,2)) < CAST(i.total_price AS DECIMAL(12,2)) - 0.01
       )`,
    // When unset, -1 matches no real cabinet_idx so Direct exclusion is a no-op.
    [INVOICE_STATUS_QUOTE, DIRECT_CABINET_ID ?? -1]
  );
}

export async function markDoctorBillReminderSentForInvoiceIds(
  ids: string[],
  sentAt: string
): Promise<void> {
  if (ids.length === 0) return;
  await ensureTable();
  const ph = ids.map(() => "?").join(",");
  await mysqlQuery(
    `UPDATE tbl_invoices SET doctor_bill_reminder_sent_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${ph})`,
    [sentAt, ...ids]
  );
}
