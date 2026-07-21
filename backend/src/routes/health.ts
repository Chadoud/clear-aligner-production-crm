import type { FastifyInstance } from "fastify";
import { mysqlQuery } from "../db/mysql.js";
import { skipPluginRateLimit } from "../http/rateLimitPolicy.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", { config: skipPluginRateLimit }, async (_req, reply) => {
    return reply.send({ status: "ok" });
  });

  app.get(
    "/health/ready",
    { config: skipPluginRateLimit },
    async (_req, reply) => {
      try {
        await mysqlQuery("SELECT 1");
        return reply.send({ status: "ok", db: "connected" });
      } catch {
        return reply.status(503).send({ status: "error", db: "disconnected" });
      }
    }
  );
}
