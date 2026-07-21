/**
 * Invoice create / update / delete / quote confirmation.
 */
import { mysqlQuery } from "../infrastructure/db/mysql/client.js";
import type { RequestPrincipal } from "../modules/auth/domain/principal.js";
import { scopeCabinet } from "../security/policies/index.js";
import { logger } from "../logger.js";
import {
  INVOICE_STATUS_QUOTE,
  INVOICE_STATUS_IN_FABRICATION,
  INVOICE_STATUS_PAID,
} from "../constants/invoiceStatus.js";
import { DIRECT_CABINET_ID } from "../utils/brand.js";
import {
  extractColumnsFromPayload,
  getClient,
  resolveInvoiceStatus,
  type InvoicePayload,
} from "./invoicePayload.js";
import { ensureTable } from "./invoiceSchema.js";
import { getInvoiceById } from "./invoiceRepositoryQueries.js";
import { maybeSendInvoiceTransactionalEmails } from "./invoiceRepositoryEmailHooks.js";
import { upsertMobUserForCase } from "./mobUsersRepository.js";
import { clearCaseCredentials } from "./caseRepository.js";

/** Statuses where the patient should have mobile app credentials (not a quote). */
function isActiveInvoiceStatus(status: number): boolean {
  return (
    status === INVOICE_STATUS_IN_FABRICATION || status === INVOICE_STATUS_PAID
  );
}

/**
 * Provision tbl_case / mob_users credentials when an invoice is no longer a quote.
 * Idempotent: reuses existing credentials when already provisioned.
 */
async function maybeProvisionMobUserForActiveInvoice(
  caseId: number,
  invoiceStatus: number,
  payload: Record<string, unknown>,
  logContext: string
): Promise<void> {
  if (!isActiveInvoiceStatus(invoiceStatus)) return;
  try {
    const plainPassword = await upsertMobUserForCase(caseId);
    if (plainPassword != null) {
      payload.mob_app_password_once = plainPassword;
    }
    const { getCaseById: getCaseForUsername } =
      await import("./caseRepository.js");
    const freshCase = await getCaseForUsername(caseId);
    if (freshCase?.username != null) {
      payload.case_username = freshCase.username;
    }
    if (freshCase?.mob_app_password != null) {
      payload.case_mob_app_password = freshCase.mob_app_password;
    }
  } catch (err) {
    logger.error({ err, caseId }, logContext);
  }
}

/**
 * Create an invoice. cabinet_id derived from tbl_case via case_id.
 */
