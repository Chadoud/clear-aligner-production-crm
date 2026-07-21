import { DIRECT_CABINET_ID } from "./brand.js";

export type LabProfileContext = "default" | "direct";

export interface PatientBrandHints {
  cabinetId?: number | null;
  cabinetName?: string | null;
  caseRef?: string | null;
}

export function isDirectPatient(hints: PatientBrandHints): boolean {
  const name = String(hints.cabinetName ?? "")
    .trim()
    .toLowerCase();
  if (name.includes("direct")) return true;
  const id = Number(hints.cabinetId);
  if (Number.isFinite(id) && id === DIRECT_CABINET_ID) return true;
  const ref = String(hints.caseRef ?? "").trim();
  if (ref.toUpperCase().startsWith("E")) return true;
  return false;
}

export function labProfileContextForPatient(
  hints: PatientBrandHints
): LabProfileContext {
  return isDirectPatient(hints) ? "direct" : "default";
}
