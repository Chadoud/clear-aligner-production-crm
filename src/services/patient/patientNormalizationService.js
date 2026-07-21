/**
 * Patient normalization: raw API shape → normalized patient object.
 *
 * @module services/patient/patientNormalizationService
 */

import { normalizeBirthDateYmd } from "@/constants/defaultBirthDate.js";

function normalizeBornDisplay(born, bornYmd) {
  const ymd = normalizeBirthDateYmd(bornYmd);
  if (ymd) {
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
  }
  const b = String(born ?? "").trim();
  if (b === "01/01/1900" || b === "1/1/1900") return "01/01/1980";
  return b;
}

/**
 * Normalize a raw API patient record to the canonical frontend shape.
 * @param {Record<string, unknown>} p - Raw patient from API
 * @param {string} [cabinet] - Cabinet/doctor name
 * @returns {{ name: string, ref: string, title: number|null, email: string|null, born: string, entered: string, cabinet: string, case_id?: number, case_status?: number }}
 */
export function normalize(p, cabinet) {
  return {
    name: p.name,
    ref: p.ref,
    title: p.title ?? null,
    email: p.email ?? null,
    born: normalizeBornDisplay(p.born, p.born_ymd),
    entered: p.entered ?? "",
    cabinet: cabinet ?? "",
    cabinet_id: p.cabinet_id != null ? p.cabinet_id : undefined,
    case_id: p.case_id ?? undefined,
    case_status: p.case_status != null ? p.case_status : undefined,
    case_notif: p.case_notif != null ? p.case_notif : undefined,
    case_notif_reason:
      p.case_notif_reason != null ? Number(p.case_notif_reason) : undefined,
    proposed_price:
      p.proposed_price != null ? Number(p.proposed_price) : undefined,
    desired_delivery_date: p.desired_delivery_date ?? undefined,
    aligner_monitoring_months:
      p.aligner_monitoring_months != null
        ? Number(p.aligner_monitoring_months)
        : undefined,
    phone: p.phone != null ? String(p.phone) : "",
    address: p.address != null ? String(p.address) : "",
    born_ymd: normalizeBirthDateYmd(p.born_ymd) || null,
    last_chat_at: p.last_chat_at ?? undefined,
    last_reply_type:
      p.last_reply_type != null ? Number(p.last_reply_type) : undefined,
  };
}

/** Unique key for a case: prefer case_id (DB), fallback to ref. */
export function caseKey(p) {
  return p.case_id != null ? String(p.case_id) : String(p.ref || "");
}
