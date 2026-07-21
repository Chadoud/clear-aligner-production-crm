/**
 * Invoice list/get queries.
 */
import { mysqlQuery } from "../infrastructure/db/mysql/client.js";
import type { RequestPrincipal } from "../modules/auth/domain/principal.js";
import { scopeCabinet } from "../security/policies/index.js";
import { buildPayloadFromRow } from "./invoicePayload.js";
import { ensureTable } from "./invoiceSchema.js";

export interface InvoiceRow {
  id: string;
  case_id: number | null;
  treatment_duration: string | null;
  treatment_steps: string | null;
  total_price: number | null;
  monthly_payment_enabled: number | null;
  amount_paid: number | null;
  invoice_status: number | null;
  generated_date: string | null;
  invoice_ref: string | null;
  services_json: string | null;
  monthly_plan_json: string | null;
  show_free_services: number | null;
  paid_date: string | null;
  doctor_bill_generated_at: string | null;
  doctor_bill_reminder_sent_at: string | null;
  down_payment_paid: number | null;
  paid_month_indices: string | null;
  payment_received_json?: string | null;
  created_at: Date;
  updated_at: Date;
  cabinet_idx?: number | null;
  cabinet_nom?: string | null;
  case_prenom?: string;
  case_nom?: string;
  case_ref?: string;
  case_email?: string;
  case_naissance?: string;
  case_address?: string;
  case_phone?: string;
  case_username?: string | null;
  case_mob_app_password?: string | null;
}

function rowToPayload(r: InvoiceRow): Record<string, unknown> {
  const row = r as unknown as Record<string, unknown>;
  return buildPayloadFromRow(row);
}

/**
 * List invoices for the principal. Company sees all; doctor sees own cabinet.
 * When case_id is provided, returns only invoices for that case (indexed lookup).
 */
export async function listInvoices(
  principal: RequestPrincipal,
  opts: {
    cabinet_id?: number;
    case_id?: number;
    limit?: number;
    offset?: number;
    companyEquivalentScope?: boolean;
  } = {}
): Promise<Record<string, unknown>[]> {
  await ensureTable();
  const cabinetScope =
    principal.role === "doctor" && opts.companyEquivalentScope
      ? Number.isFinite(opts.cabinet_id)
        ? opts.cabinet_id
        : undefined
      : scopeCabinet(principal, opts.cabinet_id);
  const limit = Math.min(Math.max(0, opts.limit ?? 1000), 5000);
  const offset = Math.max(0, opts.offset ?? 0);

  let where = "1=1";
  const params: unknown[] = [];
  if (cabinetScope !== undefined) {
    where += " AND c.cabinet_idx = ?";
    params.push(cabinetScope);
  }
  if (opts.case_id != null && Number.isFinite(opts.case_id)) {
    where += " AND i.case_id = ?";
    params.push(opts.case_id);
  }
  params.push(limit, offset);

  const rows = await mysqlQuery<InvoiceRow>(
    `SELECT i.*, c.cabinet_idx, cab.cabinet_nom,
            c.case_prenom, c.case_nom, c.case_ref, c.case_email,
            c.case_naissance, c.case_address, c.case_phone,
            c.username AS case_username,
            c.mob_app_password AS case_mob_app_password
     FROM tbl_invoices i
     LEFT JOIN tbl_case c ON c.case_id = i.case_id
     LEFT JOIN tbl_cabinet cab ON cab.cabinet_id = c.cabinet_idx
     WHERE ${where}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );

  return rows.map((r) => rowToPayload(r));
}

/**
 * Get a single invoice by id. Enforces cabinet access.
 */
export async function getInvoiceById(
  principal: RequestPrincipal,
  invoiceId: string
): Promise<Record<string, unknown> | null> {
  await ensureTable();
  const cabinetScope = scopeCabinet(principal);
  const params: unknown[] = [invoiceId];
  let where = "i.id = ?";
  if (cabinetScope !== undefined) {
    where += " AND c.cabinet_idx = ?";
    params.push(cabinetScope);
  }

  const rows = await mysqlQuery<InvoiceRow>(
    `SELECT i.*, c.cabinet_idx, cab.cabinet_nom,
            c.case_prenom, c.case_nom, c.case_ref, c.case_email,
            c.case_naissance, c.case_address, c.case_phone,
            c.username AS case_username,
            c.mob_app_password AS case_mob_app_password
     FROM tbl_invoices i
     LEFT JOIN tbl_case c ON c.case_id = i.case_id
     LEFT JOIN tbl_cabinet cab ON cab.cabinet_id = c.cabinet_idx
     WHERE ${where} LIMIT 1`,
    params
  );
  if (rows.length === 0) return null;
  return rowToPayload(rows[0]);
}
