import { groupSubRowsByPatient } from "./groupSubRowsByPatient.js";

/**
 * Returns the sub-rows (line items) for a doctor billing row.
 * In `"patients"` mode, merges lines that share the same patient (case ref) into one row.
 */
export function getFilteredSubRows(
  row,
  dataMode = "invoices",
  getBillingState
) {
  if (dataMode === "patients" && typeof getBillingState === "function") {
    return groupSubRowsByPatient(row, getBillingState);
  }
  return [...(row.lineItems ?? []), ...(row.pendingLineItems ?? [])];
}
