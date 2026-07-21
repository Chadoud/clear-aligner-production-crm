/**
 * Patient presentation: format for display (header, cards, lists).
 * Uses case status and title from utils.
 *
 * @module services/patient/patientPresentationService
 */

import {
  caseStatusToUiId,
  getCaseStatusLabel,
} from "../../utils/cases/index.js";

/** Map DB case_title to display (0=Mr, 1=Mrs). */
export function getTitleLabel(title) {
  if (title === 1) return "Mrs";
  if (title === 0) return "Mr";
  return "";
}

/** Principal workflow statuses (includes beware 1, 2 and reactivation 10). */
const PRINCIPAL_DB_STATUSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * @param {{ name: string, ref: string, case_id?: number, cabinet_id?: number, title?: number|null, phone?: string|null, address?: string|null, born_ymd?: string|null, case_notif?: number|null, case_status?: number|null, proposed_price?: number, email?: string|null, born?: string, entered?: string, cabinet?: string, desired_delivery_date?: string|null }} patient
 * @returns {{ name: string, titleLabel: string, status: string, principalStatus: string, hasBeware: boolean, ref: string, case_id?: number, cabinet_id?: number, cabinet: string, born: string, entered: string, email: string, desired_delivery_date?: string|null, info: string[], case_status?: number|null, proposed_price?: number, title?: number|null, rawPhone?: string, rawAddress?: string, bornYmd?: string|null, rawEmail?: string|null }}
 */
export function formatPatientForDisplay(patient) {
  const dbStatus =
    patient.case_status != null ? Number(patient.case_status) : null;
  const uiId = dbStatus != null ? caseStatusToUiId(dbStatus) : null;
  const statusLabel = uiId != null ? getCaseStatusLabel(uiId) : "—";
  const principalStatus =
    dbStatus != null && PRINCIPAL_DB_STATUSES.includes(dbStatus)
      ? getCaseStatusLabel(caseStatusToUiId(dbStatus))
      : statusLabel;
  const hasBewareForLab = patient.case_notif === 2;
  const hasBewareForDoctor = patient.case_notif === 1;
  const hasBeware = hasBewareForLab || hasBewareForDoctor;
  const cabinet =
    patient.cabinet != null && patient.cabinet !== ""
      ? String(patient.cabinet).trim()
      : "";
  const born = patient.born ?? "";
  const entered = patient.entered ?? "";
  const desiredDeliveryDate =
    patient.desired_delivery_date != null &&
    String(patient.desired_delivery_date).trim() !== ""
      ? String(patient.desired_delivery_date).slice(0, 10)
      : null;
  const rawEmail =
    patient.email != null && String(patient.email).trim() !== ""
      ? String(patient.email).trim()
      : null;
  return {
    name: patient.name,
    titleLabel: getTitleLabel(patient.title),
    title: patient.title ?? null,
    status: statusLabel,
    principalStatus,
    hasBeware,
    hasBewareForLab,
    hasBewareForDoctor,
    ref: patient.ref,
    case_id: patient.case_id,
    cabinet_id: patient.cabinet_id,
    cabinet,
    born,
    entered,
    desired_delivery_date: desiredDeliveryDate,
    aligner_monitoring_months:
      patient.aligner_monitoring_months != null &&
      Number.isFinite(Number(patient.aligner_monitoring_months))
        ? Number(patient.aligner_monitoring_months)
        : null,
    email: patient.email || "—",
    rawEmail,
    rawPhone: patient.phone != null ? String(patient.phone) : "",
    rawAddress: patient.address != null ? String(patient.address) : "",
    bornYmd:
      patient.born_ymd != null && String(patient.born_ymd).trim() !== ""
        ? String(patient.born_ymd).trim().slice(0, 10)
        : null,
    case_status: patient.case_status ?? null,
    proposed_price: patient.proposed_price,
    info: [
      born ? `Born on ${born}` : "born: —",
      entered ? `Entered on ${entered}` : "entered: —",
      `Cabinet: ${cabinet || "—"}`,
      `status: ${principalStatus}${hasBeware ? " (beware)" : ""}`,
      patient.email ? `Email: ${patient.email}` : "Email: —",
    ],
  };
}
