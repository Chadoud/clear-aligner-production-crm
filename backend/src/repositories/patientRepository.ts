/**
 * Patients — MySQL via tbl_case + tbl_cabinet.
 */
import { mysqlQuery, ns, mysqlDate, formatDate } from "../db/mysql.js";
import {
  CASE_STATUS_IN_FABRICATION,
  CASE_STATUS_IN_TREATMENT,
} from "../constants/caseStatus.js";
import { normalizeBirthDateYmd } from "../constants/defaultBirthDate.js";

export interface Patient {
  name: string;
  ref: string;
  title: number | null;
  email: string | null;
  born: string;
  /** YYYY-MM-DD when birth date is valid; for forms. */
  born_ymd?: string | null;
  address: string | null;
  phone: string | null;
  entered: string;
  cabinet: string;
  cabinet_id?: number;
  case_id: number;
  case_status: number | null;
  case_notif: number | null;
  /** 0 = discussion, 1 = new invoice. Used for beware label and tab navigation. */
  case_notif_reason?: number | null;
  /** Proposed price (case_prop_price); used to show Accept button when > 0. */
  proposed_price?: number;
  /** Desired delivery date (case_livraison_souhaitee). */
  desired_delivery_date?: string | null;
  /** Optional CRM override for aligner photo monitoring duration (months). */
  aligner_monitoring_months?: number | null;
  /** ISO timestamp of last chat message (notification trigger). */
  last_chat_at: string | null;
  /** reply_type of most recent reply (4 = new invoice, for notification display). */
  last_reply_type?: number | null;
}

export interface ListPatientsOptions {
  limit?: number;
  offset?: number;
  cabinet_id?: number;
  doctor_only?: boolean;
  skip_count?: boolean;
  q?: string;
}

interface MysqlRow {
  case_id: number;
  case_ref: string;
  case_prenom: string;
  case_nom: string;
  case_title: number | null;
  case_email: string;
  case_naissance: string | null;
  case_address: string | null;
  case_phone: string | null;
  case_created: string | null;
  cabinet_nom: string | null;
  cabinet_idx?: number;
  case_status: number | null;
  case_notif: number | null;
  case_notif_reason?: number | null;
  case_prop_price?: string | number;
  case_livraison_souhaitee?: string | null;
  aligner_monitoring_months?: number | null;
  last_chat_at: string | null;
  last_reply_type?: number | null;
}

const SELECT_COLS_PATIENT = `
  c.case_id, c.case_ref, c.case_prenom, c.case_nom,
  c.case_title, c.case_email, c.case_naissance, c.case_address, c.case_phone, c.case_created,
  c.case_status, c.case_notif, c.case_notif_reason, c.case_prop_price, c.case_livraison_souhaitee,
  c.aligner_monitoring_months,
  c.cabinet_idx,
  cab.cabinet_nom,
  (CASE
    WHEN ch.last_chat_at IS NULL AND rp.last_reply_created IS NULL THEN NULL
    WHEN ch.last_chat_at IS NULL THEN rp.last_reply_created
    WHEN rp.last_reply_created IS NULL THEN ch.last_chat_at
    ELSE GREATEST(ch.last_chat_at, rp.last_reply_created)
  END) AS last_chat_at,
  latest_reply.reply_type AS last_reply_type
`;

const PATIENT_BASE_FROM_SQL = `
  FROM tbl_case c
  LEFT JOIN tbl_cabinet cab ON cab.cabinet_id = c.cabinet_idx
  LEFT JOIN (
    SELECT case_idx, MAX(chat_created) as last_chat_at
    FROM tbl_chat GROUP BY case_idx
  ) ch ON ch.case_idx = c.case_id
  LEFT JOIN (
    SELECT case_idx, MAX(reply_created) as last_reply_created
    FROM tbl_reply GROUP BY case_idx
  ) rp ON rp.case_idx = c.case_id
  LEFT JOIN (
    SELECT r.case_idx, r.reply_type
    FROM tbl_reply r
    INNER JOIN (
      SELECT case_idx, MAX(reply_id) as max_id FROM tbl_reply GROUP BY case_idx
    ) m ON r.case_idx = m.case_idx AND r.reply_id = m.max_id
  ) latest_reply ON latest_reply.case_idx = c.case_id
`;