export async function createInvoice(
  principal: RequestPrincipal,
  invoice: Record<string, unknown>
): Promise<Record<string, unknown>> {
  await ensureTable();
  const id =
    (invoice.id as string) ||
    `inv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  let cabinetId: number;
  if (principal.role === "company") {
    if (
      invoice.cabinet_id == null ||
      !Number.isFinite(Number(invoice.cabinet_id))
    ) {
      throw new Error(
        "cabinet_id is required when creating invoice as company"
      );
    }
    cabinetId = Number(invoice.cabinet_id);
  } else {
    cabinetId = principal.cabinetId ?? -1;
  }
  if (cabinetId < 0) {
    throw new Error("Doctor must have cabinet_id");
  }
  const payload = { ...invoice, id } as InvoicePayload;
  delete (payload as Record<string, unknown>).cabinet_id;
  const caseId =
    invoice.case_id != null && Number.isFinite(Number(invoice.case_id))
      ? Number(invoice.case_id)
      : null;
  delete (payload as Record<string, unknown>).case_id;

  if (caseId != null) {
    const { getCaseById } = await import("./caseRepository.js");
    const c = await getCaseById(caseId);
    if (!c) throw new Error("Case not found");
    if (c.cabinet_id !== cabinetId) {
      throw new Error("Case does not belong to the specified cabinet");
    }
  } else if (principal.role !== "company") {
    throw new Error("case_id is required when creating invoice as doctor");
  }

  const cols = extractColumnsFromPayload(payload);

  await mysqlQuery(
    `INSERT INTO tbl_invoices (
      id, case_id,
      treatment_duration, treatment_steps, total_price, monthly_payment_enabled,
      amount_paid, invoice_status, generated_date, invoice_ref,
      services_json, monthly_plan_json, show_free_services,
      paid_date, down_payment_paid, paid_month_indices,
      doctor_bill_generated_at, vat_rate, payment_received_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      caseId,
      cols.treatment_duration,
      cols.treatment_steps,
      cols.total_price,
      cols.monthly_payment_enabled,
      cols.amount_paid,
      cols.invoice_status,
      cols.generated_date,
      cols.invoice_ref,
      cols.services_json,
      cols.monthly_plan_json,
      cols.show_free_services,
      cols.paid_date,
      cols.down_payment_paid,
      cols.paid_month_indices,
      cols.doctor_bill_generated_at,
      cols.vat_rate,
      cols.payment_received_json,
    ]
  );
  if (caseId != null) (payload as Record<string, unknown>).case_id = caseId;

  const client = getClient(payload);
  const addr = client?.address != null ? String(client.address).trim() : "";
  const ph = client?.phone != null ? String(client.phone).trim() : "";
  if (caseId != null && (addr || ph)) {
    const { updateCaseAddressPhone } = await import("./caseRepository.js");
    await updateCaseAddressPhone(caseId, addr || null, ph || null);
  }

  const isQuote = cols.invoice_status === INVOICE_STATUS_QUOTE;
  const AWAITING_ACCEPTANCE_STATUS = 4;
  if (caseId != null && principal.role === "company" && isQuote) {
    const { updateCaseNotif, updateCaseStatus } =
      await import("./caseRepository.js");
    await updateCaseNotif(caseId, 1, 1);
    await updateCaseStatus(caseId, AWAITING_ACCEPTANCE_STATUS);
  }

  if (caseId != null) {
    try {
      const { getCaseById } = await import("./caseRepository.js");
      const { getCabinetById } = await import("./cabinetRepository.js");
      const [c, cab] = await Promise.all([
        getCaseById(caseId),
        getCabinetById(cabinetId),
      ]);
      const cabinetNom = (cab?.name ?? "").toLowerCase();
      const isDirect =
        cabinetNom.includes("direct") || cabinetId === DIRECT_CABINET_ID;
      const recipient = isDirect ? c?.email : cab?.email;
      const recipientName = isDirect
        ? (c?.full_name ?? "Patient")
        : (cab?.name ?? "Cabinet");
      if (recipient?.trim()) {
        const { sendInvoiceEmail } =
          await import("../services/emailService.js");
        const { crmDoctorCaseInvoiceUrl } =
          await import("../services/email/emailLinks.js");
        const payloadForEmail = { ...payload } as Record<string, unknown>;
        if (payloadForEmail.client == null && c) {
          payloadForEmail.client = {
            name: c.full_name,
            firstName: c.first_name,
            lastName: c.last_name,
          };
        }
        const patientFullName = (c?.full_name ?? "").trim();
        const salutation = isDirect
          ? patientFullName
            ? `Dear ${patientFullName}`
            : "Dear Patient"
          : "Dear Dr.";
        // Direct patients get no CTA (no "Sign in to Lab" link)
        const invoiceCta = isDirect
          ? null
          : {
              href: crmDoctorCaseInvoiceUrl(caseId),
              label: "Open patient case in Lab",
            };

        const parsePdfAttachment = (raw: unknown): Buffer | null => {
          if (typeof raw !== "string" || raw.length === 0) return null;
          try {
            const buf = Buffer.from(raw, "base64");
            const magic = buf.subarray(0, 5).toString("ascii");
            if (buf.length > 20 && magic === "%PDF-") return buf;
          } catch {
            /* ignore invalid base64 */
          }
          return null;
        };

        const pdfBuffer = parsePdfAttachment(
          payload.pdf_base64 ?? payload.pdfBase64
        );
        const arrangementPdfBuffer = isQuote
          ? parsePdfAttachment(
              payload.arrangement_pdf_base64 ?? payload.arrangementPdfBase64
            )
          : null;

        await sendInvoiceEmail(
          recipient,
          recipientName,
          payloadForEmail,
          isDirect ? "Direct" : "Lab",
          salutation,
          invoiceCta,
          pdfBuffer,
          arrangementPdfBuffer
        );
      }
    } catch (e) {
      const { logger: lg } = await import("../logger.js");
      lg?.error?.(e, "Invoice email notification failed");
    }
  }

  if (caseId != null) {
    await maybeProvisionMobUserForActiveInvoice(
      caseId,
      Number(cols.invoice_status),
      payload as Record<string, unknown>,
      "mob_users upsert on invoice create failed"
    );
  }

  return payload as Record<string, unknown>;
}

/**
 * Update an invoice by id. Enforces cabinet access via tbl_case join.
 */
