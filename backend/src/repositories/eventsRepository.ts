/**
 * Delivery events (tbl_events) — Open boxes notifications.
 * Matches old app TblEvents::getNotifList logic.
 */
import { mysqlQuery } from "../db/mysql.js";

export interface DeliveryEvent {
  id: number;
  name: string;
  text: string;
  date: string;
  cabinet: string;
  case_id: number;
}

/** List active delivery events (ev_status = 1) from now - 3 days onward. */
export async function listDeliveryEvents(
  cabinetId?: number | null
): Promise<DeliveryEvent[]> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 3);
  const fromStr = fromDate.toISOString().slice(0, 10);

  const conditions = ["ev_status = 1", "ev_start_date >= ?"];
  const params: unknown[] = [fromStr];

  if (cabinetId != null && Number.isFinite(cabinetId)) {
    conditions.push("c.cabinet_idx = ?");
    params.push(cabinetId);
  }

  const where = conditions.join(" AND ");
  const rows = await mysqlQuery<{
    ev_id: number;
    ev_start_date: string | Date;
    case_id: number;
    case_prenom: string;
    case_nom: string;
    cabinet_nom: string | null;
  }>(
    `SELECT e.ev_id, e.ev_start_date, c.case_id, c.case_prenom, c.case_nom, cab.cabinet_nom
     FROM tbl_events e
     JOIN tbl_case c ON c.case_id = e.case_idx
     LEFT JOIN tbl_cabinet cab ON cab.cabinet_id = c.cabinet_idx
     WHERE ${where}
     ORDER BY e.ev_start_date ASC`,
    params
  );

  return rows.map((r) => {
    const dateStr =
      typeof r.ev_start_date === "string"
        ? r.ev_start_date
        : r.ev_start_date instanceof Date
          ? r.ev_start_date.toISOString().slice(0, 10)
          : String(r.ev_start_date ?? "");
    return {
      id: r.ev_id,
      name: [r.case_prenom, r.case_nom].filter(Boolean).join(" ").trim() || "—",
      text: `Date de livraison souhaitée ${formatDateFr(r.ev_start_date)}`,
      date: dateStr,
      cabinet: r.cabinet_nom?.trim() || "",
      case_id: r.case_id,
    };
  });
}

function formatDateFr(ymd: string | Date | null | undefined): string {
  if (ymd == null) return "—";
  const str =
    typeof ymd === "string"
      ? ymd
      : ymd instanceof Date
        ? ymd.toISOString().slice(0, 10)
        : String(ymd);
  const parts = str.split("-");
  if (parts.length < 3) return str;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/** Cancel existing active event for a case (ev_status = 0). */
export async function cancelActiveEventForCase(
  caseId: number
): Promise<boolean> {
  const result = await mysqlQuery<{ affectedRows: number }>(
    "UPDATE tbl_events SET ev_status = 0 WHERE ev_status = 1 AND case_idx = ?",
    [caseId]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/** Create a delivery event for a case. */
export async function createDeliveryEvent(
  caseId: number,
  desiredDate: string,
  title: string,
  createdBy: number
): Promise<number> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const insertResult = await mysqlQuery(
    `INSERT INTO tbl_events (
      case_idx, ev_title, ev_start_date, ev_start_time, ev_end_date, ev_end_time,
      ev_all_day, ev_status, ev_created_at, ev_created_by
    ) VALUES (?, ?, ?, '00:00:00', ?, '00:00:00', 1, 1, ?, ?)`,
    [caseId, title, desiredDate, desiredDate, now, createdBy]
  );
  const header = insertResult as unknown as { insertId?: number };
  return header?.insertId ?? 0;
}
