import Fastify from "fastify";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { registerHttpPlugins } from "./plugins/register.js";
import { registerAuthGuard } from "./hooks/authGuard.js";
import { registerRequestLogger } from "./hooks/requestLogger.js";
import { healthRoutes } from "./routes/health.js";
import { registerV1Routes } from "./routes/v1.js";
import { uploadsRoutes } from "../routes/uploads.js";
import { initCaseSheetStorage } from "../repositories/caseSheetRepository.js";
import { isRateLimitError, rateLimitErrorMessage } from "./rateLimitPolicy.js";

export async function buildApp(
  opts: { initStorage?: boolean; trustProxy?: boolean | number } = {}
) {
  // 10 MB limit covers invoice/bill JSON bodies that include an embedded PDF (base64).
  const app = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024,
    trustProxy: opts.trustProxy ?? config.trustProxy,
  });

  await registerHttpPlugins(app);
  registerAuthGuard(app, config.apiKey);

  app.setErrorHandler((err, request, reply) => {
    if (isRateLimitError(err)) {
      logger.warn(
        {
          ip: request.ip,
          url: request.url,
          code: (err as { code?: string }).code,
          correlationId: request.id,
        },
        "Rate limit exceeded"
      );
      if (reply.sent) return;
      reply.status(429).send({
        error: rateLimitErrorMessage(err),
        requestId: request.id,
      });
      return;
    }

    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;

    logger.error(
      {
        err,
        correlationId: request.id,
        method: request.method,
        url: request.url,
      },
      "Unhandled API error"
    );
    if (reply.sent) return;
    reply.status(statusCode).send({
      error: "Internal Server Error",
      requestId: request.id,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: "Not Found", path: request.url });
  });

  registerRequestLogger(app);
  await app.register(healthRoutes, { prefix: "/" });
  await app.register(uploadsRoutes);
  await app.register(registerV1Routes);

  if (opts.initStorage !== false) {
    await initCaseSheetStorage();
  }
  return app;
}
