/**
 * Scheduled doctor bill payment reminders (15th of month after bill period if still unpaid).
 */
import { logger } from "../logger.js";
import {
  fetchDoctorBillingReminderCandidates,
  markDoctorBillReminderSentForInvoiceIds,
  type ReminderCandidateRow,
} from "../repositories/doctorBillingReminderRepository.js";
import {
  sendDoctorBillingReminderEmail,
  type DoctorBillingEmailRow,
} from "./email/transactionalBilling.js";
import { scheduleTransactionalEmail } from "./email/transactionalSchedule.js";
import { getBrand } from "../utils/brand.js";
import {
  parseGeneratedDateToLocalDate,
  fifteenthOfMonthAfterPeriodEnd,
  isReminderDueDateReached,
  formatBillPeriodDdMmYyyyRange,
} from "../utils/doctorBillingReminderDates.js";

function groupKey(row: ReminderCandidateRow): string {
  const cid = row.cabinet_idx != null ? String(row.cabinet_idx) : "x";
  const stamp = String(row.doctor_bill_generated_at ?? "").trim();
  return `${cid}::${stamp}`;
}

function patientName(row: ReminderCandidateRow): string {
  const a = String(row.case_prenom ?? "").trim();
  const b = String(row.case_nom ?? "").trim();
  const n = [a, b].filter(Boolean).join(" ").trim();
  return n || "Unknown";
}

function rowToLineItem(row: ReminderCandidateRow): DoctorBillingEmailRow {
  return {
    patientName: patientName(row),
    caseRef: row.case_ref ?? undefined,
    invoiceRef: row.invoice_ref ?? undefined,
    amount: row.total_price != null ? Number(row.total_price) : null,
    invoiceDate: row.generated_date ?? undefined,
  };
}

export async function runDoctorBillingReminders(): Promise<{
  groupsTotal: number;
  emailsScheduled: number;
  skippedNotDue: number;
  skippedNoEmail: number;
}> {
  const rows = await fetchDoctorBillingReminderCandidates();
  const groups = new Map<string, ReminderCandidateRow[]>();
  for (const r of rows) {
    const k = groupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  let emailsScheduled = 0;
  let skippedNotDue = 0;
  let skippedNoEmail = 0;

  for (const [, groupRows] of groups) {
    if (groupRows.length === 0) continue;
    const cabinetIdx = groupRows[0].cabinet_idx;
    if (cabinetIdx == null || !Number.isFinite(Number(cabinetIdx))) {
      skippedNotDue += 1;
      continue;
    }

    const parsedDates: Date[] = [];
    for (const r of groupRows) {
      const d = parseGeneratedDateToLocalDate(r.generated_date);
      if (d) parsedDates.push(d);
    }
    if (parsedDates.length === 0) {
      skippedNotDue += 1;
      continue;
    }

    let max = parsedDates[0];
    for (let i = 1; i < parsedDates.length; i++) {
      if (parsedDates[i].getTime() > max.getTime()) max = parsedDates[i];
    }
    const reminderDue = fifteenthOfMonthAfterPeriodEnd(max);
    if (!isReminderDueDateReached(reminderDue)) {
      skippedNotDue += 1;
      continue;
    }

    const billMonthLabel = formatBillPeriodDdMmYyyyRange(parsedDates);
    if (!billMonthLabel) {
      skippedNotDue += 1;
      continue;
    }

    const email = String(groupRows[0].cabinet_email ?? "").trim();
    if (!email) {
      logger.warn(
        { cabinetIdx },
        "Doctor billing reminder skipped: cabinet has no email"
      );
      skippedNoEmail += 1;
      continue;
    }

    const cabinetName = String(groupRows[0].cabinet_nom ?? "").trim();
    const lineItems = groupRows.map(rowToLineItem);
    const ids = groupRows.map((r) => r.id);
    const brand = getBrand(cabinetIdx);
    const firstCaseId = groupRows[0].case_id;
    const caseId =
      firstCaseId != null && Number.isFinite(Number(firstCaseId))
        ? Number(firstCaseId)
        : undefined;
    const sentAt = new Date().toLocaleString("en-GB");

    emailsScheduled += 1;
    scheduleTransactionalEmail("doctor_billing_reminder", caseId, async () => {
      await sendDoctorBillingReminderEmail({
        doctorEmail: email,
        cabinetName,
        billMonthLabel,
        lineItems,
        caseId,
        brand,
      });
      await markDoctorBillReminderSentForInvoiceIds(ids, sentAt);
    });
  }

  return {
    groupsTotal: groups.size,
    emailsScheduled,
    skippedNotDue,
    skippedNoEmail,
  };
}
