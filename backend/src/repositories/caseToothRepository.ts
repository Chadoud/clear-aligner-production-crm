/**
 * Tooth modules — case_tooth (legacy table from old app).
 * Uses taquet codes: TS, TA, TC, TL, TE1, TE2.
 * Excludes TLL, TLR, TDL (stripping — in tbl_checkbox_stripping).
 *
 * Module id `racine-courte` (Stripping V2 palette) is not in MODULE_TO_TAQ until a legacy
 * `tooth_taq` code is assigned — persist via tbl_stripping_v2 scene JSON until then.
 */
import { mysqlQuery } from "../db/mysql.js";

/** CRM module id → old app tooth_taq */
export const MODULE_TO_TAQ: Record<string, string> = {
  rhizalyze: "TS",
  extraction: "TA",
  comment: "TC",
  lock: "TL",
  "holding-clip": "TE1",
  "clip-rotation": "TE2",
};

/** Old app tooth_taq → CRM module id */
export const TAQ_TO_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_TO_TAQ).map(([k, v]) => [v, k])
);

/** Taquets we manage (excludes TLL, TLR, TDL — stripping) */
const OUR_TAQS = Object.values(MODULE_TO_TAQ);

/** Normalize toothModules to Record<string, string[]> for API input */
export function normalizeToothModules(
  mods: Record<string, string | string[]> | null | undefined
): Record<string, string[]> {
  if (typeof mods !== "object" || mods === null) return {};
  return Object.fromEntries(
    Object.entries(mods).map(([k, v]) => [
      k,
      Array.isArray(v) ? v : v != null ? [String(v)] : [],
    ])
  );
}

export interface ToothMetadata {
  toothModules: Record<string, string[]>;
  toothComments: Record<string, string>;
}

async function ensureTable(): Promise<void> {
  const createSql = `
    CREATE TABLE IF NOT EXISTS case_tooth (
      tooth_id INT AUTO_INCREMENT PRIMARY KEY,
      case_idx INT NOT NULL,
      tooth_num INT NOT NULL,
      tooth_taq VARCHAR(10) NOT NULL,
      tooth_val TEXT NULL,
      INDEX idx_case (case_idx),
      INDEX idx_case_taq (case_idx, tooth_taq)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await mysqlQuery(createSql);
}

export async function getToothMetadataByCaseId(
  caseId: number
): Promise<ToothMetadata> {
  await ensureTable();
  const rows = await mysqlQuery<{
    tooth_num: number;
    tooth_taq: string;
    tooth_val: string | null;
  }>(
    `SELECT tooth_num, tooth_taq, tooth_val FROM case_tooth
     WHERE case_idx = ? AND tooth_taq IN (${OUR_TAQS.map(() => "?").join(",")})`,
    [caseId, ...OUR_TAQS]
  );

  const toothModules: Record<string, string[]> = {};
  const toothComments: Record<string, string> = {};

  for (const r of rows) {
    const num = String(r.tooth_num);
    const modId = TAQ_TO_MODULE[r.tooth_taq];
    if (modId) {
      if (!toothModules[num]) toothModules[num] = [];
      if (!toothModules[num].includes(modId)) toothModules[num].push(modId);
    }
    if (
      r.tooth_taq === "TC" &&
      r.tooth_val != null &&
      r.tooth_val.trim() !== ""
    ) {
      toothComments[num] = r.tooth_val;
    }
  }

  return { toothModules, toothComments };
}

export async function upsertToothMetadata(
  caseId: number,
  data: ToothMetadata
): Promise<void> {
  await ensureTable();

  await mysqlQuery(
    `DELETE FROM case_tooth WHERE case_idx = ? AND tooth_taq IN (${OUR_TAQS.map(() => "?").join(",")})`,
    [caseId, ...OUR_TAQS]
  );

  // tooth_val: use '' not null — legacy DB may have NOT NULL constraint
  const rows: Array<[number, number, string, string]> = [];
  for (const [numStr, modVal] of Object.entries(data.toothModules ?? {})) {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num)) continue;
    const ids = Array.isArray(modVal)
      ? modVal
      : modVal != null
        ? [String(modVal)]
        : [];
    for (const modId of ids) {
      const taq = MODULE_TO_TAQ[modId];
      if (!taq) continue;
      const val =
        modId === "comment" ? (data.toothComments?.[numStr] ?? "") || "" : "";
      rows.push([caseId, num, taq, val]);
    }
  }
  for (const [numStr, comment] of Object.entries(data.toothComments ?? {})) {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num) || !comment?.trim()) continue;
    const hasCommentRow = rows.some((r) => r[1] === num && r[2] === "TC");
    if (!hasCommentRow) {
      rows.push([caseId, num, "TC", comment]);
    }
  }

  if (rows.length === 0) return;

  const placeholders = rows.map(() => "(?, ?, ?, ?)").join(", ");
  const flat = rows.flat();
  await mysqlQuery(
    `INSERT INTO case_tooth (case_idx, tooth_num, tooth_taq, tooth_val) VALUES ${placeholders}`,
    flat
  );
}

let initDone = false;

export async function initCaseToothStorage(): Promise<void> {
  if (initDone) return;
  await ensureTable();
  initDone = true;
}
