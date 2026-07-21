import { getInvoiceClient } from "@/utils/invoices/index.js";
import { computeStatusCounts } from "@/services/caseStatusMetrics.js";
import { caseStatusToUiId, CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";
import { invoiceCaseDedupKey } from "./overviewTotals.js";
import type { InvoiceDto, PatientSummaryDto } from "@/types/invoice";

type InvoiceClientLike = { ref?: string | null };

/** Matches caseStatusMetrics beware notification filter. */
const BEWARE_NOTIF_LAB = 2;
const BEWARE_NOTIF_DOCTOR = 1;

/**
 * Build fast O(1) lookup maps from a patients array.
 * Looks up by ref first, then falls back to case_id — mirrors getPatientForInvoiceRef.
 */
function buildPatientLookups(patients: PatientSummaryDto[]): {
  byRef: Map<string, PatientSummaryDto>;
  byCaseId: Map<number, PatientSummaryDto>;
} {
  const byRef = new Map<string, PatientSummaryDto>();
  const byCaseId = new Map<number, PatientSummaryDto>();
  for (const p of patients) {
    if (p.ref != null) {
      const r = String(p.ref).trim();
      if (r !== "") byRef.set(r, p);
    }
    if (p.case_id != null && Number.isFinite(Number(p.case_id))) {
      byCaseId.set(Number(p.case_id), p);
    }
  }
  return { byRef, byCaseId };
}

function findPatient(
  clientRef: string | null | undefined,
  caseId: number | null | undefined,
  byRef: Map<string, PatientSummaryDto>,
  byCaseId: Map<number, PatientSummaryDto>
): PatientSummaryDto | null {
  if (clientRef != null) {
    const r = String(clientRef).trim();
    if (r !== "") {
      const p = byRef.get(r);
      if (p) return p;
    }
  }
  if (caseId != null && Number.isFinite(Number(caseId))) {
    return byCaseId.get(Number(caseId)) ?? null;
  }
  return null;
}

/**
 * Count of invoices per case workflow status (patient's `case_status` / beware notif).
 *
 * Accepts the already-loaded `allPatients` list (from useVisiblePatients or the full
 * patient cache) so the result stays reactive when the patient cache is populated and
 * does not depend on the module-level getBaseList() singleton.
 */
export function computeInvoiceCountsByCaseStatus(
  invoices: InvoiceDto[],
  opts: { scope?: "company" | "doctor" },
  allPatients: PatientSummaryDto[] = []
): Record<string, number> {
  const counts: Record<string, number> = {};
  CASE_STATUS_OPTIONS.forEach((o) => {
    counts[o.id] = 0;
  });

  const { byRef, byCaseId } = buildPatientLookups(allPatients);

  invoices.forEach((inv) => {
    const client = getInvoiceClient(inv) as InvoiceClientLike | null;
    const patient = findPatient(
      client?.ref,
      (inv as { case_id?: number | null }).case_id,
      byRef,
      byCaseId
    );
    const uiId = caseStatusToUiId(patient?.case_status);
    if (counts[uiId] != null) counts[uiId] += 1;
  });

  if (opts.scope != null) {
    const notifForBeware =
      opts.scope === "company" ? BEWARE_NOTIF_LAB : BEWARE_NOTIF_DOCTOR;
    counts.beware = invoices.filter((inv) => {
      const client = getInvoiceClient(inv) as InvoiceClientLike | null;
      const patient = findPatient(
        client?.ref,
        (inv as { case_id?: number | null }).case_id,
        byRef,
        byCaseId
      );
      return Boolean(patient && Number(patient.case_notif) === notifForBeware);
    }).length;
  }

  return counts;
}

/**
 * Sum of invoice amounts (CHF, from `totalPrice`) per case workflow status.
 * Mirrors {@link computeInvoiceCountsByCaseStatus} key mapping and beware logic.
 *
 * Accepts the already-loaded `allPatients` list so the memo in Overview/index.jsx
 * re-runs whenever patients are fetched, eliminating the stale-cache bug where all
 * amounts were bucketed under "no_follow_up" on first render.
 */
export function computeInvoiceAmountsByCaseStatus(
  invoices: InvoiceDto[],
  opts: { scope?: "company" | "doctor" },
  allPatients: PatientSummaryDto[] = []
): Record<string, number> {
  const totals: Record<string, number> = {};
  CASE_STATUS_OPTIONS.forEach((o) => {
    totals[o.id] = 0;
  });

  const { byRef, byCaseId } = buildPatientLookups(allPatients);

  invoices.forEach((inv) => {
    const client = getInvoiceClient(inv) as InvoiceClientLike | null;
    const patient = findPatient(
      client?.ref,
      (inv as { case_id?: number | null }).case_id,
      byRef,
      byCaseId
    );
    const uiId = caseStatusToUiId(patient?.case_status);
    if (totals[uiId] != null) {
      totals[uiId] += Number(inv.totalPrice) || 0;
    }
  });

  if (opts.scope != null) {
    const notifForBeware =
      opts.scope === "company" ? BEWARE_NOTIF_LAB : BEWARE_NOTIF_DOCTOR;
    totals.beware = invoices.reduce((sum, inv) => {
      const client = getInvoiceClient(inv) as InvoiceClientLike | null;
      const patient = findPatient(
        client?.ref,
        (inv as { case_id?: number | null }).case_id,
        byRef,
        byCaseId
      );
      if (patient && Number(patient.case_notif) === notifForBeware) {
        return sum + (Number(inv.totalPrice) || 0);
      }
      return sum;
    }, 0);
  }

  return totals;
}

/**
 * One count per unique case in the scoped invoice list, by workflow status (and beware via
 * {@link computeStatusCounts}). Aligns the Patients sub-tab bar chart with filters that drive
 * {@link computeInvoiceCountsByCaseStatus}.
 *
 * Accepts the already-loaded `allPatients` list so results are reactive when patients load.
 */
export function computePatientCaseStatusCountsFromScopedInvoices(
  invoices: InvoiceDto[],
  opts: { scope?: "company" | "doctor" },
  allPatients: PatientSummaryDto[] = []
): Record<string, number> {
  const { byRef, byCaseId } = buildPatientLookups(allPatients);
  const seen = new Set<string>();
  const dedupedPatients: PatientSummaryDto[] = [];
  for (const inv of invoices) {
    const key = invoiceCaseDedupKey(inv);
    if (seen.has(key)) continue;
    seen.add(key);
    const client = getInvoiceClient(inv) as InvoiceClientLike | null;
    const patient = findPatient(
      client?.ref,
      (inv as { case_id?: number | null }).case_id,
      byRef,
      byCaseId
    );
    if (patient) dedupedPatients.push(patient);
  }
  return computeStatusCounts(
    dedupedPatients as Parameters<typeof computeStatusCounts>[0],
    opts
  ).counts;
}
