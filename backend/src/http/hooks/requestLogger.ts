import type { FastifyInstance } from "fastify";
import { logger } from "../../logger.js";

export function registerRequestLogger(app: FastifyInstance): void {
  app.addHook("onRequest", async (request) => {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method
    );
    if (request.url.startsWith("/api/") && isMutation) {
      logger.info(
        {
          correlationId: request.id,
          method: request.method,
          url: request.url,
        },
        "API mutation start"
      );
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    const duration = reply.getResponseTime();
    if (request.url.startsWith("/api/") && duration != null) {
      logger.info(
        {
          correlationId: request.id,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs: Math.round(duration),
        },
        "API request"
      );
    }
  });
}
