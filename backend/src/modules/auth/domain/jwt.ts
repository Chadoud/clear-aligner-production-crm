import jwt from "jsonwebtoken";
import { timingSafeEqual } from "crypto";
import { config } from "../../../config.js";
import { logger } from "../../../logger.js";

export interface JwtPayload {
  sub: string;
  role: "company" | "doctor";
  cabinetId: number | null;
  cabinetName: string | null;
  exp?: number;
  iat?: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export function signToken(payload: Omit<JwtPayload, "exp" | "iat">): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifyToken(authHeader: string | undefined): JwtPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch (err) {
    logger.debug({ err }, "JWT verification failed");
    return null;
  }
}

export function checkApiKey(
  apiKeyHeader: string | undefined,
  expectedKey: string | undefined
): boolean {
  if (!expectedKey || !apiKeyHeader) return false;
  const a = Buffer.from(apiKeyHeader);
  const b = Buffer.from(expectedKey);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireAuth(
  authHeader: string | undefined,
  apiKeyHeader: string | undefined,
  expectedApiKey: string | undefined
): JwtPayload | { apiKey: true } | null {
  if (checkApiKey(apiKeyHeader, expectedApiKey)) return { apiKey: true };
  return verifyToken(authHeader);
}
