import type { FastifyInstance } from "fastify";
import * as caseRepo from "../../../repositories/caseRepository.js";
import * as cabinetRepo from "../../../repositories/cabinetRepository.js";
import * as caseSheetRepo from "../../../repositories/caseSheetRepository.js";
import * as traitRepo from "../../../repositories/traitementRepository.js";
import { requirePrincipal, isCompany } from "../../../auth/principal.js";
import { scopeCabinet } from "../../../security/policies/accessPolicy.js";
import {
  sendNewCaseLabEmail,
  sendNewCaseDoctorEmail,
  scheduleTransactionalEmail,
  formatPatientDisplayName,
} from "../../../services/emailService.js";
import { logMutation } from "../../../shared/utils/mutationLogger.js";
import { getBrand } from "../../../utils/brand.js";

export async function registerCasesCrudRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post<{
    Body: {
      ref?: string;
      cabinet: string;
      firstName: string;
      lastName: string;
      email?: string;
      birthday?: string;
      address?: string;
      phone?: string;
      title?: number;
      toothModules?: Record<string, unknown>;
      toothComments?: Record<string, unknown>;
      treatmentSteps?: Record<string, unknown>;
      strippingV2?: Record<string, unknown> | null;
      treatments?: (number | string)[];
      treatmentComments?: string;
    };
  }>("/api/v1/cases", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const body = req.body ?? {};
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const cabinetName = String(body.cabinet ?? "").trim();

    if (!firstName || !lastName) {
      return reply.status(400).send({
        error: "firstName and lastName are required",
      });
    }
    const cabinetRef = isCompany(principal)
      ? await cabinetRepo.getCabinetByName(cabinetName)
      : principal.cabinetId != null
        ? { id: principal.cabinetId }
        : null;
    if (!cabinetRef) {
      return reply.status(400).send({
        error: isCompany(principal)
          ? `Cabinet "${cabinetName}" not found`
          : "Doctor account is not linked to a cabinet",
      });
    }
    const cabinet = await cabinetRepo.getCabinetById(cabinetRef.id);
    if (!cabinet) {
      return reply.status(400).send({
        error: isCompany(principal)
          ? `Cabinet "${cabinetName}" not found`
          : "Doctor account is not linked to a cabinet",
      });
    }

    const cabinetNameForRef = cabinet.name ?? cabinetName;
    const isDirectCabinet = cabinetNameForRef.toLowerCase().includes("direct");
    const nextNum = await caseRepo.getNextRefNumber();
    const defaultRef = isDirectCabinet ? `E${nextNum}` : `${nextNum}`;
    const ref = String(body.ref ?? "").trim() || defaultRef;
    const comments = body.treatmentComments
      ? String(body.treatmentComments).trim()
      : null;

    const { id, ref: finalRef } = await caseRepo.insertCase({
      ref,
      cabinet_id: cabinet.id,
      first_name: firstName,
      last_name: lastName,
      email: body.email || null,
      birth_date: body.birthday || null,
      address: body.address || null,
      phone: body.phone || null,
      title: body.title ?? null,
      status: 3,
      comments,
    });

    if (Array.isArray(body.treatments) && body.treatments.length > 0) {
      const types = body.treatments
        .map((t) => (typeof t === "number" ? t : parseInt(String(t), 10)))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 8);
      await traitRepo.setTraitementsForCase(id, types);
    }

    if (
      body.toothModules != null ||
      body.toothComments != null ||
      body.treatmentSteps != null ||
      body.strippingV2 != null
    ) {
      await caseSheetRepo.saveCaseSheet(String(id), {
        toothModules: body.toothModules ?? {},
        toothComments: body.toothComments ?? {},
        treatmentSteps: body.treatmentSteps ?? {},
        ...(body.strippingV2 != null ? { strippingV2: body.strippingV2 } : {}),
      });
    }

    const cabinetNameForEmail = cabinet.name ?? cabinetNameForRef;
    const patientDisplayName = formatPatientDisplayName(
      body.title ?? null,
      firstName,
      lastName
    );
    const doctorEmail = cabinet.email?.trim() ?? "";
    const brand = getBrand(cabinet.id ?? null);
    scheduleTransactionalEmail("new_case_lab", id, () =>
      sendNewCaseLabEmail({
        cabinetName: cabinetNameForEmail,
        patientDisplayName,
        caseId: id,
      })
    );
    scheduleTransactionalEmail("new_case_doctor", id, () =>
      sendNewCaseDoctorEmail({
        doctorEmail,
        cabinetName: cabinetNameForEmail,
        caseId: id,
        brand,
      })
    );

    logMutation({
      correlationId: req.id,
      action: "create",
      resource: "case",
      resourceId: id,
      userId: principal.userId,
      cabinetId: cabinet.id,
      extra: { ref: finalRef },
    });
    return reply.status(201).send({ case: { id, ref: finalRef } });
  });

  app.get<{
    Querystring: { cabinet?: string; cabinet_id?: string };
  }>("/api/v1/cases/next-ref", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const cabinetName = req.query.cabinet?.trim();
    const cabinetIdParam =
      req.query.cabinet_id != null
        ? parseInt(req.query.cabinet_id, 10)
        : undefined;
    let cabinetId: number | undefined;
    let cabinetNameForRef = cabinetName ?? "";
    if (Number.isFinite(cabinetIdParam)) {
      const cabinet = await cabinetRepo.getCabinetById(
        cabinetIdParam as number
      );
      if (!cabinet)
        return reply.status(404).send({ error: "Cabinet not found" });
      cabinetId = cabinet.id;
      cabinetNameForRef = cabinet.name ?? cabinetNameForRef;
    } else if (cabinetName) {
      const cabinet = await cabinetRepo.getCabinetByName(cabinetName);
      if (!cabinet)
        return reply.status(404).send({ error: "Cabinet not found" });
      cabinetId = cabinet.id;
      cabinetNameForRef = cabinetName;
    }
    if (cabinetId == null) {
      return reply.status(400).send({
        error: "cabinet or cabinet_id is required",
      });
    }
    const scopedId = scopeCabinet(principal, cabinetId);
    if (scopedId !== cabinetId) {
      return reply.status(403).send({ error: "Access denied to this cabinet" });
    }
    const nextNum = await caseRepo.getNextRefNumber();
    const isDirect = cabinetNameForRef.toLowerCase().includes("direct");
    const nextRef = isDirect ? `E${nextNum}` : `${nextNum}`;
    return reply.send({ nextRef });
  });

  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      cabinet_id?: string;
      status?: string;
      q?: string;
    };
  }>("/api/v1/cases", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const limit =
      req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset =
      req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const cabinet_id =
      req.query.cabinet_id != null
        ? parseInt(req.query.cabinet_id, 10)
        : undefined;
    const status =
      req.query.status != null ? parseInt(req.query.status, 10) : undefined;
    const q = req.query.q ?? undefined;

    const scopedCabinetId = scopeCabinet(principal, cabinet_id);
    const { cases: casesList, total } = await caseRepo.listCases({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
      cabinet_id: Number.isFinite(scopedCabinetId)
        ? scopedCabinetId
        : undefined,
      status: Number.isFinite(status) ? status : undefined,
      q,
    });

    return reply.send({ cases: casesList, total });
  });
}
