import type { FastifyInstance } from "fastify";
import { emitCrmCaseChannelBridgeEvent } from "../../realtime/crmSocket.js";

/** Server-to-server bridge from mobile API (X-API-Key). */
export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: {
      caseId: number;
      channel: "general" | "doctor";
      event: "case:message-updated" | "case:message-deleted";
      payload: Record<string, unknown>;
    };
  }>("/api/v1/internal/case-channel-event", async (req, reply) => {
    const { caseId, channel, event, payload } = req.body ?? {};
    if (
      !Number.isFinite(Number(caseId)) ||
      (channel !== "general" && channel !== "doctor") ||
      (event !== "case:message-updated" && event !== "case:message-deleted") ||
      !payload ||
      typeof payload !== "object"
    ) {
      return reply.status(400).send({ error: "Invalid payload" });
    }

    emitCrmCaseChannelBridgeEvent({
      caseId: Number(caseId),
      channel,
      event,
      payload,
    });
    return reply.status(204).send();
  });
}
