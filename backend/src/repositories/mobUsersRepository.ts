/**
 * Provision mob_users when a case invoice moves quote → in fabrication.
 *
 * Credentials are generated once and stored on tbl_case (username, password_hash, mob_app_password).
 * The bcrypt hash is used for auth; plaintext is kept on tbl_case for CRM/PDF display.
 *
 * The generated plaintext is returned whenever credentials exist so the CRM can always show it.
 */
import bcrypt from "bcryptjs";
import { mysqlQuery } from "../infrastructure/db/mysql/client.js";
import { logger } from "../logger.js";
import { getCaseById, writeCaseCredentials } from "./caseRepository.js";
import { ensureMobUsersTable } from "./mobUsersSchema.js";
import { generateSuffix } from "../utils/generateAppPassword.js";

const BCRYPT_ROUNDS = 12;

/** When tbl_case has no email, mob_users.email is NOT NULL — use a stable internal address. */
function resolveMobUsersEmail(
  caseId: number,
  rawFromCase: string | null | undefined
): string {
  const trimmed = rawFromCase?.trim();
  if (trimmed) return trimmed.toLowerCase();
  return `case-${caseId}@patients.mob.local.example`;
}

function mapTitleToGender(title: number | null): number | null {
  if (title === 1) return 1;
  if (title === 2) return 2;
  return null;
}

/**
 * Ensures a row exists in mob_users for this case when moving to fabrication.
 *
 * First-time logic:
 *   - If tbl_case.password_hash is NULL: generate a strong 12-char password,
 *     bcrypt-12 hash it, and persist (username, password_hash) to tbl_case.
 *     Returns the generated plaintext so the caller can surface it once on the
 *     PDF credentials page.
 *   - If tbl_case.password_hash is already set: re-uses the stored hash,
 *     returns null (credentials already handed to the patient).
 *
 * Provisioning always writes tbl_case (username, password_hash) on first run.
 * mob_users.email is NOT NULL: if the case has no patient email, a stable
 * synthetic address case-{caseId}@patients.mob.local.example is used so
 * credentials are still created (patient can add a real email on the case later).
 *
 * @returns The plaintext app password (stored on tbl_case.mob_app_password).
 */
export async function upsertMobUserForCase(
  caseId: number
): Promise<string | null> {
  await ensureMobUsersTable();

  const c = await getCaseById(caseId);
  if (!c) {
    logger.warn({ caseId }, "mob_users: case not found");
    return null;
  }

  const email = resolveMobUsersEmail(caseId, c.email);
  if (!c.email?.trim()) {
    logger.info(
      { caseId },
      "mob_users: case email empty — using synthetic mob_users email (tbl_case credentials still provisioned)"
    );
  }
  const firstName = c.first_name?.trim() ?? "";
  const lastName = c.last_name?.trim() ?? "";
  const gender = mapTitleToGender(c.title);

  // Username format: FirstName.LASTNAME.XXXX — 4 random alphanum suffix makes
  // it unique and not guessable even if the patient name is known.
  // e.g. "Jane.DOE.A1b2"
  const caseRef = String(c.ref ?? caseId).trim();
  const existingUsername = c.username?.trim() ?? "";
  const loginUsername = existingUsername
    ? existingUsername
    : [firstName, lastName ? lastName.toUpperCase() : null, generateSuffix(4)]
        .filter(Boolean)
        .join(".");

  // ── Credential resolution ─────────────────────────────────────────────────
  let passwordHash: string;
  let generatedPlaintext: string;

  const storedPlain = c.mob_app_password?.trim() ?? "";

  if (c.password_hash && storedPlain) {
    passwordHash = c.password_hash;
    generatedPlaintext = storedPlain;
  } else if (c.password_hash) {
    // Hash exists but plaintext missing — keep credentials; run backfill to recover plain.
    passwordHash = c.password_hash;
    generatedPlaintext = storedPlain;
    if (!existingUsername) {
      await writeCaseCredentials(
        caseId,
        loginUsername,
        passwordHash,
        generatedPlaintext
      );
    }
  } else {
    // New credentials, or legacy row with hash but no stored plaintext — regenerate.
    generatedPlaintext = caseRef + generateSuffix(2);
    passwordHash = await bcrypt.hash(generatedPlaintext, BCRYPT_ROUNDS);
    await writeCaseCredentials(
      caseId,
      loginUsername,
      passwordHash,
      generatedPlaintext
    );
    logger.info(
      { caseId, hadLegacyHash: !!c.password_hash && !storedPlain },
      "mob_users: credentials stored on tbl_case (with plaintext for CRM)"
    );
  }

  // ── mob_users sync ────────────────────────────────────────────────────────
  const [byId] = await mysqlQuery<{ id: number }>(
    "SELECT id FROM mob_users WHERE id = ? LIMIT 1",
    [caseId]
  );

  if (byId) {
    await mysqlQuery(
      `UPDATE mob_users SET
        email         = ?,
        password_hash = ?,
        first_name    = ?,
        last_name     = ?,
        gender        = ?,
        updated_at    = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [email, passwordHash, firstName || null, lastName || null, gender, caseId]
    );
    return generatedPlaintext;
  }

  // Guard against the same email already being used by a different case.
  const [emailOwner] = await mysqlQuery<{ id: number }>(
    "SELECT id FROM mob_users WHERE email = ? LIMIT 1",
    [email]
  );
  if (emailOwner && emailOwner.id !== caseId) {
    logger.warn(
      { caseId, email },
      "mob_users: email already registered to another case — skip insert"
    );
    return generatedPlaintext;
  }

  await mysqlQuery(
    `INSERT INTO mob_users (
      id, email, password_hash, first_name, last_name,
      role, status, gender, profile_image, external_doctor_id
    ) VALUES (?, ?, ?, ?, ?, 'patient', 1, ?, NULL, NULL)`,
    [caseId, email, passwordHash, firstName || null, lastName || null, gender]
  );

  return generatedPlaintext;
}
