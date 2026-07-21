import type { FastifyInstance } from "fastify";
import * as caseRepo from "../../repositories/caseRepository.js";
import * as replyRepo from "../../repositories/replyRepository.js";
import * as cabinetRepo from "../../repositories/cabinetRepository.js";
import * as caseDocsRepo from "../../repositories/caseDocsRepository.js";
import { loadAuthorizedCaseContext } from "./utils/caseAccess.js";
import { requirePrincipal } from "../../auth/principal.js";
import {
  sendDiscussionReplyNotificationEmail,
  scheduleTransactionalEmail,
} from "../../services/emailService.js";
import {
  deleteCaseDocFile,
  deleteCaseDocFiles,
} from "../../utils/caseDocStorage.js";
import type { RequestPrincipal } from "../../modules/auth/domain/principal.js";
import {
  channelForReplyType,
  markCaseChannelRead,
  resolveMarkReadTimestamp,
} from "../../repositories/caseChannelReadRepository.js";
import * as feedStatsRepo from "../../repositories/caseFeedStatsRepository.js";
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

function canAccessCaseCabinet(
  principal: RequestPrincipal,
  caseCabinetId: number
): boolean {
  if (principal.role === "company") return true;
  return principal.cabinetId != null && principal.cabinetId === caseCabinetId;
}

function canDeleteMessages(principal: RequestPrincipal): boolean {
  return principal.role === "company" || principal.role === "doctor";
}

function channelFromReplyType(replyType: number): "general" | "doctor" {
  return replyType === replyRepo.GENERAL_REPLY_TYPE ? "general" : "doctor";
}

async function assertOwnMessageWithinWindow(
  ownerUserId: number,
  createdAt: string,
  viewerUserId: number,
  action: "edit" | "delete"
): Promise<string | null> {
  if (Number(ownerUserId) !== Number(viewerUserId)) {
    return "You can only modify your own messages";
  }
  if (!isWithinMutationWindow(createdAt)) {
    return action === "edit"
      ? "Message is too old to edit"
      : "Message is too old to delete";
  }
  return null;
}

