import type { FastifyReply } from "fastify";
import type { RequestPrincipal } from "../../modules/auth/domain/principal.js";

export function isCompany(principal: RequestPrincipal): boolean {
  return principal.role === "company";
}

export function doctorCabinetId(principal: RequestPrincipal): number | null {
  return principal.role === "doctor" ? principal.cabinetId : null;
}

export function scopeCabinet(
  principal: RequestPrincipal,
  requestedCabinetId?: number
): number | undefined {
  if (principal.role === "doctor") {
    // Keep historical behavior: doctor without linked cabinet gets no rows.
    return principal.cabinetId ?? -1;
  }
  return Number.isFinite(requestedCabinetId) ? requestedCabinetId : undefined;
}

export function assertCompany(
  principal: RequestPrincipal,
  reply: FastifyReply
): boolean {
  if (principal.role !== "company") {
    reply.status(403).send({ error: "Forbidden" });
    return false;
  }
  return true;
}

export function assertCaseAccess(
  principal: RequestPrincipal,
  caseCabinetId: number,
  reply: FastifyReply
): boolean {
  if (principal.role === "company") return true;
  if (principal.cabinetId != null && principal.cabinetId === caseCabinetId) {
    return true;
  }
  reply.status(403).send({ error: "Forbidden" });
  return false;
}
