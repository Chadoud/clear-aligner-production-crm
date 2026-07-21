/**
 * Brand helpers. Direct cabinet id is not hardcoded for the public tree —
 * set VITE_DIRECT_CABINET_ID in `.env` for your deployment.
 */

const rawId = String(import.meta.env.VITE_DIRECT_CABINET_ID ?? "").trim();
const parsedId = rawId === "" ? NaN : Number(rawId);

/** Numeric cabinet id treated as Direct, or null if unset. */
export const DIRECT_CABINET_ID = Number.isFinite(parsedId) ? parsedId : null;

/**
 * Derive brand from cabinet_id.
 * @param {number} cabinetId
 * @returns {"Direct"|"Lab"}
 */
export function brandFromCabinetId(cabinetId) {
  if (DIRECT_CABINET_ID != null && Number(cabinetId) === DIRECT_CABINET_ID) {
    return "Direct";
  }
  return "Lab";
}