async function queryPatients(
  whereClause: string,
  params: unknown[],
  tailSql = ""
): Promise<MysqlRow[]> {
  return mysqlQuery<MysqlRow>(
    `SELECT ${SELECT_COLS_PATIENT}
     ${PATIENT_BASE_FROM_SQL}
     ${whereClause}
     ${tailSql}`,
    params
  );
}

async function transitionInFabricationToInTreatmentIfNeeded(
  rows: MysqlRow[]
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const toUpdate = rows.filter(
    (r) =>
      r.case_status === CASE_STATUS_IN_FABRICATION &&
      r.case_livraison_souhaitee != null &&
      String(r.case_livraison_souhaitee).trim() !== "" &&
      String(r.case_livraison_souhaitee).slice(0, 10) < today
  );
  if (toUpdate.length === 0) return;
  const ids = toUpdate.map((r) => r.case_id);
  const placeholders = ids.map(() => "?").join(",\n");
  await mysqlQuery(
    `UPDATE tbl_case SET case_status = ? WHERE case_id IN (${placeholders}) AND case_status = ? AND case_livraison_souhaitee IS NOT NULL AND TRIM(case_livraison_souhaitee) != '' AND case_livraison_souhaitee < ?`,
    [CASE_STATUS_IN_TREATMENT, ...ids, CASE_STATUS_IN_FABRICATION, today]
  );
  for (const r of toUpdate) {
    r.case_status = CASE_STATUS_IN_TREATMENT;
  }
}

function fromRow(r: MysqlRow): Patient {
  const birthYmd = normalizeBirthDateYmd(
    (() => {
      const d = mysqlDate(r.case_naissance);
      if (!d) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })()
  );
  const birthDate = birthYmd
    ? new Date(
        Number(birthYmd.slice(0, 4)),
        Number(birthYmd.slice(5, 7)) - 1,
        Number(birthYmd.slice(8, 10))
      )
    : null;
  return {
    name: [r.case_prenom, r.case_nom].filter(Boolean).join(" ").trim() || "—",
    ref: r.case_ref?.trim() || String(r.case_id),
    title: r.case_title ?? null,
    email: ns(r.case_email),
    born: birthDate ? formatDate(birthDate) : "",
    address: ns(r.case_address),
    phone: ns(r.case_phone),
    entered: formatDate(mysqlDate(r.case_created)),
    cabinet: r.cabinet_nom?.trim() || "",
    cabinet_id: r.cabinet_idx != null ? r.cabinet_idx : undefined,
    case_id: r.case_id,
    case_status: r.case_status ?? null,
    case_notif: r.case_notif ?? null,
    case_notif_reason:
      r.case_notif_reason != null ? Number(r.case_notif_reason) : null,
    proposed_price:
      r.case_prop_price != null ? Number(r.case_prop_price) : undefined,
    born_ymd: birthYmd,
    desired_delivery_date: (() => {
      const raw = r.case_livraison_souhaitee;
      if (raw == null) return null;
      const str = String(raw).trim();
      if (str === "") return null;
      const s = str.slice(0, 10);
      if (/^0000-00-00/.test(s) || s === "0000-00-00") return null;
      return s;
    })(),
    aligner_monitoring_months:
      r.aligner_monitoring_months != null
        ? Number(r.aligner_monitoring_months)
        : null,
    last_chat_at:
      r.last_chat_at != null
        ? typeof r.last_chat_at === "string"
          ? r.last_chat_at
          : ((r.last_chat_at as Date).toISOString?.() ?? null)
        : null,
    last_reply_type:
      r.last_reply_type != null ? Number(r.last_reply_type) : null,
  };
}

