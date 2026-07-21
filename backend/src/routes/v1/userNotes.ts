import type { FastifyInstance } from "fastify";
import * as notesRepo from "../../repositories/userNotesRepository.js";
import { requirePrincipal } from "../../auth/principal.js";
import { logger } from "../../logger.js";
import { loadAuthorizedCaseRefContext } from "./utils/caseRefAccess.js";

export async function userNotesRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/cases/:caseId/notes — current user's notes for the case */
  app.get<{ Params: { caseId: string } }>(
    "/api/v1/cases/:caseId/notes",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const userId = principal.userId;
      if (userId == null) {
        return reply.status(401).send({ error: "User ID required" });
      }
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
        const notes = await notesRepo.getNotesByCaseAndUser(
          numericCaseId,
          userId
        );
        return reply.send({ caseId, notes });
      } catch (err) {
        logger.error({ err, caseId }, "notes GET failed");
        throw err;
      }
    }
  );

  /** POST /api/v1/cases/:caseId/notes — create a note */
  app.post<{
    Params: { caseId: string };
    Body: { noteText: string };
  }>("/api/v1/cases/:caseId/notes", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const userId = principal.userId;
    if (userId == null) {
      return reply.status(401).send({ error: "User ID required" });
    }
    const ctx = await loadAuthorizedCaseRefContext(
      req,
      reply,
      req.params.caseId
    );
    if (!ctx) return;
    const { caseRef: caseId, caseId: numericCaseId } = ctx;
    const noteText = String(req.body?.noteText ?? "").trim();
    if (!noteText) {
      return reply.status(400).send({ error: "noteText is required" });
    }

    try {
      const note = await notesRepo.createNote(numericCaseId, userId, noteText);
      return reply.status(201).send({ note });
    } catch (err) {
      logger.error({ err, caseId }, "notes POST failed");
      throw err;
    }
  });

  /** PUT /api/v1/cases/:caseId/notes/:noteId — update a note */
  app.put<{
    Params: { caseId: string; noteId: string };
    Body: { noteText: string };
  }>("/api/v1/cases/:caseId/notes/:noteId", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const userId = principal.userId;
    if (userId == null) {
      return reply.status(401).send({ error: "User ID required" });
    }
    const { caseId, noteId } = req.params;
    const noteText = String(req.body?.noteText ?? "").trim();
    if (!noteText) {
      return reply.status(400).send({ error: "noteText is required" });
    }
    const ctx = await loadAuthorizedCaseRefContext(req, reply, caseId);
    if (!ctx) return;
    const numericNoteId = parseInt(noteId, 10);
    if (!Number.isFinite(numericNoteId)) {
      return reply.status(400).send({ error: "Invalid noteId" });
    }

    try {
      const ok = await notesRepo.updateNote(numericNoteId, userId, noteText);
      if (!ok) {
        return reply
          .status(404)
          .send({ error: "Note not found or access denied" });
      }
      return reply.status(200).send({ ok: true });
    } catch (err) {
      logger.error({ err, caseId }, "notes PUT failed");
      throw err;
    }
  });

  /** DELETE /api/v1/cases/:caseId/notes/:noteId */
  app.delete<{ Params: { caseId: string; noteId: string } }>(
    "/api/v1/cases/:caseId/notes/:noteId",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const userId = principal.userId;
      if (userId == null) {
        return reply.status(401).send({ error: "User ID required" });
      }
      const { caseId, noteId } = req.params;
      const ctx = await loadAuthorizedCaseRefContext(req, reply, caseId);
      if (!ctx) return;
      const numericNoteId = parseInt(noteId, 10);
      if (!Number.isFinite(numericNoteId)) {
        return reply.status(400).send({ error: "Invalid noteId" });
      }

      try {
        const ok = await notesRepo.deleteNote(numericNoteId, userId);
        if (!ok) {
          return reply
            .status(404)
            .send({ error: "Note not found or access denied" });
        }
        return reply.status(200).send({ ok: true });
      } catch (err) {
        logger.error({ err, caseId }, "notes DELETE failed");
        throw err;
      }
    }
  );
}
