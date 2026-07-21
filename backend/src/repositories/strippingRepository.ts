/**
 * Stripping checklist — tbl_checkbox_stripping.
 * One row per case. steps_data JSON: [{gapKey, stepNum, stripings, isCompleted}].
 * stripping_completed_steps stores last completed step number for quick reads.
 */
import { mysqlQuery } from "../db/mysql.js";
import * as caseRepo from "./caseRepository.js";
import {
  safeJsonArray,
  safeJsonParse,
  safeJsonStringify,
} from "../shared/utils/json.js";
import { STRIPPING_GAP_KEYS } from "../constants/strippingGapKeys.js";

const TABLE_NAME = "tbl_checkbox_stripping";
const LEGACY_TABLE_NAME = "tbl_stripping";

const GAP_KEYS = STRIPPING_GAP_KEYS;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    case_idx INT NOT NULL PRIMARY KEY,
    steps_data JSON NULL,
    case_ref VARCHAR(50) NULL,
    stripping_completed_steps VARCHAR(50) NULL,
    last_updated_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let tableReady = false;
export async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await mysqlQuery(CREATE_TABLE_SQL);
  await migrateLegacyTableIfNeeded();
  tableReady = true;
}

function isMissingTableError(err: unknown): boolean {
  return (err as { code?: string })?.code === "ER_NO_SUCH_TABLE";
}

function isMissingColumnError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const message = String((err as { message?: string })?.message ?? "");
  return code === "ER_BAD_FIELD_ERROR" || message.includes("Unknown column");
}

function normalizeJsonForDb(raw: unknown): string {
  return safeJsonStringify(raw, "[]");
}

async function migrateLegacyTableIfNeeded(): Promise<void> {
  try {
    const rows = await mysqlQuery<{
      case_idx: number;
      steps_data: unknown;
      case_ref: string | null;
      stripping_completed_steps: string | null;
      last_updated_at: string | null;
    }>(
      `SELECT case_idx, steps_data, case_ref, stripping_completed_steps, last_updated_at
       FROM ${LEGACY_TABLE_NAME}`
    );

    if (rows.length > 0) {
      for (const row of rows) {
        await mysqlQuery(
          `INSERT INTO ${TABLE_NAME} (case_idx, steps_data, case_ref, stripping_completed_steps, last_updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             steps_data = VALUES(steps_data),
             case_ref = VALUES(case_ref),
             stripping_completed_steps = VALUES(stripping_completed_steps),
             last_updated_at = VALUES(last_updated_at)`,
          [
            row.case_idx,
            normalizeJsonForDb(row.steps_data),
            row.case_ref,
            row.stripping_completed_steps,
            row.last_updated_at,
          ]
        );
      }
    }
  } catch (err) {
    if (isMissingTableError(err) || isMissingColumnError(err)) return;
    throw err;
  }
}

