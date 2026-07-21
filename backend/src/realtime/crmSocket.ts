import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { toPrincipal, type RequestPrincipal } from "../auth/principal.js";
import type { JwtPayload } from "../modules/auth/domain/jwt.js";

export type CrmDiscussionMessageEvent = {
  caseId: number;
  channel: "general" | "doctor";
  cabinetId: number;
  patientName: string | null;
  message: {
    senderId: number;
    senderName: string | null;
    text: string;
    timestamp: string;
  };
};

let io: SocketIOServer | null = null;

function verifySocketToken(token: unknown): RequestPrincipal | null {
  if (typeof token !== "string" || !token.trim()) return null;
  try {
    const decoded = jwt.verify(token.trim(), config.jwtSecret) as JwtPayload;
    return toPrincipal(decoded);
  } catch {
    return null;
  }
}

/** Attach Socket.IO to the Fastify HTTP server (same port as REST API). */
export function initCrmSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const principal = verifySocketToken(socket.handshake.auth?.token);
    if (!principal) {
      next(new Error("Unauthorized"));
      return;
    }
    socket.data.principal = principal;
    next();
  });

  io.on("connection", (socket) => {
    const principal = socket.data.principal as RequestPrincipal;
    socket.join(`crm:user:${principal.userId}`);
    if (principal.role === "company") {
      socket.join("crm:lab");
    }
    if (principal.role === "doctor" && principal.cabinetId != null) {
      socket.join(`crm:cabinet:${principal.cabinetId}`);
    }
  });

  return io;
}

/** Push a new discussion message to connected CRM clients (lab or cabinet room). */
export function emitCrmDiscussionMessage(
  params: CrmDiscussionMessageEvent & { isDoctorPosting: boolean }
): void {
  if (!io) return;
  const { isDoctorPosting, ...payload } = params;
  if (isDoctorPosting) {
    io.to("crm:lab").emit("crm:case:new-message", payload);
    return;
  }
  io.to(`crm:cabinet:${params.cabinetId}`).emit(
    "crm:case:new-message",
    payload
  );
}

export type CrmCaseMessageMutationEvent = {
  caseId: number;
  channel: "general" | "doctor";
  messageId: string;
  text?: string;
  editedAt?: string | null;
};

function emitToDiscussionRooms(
  cabinetId: number | null | undefined,
  event: string,
  payload: CrmCaseMessageMutationEvent
): void {
  if (!io) return;
  io.to("crm:lab").emit(event, payload);
  if (cabinetId != null && Number.isFinite(Number(cabinetId))) {
    io.to(`crm:cabinet:${cabinetId}`).emit(event, payload);
  }
}

export function emitCrmCaseMessageUpdated(
  payload: CrmCaseMessageMutationEvent & { cabinetId?: number | null }
): void {
  const { cabinetId, ...rest } = payload;
  emitToDiscussionRooms(cabinetId, "crm:case:message-updated", rest);
}

export function emitCrmCaseMessageDeleted(
  payload: CrmCaseMessageMutationEvent & { cabinetId?: number | null }
): void {
  const { cabinetId, ...rest } = payload;
  emitToDiscussionRooms(cabinetId, "crm:case:message-deleted", rest);
}

/** Handle mobile API → CRM bridge (server-to-server). */
export function emitCrmCaseChannelBridgeEvent(body: {
  caseId: number;
  channel: "general" | "doctor";
  event: "case:message-updated" | "case:message-deleted";
  payload: Record<string, unknown>;
}): void {
  if (!io) return;
  const { caseId, channel, event, payload } = body;
  if (event === "case:message-deleted") {
    const messageId = String(payload.messageId ?? "");
    emitToDiscussionRooms(null, "crm:case:message-deleted", {
      caseId,
      channel,
      messageId,
    });
    return;
  }
  if (event === "case:message-updated") {
    const msg = payload.message as Record<string, unknown> | undefined;
    emitToDiscussionRooms(null, "crm:case:message-updated", {
      caseId,
      channel,
      messageId: String(msg?.id ?? ""),
      text: typeof msg?.text === "string" ? msg.text : undefined,
      editedAt: typeof msg?.editedAt === "string" ? msg.editedAt : null,
    });
  }
}
