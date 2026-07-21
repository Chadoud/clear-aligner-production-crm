/**
 * Generate unique IDs for doctor invoices: DoctorName-DD/MM/YYYY-[Sn]
 * Sequence keys still use ISO YYYY-MM-DD on the API; only the displayed ID uses French format.
 */

import { apiClient } from "@/core/api/apiClientSingleton";
import { isApiEnabled } from "@/config/api";
import { todayISODate, formatDateDDMMYYYY } from "@/utils/dates";

function slugifyDoctorName(name) {
  if (!name || typeof name !== "string") return "Doctor";
  return (
    name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 50) || "Doctor"
  );
}

/** ISO YYYY-MM-DD (API) → DD/MM/YYYY for bill ID display */
function isoToFrenchBillIdDate(isoDateStr) {
  if (!isoDateStr) return formatDateDDMMYYYY(new Date());
  const trimmed = String(isoDateStr).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return trimmed;
  return formatDateDDMMYYYY(trimmed);
}

function buildDoctorInvoiceId(doctorName, seq, isoDateStr) {
  const d = isoToFrenchBillIdDate(isoDateStr || todayISODate());
  const slug = slugifyDoctorName(doctorName);
  return `${slug}-${d}-[S${seq}]`;
}

/**
 * Generate and consume the next sequence for a doctor on today.
 * @returns {Promise<string>}
 */
export async function generateDoctorInvoiceId(doctorName) {
  const dateStr = todayISODate();
  if (!isApiEnabled) {
    throw new Error("Doctor invoice sequence requires VITE_USE_API=true");
  }
  const res = await apiClient.request("/api/v1/doctor-invoice-sequence", {
    method: "POST",
    body: JSON.stringify({ doctorName: doctorName || "Doctor", dateStr }),
  });
  const seq = res?.sequence ?? 1;
  return buildDoctorInvoiceId(doctorName, seq, dateStr);
}

/**
 * Peek the next sequence without consuming it.
 * @returns {Promise<string>}
 */
export async function getDoctorInvoiceIdForPreview(doctorName) {
  const dateStr = todayISODate();
  if (!isApiEnabled) {
    throw new Error("Doctor invoice sequence requires VITE_USE_API=true");
  }
  const res = await apiClient.request(
    `/api/v1/doctor-invoice-sequence?doctorName=${encodeURIComponent(doctorName || "Doctor")}&dateStr=${dateStr}`
  );
  const seq = res?.sequence ?? 1;
  return buildDoctorInvoiceId(doctorName, seq, dateStr);
}

/**
 * Get filename for doctor bill download. Uses preview ID.
 * @returns {Promise<string>}
 */
export async function getDoctorBillDownloadFilename(doctorName) {
  const refId = await getDoctorInvoiceIdForPreview(doctorName);
  const seqMatch = refId.match(/\[S\d+\]$/);
  const suffix = seqMatch ? seqMatch[0] : "";
  const body = refId.replace(/-\[S\d+\]$/, "");
  const lastDash = body.lastIndexOf("-");
  if (lastDash > 0) {
    const doctorPart = body.slice(0, lastDash);
    const date = body.slice(lastDash + 1).replace(/\//g, "_");
    const prefix = doctorPart.startsWith("Dr") ? doctorPart : `Dr${doctorPart}`;
    return `${prefix}-Bill-${date}${suffix ? `-${suffix}` : ""}.pdf`;
  }
  const slug = slugifyDoctorName(doctorName).replace(/-/g, "");
  const dateStr = isoToFrenchBillIdDate(todayISODate()).replace(/\//g, "_");
  return `Dr${slug}-Bill-${dateStr}.pdf`;
}