function sqlNow(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function resolveLastCompletedIndex(
  stepList: Array<{ simpleId: string }>,
  lastCompletedStep?: string | null
): number {
  return lastCompletedStep != null && String(lastCompletedStep).trim() !== ""
    ? stepList.findIndex(
        (s) =>
          s.simpleId === lastCompletedStep ||
          s.simpleId.replace(/-0$/, "") === lastCompletedStep
      )
    : -1;
}

function buildStrippingStepsData(
  stepList: Array<{ gapKey: string; stepNum: number; stripings: string[] }>,
  lastIdx: number
): Array<{
  gapKey: string;
  stepNum: number;
  stripings: string[];
  isCompleted: boolean;
}> {
  return stepList.map((s, idx) => ({
    gapKey: s.gapKey,
    stepNum: s.stepNum,
    stripings: s.stripings,
    isCompleted: lastIdx >= 0 && idx <= lastIdx,
  }));
}

async function deleteLegacyCaseRow(caseId: number): Promise<void> {
  try {
    await mysqlQuery(`DELETE FROM ${LEGACY_TABLE_NAME} WHERE case_idx = ?`, [
      caseId,
    ]);
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
}

async function upsertStrippingSnapshot(
  caseId: number,
  stepsData: Array<{
    gapKey: string;
    stepNum: number;
    stripings: string[];
    isCompleted: boolean;
  }>,
  completedStepNum: string
): Promise<void> {
  const caseRow = await caseRepo.getCaseById(caseId);
  const caseRef = caseRow?.ref ?? String(caseId);
  const now = sqlNow();

  await mysqlQuery(
    `INSERT INTO ${TABLE_NAME} (case_idx, steps_data, case_ref, stripping_completed_steps, last_updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE steps_data = VALUES(steps_data), case_ref = VALUES(case_ref), stripping_completed_steps = VALUES(stripping_completed_steps), last_updated_at = VALUES(last_updated_at)`,
    [caseId, JSON.stringify(stepsData), caseRef, completedStepNum, now]
  );
}

export interface StrippingStep {
  stepNum: number;
  /** Stripping option IDs: "mesial", "distal", "mesio-distal" */
  stripings: string[];
  /** Whether this step is completed (checkbox checked) */
  isCompleted?: boolean;
}

export type TreatmentSteps = Record<string, StrippingStep[]>;

function parseJsonArray(raw: unknown): string[] {
  return safeJsonArray(raw);
}

interface StepDataRow {
  gapKey: string;
  stepNum: number;
  stripings: unknown;
  isCompleted?: boolean;
}

function parseStepsData(raw: unknown): StepDataRow[] {
  if (raw == null) return [];
  const str =
    typeof raw === "string"
      ? raw
      : Buffer.isBuffer(raw)
        ? raw.toString("utf8")
        : safeJsonStringify(raw, "[]");
  const parsed = safeJsonParse<Record<string, unknown>[]>(str, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((s: Record<string, unknown>) => ({
    gapKey: String(s.gapKey ?? ""),
    stepNum: Number(s.stepNum) || 0,
    stripings: s.stripings,
    isCompleted: s.isCompleted === true || s.isCompleted === 1,
  }));
}

export async function getStrippingByCaseId(
  caseId: number
): Promise<TreatmentSteps> {
  await ensureTable();
  let rows: Array<{ steps_data: unknown }> = [];
  try {
    rows = await mysqlQuery<{ steps_data: unknown }>(
      `SELECT steps_data FROM ${TABLE_NAME} WHERE case_idx = ?`,
      [caseId]
    );
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  if (rows.length === 0) {
    try {
      rows = await mysqlQuery<{ steps_data: unknown }>(
        `SELECT steps_data FROM ${LEGACY_TABLE_NAME} WHERE case_idx = ?`,
        [caseId]
      );
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (rows.length === 0) return {};
  const stepsData = parseStepsData(rows[0].steps_data);
  const result: TreatmentSteps = {};
  for (const s of stepsData) {
    const gapKey = s.gapKey;
    if (!gapKey) continue;
    if (!result[gapKey]) result[gapKey] = [];
    result[gapKey].push({
      stepNum: s.stepNum,
      stripings: parseJsonArray(s.stripings),
      isCompleted: s.isCompleted,
    });
  }
  for (const gapKey of Object.keys(result)) {
    result[gapKey].sort((a, b) => a.stepNum - b.stepNum);
  }
  return result;
}

/** Build ordered step list (same order as frontend buildStepList). */
function buildStepList(treatmentSteps: TreatmentSteps): Array<{
  gapKey: string;
  stepIdx: number;
  stepNum: number;
  stripings: string[];
  simpleId: string;
  isCompleted: boolean;
}> {
  const entries: Array<{
    gapKey: string;
    stepIdx: number;
    stepNum: number;
    stripings: string[];
    simpleId: string;
    isCompleted: boolean;
  }> = [];
  for (const gapKey of GAP_KEYS) {
    const steps = treatmentSteps[gapKey] ?? [];
    steps.forEach((step, stepIdx) => {
      const simpleId = gapKey.slice(1) + (stepIdx > 0 ? `-${stepIdx}` : "");
      entries.push({
        gapKey,
        stepIdx,
        stepNum: step.stepNum,
        stripings: step.stripings ?? [],
        simpleId,
        isCompleted: !!step.isCompleted,
      });
    });
  }
  entries.sort((a, b) => a.stepNum - b.stepNum);
  return entries;
}

/**
 * Derive last completed step from treatment steps (last step with isCompleted in ordered list).
 */
export function getLastCompletedStep(
  treatmentSteps: TreatmentSteps
): string | null {
  const stepList = buildStepList(treatmentSteps);
  let lastIdx = -1;
  for (let i = 0; i < stepList.length; i++) {
    if (stepList[i].isCompleted) lastIdx = i;
  }
  if (lastIdx < 0) return null;
  return stepList[lastIdx].simpleId;
}

export async function setStrippingForCase(
  caseId: number,
  treatmentSteps: TreatmentSteps,
  lastCompletedStep?: string | null
): Promise<void> {
  await ensureTable();
  const stepList = buildStepList(treatmentSteps ?? {});
  if (stepList.length === 0) {
    await mysqlQuery(`DELETE FROM ${TABLE_NAME} WHERE case_idx = ?`, [caseId]);
    await deleteLegacyCaseRow(caseId);
    return;
  }

  const lastIdx = resolveLastCompletedIndex(stepList, lastCompletedStep);
  const stepsData = buildStrippingStepsData(stepList, lastIdx);
  const completedStepNum =
    lastIdx >= 0 ? String(stepList[lastIdx].stepNum) : "";
  await upsertStrippingSnapshot(caseId, stepsData, completedStepNum);
  await deleteLegacyCaseRow(caseId);
}

/**
 * Update is_completed for each step when only checkbox toggles (no treatmentSteps change).
 */
export async function updateStrippingCompletion(
  caseId: number,
  lastCompletedStep: string | null
): Promise<void> {
  await ensureTable();
  const treatmentSteps = await getStrippingByCaseId(caseId);
  const stepList = buildStepList(treatmentSteps);
  if (stepList.length === 0) return;

  const lastIdx = resolveLastCompletedIndex(stepList, lastCompletedStep);
  const stepsData = buildStrippingStepsData(stepList, lastIdx);
  const completedStepNum =
    lastIdx >= 0 ? String(stepList[lastIdx].stepNum) : "";
  await upsertStrippingSnapshot(caseId, stepsData, completedStepNum);
  await deleteLegacyCaseRow(caseId);
}
