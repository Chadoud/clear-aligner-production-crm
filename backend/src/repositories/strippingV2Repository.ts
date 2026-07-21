/**
 * Stripping & attachments V2 — full canvas scene in tbl_stripping_v2.
 * One row per case. scene_json: { cases, attachments }; schema_version column separately.
 */
import { mysqlQuery } from "../db/mysql.js";
import * as caseRepo from "./caseRepository.js";
import { safeJsonParse, safeJsonStringify } from "../shared/utils/json.js";

const TABLE_NAME = "tbl_stripping_v2";

/** Hard caps to limit abuse / oversized payloads */
const MAX_CASES = 400;
const MAX_ATTACHMENTS = 800;
const MAX_SCENE_JSON_CHARS = 900_000;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    case_idx INT NOT NULL PRIMARY KEY,
    case_ref VARCHAR(50) NULL,
    schema_version SMALLINT NOT NULL DEFAULT 1,
    scene_json JSON NOT NULL,
    last_updated_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let tableReady = false;

export async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await mysqlQuery(CREATE_TABLE_SQL);
  tableReady = true;
}

export interface StrippingV2Scene {
  schemaVersion: number;
  cases: unknown[];
  attachments: unknown[];
}

function sqlNow(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function normalizeScene(raw: unknown): StrippingV2Scene | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const rawSv = o.schemaVersion;
  const schemaVersion =
    Number.isFinite(Number(rawSv)) &&
    Number(rawSv) >= 1 &&
    Number(rawSv) <= 32767
      ? Math.floor(Number(rawSv))
      : 1;
  const cases = Array.isArray(o.cases) ? o.cases : [];
  const attachments = Array.isArray(o.attachments) ? o.attachments : [];
  if (cases.length > MAX_CASES || attachments.length > MAX_ATTACHMENTS) {
    return null;
  }
  return { schemaVersion, cases, attachments };
}

function isEmptyScene(scene: StrippingV2Scene): boolean {
  return scene.cases.length === 0 && scene.attachments.length === 0;
}

export async function getStrippingV2ByCaseId(
  caseId: number
): Promise<StrippingV2Scene | null> {
  await ensureTable();
  let rows: Array<{ schema_version: number; scene_json: unknown }> = [];
  try {
    rows = await mysqlQuery<{
      schema_version: number;
      scene_json: unknown;
    }>(
      `SELECT schema_version, scene_json FROM ${TABLE_NAME} WHERE case_idx = ?`,
      [caseId]
    );
  } catch (err) {
    if ((err as { code?: string })?.code === "ER_NO_SUCH_TABLE") return null;
    throw err;
  }
  if (rows.length === 0) return null;
  const inner = safeJsonParse<Record<string, unknown>>(
    typeof rows[0].scene_json === "string"
      ? rows[0].scene_json
      : rows[0].scene_json != null
        ? JSON.stringify(rows[0].scene_json)
        : "{}",
    {}
  );
  const merged = {
    ...inner,
    schemaVersion: rows[0].schema_version,
  };
  const scene = normalizeScene(merged);
  if (!scene) return null;
  if (scene.schemaVersion > 1) {
    /** Unknown future version — do not corrupt; caller shows empty / message */
    return null;
  }
  return scene;
}

export async function upsertStrippingV2ForCase(
  caseId: number,
  scene: StrippingV2Scene
): Promise<void> {
  await ensureTable();
  if (isEmptyScene(scene)) {
    await deleteStrippingV2ForCase(caseId);
    return;
  }
  const normalized = normalizeScene(scene);
  if (!normalized) {
    throw new Error("Invalid stripping V2 scene payload");
  }
  const jsonInner = {
    cases: normalized.cases,
    attachments: normalized.attachments,
  };
  const jsonStr = safeJsonStringify(jsonInner, "{}");
  if (jsonStr.length > MAX_SCENE_JSON_CHARS) {
    throw new Error("Stripping V2 scene exceeds maximum size");
  }
  const caseRow = await caseRepo.getCaseById(caseId);
  const caseRef = caseRow?.ref ?? String(caseId);
  const now = sqlNow();
  const sv = Math.min(32767, Math.max(1, Math.floor(normalized.schemaVersion)));

  await mysqlQuery(
    `INSERT INTO ${TABLE_NAME} (case_idx, case_ref, schema_version, scene_json, last_updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       case_ref = VALUES(case_ref),
       schema_version = VALUES(schema_version),
       scene_json = VALUES(scene_json),
       last_updated_at = VALUES(last_updated_at)`,
    [caseId, caseRef, sv, jsonStr, now]
  );
}

export async function deleteStrippingV2ForCase(caseId: number): Promise<void> {
  await ensureTable();
  try {
    await mysqlQuery(`DELETE FROM ${TABLE_NAME} WHERE case_idx = ?`, [caseId]);
  } catch (err) {
    if ((err as { code?: string })?.code === "ER_NO_SUCH_TABLE") return;
    throw err;
  }
}

/** Explicit clear: same as upsert empty */
export async function clearStrippingV2ForCase(caseId: number): Promise<void> {
  await deleteStrippingV2ForCase(caseId);
}
