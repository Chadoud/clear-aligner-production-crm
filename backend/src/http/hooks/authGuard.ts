import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../auth/jwt.js";
import { toPrincipal } from "../../auth/principal.js";

const UNPROTECTED_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/password-reset-request",
  "/api/v1/auth/password-reset",
  "/health",
  "/health/ready",
  "/api/v1/status",
  "/api/v1/cron/doctor-billing-reminders",
]);

export function registerAuthGuard(
  app: FastifyInstance,
  expectedApiKey: string | undefined
): void {
  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/v1/")) return;
    const path = request.url.split("?")[0];
    if (UNPROTECTED_PATHS.has(path)) return;
    if (path.startsWith("/api/v1/media/profile/")) return;

    const result = requireAuth(
      request.headers.authorization,
      request.headers["x-api-key"] as string | undefined,
      expectedApiKey
    );

    if (!result) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    if ("apiKey" in result) return;
    const principal = toPrincipal(result);
    if (!principal) {
      return reply.status(401).send({ error: "Invalid token payload" });
    }
    request.principal = principal;
  });
}