export async function updateInvoice(
  principal: RequestPrincipal,
  invoiceId: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  await ensureTable();
  const existing = await getInvoiceById(principal, invoiceId);
  if (!existing) return null;
  const merged = { ...existing, ...updates, id: invoiceId };
  const payloadForData = { ...merged };
  delete (payloadForData as Record<string, unknown>).case_id;
  const cabinetScope = scopeCabinet(principal);

  const cols = extractColumnsFromPayload(payloadForData as InvoicePayload);
  const mergedRecord = merged as Record<string, unknown>;
  const caseId =
    mergedRecord.case_id != null &&
    Number.isFinite(Number(mergedRecord.case_id))
      ? Number(mergedRecord.case_id)
      : null;
  const setClauses = [
    "i.treatment_duration = ?",
    "i.treatment_steps = ?",
    "i.total_price = ?",
    "i.monthly_payment_enabled = ?",
    "i.amount_paid = ?",
    "i.invoice_status = ?",
    "i.generated_date = ?",
    "i.invoice_ref = ?",
    "i.services_json = ?",
    "i.monthly_plan_json = ?",
    "i.show_free_services = ?",
    "i.paid_date = ?",
    "i.down_payment_paid = ?",
    "i.paid_month_indices = ?",
    "i.doctor_bill_generated_at = ?",
    "i.vat_rate = ?",
    "i.payment_received_json = ?",
    "i.updated_at = CURRENT_TIMESTAMP",
  ];
  const updateParams: unknown[] = [
    cols.treatment_duration,
    cols.treatment_steps,
    cols.total_price,
    cols.monthly_payment_enabled,
    cols.amount_paid,
    cols.invoice_status,
    cols.generated_date,
    cols.invoice_ref,
    cols.services_json,
    cols.monthly_plan_json,
    cols.show_free_services,
    cols.paid_date,
    cols.down_payment_paid,
    cols.paid_month_indices,
    cols.doctor_bill_generated_at,
    cols.vat_rate,
    cols.payment_received_json,
  ];
  if (updates.case_id !== undefined) {
    setClauses.push("i.case_id = ?");
    updateParams.push(caseId);
  }
  updateParams.push(invoiceId);
  if (cabinetScope !== undefined) updateParams.push(cabinetScope);

  let result: { affectedRows: number }[];
  if (cabinetScope !== undefined) {
    result = await mysqlQuery<{ affectedRows: number }>(
      `UPDATE tbl_invoices i
       LEFT JOIN tbl_case c ON c.case_id = i.case_id
       SET ${setClauses.join(", ")}
       WHERE i.id = ? AND c.cabinet_idx = ?`,
      updateParams
    );
  } else {
    const setClausesNoPrefix = setClauses.map((s) => s.replace(/^i\./, ""));
    result = await mysqlQuery<{ affectedRows: number }>(
      `UPDATE tbl_invoices SET ${setClausesNoPrefix.join(", ")} WHERE id = ?`,
      updateParams
    );
  }

  if ((result[0] as { affectedRows?: number })?.affectedRows === 0) return null;
  void maybeSendInvoiceTransactionalEmails(existing, merged).catch((err) => {
    logger.error({ err }, "Invoice transactional email hook failed");
  });

  const nextStatus = resolveInvoiceStatus(merged as InvoicePayload);
  if (caseId != null) {
    await maybeProvisionMobUserForActiveInvoice(
      caseId,
      nextStatus,
      merged as Record<string, unknown>,
      "mob_users upsert on invoice update failed"
    );
  }

  return merged;
}

/**
 * Set the most recent quote invoice for a case to in_fabrication (invoice_status = 2).
 * For Direct patients, fires a thank-you / payment-receipt email (non-fatal).
 */
export async function setQuoteToConfirmedForCase(
  caseId: number
): Promise<boolean> {
  await ensureTable();
  const rows = await mysqlQuery<{
    id: string;
    invoice_ref: string | null;
    amount_paid: number | null;
    total_price: number | null;
    treatment_duration: string | null;
  }>(
    `SELECT id, invoice_ref, amount_paid, total_price, treatment_duration
     FROM tbl_invoices
     WHERE case_id = ? AND invoice_status = ?
     ORDER BY created_at DESC LIMIT 1`,
    [caseId, INVOICE_STATUS_QUOTE]
  );
  if (rows.length === 0) return false;
  const inv = rows[0];
  const result = await mysqlQuery<{ affectedRows: number }>(
    `UPDATE tbl_invoices SET invoice_status = ? WHERE id = ?`,
    [INVOICE_STATUS_IN_FABRICATION, inv.id]
  );
  const updated =
    (result[0] as unknown as { affectedRows: number })?.affectedRows > 0;

  if (!updated) return false;

  void _maybeSendDirectAcceptedEmail(caseId, inv).catch((err) => {
    logger.error({ err }, "Direct first-payment email failed");
  });

  try {
    await upsertMobUserForCase(caseId);
  } catch (err) {
    logger.error({ err, caseId }, "mob_users upsert failed");
  }

  return true;
}

