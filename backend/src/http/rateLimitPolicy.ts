/**
 * Shared rate-limit policy: identity helpers, auth budgets, 429 detection.
 *
 * Auth uses a small in-process dual counter (IP + email/token). We do not chain
 * two `@fastify/rate-limit` preHandlers — that plugin marks each request as
 * already-run, so the second check would be skipped.
 *
 * In-memory store is per Node process — keep a single API instance (or use Redis).
 */
import { createHash } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

export const AUTH_TOO_MANY =
  "Too many attempts. Please try again later." as const;

export function clientIp(req: FastifyRequest): string {
  return String(req.ip || "unknown");
}

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

/** Stable key fragment for reset tokens — never log the raw token. */
export function tokenRateLimitKey(raw: unknown): string {
  const token = String(raw ?? "").trim();
  if (!token) return "empty";
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

export function emailFromBody(req: FastifyRequest): string {
  const body = req.body as { email?: unknown } | undefined;
  return normalizeEmail(body?.email);
}

export function tokenFromBody(req: FastifyRequest): string {
  const body = req.body as { token?: unknown } | undefined;
  return tokenRateLimitKey(body?.token);
}

export function authTooManyResponse(): { error: string; statusCode: number } {
  return { statusCode: 429, error: AUTH_TOO_MANY };
}

/** Route config: skip global @fastify/rate-limit (plugin accepts false; types omit it). */
export const skipPluginRateLimit = {
  rateLimit: false,
} as unknown as { rateLimit?: Record<string, never> };

export const LOGIN_IP = {
  max: 20,
  windowMs: 60_000,
  keyPrefix: "login:ip",
};

export const LOGIN_EMAIL = {
  max: 10,
  windowMs: 15 * 60_000,
  keyPrefix: "login:email",
};

export const RESET_REQUEST_IP = {
  max: 10,
  windowMs: 15 * 60_000,
  keyPrefix: "reset-req:ip",
};

export const RESET_REQUEST_EMAIL = {
  max: 5,
  windowMs: 15 * 60_000,
  keyPrefix: "reset-req:email",
};

export const RESET_CONSUME_IP = {
  max: 20,
  windowMs: 15 * 60_000,
  keyPrefix: "reset:ip",
};

export const RESET_CONSUME_TOKEN = {
  max: 10,
  windowMs: 15 * 60_000,
  keyPrefix: "reset:token",
};

type Bucket = { count: number; resetAt: number };

const authBuckets = new Map<string, Bucket>();

/** @internal test helper */
export function __resetAuthRateLimitBucketsForTests(): void {
  authBuckets.clear();
}

export function consumeAuthBudget(
  key: string,
  max: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let bucket = authBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    authBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

type Budget = { max: number; windowMs: number; keyPrefix: string };

/**
 * preHandler that enforces two independent budgets (either trip → 429).
 */
export function dualAuthRateLimitPreHandler(
  primary: Budget,
  primaryKey: (req: FastifyRequest) => string,
  secondary: Budget,
  secondaryKey: (req: FastifyRequest) => string
) {
  return async function authRateLimit(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const checks = [
      {
        key: `${primary.keyPrefix}:${primaryKey(req)}`,
        max: primary.max,
        windowMs: primary.windowMs,
      },
      {
        key: `${secondary.keyPrefix}:${secondaryKey(req)}`,
        max: secondary.max,
        windowMs: secondary.windowMs,
      },
    ];
    for (const check of checks) {
      const result = consumeAuthBudget(check.key, check.max, check.windowMs);
      if (!result.ok) {
        reply.header("retry-after", String(result.retryAfterSec));
        reply.header("x-ratelimit-limit", String(check.max));
        reply.header("x-ratelimit-remaining", "0");
        await reply.status(429).send({ error: AUTH_TOO_MANY });
        return;
      }
    }
  };
}

export function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    statusCode?: unknown;
    code?: unknown;
    error?: unknown;
    message?: unknown;
  };
  if (Number(e.statusCode) === 429) return true;
  const code = String(e.code ?? "");
  if (code === "FST_ERR_RATE_LIMIT" || code.includes("RATE_LIMIT")) return true;
  const msg =
    `${String(e.error ?? "")} ${String(e.message ?? "")}`.toLowerCase();
  return (
    msg.includes("too many") ||
    msg.includes("rate limit") ||
    msg.includes("too many login attempts")
  );
}

export function rateLimitErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return AUTH_TOO_MANY;
  const e = err as { error?: unknown; message?: unknown };
  const fromError = String(e.error ?? "").trim();
  if (fromError && fromError.toLowerCase() !== "too many requests") {
    return fromError;
  }
  const fromMessage = String(e.message ?? "").trim();
  if (fromMessage) return fromMessage;
  return AUTH_TOO_MANY;
}
