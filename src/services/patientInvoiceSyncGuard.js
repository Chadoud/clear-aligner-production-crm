/**
 * Guard to prevent useGeneratedInvoicesSync from overwriting patient status
 * immediately after a manual status change via the dropdown.
 *
 * @module services/patientInvoiceSyncGuard
 */

const COOLDOWN_MS = 2000;

let lastPatientRef = null;
let lastChangeTime = 0;

/**
 * Call when ActionButtons successfully changes patient status.
 * @param {string} patientRef
 */
export function setLastPatientChangeByUser(patientRef) {
  if (patientRef != null && String(patientRef).trim() !== "") {
    lastPatientRef = String(patientRef).trim();
    lastChangeTime = Date.now();
  }
}

/**
 * Returns true if the invoice→patient sync should skip (patient was recently changed by user).
 * @param {string} patientRef
 * @returns {boolean}
 */
export function shouldSkipInvoiceSync(patientRef) {
  if (!patientRef || String(patientRef).trim() === "") return false;
  if (lastPatientRef === null) return false;

  const elapsed = Date.now() - lastChangeTime;
  if (elapsed > COOLDOWN_MS) {
    lastPatientRef = null;
    lastChangeTime = 0;
    return false;
  }

  return lastPatientRef === String(patientRef).trim();
}
