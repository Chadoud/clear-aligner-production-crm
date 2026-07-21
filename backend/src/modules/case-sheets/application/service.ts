import * as caseRepo from "../../../repositories/caseRepository.js";
import * as traitRepo from "../../../repositories/traitementRepository.js";
import * as toothRepo from "../../../repositories/caseToothRepository.js";
import * as strippingRepo from "../../../repositories/strippingRepository.js";
import * as strippingV2Repo from "../../../repositories/strippingV2Repository.js";
import type { StrippingV2Scene } from "../../../repositories/strippingV2Repository.js";

export async function initCaseSheetStorage(): Promise<void> {
  await strippingRepo.ensureTable();
  await strippingV2Repo.ensureTable();
  await toothRepo.initCaseToothStorage();
}

export async function getCaseSheet(
  caseIdOrRef: string
): Promise<Record<string, unknown>> {
  const caseId = await caseRepo.getCaseIdByPatientRef(caseIdOrRef);
  if (caseId == null) {
    return { treatments: [] };
  }
  const [traitements, toothMetadata, treatmentSteps, strippingV2] =
    await Promise.all([
      traitRepo.getTraitementsByCaseId(caseId),
      toothRepo.getToothMetadataByCaseId(caseId).catch(() => null),
      strippingRepo.getStrippingByCaseId(caseId).catch(() => null),
      strippingV2Repo.getStrippingV2ByCaseId(caseId).catch(() => null),
    ]);
  const data: Record<string, unknown> = { treatments: traitements };
  if (toothMetadata) {
    data.toothModules = toothMetadata.toothModules;
    data.toothComments = toothMetadata.toothComments;
  }
  if (treatmentSteps != null && Object.keys(treatmentSteps).length > 0) {
    data.treatmentSteps = treatmentSteps;
  }
  data.lastCompletedStep =
    treatmentSteps != null
      ? strippingRepo.getLastCompletedStep(treatmentSteps)
      : null;
  /**
   * Stripping V2 canvas scene — omit key when absent so PUT payloads do not send
   * strippingV2: null (which would clear tbl_stripping_v2 on every unrelated autosave).
   */
  if (strippingV2 != null) {
    data.strippingV2 = strippingV2;
  }
  return data;
}

export async function saveCaseSheet(
  caseIdOrRef: string,
  updates: Record<string, unknown>
): Promise<void> {
  const caseId = await caseRepo.getCaseIdByPatientRef(caseIdOrRef);
  if (caseId == null) return;

  const existing = await getCaseSheet(caseIdOrRef);
  const merged = { ...existing, ...updates };

  if (Array.isArray(merged.treatments)) {
    const types = merged.treatments
      .map((t) => (typeof t === "number" ? t : parseInt(String(t), 10)))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 8);
    await traitRepo.setTraitementsForCase(caseId, types);
  }

  if (merged.toothModules !== undefined || merged.toothComments !== undefined) {
    const existingTooth = await toothRepo
      .getToothMetadataByCaseId(caseId)
      .catch(() => ({ toothModules: {}, toothComments: {} }));
    await toothRepo.upsertToothMetadata(caseId, {
      toothModules:
        (merged.toothModules as Record<string, string[]>) ??
        existingTooth.toothModules,
      toothComments:
        (merged.toothComments as Record<string, string>) ??
        existingTooth.toothComments,
    });
  }
  if (
    merged.treatmentSteps !== undefined &&
    typeof merged.treatmentSteps === "object"
  ) {
    const lastCompleted =
      merged.lastCompletedStep != null
        ? String(merged.lastCompletedStep)
        : undefined;
    await strippingRepo.setStrippingForCase(
      caseId,
      merged.treatmentSteps as Record<
        string,
        Array<{ stepNum: number; stripings: string[]; isCompleted?: boolean }>
      >,
      lastCompleted
    );
  }
  if (merged.lastCompletedStep !== undefined) {
    const lastCompleted =
      merged.lastCompletedStep != null
        ? String(merged.lastCompletedStep)
        : null;
    await strippingRepo.updateStrippingCompletion(caseId, lastCompleted);
  }

  /**
   * strippingV2: canvas scene { schemaVersion, cases, attachments }.
   * Explicit `null` clears tbl_stripping_v2. Omitted key leaves DB unchanged.
   */
  if (Object.prototype.hasOwnProperty.call(updates, "strippingV2")) {
    const v = updates.strippingV2;
    if (v == null) {
      await strippingV2Repo.clearStrippingV2ForCase(caseId);
    } else if (typeof v === "object" && !Array.isArray(v)) {
      await strippingV2Repo.upsertStrippingV2ForCase(
        caseId,
        v as StrippingV2Scene
      );
    }
  }
}