async function _maybeSendDirectAcceptedEmail(
  caseId: number,
  inv: {
    invoice_ref: string | null;
    amount_paid: number | null;
    total_price: number | null;
    treatment_duration: string | null;
  }
): Promise<void> {
  const { getCaseById } = await import("./caseRepository.js");
  const { getCabinetById } = await import("./cabinetRepository.js");
  const c = await getCaseById(caseId);
  if (!c?.cabinet_id) return;

  const cabinetId = c.cabinet_id as number;
  const cab = await getCabinetById(cabinetId);
  const cabinetNom = (cab?.name ?? "").toLowerCase();
  const isDirect =
    cabinetNom.includes("direct") || cabinetId === DIRECT_CABINET_ID;
  if (!isDirect) return;

  const { isValidEmail } = await import("../services/email/smtp.js");
  const patientEmail = (c.email as string | undefined)?.trim() ?? "";
  if (!patientEmail || !isValidEmail(patientEmail)) return;

  const { sendDirectFirstPaymentEmail } =
    await import("../services/emailService.js");
  await sendDirectFirstPaymentEmail({
    to: patientEmail,
    patientFullName: (c.full_name as string | undefined) ?? "",
    invoiceRef: inv.invoice_ref,
    amountPaid: Number(inv.amount_paid) || 0,
    totalPrice: Number(inv.total_price) || 0,
    treatmentDuration: inv.treatment_duration,
  });
}

/**
 * Delete an invoice by id. Enforces cabinet access via tbl_case join.
 *
 * After deletion, if the case has no remaining invoices with status
 * in_fabrication (2) or paid (3), credentials are cleared from tbl_case and
 * mob_users so that fresh credentials are generated on the next fabrication event.
 */
export async function deleteInvoice(
  principal: RequestPrincipal,
  invoiceId: string
): Promise<boolean> {
  await ensureTable();

  // Capture case_id before deletion so we can run the credential cleanup check.
  const [preRow] = await mysqlQuery<{ case_id: number | null }>(
    "SELECT case_id FROM tbl_invoices WHERE id = ? LIMIT 1",
    [invoiceId]
  );
  const caseId =
    preRow?.case_id != null && Number.isFinite(Number(preRow.case_id))
      ? Number(preRow.case_id)
      : null;

  const cabinetScope = scopeCabinet(principal);

  let result: { affectedRows?: number }[];
  if (cabinetScope !== undefined) {
    result = await mysqlQuery<{ affectedRows: number }>(
      `DELETE i FROM tbl_invoices i
       LEFT JOIN tbl_case c ON c.case_id = i.case_id
       WHERE i.id = ? AND c.cabinet_idx = ?`,
      [invoiceId, cabinetScope]
    );
  } else {
    result = await mysqlQuery<{ affectedRows: number }>(
      `DELETE FROM tbl_invoices WHERE id = ?`,
      [invoiceId]
    );
  }

  const deleted = (result[0]?.affectedRows ?? 0) > 0;
  if (!deleted) return false;

  // If this case has no remaining fabrication/paid invoices, wipe its credentials
  // so fresh ones are generated when the next invoice goes to fabrication.
  if (caseId != null) {
    try {
      const [remaining] = await mysqlQuery<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM tbl_invoices
         WHERE case_id = ? AND invoice_status IN (?, ?)`,
        [caseId, INVOICE_STATUS_IN_FABRICATION, INVOICE_STATUS_PAID]
      );
      if ((remaining?.cnt ?? 1) === 0) {
        await clearCaseCredentials(caseId);
        logger.info(
          { caseId },
          "credentials cleared — no remaining fabrication/paid invoices"
        );
      }
    } catch (err) {
      logger.error(
        { err, caseId },
        "credential cleanup after invoice delete failed"
      );
    }
  }

  return true;
}
