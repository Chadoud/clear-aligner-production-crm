import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { config } from "../../config.js";
import { AUTH_TOO_MANY, clientIp } from "../rateLimitPolicy.js";

export async function registerHttpPlugins(app: FastifyInstance): Promise<void> {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    global: true,
    // Dev dashboards refetch many lists; keep prod tighter.
    max: process.env.NODE_ENV === "production" ? 300 : 2000,
    timeWindow: "1 minute",
    skipOnError: false,
    keyGenerator: (req) => clientIp(req),
    allowList: (req) => req.method === "OPTIONS",
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: AUTH_TOO_MANY,
    }),
  });
}
