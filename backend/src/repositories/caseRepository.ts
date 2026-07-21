/**
 * Cases — MySQL via tbl_case.
 */
import { mysqlQuery, ns, mysqlDate } from "../db/mysql.js";
import { DEFAULT_CASE_BIRTH_DATE } from "../constants/defaultBirthDate.js";

export interface Case {
  id: number;
  ref: string | null;
  cabinet_id: number;
  /** 0=undefined, 1=Mr, 2=Mrs (case_title) */
  title: number | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  birth_date: Date | null;
  address: string | null;
  phone: string | null;
  status: number;
  proposed_price: number;
  currency: string | null;
  created_at: Date | null;
  comments: string | null;
  legacy_stl_enabled?: boolean;
  external_stl_raw?: string | null;
  /** Mobile-app login name (patient full name). Set on first quote→fabrication. */
  username?: string | null;
  /** bcrypt-12 hash of the generated app password — used by mobile-app auth layer. */
  password_hash?: string | null;
  /** Plaintext app password — CRM/PDF display only (lab access). */
  mob_app_password?: string | null;
}

export interface ListCasesOptions {
  cabinet_id?: number;
  status?: number;
  limit?: number;
  offset?: number;
  q?: string;
}

interface MysqlRow {
  case_id: number;
  case_ref: string;
  cabinet_idx: number;
  case_title: number | null;
  case_prenom: string;
  case_nom: string;
  case_naissance: string | null;
  case_email: string;
  case_address: string | null;
  case_phone: string | null;
  case_status: number;
  case_prop_price: string | number;
  case_prop_cur: string;
  case_created: string;
  case_comments: string;
  case_stl?: number | null;
  case_external_stl?: string | null;
  username?: string | null;
  password_hash?: string | null;
  mob_app_password?: string | null;
}

function fromRow(r: MysqlRow): Case {
  const firstName = ns(r.case_prenom);
  const lastName = ns(r.case_nom);
  return {
    id: r.case_id,
    ref: ns(r.case_ref),
    cabinet_id: r.cabinet_idx,
    title: r.case_title ?? null,
    first_name: firstName,
    last_name: lastName,
    full_name: [firstName, lastName].filter(Boolean).join(" ") || null,
    email: ns(r.case_email),
    birth_date: mysqlDate(r.case_naissance),
    address: ns(r.case_address),
    phone: ns(r.case_phone),
    status: r.case_status,
    proposed_price: Number(r.case_prop_price ?? 0),
    currency: ns(r.case_prop_cur) ?? "CHF",
    created_at: mysqlDate(r.case_created),
    comments: ns(r.case_comments),
    legacy_stl_enabled: Number(r.case_stl ?? 0) === 1,
    external_stl_raw: ns(r.case_external_stl),
    username: ns(r.username),
    password_hash: ns(r.password_hash),
    mob_app_password: ns(r.mob_app_password),
  };
}

const SELECT_COLS = `
  case_id, case_ref, cabinet_idx, case_title, case_prenom, case_nom,
  case_naissance, case_email, case_address, case_phone, case_status, case_prop_price,
  case_prop_cur, case_created, case_comments, case_stl, case_external_stl,
  username, password_hash, mob_app_password
`;

