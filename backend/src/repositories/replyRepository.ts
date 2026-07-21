/**
 * Discussion replies — tbl_reply (legacy structure).
 * case_idx, user_idx, reply_text, reply_created, reply_type.
 */
import { mysqlQuery } from "../db/mysql.js";

export interface ReplyMessage {
  id: number;
  text: string;
  author: string;
  userId: number;
  date: string;
  time: string;
  createdAt: string;
  replyType: number;
}

export {
  DISCUSSION_REPLY_TYPE,
  GENERAL_REPLY_TYPE,
} from "../constants/replyTypes.js";

/** reply_type = 3: price proposal accepted (doctor accepts quote). */
export const ACCEPTANCE_REPLY_TYPE = 3;

/** Whether posting this reply_type should trigger legacy-style reply notification emails (excludes acceptance / price rows). */
export function shouldSendReplyNotificationEmail(replyType: number): boolean {
  return replyType !== ACCEPTANCE_REPLY_TYPE;
}

/** reply_type = 4: new invoice/quote created (lab created quote for doctor). */
export const INVOICE_CREATED_REPLY_TYPE = 4;

/**
 * Fetch replies for a case, ordered by reply_id ASC.
 * @param replyTypeFilter - if set, only return replies with this reply_type (0 = discussion, 21 = general). If null/undefined, return all.
 */
export async function getRepliesByCaseId(
  caseId: number,
  limit = 200,
  replyTypeFilter?: number | null
): Promise<ReplyMessage[]> {
  const typeFilter =
    replyTypeFilter != null && Number.isFinite(replyTypeFilter)
      ? " AND r.reply_type = ?"
      : "";
  const params = typeFilter ? [caseId, replyTypeFilter] : [caseId];

  const rows = await mysqlQuery<{
    reply_id: number;
    reply_text: string;
    reply_created: string;
    reply_type: number;
    user_idx: number;
    user_firstname: string;
    user_lastname: string;
  }>(
    `SELECT r.reply_id, r.reply_text, r.reply_created, r.reply_type,
            r.user_idx,
            COALESCE(NULLIF(TRIM(u.user_firstname), ''), NULLIF(TRIM(c.case_prenom), ''), '') AS user_firstname,
            COALESCE(NULLIF(TRIM(u.user_lastname), ''), NULLIF(TRIM(c.case_nom), ''), '') AS user_lastname
     FROM tbl_reply r
     LEFT JOIN users u ON u.user_id = r.user_idx
     LEFT JOIN tbl_case c ON c.case_id = r.user_idx
     WHERE r.case_idx = ?${typeFilter}
     ORDER BY r.reply_id ASC`,
    params
  );

  const result: ReplyMessage[] = rows.slice(-limit).map((r) => {
    const created = r.reply_created ? new Date(r.reply_created) : new Date();
    const dateStr = created.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = created.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const author =
      [r.user_firstname, r.user_lastname].filter(Boolean).join(" ").trim() ||
      "—";
    return {
      id: r.reply_id,
      text: r.reply_text?.trim() || "",
      author,
      userId: r.user_idx,
      date: dateStr,
      time: timeStr,
      createdAt: r.reply_created,
      replyType: r.reply_type ?? 0,
    };
  });

  return result;
}

/**
 * Insert a new reply. Uses user_idx from principal; cabinet_idx from case if needed.
 */
export async function insertReply(
  caseId: number,
  userId: number,
  text: string,
  replyType = 0
): Promise<number> {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;

  const result = await mysqlQuery(
    `INSERT INTO tbl_reply (case_idx, user_idx, reply_text, reply_type)
     VALUES (?, ?, ?, ?)`,
    [caseId, userId, trimmed, replyType]
  );
  const header = result as unknown as { insertId?: number };
  return header?.insertId ?? 0;
}

/** After last reply_docs row removed — clear ERP attachment-only placeholder. */
export async function clearAttachmentPlaceholderText(
  replyId: number
): Promise<void> {
  const id = Number(replyId);
  if (!Number.isFinite(id) || id <= 0) return;
  await mysqlQuery(
    `UPDATE tbl_reply SET reply_text = '' WHERE reply_id = ? AND TRIM(reply_text) = '(attachment)'`,
    [id]
  );
}

export const DELETED_PLACEHOLDER = "(deleted)";

/**
 * Soft-delete: keep row, clear attachments, set reply_text to (deleted).
 */
export async function softDeleteReply(
  caseId: number,
  replyId: number
): Promise<boolean> {
  const cid = Number(caseId);
  const rid = Number(replyId);
  if (!Number.isFinite(cid) || !Number.isFinite(rid) || rid <= 0) return false;

  const rows = await mysqlQuery<{ reply_text: string }>(
    `SELECT reply_text FROM tbl_reply WHERE reply_id = ? AND case_idx = ? LIMIT 1`,
    [rid, cid]
  );
  const row = (rows as unknown as { reply_text: string }[])[0];
  if (!row) return false;
  if (String(row.reply_text ?? "").trim() === DELETED_PLACEHOLDER) return false;

  const result = await mysqlQuery<{ affectedRows: number }>(
    `UPDATE tbl_reply SET reply_text = ? WHERE reply_id = ? AND case_idx = ?`,
    [DELETED_PLACEHOLDER, rid, cid]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/**
 * Hard-delete a tbl_reply row for a case (attachments must be removed separately).
 */
export async function hardDeleteReply(
  caseId: number,
  replyId: number
): Promise<boolean> {
  const cid = Number(caseId);
  const rid = Number(replyId);
  if (!Number.isFinite(cid) || !Number.isFinite(rid) || rid <= 0) return false;

  const result = await mysqlQuery<{ affectedRows: number }>(
    `DELETE FROM tbl_reply WHERE reply_id = ? AND case_idx = ?`,
    [rid, cid]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

export async function getReplyMeta(
  caseId: number,
  replyId: number
): Promise<{
  userId: number;
  createdAt: string;
  text: string;
  replyType: number;
} | null> {
  const rows = await mysqlQuery<{
    user_idx: number;
    reply_text: string;
    reply_created: string;
    reply_type: number;
  }>(
    `SELECT user_idx, reply_text, reply_created, reply_type
     FROM tbl_reply WHERE reply_id = ? AND case_idx = ? LIMIT 1`,
    [replyId, caseId]
  );
  if (!rows[0]) return null;
  return {
    userId: rows[0].user_idx,
    createdAt: rows[0].reply_created,
    text: rows[0].reply_text?.trim() || "",
    replyType: rows[0].reply_type ?? 0,
  };
}

export async function updateReplyText(
  caseId: number,
  replyId: number,
  text: string
): Promise<{ text: string; editedAt: string | null } | null> {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;

  try {
    await mysqlQuery(
      `UPDATE tbl_reply SET reply_text = ?, reply_edited_at = CURRENT_TIMESTAMP
       WHERE reply_id = ? AND case_idx = ?`,
      [trimmed, replyId, caseId]
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "ER_BAD_FIELD_ERROR") throw err;
    await mysqlQuery(
      `UPDATE tbl_reply SET reply_text = ? WHERE reply_id = ? AND case_idx = ?`,
      [trimmed, replyId, caseId]
    );
  }

  let editedAt: string | null = null;
  try {
    const [row] = await mysqlQuery<{ reply_edited_at: string | null }>(
      `SELECT reply_edited_at FROM tbl_reply WHERE reply_id = ? LIMIT 1`,
      [replyId]
    );
    editedAt = row?.reply_edited_at ?? null;
  } catch {
    editedAt = new Date().toISOString();
  }

  return { text: trimmed, editedAt };
}
