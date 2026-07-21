/**
 * User notes — tbl_user_notes. Private per-user notes on cases.
 */
import { mysqlQuery } from "../db/mysql.js";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tbl_user_notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    case_idx INT NOT NULL,
    user_idx INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_case (case_idx),
    INDEX idx_user (user_idx),
    INDEX idx_case_user (case_idx, user_idx)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await mysqlQuery(CREATE_TABLE_SQL);
  tableReady = true;
}

export interface UserNote {
  noteId: number;
  caseIdx: number;
  userIdx: number;
  noteText: string;
  createdAt: string;
  updatedAt: string;
}

export async function getNotesByCaseAndUser(
  caseId: number,
  userId: number
): Promise<UserNote[]> {
  await ensureTable();
  const rows = await mysqlQuery<{
    note_id: number;
    case_idx: number;
    user_idx: number;
    note_text: string;
    created_at: string;
    updated_at: string;
  }>(
    "SELECT note_id, case_idx, user_idx, note_text, created_at, updated_at FROM tbl_user_notes WHERE case_idx = ? AND user_idx = ? ORDER BY created_at DESC",
    [caseId, userId]
  );
  return rows.map((r) => ({
    noteId: r.note_id,
    caseIdx: r.case_idx,
    userIdx: r.user_idx,
    noteText: r.note_text,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createNote(
  caseId: number,
  userId: number,
  noteText: string
): Promise<UserNote> {
  await ensureTable();
  const insertResult = await mysqlQuery(
    "INSERT INTO tbl_user_notes (case_idx, user_idx, note_text) VALUES (?, ?, ?)",
    [caseId, userId, noteText]
  );
  const insertId =
    (insertResult as unknown as { insertId?: number })?.insertId ?? 0;
  const [row] = await mysqlQuery<{
    note_id: number;
    case_idx: number;
    user_idx: number;
    note_text: string;
    created_at: string;
    updated_at: string;
  }>(
    "SELECT note_id, case_idx, user_idx, note_text, created_at, updated_at FROM tbl_user_notes WHERE note_id = ?",
    [insertId ?? 0]
  );
  if (!row) throw new Error("Failed to fetch created note");
  return {
    noteId: row.note_id,
    caseIdx: row.case_idx,
    userIdx: row.user_idx,
    noteText: row.note_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateNote(
  noteId: number,
  userId: number,
  noteText: string
): Promise<boolean> {
  await ensureTable();
  const result = await mysqlQuery(
    "UPDATE tbl_user_notes SET note_text = ?, updated_at = CURRENT_TIMESTAMP WHERE note_id = ? AND user_idx = ?",
    [noteText, noteId, userId]
  );
  const r = result as unknown as { affectedRows?: number };
  return (r?.affectedRows ?? 0) > 0;
}

export async function deleteNote(
  noteId: number,
  userId: number
): Promise<boolean> {
  await ensureTable();
  const result = await mysqlQuery(
    "DELETE FROM tbl_user_notes WHERE note_id = ? AND user_idx = ?",
    [noteId, userId]
  );
  const r = result as unknown as { affectedRows?: number };
  return (r?.affectedRows ?? 0) > 0;
}
