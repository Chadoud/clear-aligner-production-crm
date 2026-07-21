/**
 * One-time plaintext password storage for the patient mobile-app credentials page.
 *
 * The bcrypt hash is stored permanently in tbl_case; the plaintext is only available
 * at generation time and must never be persisted to the DB. We keep it in
 * sessionStorage (cleared on tab close, scoped to the namespace) so the lab can
 * see the password after the invoice status toggle and when reopening the modal
 * within the same browser session.
 *
 * Key: `lab:mob_app_password:{case_id}`
 */

const NS = "lab:mob_app_password:";

/**
 * Store a generated plaintext password for a case in the current session.
 * No-op if caseId or password is falsy.
 * @param {number|string} caseId
 * @param {string} password - plaintext (only stored in-session, never in DB)
 */
export function storeMobAppPassword(caseId, password) {
  if (!caseId || !password) return;
  try {
    sessionStorage.setItem(`${NS}${caseId}`, String(password));
  } catch {
    // Storage quota / private browsing — non-fatal.
  }
}

/**
 * Retrieve the stored plaintext password for a case from the current session.
 * Returns null when not found or after session ends.
 * @param {number|string|null|undefined} caseId
 * @returns {string|null}
 */
export function getMobAppPassword(caseId) {
  if (!caseId) return null;
  try {
    return sessionStorage.getItem(`${NS}${caseId}`) ?? null;
  } catch {
    return null;
  }
}

/**
 * Remove the stored password for a case (e.g. after credentials reset).
 * @param {number|string|null|undefined} caseId
 */
export function clearMobAppPassword(caseId) {
  if (!caseId) return;
  try {
    sessionStorage.removeItem(`${NS}${caseId}`);
  } catch {
    // Non-fatal.
  }
}
