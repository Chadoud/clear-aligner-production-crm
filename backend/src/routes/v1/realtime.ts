import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { requirePrincipal } from "../../auth/principal.js";

/** Mobile API JWT for Socket.IO (lab feed + case rooms on mobile API host). */
function signMobileSocketToken(userId: number): string {
  return jwt.sign({ userId, role: "doctor" }, config.mobileJwtSecret, {
    expiresIn: "1h",
  });
}

export async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/realtime/config — socket URLs + mobile bridge token for CRM frontend. */
  app.get("/api/v1/realtime/config", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;

    return reply.send({
      /** Empty string → connect to window.location.origin (CRM backend Socket.IO). */
      crmSocketUrl: "",
      mobileSocketUrl: config.mobileApiBaseUrl.replace(/\/$/, ""),
      mobileSocketToken: signMobileSocketToken(principal.userId),
    });
  });
}