export async function listCases(
  opts: ListCasesOptions = {}
): Promise<{ cases: Case[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.cabinet_id != null) {
    conditions.push("cabinet_idx = ?");
    params.push(opts.cabinet_id);
  }
  if (opts.status != null) {
    conditions.push("case_status = ?");
    params.push(opts.status);
  }
  if (opts.q?.trim()) {
    conditions.push(
      "(CONCAT(case_prenom, ' ', case_nom) LIKE ? OR case_ref LIKE ?)"
    );
    params.push(`%${opts.q.trim()}%`, `%${opts.q.trim()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRow] = await mysqlQuery<{ total: number }>(
    `SELECT COUNT(*) AS total FROM tbl_case ${where}`,
    params
  );
  const total = Number(countRow?.total ?? 0);

  const rows = await mysqlQuery<MysqlRow>(
    `SELECT ${SELECT_COLS} FROM tbl_case ${where}
     ORDER BY case_created DESC, case_id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { cases: rows.map(fromRow), total };
}

export async function getCaseById(id: number): Promise<Case | null> {
  const rows = await mysqlQuery<MysqlRow>(
    `SELECT ${SELECT_COLS} FROM tbl_case WHERE case_id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

/**
 * Resolve case_id from patientRef (case_ref or numeric case_id).
 * When patientRef is numeric, prefer case_id match — the old app uses case_id in URLs.
 */
export async function getCaseIdByPatientRef(
  patientRef: string
): Promise<number | null> {
  const ref = String(patientRef ?? "").trim();
  if (!ref) return null;
  const asNum = parseInt(ref, 10);
  if (Number.isFinite(asNum)) {
    // Prefer case_id — old app uses /case/edit/id/{case_id}
    const byId = await mysqlQuery<{ case_id: number }>(
      "SELECT case_id FROM tbl_case WHERE case_id = ? LIMIT 1",
      [asNum]
    );
    if (byId.length > 0) return byId[0].case_id;
    // Fallback: case_ref might be numeric string (e.g. "6309")
    const byRef = await mysqlQuery<{ case_id: number }>(
      "SELECT case_id FROM tbl_case WHERE case_ref = ? LIMIT 1",
      [ref]
    );
    return byRef[0] ? byRef[0].case_id : null;
  }
  const rows = await mysqlQuery<{ case_id: number }>(
    "SELECT case_id FROM tbl_case WHERE case_ref = ? LIMIT 1",
    [ref]
  );
  return rows[0] ? rows[0].case_id : null;
}

export interface InsertCaseInput {
  ref: string;
  cabinet_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  birth_date?: string | null;
  address?: string | null;
  phone?: string | null;
  title?: number | null;
  status?: number;
  comments?: string | null;
}

/**
 * Parse case_ref to numeric value. "12" → 12, "E12" → 12, "cacadou" → NaN.
 */
function parseRefToNumber(ref: string | null | undefined): number {
  const s = String(ref ?? "").trim();
  if (!s) return NaN;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (/^E\d+$/i.test(s)) return parseInt(s.slice(1), 10);
  return NaN;
}

/**
 * Get next ref number from the most recently created case with a valid ref.
 * Ignores empty refs and non-numeric refs (e.g. "cacadou").
 * E26054 → 26054, 12 → 12. Returns that number + 1.
 * Order: case_created DESC so we use the latest case's ref, not the numerically highest.
 */
export async function getNextRefNumber(): Promise<number> {
  const rows = await mysqlQuery<{ case_ref: string }>(
    `SELECT case_ref FROM tbl_case
     ORDER BY case_created DESC, case_id DESC`
  );
  for (const r of rows) {
    const n = parseRefToNumber(r.case_ref);
    if (Number.isFinite(n)) return n + 1;
  }
  return 1;
}

/**
 * Insert a new case into tbl_case.
 * @returns { id, ref } of the created row
 */
export async function insertCase(
  input: InsertCaseInput
): Promise<{ id: number; ref: string }> {
  const ref = String(input.ref ?? "").trim() || `${Date.now()}`;
  const status = input.status ?? 3; // case_study (case study/quotation)
  const insertResult = await mysqlQuery(
    `INSERT INTO tbl_case (
      case_ref, cabinet_idx, case_prenom, case_nom,
      case_email, case_naissance, case_address, case_phone, case_title, case_status, case_comments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ref,
      input.cabinet_id,
      input.first_name?.trim() ?? "",
      input.last_name?.trim() ?? "",
      input.email?.trim() ?? "",
      input.birth_date?.trim() || DEFAULT_CASE_BIRTH_DATE, // DB requires non-null; use placeholder when not provided
      input.address?.trim() ?? null,
      input.phone?.trim() ?? null,
      input.title ?? 0, // DB does not allow NULL; 0 = Mr (default)
      status,
      input.comments?.trim() ?? "", // DB requires non-null
    ]
  );
  const header = insertResult as unknown as { insertId?: number };
  const insertId = header?.insertId ?? 0;
  return { id: insertId, ref };
}

/** Update case_status for a case by case_id. */
export async function updateCaseStatus(
  caseId: number,
  caseStatus: number
): Promise<boolean> {
  const result = await mysqlQuery<{ affectedRows: number }>(
    "UPDATE tbl_case SET case_status = ? WHERE case_id = ?",
    [caseStatus, caseId]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/** Update case_notif for a case by case_id. 1=notify doctor, 2=notify lab. Keeps workflow status intact.
 * @param caseNotifReason - Optional. 0 = discussion, 1 = new invoice. When set, also updates case_notif_reason.
 */
export async function updateCaseNotif(
  caseId: number,
  caseNotif: number,
  caseNotifReason?: number
): Promise<boolean> {
  if (caseNotifReason !== undefined) {
    try {
      const result = await mysqlQuery<{ affectedRows: number }>(
        "UPDATE tbl_case SET case_notif = ?, case_notif_reason = ? WHERE case_id = ?",
        [caseNotif, caseNotifReason, caseId]
      );
      return (result as unknown as { affectedRows: number }).affectedRows > 0;
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("Unknown column") && msg.includes("case_notif_reason")) {
        // Column not yet migrated; fall back to case_notif only
      } else {
        throw err;
      }
    }
  }
  const result = await mysqlQuery<{ affectedRows: number }>(
    "UPDATE tbl_case SET case_notif = ? WHERE case_id = ?",
    [caseNotif, caseId]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/** Update case_address and case_phone for a case by case_id. */
export async function updateCaseAddressPhone(
  caseId: number,
  address: string | null,
  phone: string | null
): Promise<boolean> {
  const result = await mysqlQuery<{ affectedRows: number }>(
    "UPDATE tbl_case SET case_address = ?, case_phone = ? WHERE case_id = ?",
    [address ?? null, phone ?? null, caseId]
  );
  return (result[0] as unknown as { affectedRows: number })?.affectedRows > 0;
}

/**
 * Clear mobile-app credentials from tbl_case and remove the mob_users row.
 * Called when all fabrication/paid invoices for this case are deleted, so fresh
 * credentials are generated on the next fabrication event.
 */
export async function clearCaseCredentials(caseId: number): Promise<void> {
  await mysqlQuery(
    "UPDATE tbl_case SET username = NULL, password_hash = NULL, mob_app_password = NULL WHERE case_id = ?",
    [caseId]
  );
  // Remove the mobile-app account so it cannot be used after the invoice is gone.
  try {
    await mysqlQuery("DELETE FROM mob_users WHERE id = ?", [caseId]);
  } catch {
    // mob_users table may not exist yet on first run — non-fatal.
  }
}

/**
 * Persist mobile-app credentials onto tbl_case (username + bcrypt hash + plaintext for CRM).
 */
export async function writeCaseCredentials(
  caseId: number,
  username: string,
  passwordHash: string,
  plainPassword: string
): Promise<void> {
  await mysqlQuery(
    "UPDATE tbl_case SET username = ?, password_hash = ?, mob_app_password = ? WHERE case_id = ?",
    [username, passwordHash, plainPassword, caseId]
  );
}

/** Update case_ref for a case by case_id. */
export async function updateCaseRef(
  caseId: number,
  ref: string
): Promise<boolean> {
  const trimmed = String(ref ?? "").trim();
  if (!trimmed) return false;
  const result = await mysqlQuery<{ affectedRows: number }>(
    "UPDATE tbl_case SET case_ref = ? WHERE case_id = ?",
    [trimmed, caseId]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/** Run a query, ignoring ER_NO_SUCH_TABLE (table may not exist in older DBs). */
async function runIfTableExists(sql: string, params: unknown[]): Promise<void> {
  try {
    await mysqlQuery(sql, params);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ER_NO_SUCH_TABLE") return;
    throw err;
  }
}

/**
 * Delete a case and all related data. Caller must enforce access control.
 * Order: child tables first, then tbl_case.
 * Uses runIfTableExists for optional tables (may not exist in older DBs).
 */
export async function deleteCase(caseId: number): Promise<boolean> {
  const id = Number(caseId);
  if (!Number.isFinite(id)) return false;

  const caseRow = await getCaseById(id);
  if (!caseRow) return false;

  // Delete child records (order matters for FK / logical dependencies)
  await runIfTableExists("DELETE FROM tbl_traitements WHERE case_idx = ?", [
    id,
  ]);
  await runIfTableExists("DELETE FROM tbl_suivi WHERE case_idx = ?", [id]);
  await runIfTableExists("DELETE FROM tbl_user_notes WHERE case_idx = ?", [id]);
  await runIfTableExists(
    "DELETE FROM tbl_checkbox_stripping WHERE case_idx = ?",
    [id]
  );
  await runIfTableExists("DELETE FROM tbl_stripping WHERE case_idx = ?", [id]);
  await runIfTableExists("DELETE FROM case_tooth WHERE case_idx = ?", [id]);
  await runIfTableExists("DELETE FROM tbl_chat WHERE case_idx = ?", [id]);

  // Reply docs: delete by reply_idx for this case
  try {
    const replyRows = await mysqlQuery<{ reply_id: number }>(
      "SELECT reply_id FROM tbl_reply WHERE case_idx = ?",
      [id]
    );
    for (const r of replyRows) {
      await runIfTableExists("DELETE FROM reply_docs WHERE reply_idx = ?", [
        r.reply_id,
      ]);
    }
    await mysqlQuery("DELETE FROM tbl_reply WHERE case_idx = ?", [id]);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "ER_NO_SUCH_TABLE") {
      // tbl_reply or reply_docs may not exist
    } else {
      throw err;
    }
  }

  await runIfTableExists("DELETE FROM case_docs WHERE case_idx = ?", [id]);
  await runIfTableExists("DELETE FROM tbl_case_sheets WHERE case_id = ?", [id]);
  await runIfTableExists("DELETE FROM tbl_invoices WHERE case_id = ?", [id]);
  await runIfTableExists("DELETE FROM tbl_events WHERE case_idx = ?", [id]);

  const result = await mysqlQuery<{ affectedRows: number }>(
    "DELETE FROM tbl_case WHERE case_id = ?",
    [id]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}
