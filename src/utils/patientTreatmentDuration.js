/**
 * Client-side mirror of patientTreatmentDurationService (CRM backend).
 * @module utils/patientTreatmentDuration
 */

import { brandFromCabinetId } from "@/config/brand";

const INVOICE_STATUS_IN_FABRICATION = 2;
const INVOICE_STATUS_PAID = 3;

function parseMonths(value) {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseDateOnly(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 10);
  if (!s || s.startsWith("0000")) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addCalendarMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function invoiceDurationMonths(invoice, direct) {
  const treatmentMonths = parseMonths(invoice?.treatmentDuration);
  if (!direct) return treatmentMonths;
  const planLen = Array.isArray(invoice?.monthlyPaymentPlanRows)
    ? invoice.monthlyPaymentPlanRows.length
    : 0;
  const fromPlan = planLen > 0 ? planLen + 1 : 0;
  return Math.max(treatmentMonths, fromPlan);
}

export function resolveTreatmentDurationMonths({
  alignerMonitoringMonthsOverride,
  invoices = [],
  cabinetId,
}) {
  const direct = brandFromCabinetId(Number(cabinetId) || 0) === "Direct";

  // Manual override applies to Lab (Dr) cases only — Direct uses invoice plans.
  if (!direct) {
    const override = parseMonths(alignerMonitoringMonthsOverride);
    if (override > 0) return override;
  }

  let max = 0;
  for (const invoice of invoices) {
    const status = Number(invoice?.invoiceStatus);
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

export function resolveTreatmentWindow({
  desiredDeliveryDate,
  mobRegisteredAt,
  durationMonths,
}) {
  const months = durationMonths != null ? parseMonths(durationMonths) : null;
  if (!months) {
    return { durationMonths: null, treatmentStart: null, treatmentEnd: null };
  }

  let treatmentStart = parseDateOnly(desiredDeliveryDate);
  if (!treatmentStart && mobRegisteredAt) {
    const reg = new Date(mobRegisteredAt);
    treatmentStart = Number.isNaN(reg.getTime()) ? null : reg;
  }
  if (!treatmentStart) {
    return { durationMonths: months, treatmentStart: null, treatmentEnd: null };
  }

  return {
    durationMonths: months,
    treatmentStart,
    treatmentEnd: addCalendarMonths(treatmentStart, months),
  };
}

export function formatTreatmentEndDate(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
