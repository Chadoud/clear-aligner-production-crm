import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "./jwt.js";

export interface RequestPrincipal {
  userId: number;
  role: "company" | "doctor";
  cabinetId: number | null;
  cabinetName: string | null;
}

export function toPrincipal(payload: JwtPayload): RequestPrincipal | null {
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return null;
  return {
    userId,
    role: payload.role,
    cabinetId: payload.cabinetId ?? null,
    cabinetName: payload.cabinetName ?? null,
  };
}

export function getPrincipal(request: FastifyRequest): RequestPrincipal | null {
  return request.principal ?? null;
}

export function requirePrincipal(
  request: FastifyRequest,
  reply: FastifyReply
): RequestPrincipal | null {
  const principal = getPrincipal(request);
  if (!principal) {
    reply.status(401).send({ error: "Unauthorized" });
    return null;
  }
  return principal;
}
