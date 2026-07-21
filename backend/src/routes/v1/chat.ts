import type { FastifyInstance } from "fastify";
import * as caseRepo from "../../repositories/caseRepository.js";
import * as chatRepo from "../../repositories/chatRepository.js";
import { loadAuthorizedCaseContext } from "./utils/caseAccess.js";
import type { RequestPrincipal } from "../../modules/auth/domain/principal.js";
import {
  emitCrmDiscussionMessage,
  emitCrmCaseMessageDeleted,
  emitCrmCaseMessageUpdated,
} from "../../realtime/crmSocket.js";
import { isWithinMutationWindow } from "../../shared/utils/messageMutationWindow.js";
import {
  notifyMobileCaseChannelEvent,
  notifyMobileCaseChannelNewMessage,
} from "../../services/mobileApiNotifyService.js";

function canDeleteMessages(principal: RequestPrincipal): boolean {
  return principal.role === "company" || principal.role === "doctor";
}

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/cases/:caseId/chat — fetch chat messages for a case */
  app.get<{ Params: { caseId: string } }>(
    "/api/v1/cases/:caseId/chat",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(
        req,
        reply,
        req.params.caseId
      );
      if (!ctx) return;
      const { caseId } = ctx;
      const messages = await chatRepo.getChatByCaseId(caseId);
      return reply.send({ caseId, messages });
    }
  );

  /** POST /api/v1/cases/:caseId/chat — add a chat message */
  app.post<{
    Params: { caseId: string };
    Body: { text?: string };
  }>("/api/v1/cases/:caseId/chat", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.caseId);
    if (!ctx) return;
    const { principal, caseId, caseRow } = ctx;
    const text = req.body?.text ?? "";
    const id = await chatRepo.insertChat(
      caseId,
      principal.userId,
      principal.cabinetId ?? null,
      text
    );
    if (!id) {
      return reply.status(400).send({ error: "Message text is required" });
    }
    // Set case_notif when a change is made: doctor (cabinet owner) -> 2 (notify lab), lab (company) -> 1 (notify doctor).
    // Beware appears only from the moment of change and disappears when seen.
    const cabinetId = principal.cabinetId ?? null;
    const isDoctorPosting =
      cabinetId != null &&
      Number.isFinite(cabinetId) &&
      caseRow.cabinet_id === cabinetId;
    if (isDoctorPosting) {
      await caseRepo.updateCaseNotif(caseId, 2, 0);
    } else {
      await caseRepo.updateCaseNotif(caseId, 1, 0);
    }

    const timestamp = new Date().toISOString();
    const messageText = text.trim() || "(message)";

    emitCrmDiscussionMessage({
      caseId,
      channel: "general",
      cabinetId: caseRow.cabinet_id,
      isDoctorPosting,
      patientName: caseRow.full_name ?? null,
      message: {
        senderId: principal.userId,
        senderName: principal.cabinetName ?? null,
        text: messageText,
        timestamp,
      },
    });

    void notifyMobileCaseChannelNewMessage({
      caseId,
      channel: "general",
      senderUserId: principal.userId,
      senderName: principal.cabinetName ?? null,
      text: messageText,
      attachmentsCount: 0,
      message: {
        id: `chat-${id}`,
        source: "chat",
        channel: "general",
        text: messageText,
        senderId: String(principal.userId),
        senderName: principal.cabinetName ?? null,
        timestamp,
        attachments: [],
      },
    });

    return reply.status(201).send({ ok: true, id });
  });

  /** PATCH /api/v1/cases/:caseId/chat/:chatId — edit own chat within 5 minutes */
  app.patch<{
    Params: { caseId: string; chatId: string };
    Body: { text?: string };
  }>("/api/v1/cases/:caseId/chat/:chatId", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.caseId);
    if (!ctx) return;
    if (!canDeleteMessages(ctx.principal)) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const chatId = parseInt(req.params.chatId, 10);
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return reply.status(400).send({ error: "Invalid chatId" });
    }

    const text = String(req.body?.text ?? "").trim();
    if (!text)
      return reply.status(400).send({ error: "Message text is required" });

    const meta = await chatRepo.getChatMeta(ctx.caseId, chatId);
    if (!meta) return reply.status(404).send({ error: "Message not found" });
    if (Number(meta.userId) !== Number(ctx.principal.userId)) {
      return reply
        .status(403)
        .send({ error: "You can only modify your own messages" });
    }
    if (!isWithinMutationWindow(meta.createdAt)) {
      return reply.status(403).send({ error: "Message is too old to edit" });
    }

    const updated = await chatRepo.updateChatText(ctx.caseId, chatId, text);
    if (!updated) return reply.status(404).send({ error: "Message not found" });

    const messageId = `chat-${chatId}`;
    emitCrmCaseMessageUpdated({
      caseId: ctx.caseId,
      channel: "general",
      messageId,
      text: updated.text,
      editedAt: updated.editedAt,
      cabinetId: ctx.caseRow.cabinet_id,
    });

    void notifyMobileCaseChannelEvent({
      caseId: ctx.caseId,
      channel: "general",
      event: "case:message-updated",
      payload: {
        caseId: ctx.caseId,
        channel: "general",
        message: {
          id: messageId,
          source: "chat",
          channel: "general",
          text: updated.text,
          senderId: String(ctx.principal.userId),
          timestamp: meta.createdAt,
          editedAt: updated.editedAt,
          attachments: [],
        },
      },
    });

    return reply.send({
      ok: true,
      id: chatId,
      text: updated.text,
      editedAt: updated.editedAt,
    });
  });

  /** DELETE /api/v1/cases/:caseId/chat/:chatId — soft delete own chat within 5 minutes */
  app.delete<{ Params: { caseId: string; chatId: string } }>(
    "/api/v1/cases/:caseId/chat/:chatId",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(
        req,
        reply,
        req.params.caseId
      );
      if (!ctx) return;
      if (!canDeleteMessages(ctx.principal)) {
        return reply
          .status(403)
          .send({ error: "Only doctors and lab staff can delete messages" });
      }

      const chatId = parseInt(req.params.chatId, 10);
      if (!Number.isFinite(chatId) || chatId <= 0) {
        return reply.status(400).send({ error: "Invalid chatId" });
      }

      const meta = await chatRepo.getChatMeta(ctx.caseId, chatId);
      if (!meta) return reply.status(404).send({ error: "Message not found" });
      if (Number(meta.userId) !== Number(ctx.principal.userId)) {
        return reply
          .status(403)
          .send({ error: "You can only modify your own messages" });
      }
      if (!isWithinMutationWindow(meta.createdAt)) {
        return reply
          .status(403)
          .send({ error: "Message is too old to delete" });
      }

      const deleted = await chatRepo.softDeleteChat(ctx.caseId, chatId);
      if (!deleted) {
        return reply.status(404).send({ error: "Message not found" });
      }

      const messageId = `chat-${chatId}`;
      emitCrmCaseMessageUpdated({
        caseId: ctx.caseId,
        channel: "general",
        messageId,
        text: "(deleted)",
        cabinetId: ctx.caseRow.cabinet_id,
      });

      emitCrmCaseMessageDeleted({
        caseId: ctx.caseId,
        channel: "general",
        messageId,
        cabinetId: ctx.caseRow.cabinet_id,
      });

      void notifyMobileCaseChannelEvent({
        caseId: ctx.caseId,
        channel: "general",
        event: "case:message-deleted",
        payload: { caseId: ctx.caseId, channel: "general", messageId },
      });

      return reply.status(204).send();
    }
  );
}
