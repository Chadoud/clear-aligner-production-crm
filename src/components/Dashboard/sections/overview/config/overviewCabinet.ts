import { getInvoiceClient } from "@/utils/invoices/index.js";
import {
  getPatientByCaseId,
  getRawPatientByRef,
} from "@/services/patientDataService";
import { getCabinetNameById } from "@/data/cabinets";
import type { InvoiceDto, PatientSummaryDto } from "@/types/invoice";

type InvoiceClientLike = {
  ref?: string | null;
};

/**
 * Cabinet/doctor name from invoice.
 * Resolution order:
 * 1) patient.cabinet resolved by case_id (canonical ownership),
 * 2) patient.cabinet resolved by client ref fallback,
 * 3) doctorInfo.name,
 * 4) cabinet_nom/cabinetName,
 * 5) cabinet_id lookup.
 */
export function getCabinetForInvoice(inv: InvoiceDto): string {
  const caseId =
    inv?.case_id != null && Number.isFinite(Number(inv.case_id))
      ? Number(inv.case_id)
      : null;
  const clientRef = (getInvoiceClient(inv) as InvoiceClientLike | null)?.ref;

  const patientByCase = caseId != null ? getPatientByCaseId(caseId) : null;
  const patientByRef =
    patientByCase == null && clientRef ? getRawPatientByRef(clientRef) : null;
  const patient = (patientByCase ?? patientByRef) as PatientSummaryDto | null;
  const fromPatient = patient?.cabinet;
  if (fromPatient && String(fromPatient).trim()) {
    return String(fromPatient).trim();
  }

  const fromDoctorInfo = inv?.doctorInfo?.name;
  if (fromDoctorInfo && String(fromDoctorInfo).trim()) {
    return String(fromDoctorInfo).trim();
  }

  const fromApi = inv?.cabinet_nom ?? inv?.cabinetName;
  if (fromApi && String(fromApi).trim()) return String(fromApi).trim();

  const cabinetId = inv?.cabinet_id ?? inv?.cabinetId;
  const fromId = getCabinetNameById(cabinetId ?? null);
  if (fromId) return fromId;

  return "";
}
