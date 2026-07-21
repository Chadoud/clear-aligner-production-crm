import type { FastifyReply, FastifyRequest } from "fastify";
import * as caseRepo from "../../../repositories/caseRepository.js";
import type { Case } from "../../../repositories/caseRepository.js";
import {
  enforceCaseAccess,
  requirePrincipal,
  type RequestPrincipal,
} from "../../../auth/principal.js";

type CaseAccessContext = {
  principal: RequestPrincipal;
  caseId: number;
  caseRow: Case;
};

/**
 * Shared route helper for case-scoped endpoints:
 * - require authenticated principal
 * - parse/validate caseId path param
 * - load case row
 * - enforce cabinet/company access policy
 */
export async function loadAuthorizedCaseContext(
  req: FastifyRequest,
  reply: FastifyReply,
  rawCaseId: string
): Promise<CaseAccessContext | null> {
  const principal = requirePrincipal(req, reply);
  if (!principal) return null;

  const caseId = parseInt(rawCaseId, 10);
  if (!Number.isFinite(caseId)) {
    reply.status(400).send({ error: "Invalid caseId" });
    return null;
  }

  const caseRow = await caseRepo.getCaseById(caseId);
  if (!caseRow) {
    reply.status(404).send({ error: "Case not found" });
    return null;
  }

  if (!enforceCaseAccess(principal, caseRow.cabinet_id, reply)) return null;
  return { principal, caseId, caseRow };
}
