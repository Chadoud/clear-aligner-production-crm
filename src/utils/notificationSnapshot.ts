import { INVOICE_CREATED_REASON } from "@/components/Dashboard/Header/utils/formatters";

function isDirectCabinet(name: unknown): boolean {
  return String(name ?? "")
    .toLowerCase()
    .includes("direct");
}

export interface PatientNotifRow {
  case_id?: number | string;
  ref?: string;
  name?: string;
  cabinet?: string;
  case_notif?: number;
  case_notif_reason?: number;
  last_chat_at?: string | null;
}

export type PatientNotificationKind = "message" | "invoice" | "upload";

export interface PatientNotificationChange {
  kind: PatientNotificationKind;
  patient: PatientNotifRow;
}

/** Same filter as useBewarePatients. */
export function filterBewarePatients(
  patients: PatientNotifRow[],
  scope: string,
  isLab: boolean
): PatientNotifRow[] {
  const notifForScope = scope === "company" ? 2 : 1;
  if (isLab && notifForScope === 1) return [];
  return patients.filter((p) => {
    if (Number(p.case_notif) !== notifForScope) return false;
    if (isDirectCabinet(p.cabinet)) return false;
    if (p.case_notif_reason === INVOICE_CREATED_REASON) return true;
    return Boolean(p.last_chat_at);
  });
}

export function buildPatientNotifSnapshot(patient: PatientNotifRow): string {
  return [
    patient.case_id ?? "",
    patient.case_notif ?? 0,
    patient.case_notif_reason ?? 0,
    patient.last_chat_at ?? "",
  ].join(":");
}

export function detectPatientNotificationChanges(
  previous: Map<string, string>,
  patients: PatientNotifRow[],
  scope: string,
  isLab: boolean
): { changes: PatientNotificationChange[]; next: Map<string, string> } {
  const beware = filterBewarePatients(patients, scope, isLab);
  const next = new Map<string, string>();
  const changes: PatientNotificationChange[] = [];

  for (const patient of beware) {
    const caseKey = String(patient.case_id ?? patient.ref ?? "");
    if (!caseKey) continue;
    const snapshot = buildPatientNotifSnapshot(patient);
    next.set(caseKey, snapshot);

    const prev = previous.get(caseKey);
    if (prev === undefined || prev !== snapshot) {
      const kind: PatientNotificationKind =
        patient.case_notif_reason === INVOICE_CREATED_REASON
          ? "invoice"
          : "message";
      if (prev !== undefined) {
        changes.push({ kind, patient });
      } else if (previous.size > 0) {
        changes.push({ kind, patient });
      }
    }
  }

  return { changes, next };
}

export function detectNewDeliveryEvents(
  previousIds: Set<number>,
  events: Array<{ id: number }>,
  hasBaseline: boolean
): Array<{ id: number }> {
  if (!hasBaseline) return [];
  return events.filter((ev) => !previousIds.has(ev.id));
}

export function buildDeliveryIdSet(events: Array<{ id: number }>): Set<number> {
  return new Set(events.map((ev) => ev.id));
}
