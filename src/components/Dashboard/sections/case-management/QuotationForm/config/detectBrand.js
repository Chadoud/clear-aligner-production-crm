import { brandFromCabinetId } from "@/config/brand";

/**
 * Detects invoice brand from patient ref and cabinet (for quotation form).
 * Cabinet name "direct" takes precedence over cabinet_id when it clearly
 * indicates Direct (also see VITE_DIRECT_CABINET_ID).
 */
export function detectBrandFromPatient(patient) {
  const cabinet =
    patient?.cabinet != null ? String(patient.cabinet).trim() : "";
  const cabinetIsDirect = cabinet && cabinet.toLowerCase().includes("direct");

  const cabinetId =
    patient?.cabinet_id != null && Number.isFinite(Number(patient.cabinet_id))
      ? Number(patient.cabinet_id)
      : null;

  // Cabinet name "direct" → Direct (even if cabinet_id differs)
  if (cabinetIsDirect) return "Direct";
  if (cabinetId != null) return brandFromCabinetId(cabinetId);

  const refText = patient?.ref?.trim();
  if (!refText && !cabinet) return null;
  if (refText === "Empty" && !cabinet) return null;

  const refSuggestsDirect = refText && refText.toUpperCase().startsWith("E");
  if (cabinet) return "Lab";
  return refSuggestsDirect ? "Direct" : "Lab";
}
