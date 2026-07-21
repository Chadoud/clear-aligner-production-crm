/**
 * Create / update users and passwords.
 */
import bcrypt from "bcryptjs";
import { mysqlQuery } from "../db/mysql.js";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserRow,
} from "./userRepositoryTypes.js";
import { getUserById } from "./userRepositoryQueries.js";

/** Legacy users table columns are NOT NULL; empty means "" not SQL NULL. */
function legacyUserText(value: unknown, fallback = ""): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

async function tryUpdateUserColumn(
  id: number,
  column: string,
  value: unknown
): Promise<boolean> {
  try {
    await mysqlQuery(
      `UPDATE users SET ${column} = ?, user_datemodified = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [value, id]
    );
    return true;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "ER_BAD_FIELD_ERROR") return false;
    throw err;
  }
}

/**
 * Permanently remove a user row (any status). Clears rights and password-reset tokens first.
 * Does not cascade into legacy case/chat/reply history.
 */
export async function deleteUser(id: number): Promise<boolean> {
  await mysqlQuery("DELETE FROM user_rights WHERE user_idx = ?", [id]);
  try {
    await mysqlQuery("DELETE FROM tbl_password_resets WHERE user_id = ?", [id]);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== "ER_NO_SUCH_TABLE") throw err;
  }
  try {
    await mysqlQuery("DELETE FROM tbl_user_notes WHERE user_idx = ?", [id]);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== "ER_NO_SUCH_TABLE") throw err;
  }
  const result = await mysqlQuery<{ affectedRows: number }>(
    "DELETE FROM users WHERE user_id = ?",
    [id]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

export async function createUser(
  payload: CreateUserPayload
): Promise<UserRow | null> {
  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return null;

  const [existing] = await mysqlQuery<{ user_id: number }>(
    "SELECT user_id FROM users WHERE user_name = ? LIMIT 1",
    [email]
  );
  if (existing) return null;

  const passwordHash = await bcrypt.hash(String(payload.password || ""), 10);
  const firstName = String(payload.firstName ?? "").trim();
  const lastName = String(payload.lastName ?? "")
    .trim()
    .toUpperCase();
  const phone = legacyUserText(payload.phone);
  const website = legacyUserText(payload.website);
  const address = legacyUserText(payload.address);
  const zip = legacyUserText(payload.zip);
  const city = legacyUserText(payload.city);
  const country = legacyUserText(payload.country);
  const isCompany = payload.isCompany === true ? 1 : 0;
  const cabinetId =
    payload.cabinetId != null && payload.cabinetId !== 0
      ? payload.cabinetId
      : 0;

  const result = await mysqlQuery<{ insertId: number }>(
    `INSERT INTO users (
      user_name, user_password, user_firstname, user_lastname,
      user_phone, user_website, user_cabinet_adresse, user_cabinet_adresse_npa, user_cabinet_adresse_ville, user_cabinet_adresse_pays,
      user_dateentered, user_is_superadmin, user_status, idx_client
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 1, ?)`,
    [
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      website,
      address,
      zip,
      city,
      country,
      isCompany,
      cabinetId,
    ]
  );
  const insertId = (result as unknown as { insertId?: number })?.insertId;
  if (!insertId) return null;
  return getUserById(insertId);
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload
): Promise<UserRow | null> {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (payload.firstName !== undefined) {
    updates.push("user_firstname = ?");
    params.push(String(payload.firstName).trim());
  }
  if (payload.lastName !== undefined) {
    updates.push("user_lastname = ?");
    params.push(String(payload.lastName).trim().toUpperCase());
  }
  if (payload.phone !== undefined) {
    updates.push("user_phone = ?");
    params.push(legacyUserText(payload.phone));
  }
  if (payload.website !== undefined) {
    updates.push("user_website = ?");
    params.push(legacyUserText(payload.website));
  }
  if (payload.isCompany !== undefined) {
    updates.push("user_is_superadmin = ?");
    params.push(payload.isCompany ? 1 : 0);
  }
  if (payload.cabinetId !== undefined) {
    updates.push("idx_client = ?");
    params.push(
      payload.cabinetId == null || payload.cabinetId === 0
        ? 0
        : payload.cabinetId
    );
  }
  if (payload.displayName !== undefined) {
    updates.push("user_cabinet_nom = ?");
    params.push(
      payload.displayName == null
        ? null
        : String(payload.displayName).trim() || null
    );
  } else if (payload.legalName !== undefined) {
    updates.push("user_cabinet_nom = ?");
    params.push(
      payload.legalName == null
        ? null
        : String(payload.legalName).trim() || null
    );
  }
  if (payload.address !== undefined) {
    updates.push("user_cabinet_adresse = ?");
    params.push(legacyUserText(payload.address));
  }
  if (payload.zip !== undefined) {
    updates.push("user_cabinet_adresse_npa = ?");
    params.push(legacyUserText(payload.zip));
  }
  if (payload.city !== undefined) {
    updates.push("user_cabinet_adresse_ville = ?");
    params.push(legacyUserText(payload.city));
  }
  if (payload.country !== undefined) {
    updates.push("user_cabinet_adresse_pays = ?");
    params.push(legacyUserText(payload.country));
  }
  const directName =
    payload.directDisplayName !== undefined
      ? payload.directDisplayName
      : payload.directLegalName;
  const directFields: Array<[string, unknown]> = [];
  if (directName !== undefined) {
    directFields.push([
      "user_cabinet_nom_direct",
      directName == null ? null : String(directName).trim() || null,
    ]);
  }
  if (payload.directAddress !== undefined) {
    directFields.push([
      "user_cabinet_adresse_direct",
      payload.directAddress == null
        ? null
        : String(payload.directAddress).trim() || null,
    ]);
  }
  if (payload.directZip !== undefined) {
    directFields.push([
      "user_cabinet_adresse_npa_direct",
      payload.directZip == null
        ? null
        : String(payload.directZip).trim() || null,
    ]);
  }
  if (payload.directCity !== undefined) {
    directFields.push([
      "user_cabinet_adresse_ville_direct",
      payload.directCity == null
        ? null
        : String(payload.directCity).trim() || null,
    ]);
  }

  if (updates.length > 0) {
    updates.push("user_datemodified = CURRENT_TIMESTAMP");
    params.push(id);
    await mysqlQuery(
      `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`,
      params
    );
  }

  for (const [column, value] of directFields) {
    await tryUpdateUserColumn(id, column, value);
  }

  const optionalPersonalFields: Array<[string, unknown]> = [];
  if (payload.title !== undefined) {
    const raw = payload.title == null ? "" : String(payload.title).trim();
    const gender = raw === "2" ? 2 : raw === "1" ? 1 : 1;
    optionalPersonalFields.push(["user_gender", gender]);
  }
  if (payload.birthDate !== undefined) {
    const raw =
      payload.birthDate == null ? "" : String(payload.birthDate).trim();
    optionalPersonalFields.push(["user_birthdate", raw || "0000-00-00"]);
  }
  if (payload.function !== undefined) {
    optionalPersonalFields.push([
      "user_fonction",
      payload.function == null ? null : String(payload.function).trim() || null,
    ]);
  }
  for (const [column, value] of optionalPersonalFields) {
    await tryUpdateUserColumn(id, column, value);
  }

  if (
    updates.length === 0 &&
    directFields.length === 0 &&
    optionalPersonalFields.length === 0
  ) {
    return getUserById(id);
  }
  return getUserById(id);
}

/** Update user's password hash. */
export async function updateUserPassword(
  id: number,
  newPassword: string
): Promise<void> {
  const hash = await bcrypt.hash(String(newPassword ?? ""), 10);
  await mysqlQuery(
    `UPDATE users SET user_password = ?, user_datemodified = CURRENT_TIMESTAMP WHERE user_id = ?`,
    [hash, id]
  );
}
