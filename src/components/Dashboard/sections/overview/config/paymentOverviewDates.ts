import { parseEnteredToDate } from "@/utils/dates/enteredDate.js";
import type { InvoiceDto, PatientSummaryDto } from "@/types/invoice";
import { ENGLISH_SHORT_MONTH_NAMES as MONTH_NAMES } from "@/utils/dates/englishShortMonthNames";
import { formatPanelDate } from "./overviewDateUtils.js";

function parseCreatedAtIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ISO `createdAt` from API → same shape as `formatPanelDate(..., false)` (e.g. "17 Mar 2026").
 */
export function formatPanelDateFromCreatedAtIso(
  iso: string | null | undefined
): string {
  if (!iso) return "—";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const monthStr = MONTH_NAMES[d.getMonth()] ?? "";
  return `${day} ${monthStr} ${d.getFullYear()}`;
}

export type PaymentOverviewDateInput = {
  createdAt?: string | null;
  generatedDate?: string | null;
  patientEntered?: string | null;
};

/**
 * Payment overview Date column: DB `created_at` first, then document `generatedDate`, then case `entered`.
 */
export function formatPaymentOverviewRowDate(
  input: PaymentOverviewDateInput
): string {
  const fromCreated = formatPanelDateFromCreatedAtIso(input.createdAt ?? null);
  if (fromCreated !== "—") return fromCreated;
  if (input.generatedDate) {
    return formatPanelDate(input.generatedDate, false);
  }
  if (input.patientEntered) {
    return formatPanelDate(input.patientEntered, false);
  }
  return "—";
}

/**
 * Same priority as {@link formatPaymentOverviewRowDate}, for sorting and cabinet "latest" date.
 */
export function paymentOverviewComparableDate(
  inv: InvoiceDto,
  patient: PatientSummaryDto | null | undefined
): Date | null {
  return (
    parseCreatedAtIso(inv.createdAt) ??
    parseEnteredToDate(String(inv.generatedDate ?? "")) ??
    parseEnteredToDate(String(patient?.entered ?? "")) ??
    null
  );
}
