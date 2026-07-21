import type { FastifyInstance } from "fastify";
import * as caseSheetRepo from "../../../repositories/caseSheetRepository.js";
import * as caseRepo from "../../../repositories/caseRepository.js";
import {
  enforceCaseAccess,
  requirePrincipal,
} from "../../../auth/principal.js";
import { logger } from "../../../logger.js";

export async function caseSheetsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { caseId: string } }>(
    "/api/v1/case-sheets/:caseId",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const { caseId } = req.params;
      if (!caseId?.trim()) {
        return reply.status(400).send({ error: "caseId is required" });
      }
      try {
        const numericCaseId = await caseRepo.getCaseIdByPatientRef(caseId);
        if (!numericCaseId) {
          return reply.status(404).send({ error: "Case not found", caseId });
        }
        const caseRow = await caseRepo.getCaseById(numericCaseId);
        if (!caseRow) {
          return reply.status(404).send({ error: "Case not found", caseId });
        }
        if (!enforceCaseAccess(principal, caseRow.cabinet_id, reply)) return;
        const data = await caseSheetRepo.getCaseSheet(caseId);
        return reply.send({ caseId, data });
      } catch (err) {
        logger.error({ err, caseId }, "case-sheets GET failed");
        throw err;
      }
    }
  );

  app.put<{ Params: { caseId: string }; Body: Record<string, unknown> }>(
    "/api/v1/case-sheets/:caseId",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const { caseId } = req.params;
      if (!caseId?.trim()) {
        return reply.status(400).send({ error: "caseId is required" });
      }
      const numericCaseId = await caseRepo.getCaseIdByPatientRef(caseId);
      if (!numericCaseId) {
        return reply.status(404).send({ error: "Case not found" });
      }
      const caseRow = await caseRepo.getCaseById(numericCaseId);
      if (!caseRow) {
        return reply.status(404).send({ error: "Case not found" });
      }
      if (!enforceCaseAccess(principal, caseRow.cabinet_id, reply)) return;
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return reply.status(400).send({ error: "Body must be a JSON object" });
      }
      await caseSheetRepo.saveCaseSheet(caseId, body);
      return reply.status(200).send({ ok: true });
    }
  );
}
