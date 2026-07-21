/**
 * Invoice row ↔ API payload mapping (tbl_invoices + case join).
 */
import { formatDate, mysqlDate } from "../shared/utils/date.js";
import { resolveVatRate } from "../shared/utils/vatRate.js";
import {
  calculateLabPrice,
  calculateServicesSumExcludingLab,
} from "../utils/priceCalculations.js";
import {
  INVOICE_STATUS_QUOTE,
  INVOICE_STATUS_IN_FABRICATION,
  INVOICE_STATUS_PAID,
} from "../constants/invoiceStatus.js";
import { brandFromCabinetId } from "../utils/brand.js";
import { safeJsonParse } from "../shared/utils/json.js";
import { ns } from "../shared/utils/string.js";

export type InvoicePayload = Record<string, unknown>;

function serializePaymentReceived(raw: unknown): string | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const obj: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) obj[String(k)] = n;
  }
  if (Object.keys(obj).length === 0) return null;
  return JSON.stringify(obj);
}

export function getClient(obj: InvoicePayload): Record<string, unknown> {
  return (obj.client ?? obj.clientInfo ?? {}) as Record<string, unknown>;
}

export function resolveInvoiceStatus(payload: InvoicePayload): number {
  const status = payload.invoiceStatus;
  if (
    status === INVOICE_STATUS_QUOTE ||
    status === INVOICE_STATUS_IN_FABRICATION ||
    status === INVOICE_STATUS_PAID
  ) {
    return status;
  }
  const total = Number(payload.totalPrice) || 0;
  const paid = Number(payload.amountPaid) || 0;
  if (total > 0 && paid >= total - 0.01) return INVOICE_STATUS_PAID;
  const isQuote = payload.isQuote;
  if (isQuote === true) return INVOICE_STATUS_QUOTE;
  if (isQuote === false) return INVOICE_STATUS_IN_FABRICATION;
  return INVOICE_STATUS_QUOTE;
}

export function extractColumnsFromPayload(
  payload: InvoicePayload
): Record<string, unknown> {
  return {
    treatment_duration: payload.treatmentDuration ?? null,
    treatment_steps: payload.treatmentSteps ?? null,
    total_price: payload.totalPrice != null ? Number(payload.totalPrice) : null,
    monthly_payment_enabled: payload.monthlyPaymentEnabled ? 1 : 0,
    amount_paid: payload.amountPaid != null ? Number(payload.amountPaid) : null,
    invoice_status: resolveInvoiceStatus(payload),
    generated_date: payload.generatedDate ?? null,
    invoice_ref: payload.invoiceRef ?? null,
    services_json: Array.isArray(payload.services)
      ? JSON.stringify(payload.services)
      : null,
    monthly_plan_json: Array.isArray(payload.monthlyPaymentPlanRows)
      ? JSON.stringify(payload.monthlyPaymentPlanRows)
      : null,
    show_free_services:
      payload.brand === "Direct" && payload.showFreeServices !== false ? 1 : 0,
    paid_date: payload.paidDate ?? null,
    doctor_bill_generated_at: payload.doctorBillGeneratedAt ?? null,
    down_payment_paid: payload.downPaymentPaid ? 1 : 0,
    paid_month_indices: Array.isArray(payload.paidMonthIndices)
      ? JSON.stringify(payload.paidMonthIndices)
      : null,
    payment_received_json: serializePaymentReceived(
      payload.paymentReceivedByDisplayIndex
    ),
    vat_rate:
      payload.vatRate != null && Number.isFinite(Number(payload.vatRate))
        ? Number(payload.vatRate)
        : null,
  };
}

function parseJson<T>(raw: unknown): T | null {
  return safeJsonParse<T | null>(raw, null);
}

export function parsePaymentReceivedFromRow(
  raw: unknown
): Record<string, number> {
  const parsed = parseJson<Record<string, unknown>>(raw);
  if (!parsed || typeof parsed !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[String(k)] = n;
  }
  return out;
}

export function buildClientFromRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const prenom = ns(row.case_prenom);
  const nom = ns(row.case_nom);
  const name = [prenom, nom].filter(Boolean).join(" ").trim() || null;
  const born = row.case_naissance
    ? formatDate(mysqlDate(row.case_naissance))
    : null;
  return {
    name,
    ref: ns(row.case_ref),
    email: ns(row.case_email),
    born,
    address: ns(row.case_address),
    phone: ns(row.case_phone),
  };
}

