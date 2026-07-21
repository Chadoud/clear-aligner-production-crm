/**
 * Brand helpers. Set DIRECT_CABINET_ID in backend/.env for your deployment.
 * When unset, no cabinet is treated as Direct by id alone.
 */

const rawId = String(process.env.DIRECT_CABINET_ID ?? "").trim();
const parsedId = rawId === "" ? NaN : Number(rawId);

export const DIRECT_CABINET_ID: number | null = Number.isFinite(parsedId)
  ? parsedId
  : null;

export function brandFromCabinetId(
  cabinetId: number | null | undefined
): "Direct" | "Lab" {
  if (
    DIRECT_CABINET_ID != null &&
    cabinetId != null &&
    Number(cabinetId) === DIRECT_CABINET_ID
  ) {
    return "Direct";
  }
  return "Lab";
}

/** Alias used by routes/services. */
export const getBrand = brandFromCabinetId;