export async function replyRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/cases/:caseId/replies — fetch replies for a case. Query: type=discussion|general (default: discussion). */
  app.get<{
    Params: { caseId: string };
    Querystring: { type?: string };
  }>("/api/v1/cases/:caseId/replies", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.caseId);
    if (!ctx) return;
    const { caseId, principal } = ctx;
    const typeParam = (req.query?.type ?? "discussion").toLowerCase();
    const replyTypeFilter =
      typeParam === "general"
        ? replyRepo.GENERAL_REPLY_TYPE
        : replyRepo.DISCUSSION_REPLY_TYPE;
    const replies = await replyRepo.getRepliesByCaseId(
      caseId,
      200,
      replyTypeFilter
    );
    const replyIds = replies.map((r) => r.id);
    const attachmentsMap =
      await caseDocsRepo.getAttachmentsByReplyIds(replyIds);
    const repliesWithAttachments = replies.map((r) => ({
      ...r,
      attachments: attachmentsMap.get(r.id) ?? [],
    }));
    await markCaseChannelRead(
      principal.userId,
      caseId,
      channelForReplyType(typeParam),
      await resolveMarkReadTimestamp(caseId, channelForReplyType(typeParam))
    ).catch(() => {});
    return reply.send({ caseId, replies: repliesWithAttachments });
  });

  /** POST /api/v1/cases/:caseId/channels/:channel/read — mark case channel read (CRM + mobile sync). */
  app.post<{
    Params: { caseId: string; channel: string };
  }>("/api/v1/cases/:caseId/channels/:channel/read", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.caseId);
    if (!ctx) return;
    const channel =
      String(req.params.channel || "")
        .trim()
        .toLowerCase() === "doctor"
        ? "doctor"
        : "general";
    await markCaseChannelRead(
      ctx.principal.userId,
      ctx.caseId,
      channel,
      await resolveMarkReadTimestamp(ctx.caseId, channel)
    );
    return reply.status(204).send();
  });

  /** POST /api/v1/cases/:caseId/replies — add a discussion reply */
  app.post<{
    Params: { caseId: string };
    Body: {
      text?: string;
      replyType?: number;
      attachments?: Array<{ storedFilename: string; filename?: string }>;
    };
  }>("/api/v1/cases/:caseId/replies", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.caseId);
    if (!ctx) return;
    const { principal, caseId, caseRow } = ctx;
    const text = String(req.body?.text ?? "").trim();
    const replyType = req.body?.replyType ?? 0;
    const attachments = Array.isArray(req.body?.attachments)
      ? req.body.attachments
      : [];
    if (!text && attachments.length === 0) {
      return reply
        .status(400)
        .send({ error: "Message text or attachment is required" });
    }
    const replyText = text || "(attachment)";
    const id = await replyRepo.insertReply(
      caseId,
      principal.userId,
      replyText,
      replyType
    );
    if (!id) {
      return reply.status(400).send({ error: "Failed to create reply" });
    }
    // Set case_notif (same as old app): doctor -> 2 (notify lab), lab -> 1 (notify doctor). reason = 0 (discussion)
    const cabinetId = principal.cabinetId ?? null;
    const isDoctorPosting =
      cabinetId != null &&
      Number.isFinite(cabinetId) &&
      caseRow.cabinet_id === cabinetId;
    const newNotif = isDoctorPosting ? 2 : 1;
    await caseRepo.updateCaseNotif(caseId, newNotif, 0);
    if (replyRepo.shouldSendReplyNotificationEmail(replyType)) {
      const cabinet = await cabinetRepo.getCabinetById(caseRow.cabinet_id);
      const patientDisplayName = caseRow.full_name ?? "—";
      const cabinetName = cabinet?.name ?? "";
      const doctorEmail = cabinet?.email?.trim() ?? "";
      scheduleTransactionalEmail("reply_notification", caseId, () =>
        sendDiscussionReplyNotificationEmail({
          notifyLab: isDoctorPosting,
          cabinetName,
          patientDisplayName,
          doctorEmail,
          caseId,
        })
      );
    }
    for (const att of attachments) {
      const stored = att?.storedFilename?.trim();
      if (stored) {
        await caseDocsRepo.insertReplyDoc(
          id,
          stored,
          att?.filename?.trim() || undefined
        );
      }
    }

    const channel =
      replyType === replyRepo.GENERAL_REPLY_TYPE ? "general" : "doctor";
    const timestamp = new Date().toISOString();
    const socketAttachments = attachments
      .map((att) => {
        const stored = att?.storedFilename?.trim();
        if (!stored) return null;
        return {
          storedFilename: stored,
          filename: att?.filename?.trim() || stored,
        };
      })
      .filter(
        (a): a is { storedFilename: string; filename: string } => a != null
      );

    emitCrmDiscussionMessage({
      caseId,
      channel,
      cabinetId: caseRow.cabinet_id,
      isDoctorPosting,
      patientName: caseRow.full_name ?? null,
      message: {
        senderId: principal.userId,
        senderName: principal.cabinetName ?? null,
        text: replyText,
        timestamp,
      },
    });

    void notifyMobileCaseChannelNewMessage({
      caseId,
      channel,
      senderUserId: principal.userId,
      senderName: principal.cabinetName ?? null,
      text: replyText,
      attachmentsCount: socketAttachments.length,
      message: {
        id: `reply-${id}`,
        source: "reply",
        channel,
        text: replyText,
        senderId: String(principal.userId),
        senderName: principal.cabinetName ?? null,
        timestamp,
        replyType,
        attachments: socketAttachments,
      },
    });

    return reply.status(201).send({ ok: true, id });
  });

  /** PATCH /api/v1/cases/:caseId/replies/:replyId — edit own text reply within 5 minutes */
  app.patch<{
    Params: { caseId: string; replyId: string };
    Body: { text?: string };
  }>("/api/v1/cases/:caseId/replies/:replyId", async (req, reply) => {
    const ctx = await loadAuthorizedCaseContext(req, reply, req.params.caseId);
    if (!ctx) return;
    if (!canDeleteMessages(ctx.principal)) {
      return reply.status(403).send({ error: "Unauthorized" });
    }

    const replyId = parseInt(req.params.replyId, 10);
    if (!Number.isFinite(replyId) || replyId <= 0) {
      return reply.status(400).send({ error: "Invalid replyId" });
    }

    const text = String(req.body?.text ?? "").trim();
    if (!text) {
      return reply.status(400).send({ error: "Message text is required" });
    }

    const meta = await replyRepo.getReplyMeta(ctx.caseId, replyId);
    if (!meta) return reply.status(404).send({ error: "Message not found" });
    if (meta.text === "(attachment)") {
      return reply
        .status(400)
        .send({ error: "Only text messages can be edited" });
    }

    const deny = await assertOwnMessageWithinWindow(
      meta.userId,
      meta.createdAt,
      ctx.principal.userId,
      "edit"
    );
    if (deny) return reply.status(403).send({ error: deny });

    const attachmentsMap = await caseDocsRepo.getAttachmentsByReplyIds([
      replyId,
    ]);
    if ((attachmentsMap.get(replyId) ?? []).length > 0) {
      return reply
        .status(400)
        .send({ error: "Only text messages can be edited" });
    }

    const updated = await replyRepo.updateReplyText(ctx.caseId, replyId, text);
    if (!updated) return reply.status(404).send({ error: "Message not found" });

    const resolvedChannel = channelFromReplyType(meta.replyType);
    const messageId = `reply-${replyId}`;

    emitCrmCaseMessageUpdated({
      caseId: ctx.caseId,
      channel: resolvedChannel,
      messageId,
      text: updated.text,
      editedAt: updated.editedAt,
      cabinetId: ctx.caseRow.cabinet_id,
    });

    void notifyMobileCaseChannelEvent({
      caseId: ctx.caseId,
      channel: resolvedChannel,
      event: "case:message-updated",
      payload: {
        caseId: ctx.caseId,
        channel: resolvedChannel,
        message: {
          id: messageId,
          source: "reply",
          channel: resolvedChannel,
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
      id: replyId,
      text: updated.text,
      editedAt: updated.editedAt,
    });
  });

  /** DELETE /api/v1/cases/:caseId/replies/:replyId — soft delete own reply within 5 minutes */
  app.delete<{ Params: { caseId: string; replyId: string } }>(
    "/api/v1/cases/:caseId/replies/:replyId",
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

      const replyId = parseInt(req.params.replyId, 10);
      if (!Number.isFinite(replyId) || replyId <= 0) {
        return reply.status(400).send({ error: "Invalid replyId" });
      }

      const meta = await replyRepo.getReplyMeta(ctx.caseId, replyId);
      if (!meta) return reply.status(404).send({ error: "Message not found" });

      const deny = await assertOwnMessageWithinWindow(
        meta.userId,
        meta.createdAt,
        ctx.principal.userId,
        "delete"
      );
      if (deny) return reply.status(403).send({ error: deny });

      const filenames = await caseDocsRepo.deleteAllForReply(replyId);
      await deleteCaseDocFiles(ctx.caseId, filenames);

      const deleted = await replyRepo.softDeleteReply(ctx.caseId, replyId);
      if (!deleted) {
        return reply.status(404).send({ error: "Message not found" });
      }

      const channel = channelFromReplyType(meta.replyType);
      const messageId = `reply-${replyId}`;

      emitCrmCaseMessageUpdated({
        caseId: ctx.caseId,
        channel,
        messageId,
        text: "(deleted)",
        cabinetId: ctx.caseRow.cabinet_id,
      });

      emitCrmCaseMessageDeleted({
        caseId: ctx.caseId,
        channel,
        messageId,
        cabinetId: ctx.caseRow.cabinet_id,
      });

      void notifyMobileCaseChannelEvent({
        caseId: ctx.caseId,
        channel,
        event: "case:message-deleted",
        payload: { caseId: ctx.caseId, channel, messageId },
      });

      return reply.status(204).send();
    }
  );

  /** DELETE /api/v1/cases/:caseId/replies/:replyId/attachments/:filename — delete a reply attachment */
  app.delete<{
    Params: { caseId: string; replyId: string; filename: string };
  }>(
    "/api/v1/cases/:caseId/replies/:replyId/attachments/:filename",
    async (req, reply) => {
      const caseId = parseInt(req.params.caseId, 10);
      const replyId = parseInt(req.params.replyId, 10);
      if (!Number.isFinite(caseId) || !Number.isFinite(replyId)) {
        return reply.status(400).send({ error: "Invalid caseId or replyId" });
      }
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

      const meta = await replyRepo.getReplyMeta(ctx.caseId, replyId);
      if (!meta) return reply.status(404).send({ error: "Message not found" });

      const deny = await assertOwnMessageWithinWindow(
        meta.userId,
        meta.createdAt,
        ctx.principal.userId,
        "delete"
      );
      if (deny) return reply.status(403).send({ error: deny });

      const rawFilename = req.params.filename;
      const safeFilename = rawFilename.replace(/\.\./g, "").trim();
      if (!safeFilename)
        return reply.status(400).send({ error: "Invalid filename" });

      const deleted = await caseDocsRepo.deleteReplyDoc(replyId, safeFilename);
      if (!deleted)
        return reply.status(404).send({ error: "Attachment not found" });

      await deleteCaseDocFile(ctx.caseId, safeFilename);

      const remaining = await caseDocsRepo.getAttachmentsByReplyIds([replyId]);
      const left = remaining.get(replyId) ?? [];
      if (left.length === 0) {
        await replyRepo.clearAttachmentPlaceholderText(replyId);
      }

      return reply.send({ ok: true });
    }
  );

  /** GET /api/v1/cases/:caseId/channel-stats — unread counts per channel (CRM badges). */
  app.get<{ Params: { caseId: string } }>(
    "/api/v1/cases/:caseId/channel-stats",
    async (req, reply) => {
      const ctx = await loadAuthorizedCaseContext(
        req,
        reply,
        req.params.caseId
      );
      if (!ctx) return;
      const statsMap = await feedStatsRepo.getFeedStatsForCaseIds(
        [ctx.caseId],
        { viewerUserId: ctx.principal.userId }
      );
      const row = statsMap.get(ctx.caseId) ?? {
        lastGeneralAt: null,
        lastDoctorAt: null,
        unreadGeneralCount: 0,
        unreadDoctorCount: 0,
        lastActivityAt: null,
      };
      return reply.send({ caseId: ctx.caseId, ...row });
    }
  );

  /** GET /api/v1/cases/channel-stats?ids=1,2,3 — batch unread stats for case list. */
  app.get<{ Querystring: { ids?: string } }>(
    "/api/v1/cases/channel-stats",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;

      const rawIds = String(req.query?.ids ?? "")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0);
      const uniqueIds = [...new Set(rawIds)].slice(0, 100);
      if (!uniqueIds.length) {
        return reply.send({ stats: {} });
      }

      const authorizedIds: number[] = [];
      await Promise.all(
        uniqueIds.map(async (caseId) => {
          const caseRow = await caseRepo.getCaseById(caseId);
          if (!caseRow) return;
          if (!canAccessCaseCabinet(principal, caseRow.cabinet_id)) return;
          authorizedIds.push(caseId);
        })
      );

      const statsMap = await feedStatsRepo.getFeedStatsForCaseIds(
        authorizedIds,
        { viewerUserId: principal.userId }
      );
      const stats: Record<
        string,
        feedStatsRepo.CaseFeedStats & { caseId: number }
      > = {};
      for (const [caseId, row] of statsMap) {
        stats[String(caseId)] = { caseId, ...row };
      }
      return reply.send({ stats });
    }
  );
}
