/**
 * Chat messages — tbl_chat (legacy structure).
 * Same as old app: case_idx, user_idx, cabinet_idx, chat_text, chat_created.
 */
import { mysqlQuery } from "../db/mysql.js";

export interface ChatMessage {
  id: number;
  text: string;
  author: string;
  userId: number;
  date: string;
  time: string;
  createdAt: string;
}

/**
 * Fetch chat messages for a case, ordered by chat_id DESC (newest first for display we reverse).
 */
export async function getChatByCaseId(
  caseId: number,
  limit = 100
): Promise<ChatMessage[]> {
  const rows = await mysqlQuery<{
    chat_id: number;
    chat_text: string;
    chat_created: string;
    user_idx: number;
    user_firstname: string;
    user_lastname: string;
  }>(
    `SELECT c.chat_id, c.chat_text, c.chat_created,
            c.user_idx,
            COALESCE(NULLIF(TRIM(u.user_firstname), ''), NULLIF(TRIM(p.case_prenom), ''), '') AS user_firstname,
            COALESCE(NULLIF(TRIM(u.user_lastname), ''), NULLIF(TRIM(p.case_nom), ''), '') AS user_lastname
     FROM tbl_chat c
     LEFT JOIN users u ON u.user_id = c.user_idx
     LEFT JOIN tbl_case p ON p.case_id = c.user_idx
     WHERE c.case_idx = ?
     ORDER BY c.chat_id ASC`,
    [caseId]
  );

  const result: ChatMessage[] = rows.slice(-limit).map((r) => {
    const created = r.chat_created ? new Date(r.chat_created) : new Date();
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
      id: r.chat_id,
      text: r.chat_text?.trim() || "",
      author,
      userId: r.user_idx,
      date: dateStr,
      time: timeStr,
      createdAt: r.chat_created,
    };
  });

  return result;
}

/**
 * Insert a new chat message.
 * cabinetId: user's cabinet; if null, uses the case's cabinet_idx.
 */
export async function insertChat(
  caseId: number,
  userId: number,
  cabinetId: number | null,
  text: string
): Promise<number> {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;

  let cabinetIdx = cabinetId;
  if (cabinetIdx == null || !Number.isFinite(cabinetIdx)) {
    const [row] = await mysqlQuery<{ cabinet_idx: number }>(
      "SELECT cabinet_idx FROM tbl_case WHERE case_id = ? LIMIT 1",
      [caseId]
    );
    cabinetIdx = row?.cabinet_idx ?? 0;
  }

  const result = await mysqlQuery(
    `INSERT INTO tbl_chat (case_idx, user_idx, cabinet_idx, chat_text)
     VALUES (?, ?, ?, ?)`,
    [caseId, userId, cabinetIdx, trimmed]
  );
  const header = result as unknown as { insertId?: number };
  return header?.insertId ?? 0;
}

export const DELETED_PLACEHOLDER = "(deleted)";

/**
 * Soft-delete: keep row, set chat_text to (deleted).
 */
export async function softDeleteChat(
  caseId: number,
  chatId: number
): Promise<boolean> {
  const cid = Number(caseId);
  const id = Number(chatId);
  if (!Number.isFinite(cid) || !Number.isFinite(id) || id <= 0) return false;

  const result = await mysqlQuery<{ affectedRows: number }>(
    `UPDATE tbl_chat SET chat_text = ? WHERE chat_id = ? AND case_idx = ? AND TRIM(chat_text) <> ?`,
    [DELETED_PLACEHOLDER, id, cid, DELETED_PLACEHOLDER]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/**
 * Hard-delete a tbl_chat row for a case.
 */
export async function hardDeleteChat(
  caseId: number,
  chatId: number
): Promise<boolean> {
  const cid = Number(caseId);
  const id = Number(chatId);
  if (!Number.isFinite(cid) || !Number.isFinite(id) || id <= 0) return false;

  const result = await mysqlQuery<{ affectedRows: number }>(
    `DELETE FROM tbl_chat WHERE chat_id = ? AND case_idx = ?`,
    [id, cid]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

export async function getChatMeta(
  caseId: number,
  chatId: number
): Promise<{ userId: number; createdAt: string; text: string } | null> {
  const rows = await mysqlQuery<{
    user_idx: number;
    chat_text: string;
    chat_created: string;
  }>(
    `SELECT user_idx, chat_text, chat_created
     FROM tbl_chat WHERE chat_id = ? AND case_idx = ? LIMIT 1`,
    [chatId, caseId]
  );
  if (!rows[0]) return null;
  return {
    userId: rows[0].user_idx,
    createdAt: rows[0].chat_created,
    text: rows[0].chat_text?.trim() || "",
  };
}

export async function updateChatText(
  caseId: number,
  chatId: number,
  text: string
): Promise<{ text: string; editedAt: string | null } | null> {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;

  try {
    await mysqlQuery(
      `UPDATE tbl_chat SET chat_text = ?, chat_edited_at = CURRENT_TIMESTAMP
       WHERE chat_id = ? AND case_idx = ?`,
      [trimmed, chatId, caseId]
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "ER_BAD_FIELD_ERROR") throw err;
    await mysqlQuery(
      `UPDATE tbl_chat SET chat_text = ? WHERE chat_id = ? AND case_idx = ?`,
      [trimmed, chatId, caseId]
    );
  }

  let editedAt: string | null = null;
  try {
    const [row] = await mysqlQuery<{ chat_edited_at: string | null }>(
      `SELECT chat_edited_at FROM tbl_chat WHERE chat_id = ? LIMIT 1`,
      [chatId]
    );
    editedAt = row?.chat_edited_at ?? null;
  } catch {
    editedAt = new Date().toISOString();
  }

  return { text: trimmed, editedAt };
}
