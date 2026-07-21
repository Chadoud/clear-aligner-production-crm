import type { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs/promises";
import * as caseRepo from "../../../repositories/caseRepository.js";
import { upsertMobUserForCase } from "../../../repositories/mobUsersRepository.js";
import { config } from "../../../config.js";
import { loadAuthorizedCaseContext } from "../utils/caseAccess.js";
import { logMutation } from "../../../shared/utils/mutationLogger.js";

/** GET/PATCH/DELETE single case — registered after :id/docs so paths stay unambiguous. */
export async function registerCasesDetailRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    "/api/v1/cases/:id",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
      if (!ctx) return;
      return reply.send(ctx.caseRow);
    }
  );

  /**
   * POST /api/v1/cases/:id/provision-credentials[?force=true]
   * Company-only. Provisions (or re-syncs) mobile-app credentials for this case.
   *
   * Normal mode: password is the generated plaintext on first call, null on
   * subsequent calls (credentials already delivered — show "See original invoice").
   *
   * Force mode (?force=true): clears the existing password_hash so new credentials
   * are generated unconditionally. Use when the lab needs to re-issue credentials
   * because the patient lost theirs or the original PDF was never printed.
   * Returns { username, password, reset: true }.
   */
  app.post<{
    Params: { id: string };
    Querystring: { force?: string };
  }>("/api/v1/cases/:id/provision-credentials", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
    if (!ctx) return;
    if (ctx.principal.role !== "company") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const force = req.query.force === "true" || req.query.force === "1";
    if (force) {
      // Clear existing credentials so upsertMobUserForCase generates fresh ones.
      await caseRepo.clearCaseCredentials(ctx.caseId);
    }
    const plainPassword = await upsertMobUserForCase(ctx.caseId);
    const updatedCase = await caseRepo.getCaseById(ctx.caseId);
    return reply.send({
      username: updatedCase?.username ?? null,
      password: updatedCase?.mob_app_password ?? plainPassword ?? null,
      ...(force ? { reset: true } : {}),
    });
  });

  app.patch<{ Params: { id: string } }>(
    "/api/v1/cases/:id/seen",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
      if (!ctx) return;
      await caseRepo.updateCaseNotif(ctx.caseId, 0, 0);
      return reply.send({ ok: true });
    }
  );

  app.patch<{
    Params: { id: string };
    Body: { ref?: string };
  }>("/api/v1/cases/:id", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
    if (!ctx) return;
    const { ref } = req.body ?? {};
    if (ref != null) {
      const trimmed = String(ref).trim();
      if (!trimmed)
        return reply.status(400).send({ error: "ref cannot be empty" });
      await caseRepo.updateCaseRef(ctx.caseId, trimmed);
    }
    return reply.send({ ok: true });
  });

  app.delete<{ Params: { id: string } }>(
    "/api/v1/cases/:id",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(req, reply, req.params.id);
      if (!ctx) return;
      const { caseId: id } = ctx;
      const deleted = await caseRepo.deleteCase(id);
      if (!deleted)
        return reply.status(500).send({ error: "Failed to delete case" });
      logMutation({
        correlationId: req.id,
        action: "delete",
        resource: "case",
        resourceId: id,
        userId: ctx.principal.userId,
        cabinetId: ctx.caseRow.cabinet_id,
      });
      const uploadsRoot = path.isAbsolute(config.uploadsDir)
        ? config.uploadsDir
        : path.join(process.cwd(), config.uploadsDir);
      const caseDir = path.join(uploadsRoot, String(id));
      try {
        await fs.rm(caseDir, { recursive: true, force: true });
      } catch {
        // Ignore if dir missing or already removed
      }
      return reply.send({ ok: true });
    }
  );
}
