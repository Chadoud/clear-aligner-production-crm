import type { FastifyInstance } from "fastify";
import * as suiviRepo from "../../../repositories/suiviRepository.js";
import { loadAuthorizedCaseRefContext } from "../utils/caseRefAccess.js";

export async function registerCasesSuiviRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: { caseId: string } }>(
    "/api/v1/cases/:caseId/suivi",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseRefContext(
        req,
        reply,
        req.params.caseId
      );
      if (!ctx) return;
      const entries = await suiviRepo.listSuiviByCaseId(ctx.caseId);
      return reply.send({ suivi: entries });
    }
  );

  app.post<{
    Params: { caseId: string };
    Body: { text: string; type?: number; date?: string };
  }>("/api/v1/cases/:caseId/suivi", async (req, reply) => {
    const ctx = await loadAuthorizedCaseRefContext(
      req,
      reply,
      req.params.caseId
    );
    if (!ctx) return;
    const { caseId, caseRow, principal } = ctx;
    const { text, type = 0, date } = req.body ?? {};
    if (!text || typeof text !== "string" || !text.trim())
      return reply.status(400).send({ error: "text is required" });
    const id = await suiviRepo.insertSuivi(
      caseId,
      caseRow.cabinet_id,
      principal.userId,
      text.trim(),
      Number(type) || 0,
      date
    );
    return reply.status(201).send({ ok: true, id });
  });

  app.delete<{
    Params: { caseId: string; suiviId: string };
  }>("/api/v1/cases/:caseId/suivi/:suiviId", async (req, reply) => {
    const ctx = await loadAuthorizedCaseRefContext(
      req,
      reply,
      req.params.caseId
    );
    if (!ctx) return;
    const suiviId = parseInt(req.params.suiviId, 10);
    if (!Number.isFinite(suiviId))
      return reply.status(400).send({ error: "Invalid suiviId" });
    const deleted = await suiviRepo.deleteSuivi(suiviId, ctx.caseId);
    if (!deleted)
      return reply.status(404).send({ error: "Suivi entry not found" });
    return reply.send({ ok: true });
  });
}
