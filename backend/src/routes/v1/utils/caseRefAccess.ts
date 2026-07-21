import type { FastifyReply, FastifyRequest } from "fastify";
import * as caseRepo from "../../../repositories/caseRepository.js";
import type { Case } from "../../../repositories/caseRepository.js";
import {
  enforceCaseAccess,
  requirePrincipal,
  type RequestPrincipal,
} from "../../../auth/principal.js";

type CaseRefAccessContext = {
  principal: RequestPrincipal;
  caseRef: string;
  caseId: number;
  caseRow: Case;
};

/**
 * Shared helper for routes that receive case patient-ref in URL
 * (`/cases/:caseId/...`, where caseId is the ref string in frontend routes).
 */
export async function loadAuthorizedCaseRefContext(
  req: FastifyRequest,
  reply: FastifyReply,
  rawCaseRef: string,
  options: { includeCaseRefInNotFound?: boolean } = {}
): Promise<CaseRefAccessContext | null> {
  const principal = requirePrincipal(req, reply);
  if (!principal) return null;

  const caseRef = String(rawCaseRef ?? "").trim();
  if (!caseRef) {
    reply.status(400).send({ error: "caseId is required" });
    return null;
  }

  const caseId = await caseRepo.getCaseIdByPatientRef(caseRef);
  if (!caseId) {
    reply
      .status(404)
      .send(
        options.includeCaseRefInNotFound
          ? { error: "Case not found", caseId: caseRef }
          : { error: "Case not found" }
      );
    return null;
  }

  const caseRow = await caseRepo.getCaseById(caseId);
  if (!caseRow) {
    reply
      .status(404)
      .send(
        options.includeCaseRefInNotFound
          ? { error: "Case not found", caseId: caseRef }
          : { error: "Case not found" }
      );
    return null;
  }

  if (!enforceCaseAccess(principal, caseRow.cabinet_id, reply)) return null;
  return { principal, caseRef, caseId, caseRow };
}