export function computeDerivedFields(row: Record<string, unknown>): {
  remainingBalanceDue: number | null;
  numberOfMonthlyPayments: number;
  monthlyPaymentAmount: number | null;
  labPrice: number | null;
  labPricesSum: number | null;
} {
  const total = Number(row.total_price) || 0;
  const paid = Number(row.amount_paid) || 0;
  const services =
    parseJson<
      Array<{
        code?: string;
        quantity?: number;
        points?: number;
        vpt?: number;
        point_value?: number;
      }>
    >(row.services_json) ?? [];
  const planRows =
    parseJson<Array<{ amount?: number }>>(row.monthly_plan_json) ?? [];

  const remainingBalanceDue = Math.max(0, total - paid);
  const numberOfMonthlyPayments = planRows.length;
  const monthlyPaymentAmount =
    planRows.length > 0 && planRows[0]?.amount != null
      ? Number(planRows[0].amount)
      : planRows.length > 0
        ? remainingBalanceDue / planRows.length
        : null;
  const vatRate =
    row.vat_rate != null && Number.isFinite(Number(row.vat_rate))
      ? resolveVatRate(Number(row.vat_rate))
      : 0;
  const labPricesSum = calculateServicesSumExcludingLab(services);
  const labPrice = calculateLabPrice(total, services, vatRate);

  return {
    remainingBalanceDue,
    numberOfMonthlyPayments,
    monthlyPaymentAmount,
    labPrice,
    labPricesSum,
  };
}

export function brandFromRow(row: Record<string, unknown>): "Direct" | "Lab" {
  const cabinetNom = String(row.cabinet_nom ?? "")
    .trim()
    .toLowerCase();
  if (cabinetNom.includes("direct")) return "Direct";
  const cabinetIdx = Number(row.cabinet_idx ?? row.cabinet_id) || 0;
  return brandFromCabinetId(cabinetIdx);
}

export function createdAtToIso(v: unknown): string | undefined {
  const d = mysqlDate(v);
  if (!d) return undefined;
  return d.toISOString();
}

export function buildPayloadFromRow(
  row: Record<string, unknown>
): InvoicePayload {
  const client = buildClientFromRow(row);
  const derived = computeDerivedFields(row);
  const cabinetIdx = Number(row.cabinet_idx ?? row.cabinet_id) || 0;
  const brand = brandFromRow(row);
  const payload: InvoicePayload = {
    id: row.id,
    client,
    brand,
    treatmentDuration: row.treatment_duration,
    treatmentSteps: row.treatment_steps,
    totalPrice: row.total_price,
    monthlyPaymentEnabled: row.monthly_payment_enabled === 1,
    amountPaid: row.amount_paid,
    remainingBalanceDue: derived.remainingBalanceDue,
    numberOfMonthlyPayments: derived.numberOfMonthlyPayments,
    monthlyPaymentAmount: derived.monthlyPaymentAmount,
    labPrice: derived.labPrice,
    labPricesSum: derived.labPricesSum,
    invoiceStatus: row.invoice_status ?? INVOICE_STATUS_IN_FABRICATION,
    isQuote: row.invoice_status === INVOICE_STATUS_QUOTE,
    generatedDate: row.generated_date,
    invoiceRef: row.invoice_ref,
    services: parseJson<unknown[]>(row.services_json) ?? [],
    monthlyPaymentPlanRows: parseJson<unknown[]>(row.monthly_plan_json) ?? [],
    showFreeServices: brand === "Direct" ? row.show_free_services !== 0 : false,
    paidDate: row.paid_date ?? undefined,
    doctorBillGeneratedAt: row.doctor_bill_generated_at ?? undefined,
    doctorBillReminderSentAt: row.doctor_bill_reminder_sent_at ?? undefined,
    downPaymentPaid: row.down_payment_paid === 1,
    paidMonthIndices: parseJson<number[]>(row.paid_month_indices) ?? [],
    paymentReceivedByDisplayIndex: parsePaymentReceivedFromRow(
      row.payment_received_json
    ),
    ...(row.vat_rate != null
      ? { vatRate: resolveVatRate(Number(row.vat_rate)) }
      : {}),
  };
  if (row.case_id != null) payload.case_id = row.case_id;
  if (cabinetIdx > 0) payload.cabinet_id = cabinetIdx;
  const cabinetNom =
    row.cabinet_nom != null ? String(row.cabinet_nom).trim() : null;
  if (cabinetNom) payload.cabinet_nom = cabinetNom;
  const createdAtIso = createdAtToIso(row.created_at);
  if (createdAtIso) payload.createdAt = createdAtIso;
  // Patient mobile-app login (stored on tbl_case)
  if (row.case_username != null) payload.case_username = row.case_username;
  if (row.case_mob_app_password != null) {
    payload.case_mob_app_password = row.case_mob_app_password;
  }
  return payload;
}
