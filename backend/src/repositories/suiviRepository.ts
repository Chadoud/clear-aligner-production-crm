/**
 * Follow-up (tbl_suivi) — matches old app CaseSuivi.
 * suivi_id, case_idx, user_idx, cabinet_idx, suivi_text, suivi_type, suivi_created
 */
import { mysqlQuery } from "../db/mysql.js";

export interface SuiviEntry {
  id: number;
  case_id: number;
  text: string;
  type: number;
  date: string;
  user?: string;
}

export async function listSuiviByCaseId(caseId: number): Promise<SuiviEntry[]> {
  const rows = await mysqlQuery<{
    suivi_id: number;
    case_idx: number;
    suivi_text: string;
    suivi_type: number;
    suivi_created: string | Date;
    user_firstname: string | null;
    user_lastname: string | null;
  }>(
    `SELECT s.suivi_id, s.case_idx, s.suivi_text, s.suivi_type, s.suivi_created,
            u.user_firstname, u.user_lastname
     FROM tbl_suivi s
     LEFT JOIN users u ON u.user_id = s.user_idx
     WHERE s.case_idx = ?
     ORDER BY s.suivi_id DESC`,
    [caseId]
  );

  return rows.map((r) => {
    const created =
      typeof r.suivi_created === "string"
        ? r.suivi_created
        : r.suivi_created instanceof Date
          ? r.suivi_created.toISOString()
          : "";
    const dateStr = created.slice(0, 10);
    const user =
      [r.user_firstname, r.user_lastname].filter(Boolean).join(" ").trim() ||
      "—";
    return {
      id: r.suivi_id,
      case_id: r.case_idx,
      text: r.suivi_text?.trim() ?? "",
      type: r.suivi_type ?? 0,
      date: dateStr,
      user,
    };
  });
}

export async function insertSuivi(
  caseId: number,
  cabinetId: number,
  userId: number,
  text: string,
  type: number,
  date?: string
): Promise<number> {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;

  const dateStr = date?.trim().slice(0, 10);
  const suiviCreated = dateStr
    ? `${dateStr} 12:00:00`
    : new Date().toISOString().slice(0, 19).replace("T", " ");

  const result = await mysqlQuery(
    `INSERT INTO tbl_suivi (case_idx, user_idx, cabinet_idx, suivi_text, suivi_type, suivi_created)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [caseId, userId, cabinetId, trimmed, type, suiviCreated]
  );
  const header = result as unknown as { insertId?: number };
  return header?.insertId ?? 0;
}

export async function deleteSuivi(
  suiviId: number,
  caseId: number
): Promise<boolean> {
  const result = await mysqlQuery<{ affectedRows: number }>(
    "DELETE FROM tbl_suivi WHERE suivi_id = ? AND case_idx = ?",
    [suiviId, caseId]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}
