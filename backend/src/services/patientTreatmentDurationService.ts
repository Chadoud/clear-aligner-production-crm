import { getBrand } from "../utils/brand.js";
import {
  INVOICE_STATUS_IN_FABRICATION,
  INVOICE_STATUS_PAID,
} from "../constants/invoiceStatus.js";

export type InvoiceDurationInput = {
  invoiceStatus?: number | null;
  treatmentDuration?: string | number | null;
  monthlyPaymentPlanRows?: Array<unknown> | null;
  monthly_plan_json?: string | unknown[] | null;
};

function parseMonths(value: unknown): number {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseDateOnly(value: unknown): Date | null {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 10);
  if (!s || s.startsWith("0000")) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addCalendarMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function planRowsFromInvoice(invoice: InvoiceDurationInput): unknown[] {
  if (Array.isArray(invoice.monthlyPaymentPlanRows)) {
    return invoice.monthlyPaymentPlanRows;
  }
  const raw = invoice.monthly_plan_json;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function invoiceDurationMonths(
  invoice: InvoiceDurationInput,
  direct: boolean
): number {
  const treatmentMonths = parseMonths(invoice.treatmentDuration);
  if (!direct) return treatmentMonths;
  const planLen = planRowsFromInvoice(invoice).length;
  const fromPlan = planLen > 0 ? planLen + 1 : 0;
  return Math.max(treatmentMonths, fromPlan);
}

export function resolveTreatmentDurationMonths(opts: {
  alignerMonitoringMonthsOverride?: number | null;
  invoices?: InvoiceDurationInput[];
  cabinetId?: number | null;
  caseRef?: string | null;
}): number | null {
  const brand = getBrand(Number(opts.cabinetId) || 0);
  const direct = brand === "Direct";

  // Manual override applies to Lab (Dr) cases only — Direct uses invoice plans.
  if (!direct) {
    const override = parseMonths(opts.alignerMonitoringMonthsOverride);
    if (override > 0) return override;
  }

  let max = 0;
  for (const invoice of opts.invoices ?? []) {
    const status = Number(invoice.invoiceStatus);
    if (
      status !== INVOICE_STATUS_IN_FABRICATION &&
      status !== INVOICE_STATUS_PAID
    ) {
      continue;
    }
    max = Math.max(max, invoiceDurationMonths(invoice, direct));
  }
  return max > 0 ? max : null;
}

export function resolveTreatmentWindow(opts: {
  desiredDeliveryDate?: string | null;
  mobRegisteredAt?: string | Date | null;
  durationMonths?: number | null;
}): {
  durationMonths: number | null;
  treatmentStart: Date | null;
  treatmentEnd: Date | null;
} {
  const durationMonths =
    opts.durationMonths != null ? parseMonths(opts.durationMonths) : null;
  if (!durationMonths) {
    return { durationMonths: null, treatmentStart: null, treatmentEnd: null };
  }

  let treatmentStart = parseDateOnly(opts.desiredDeliveryDate);
  if (!treatmentStart && opts.mobRegisteredAt) {
    const reg =
      opts.mobRegisteredAt instanceof Date
        ? opts.mobRegisteredAt
        : new Date(opts.mobRegisteredAt);
    treatmentStart = Number.isNaN(reg.getTime()) ? null : reg;
  }
  if (!treatmentStart) {
    return { durationMonths, treatmentStart: null, treatmentEnd: null };
  }

  return {
    durationMonths,
    treatmentStart,
    treatmentEnd: addCalendarMonths(treatmentStart, durationMonths),
  };
}

export function isWithinTreatmentWindow(
  treatmentEnd: Date | null,
  now = new Date()
): boolean {
  if (!treatmentEnd) return false;
  return now.getTime() <= treatmentEnd.getTime();
}
