import type { FastifyInstance } from "fastify";
import * as toothRepo from "../../repositories/caseToothRepository.js";
import * as strippingRepo from "../../repositories/strippingRepository.js";
import * as strippingV2Repo from "../../repositories/strippingV2Repository.js";
import type { StrippingV2Scene } from "../../repositories/strippingV2Repository.js";
import { logger } from "../../logger.js";
import { loadAuthorizedCaseRefContext } from "./utils/caseRefAccess.js";

export async function treatmentPlanRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/cases/:caseId/treatment-plan — tooth modules, comments, stripping steps */
  app.get<{ Params: { caseId: string } }>(
    "/api/v1/cases/:caseId/treatment-plan",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseRefContext(
        req,
        reply,
        req.params.caseId,
        {
          includeCaseRefInNotFound: true,
        }
      );
      if (!ctx) return;
      const { caseRef: caseId, caseId: numericCaseId } = ctx;
      try {
        const [toothMetadata, treatmentSteps, strippingV2] = await Promise.all([
          toothRepo.getToothMetadataByCaseId(numericCaseId),
          strippingRepo.getStrippingByCaseId(numericCaseId),
          strippingV2Repo
            .getStrippingV2ByCaseId(numericCaseId)
            .catch(() => null),
        ]);

        const payload: Record<string, unknown> = {
          caseId,
          toothModules: toothMetadata.toothModules,
          toothComments: toothMetadata.toothComments,
          treatmentSteps,
        };
        if (strippingV2 != null) {
          payload.strippingV2 = strippingV2;
        }
        return reply.send(payload);
      } catch (err) {
        logger.error({ err, caseId }, "treatment-plan GET failed");
        throw err;
      }
    }
  );

  /** PUT /api/v1/cases/:caseId/treatment-plan — upsert tooth modules, comments, stripping */
  app.put<{
    Params: { caseId: string };
    Body: {
      toothModules?: Record<string, string | string[]>;
      toothComments?: Record<string, string>;
      treatmentSteps?: Record<
        string,
        Array<{ stepNum: number; stripings: string[] }>
      >;
      strippingV2?: Record<string, unknown> | null;
    };
  }>("/api/v1/cases/:caseId/treatment-plan", async (req, reply) => {
    const ctx = await loadAuthorizedCaseRefContext(
      req,
      reply,
      req.params.caseId
    );
    if (!ctx) return;
    const { caseRef: caseId, caseId: numericCaseId } = ctx;

    const body = req.body ?? {};
    try {
      if (body.toothModules !== undefined || body.toothComments !== undefined) {
        const existing =
          await toothRepo.getToothMetadataByCaseId(numericCaseId);
        await toothRepo.upsertToothMetadata(numericCaseId, {
          toothModules: toothRepo.normalizeToothModules(
            body.toothModules ?? existing.toothModules
          ),
          toothComments: body.toothComments ?? existing.toothComments,
        });
      }
      if (body.treatmentSteps !== undefined) {
        const existingSteps =
          await strippingRepo.getStrippingByCaseId(numericCaseId);
        const lastCompleted = strippingRepo.getLastCompletedStep(existingSteps);
        await strippingRepo.setStrippingForCase(
          numericCaseId,
          body.treatmentSteps as Record<
            string,
            Array<{ stepNum: number; stripings: string[] }>
          >,
          lastCompleted ?? undefined
        );
      }
      if (Object.prototype.hasOwnProperty.call(body, "strippingV2")) {
        const v = body.strippingV2;
        if (v == null) {
          await strippingV2Repo.clearStrippingV2ForCase(numericCaseId);
        } else if (typeof v === "object" && !Array.isArray(v)) {
          await strippingV2Repo.upsertStrippingV2ForCase(
            numericCaseId,
            v as unknown as StrippingV2Scene
          );
        }
      }
      return reply.status(200).send({ ok: true });
    } catch (err) {
      logger.error({ err, caseId }, "treatment-plan PUT failed");
      throw err;
    }
  });
}
