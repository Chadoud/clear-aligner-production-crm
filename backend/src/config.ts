import { loadEnv } from "./loadEnv.js";

loadEnv();

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function parsePort(raw: string): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

/**
 * How many reverse-proxy hops to trust for `req.ip` / X-Forwarded-For.
 * Production default: 1 (nginx). Dev default: false (hit API directly).
 * Only safe when Node is not reachable from the public internet.
 */
function parseTrustProxy(): boolean | number {
  const raw = process.env.TRUST_PROXY?.trim().toLowerCase();
  if (raw === undefined || raw === "") {
    return isProd ? 1 : false;
  }
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "true" || raw === "yes") return 1;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0) return n === 0 ? false : n;
  return isProd ? 1 : false;
}

export const config = {
  port: parsePort(optional("PORT", "4000")),
  /**
   * Bind address. Production default 127.0.0.1 (nginx on the same host only).
   * Dev default 0.0.0.0. Override with LISTEN_HOST.
   */
  listenHost: optional("LISTEN_HOST", isProd ? "127.0.0.1" : "0.0.0.0"),
  nodeEnv,
  trustProxy: parseTrustProxy(),
  /** MySQL connection string (`SOURCE_DB_URL`) */
  sourceDb: {
    url: isProd
      ? required("SOURCE_DB_URL")
      : optional("SOURCE_DB_URL", "mysql://localhost/aligner_crm"),
  },
  /** Frontend origin for CORS */
  corsOrigin: isProd
    ? required("CORS_ORIGIN")
    : optional("CORS_ORIGIN", "http://localhost:3000"),
  /** JWT secret for API auth */
  jwtSecret: isProd
    ? required("JWT_SECRET")
    : optional("JWT_SECRET", "dev-only-insecure-jwt-secret-change-me"),
  /** Optional API key for server-to-server (X-API-Key header) */
  apiKey: process.env.API_KEY?.trim() || undefined,
  /** Shared secret for scheduled jobs (e.g. POST /api/v1/cron/doctor-billing-reminders, header X-Cron-Secret) */
  cronSecret: process.env.CRON_SECRET?.trim() || undefined,
  /** Directory for case document uploads (relative to backend root or absolute) */
  uploadsDir: optional("UPLOADS_DIR", "data/uploads"),
  /** Cabinet / user profile images on local disk (`data/profile/…`) */
  profileDir: optional("PROFILE_DIR", "data/profile"),
  mobileApiBaseUrl: optional("MOBILE_API_BASE_URL", "https://api.example.com"),
  /** JWT secret for mobile API Socket.IO bridge (defaults to CRM JWT secret). */
  mobileJwtSecret: optional(
    "MOBILE_JWT_SECRET",
    optional("JWT_SECRET", "dev-only-insecure-jwt-secret-change-me")
  ),
  /** Shared secret for mobile API /api/internal/* (cross-platform sync). */
  mobileInternalApiKey: optional(
    "MOBILE_INTERNAL_API_KEY",
    optional("INTERNAL_API_KEY", "")
  ),
  /** Frontend base URL for building links in emails (password reset, etc.) */
  appBaseUrl: optional("APP_BASE_URL", "https://crm.example.com"),
  /** Password reset token lifetime in minutes */
  passwordResetTokenTtlMinutes: Number(
    optional("PASSWORD_RESET_TOKEN_TTL_MINUTES", "60")
  ),
} as const;