export async function listPatients(
  opts: ListPatientsOptions = {}
): Promise<{ patients: Patient[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 5000);
  const offset = opts.offset ?? 0;
  const conditions: string[] = [
    "TRIM(CONCAT(c.case_prenom, ' ', c.case_nom)) != ''",
  ];
  const params: unknown[] = [];

  if (opts.cabinet_id != null) {
    conditions.push("c.cabinet_idx = ?");
    params.push(opts.cabinet_id);
  }
  if (opts.doctor_only) {
    conditions.push("c.case_ref != '' AND c.case_ref NOT LIKE 'E%'");
  }
  if (opts.q?.trim()) {
    conditions.push(
      "(CONCAT(c.case_prenom, ' ', c.case_nom) LIKE ? OR c.case_ref LIKE ?)"
    );
    params.push(`%${opts.q.trim()}%`, `%${opts.q.trim()}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  let total = 0;
  if (!opts.skip_count) {
    const [countRow] = await mysqlQuery<{ total: number }>(
      `SELECT COUNT(*) AS total FROM tbl_case c ${where}`,
      params
    );
    total = Number(countRow?.total ?? 0);
  }

  const rows = await queryPatients(
    where,
    [...params, limit, offset],
    "ORDER BY c.case_created DESC, c.case_id DESC LIMIT ? OFFSET ?"
  );

  await transitionInFabricationToInTreatmentIfNeeded(rows);

  return {
    patients: rows.map(fromRow),
    total: opts.skip_count ? rows.length : total,
  };
}

/**
 * Fetch a single patient by ref (case_ref or numeric case_id).
 * @param ref - Patient ref from URL (e.g. "12345")
 * @param cabinetId - Optional: only return if patient belongs to this cabinet
 */
export async function getPatientByRef(
  ref: string,
  cabinetId?: number | null
): Promise<Patient | null> {
  const trimmed = ref?.trim();
  if (!trimmed) return null;

  const conditions: string[] = [];
  const params: unknown[] = [];

  const numericId = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  if (numericId != null) {
    conditions.push("(c.case_ref = ? OR c.case_id = ?)");
    params.push(trimmed, numericId);
  } else {
    conditions.push("c.case_ref = ?");
    params.push(trimmed);
  }

  if (cabinetId != null && Number.isFinite(cabinetId)) {
    conditions.push("c.cabinet_idx = ?");
    params.push(cabinetId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const rows = await queryPatients(where, params, "LIMIT 1");

  await transitionInFabricationToInTreatmentIfNeeded(rows);

  return rows[0] ? fromRow(rows[0]) : null;
}

/**
 * Fetch a single patient by case_id (tbl_case.case_id).
 * Used when URL is /case-management/id/:caseId — lookup by case_id only to avoid
 * wrong patient when case_ref is numeric (e.g. ref "6309" vs case_id 6309).
 */
export async function getPatientByCaseId(
  caseId: number,
  cabinetId?: number | null
): Promise<Patient | null> {
  if (!Number.isFinite(caseId)) return null;

  const conditions: string[] = ["c.case_id = ?"];
  const params: unknown[] = [caseId];

  if (cabinetId != null && Number.isFinite(cabinetId)) {
    conditions.push("c.cabinet_idx = ?");
    params.push(cabinetId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const rows = await queryPatients(where, params, "LIMIT 1");

  await transitionInFabricationToInTreatmentIfNeeded(rows);

  return rows[0] ? fromRow(rows[0]) : null;
}

/** Whitelisted tbl_case columns for PATCH /api/v1/patients/:ref (demographics + workflow). */
export type PatchPatientSqlInput = {
  case_status?: number;
  case_ref?: string;
  case_prenom?: string | null;
  case_nom?: string | null;
  case_title?: number | null;
  case_email?: string | null;
  case_naissance?: string | null;
  case_address?: string | null;
  case_phone?: string | null;
  aligner_monitoring_months?: number | null;
};

const PATCH_PATIENT_SQL_KEYS: (keyof PatchPatientSqlInput)[] = [
  "case_status",
  "case_ref",
  "case_prenom",
  "case_nom",
  "case_title",
  "case_email",
  "case_naissance",
  "case_address",
  "case_phone",
  "aligner_monitoring_months",
];

const PATCH_NULLABLE: Set<keyof PatchPatientSqlInput> = new Set([
  "case_title",
  "case_email",
  "case_naissance",
  "case_address",
  "case_phone",
  "case_prenom",
  "case_nom",
  "aligner_monitoring_months",
]);

/**
 * Patch mutable fields on a case row. Only whitelisted columns are allowed.
 * Looks up by case_ref first; falls back to numeric case_id if ref is a bare integer.
 * Use `null` on nullable columns to SET NULL in MySQL.
 */
export async function patchPatient(
  ref: string,
  updates: PatchPatientSqlInput
): Promise<boolean> {
  const setParts: string[] = [];
  const values: unknown[] = [];

  for (const key of PATCH_PATIENT_SQL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
    const v = updates[key];
    if (v === undefined) continue;
    if (v === null && !PATCH_NULLABLE.has(key)) continue;

    setParts.push(`${key} = ?`);
    if (key === "case_ref") {
      values.push(String(v).trim());
    } else if (key === "case_status") {
      values.push(Number(v));
    } else if (key === "case_title") {
      values.push(v === null ? null : Number(v));
    } else if (key === "case_prenom" || key === "case_nom") {
      values.push(v === null ? null : String(v).trim().slice(0, 120));
    } else if (
      key === "case_email" ||
      key === "case_address" ||
      key === "case_phone"
    ) {
      values.push(v === null ? null : String(v).trim().slice(0, 255));
    } else if (key === "case_naissance") {
      values.push(v === null ? null : String(v).trim().slice(0, 10));
    } else if (key === "aligner_monitoring_months") {
      if (v === null) {
        values.push(null);
      } else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 1 || n > 36) continue;
        values.push(Math.floor(n));
      }
    }
  }

  if (setParts.length === 0) return false;

  // Try by case_ref; if ref looks like a plain integer, also try case_id.
  const trimmed = ref.trim();
  const numericId = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  const where = numericId ? "(case_ref = ? OR case_id = ?)" : "case_ref = ?";
  const whereParams = numericId ? [trimmed, numericId] : [trimmed];

  const result = await mysqlQuery<{ affectedRows: number }>(
    `UPDATE tbl_case SET ${setParts.join(", ")} WHERE ${where}`,
    [...values, ...whereParams]
  );
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/**
 * Accept a price proposal: set status to In fabrication (5), save desired delivery date,
 * create delivery event (Open boxes), create acceptance reply, notify lab.
 * Matches old app accPropPrice / saveActionsCaseClient logic.
 * When doctor accepts: case_notif = 2 (notify lab). When company accepts: case_notif = 0 (no self-notify).
 */
export async function acceptPatient(
  ref: string,
  desiredDeliveryDate: string,
  userId: number,
  cabinetId?: number | null,
  acceptedByRole?: "company" | "doctor"
): Promise<Patient | null> {
  const patient = await getPatientByRef(ref.trim(), cabinetId);
  if (!patient) return null;

  const caseId = patient.case_id;
  const ymd = desiredDeliveryDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  const { cancelActiveEventForCase, createDeliveryEvent } =
    await import("./eventsRepository.js");
  const { insertReply, ACCEPTANCE_REPLY_TYPE } =
    await import("./replyRepository.js");

  await cancelActiveEventForCase(caseId);
  const eventTitle = `Livraison :${patient.name} - N° ref :${patient.ref} - Cabinet :${patient.cabinet}`;
  await createDeliveryEvent(caseId, ymd, eventTitle, userId);

  // Doctor accepts → case_notif = 2 (notify lab). Company accepts → case_notif = 0 (no self-notify).
  const caseNotif = acceptedByRole === "doctor" ? 2 : 0;
  await mysqlQuery(
    `UPDATE tbl_case SET case_status = ?, case_livraison_souhaitee = ?, case_notif = ? WHERE case_id = ?`,
    [CASE_STATUS_IN_FABRICATION, ymd, caseNotif, caseId]
  );

  await insertReply(
    caseId,
    userId,
    "proposition acceptée",
    ACCEPTANCE_REPLY_TYPE
  );

  // Convert most recent quote invoice to in_fabrication (invoice_status = 2)
  const { setQuoteToConfirmedForCase } = await import("./invoiceRepository.js");
  await setQuoteToConfirmedForCase(caseId);

  return getPatientByRef(ref.trim(), cabinetId);
}
