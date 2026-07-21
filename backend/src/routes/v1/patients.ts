import type { FastifyInstance } from "fastify";
import * as patientRepo from "../../repositories/patientRepository.js";
import * as cabinetRepo from "../../repositories/cabinetRepository.js";
import * as eventsRepo from "../../repositories/eventsRepository.js";
import { requirePrincipal } from "../../auth/principal.js";
import {
  sendCasePausedEmail,
  sendCaseSansSuiteEmail,
  sendCaseDeliveredCompanyEmail,
  scheduleTransactionalEmail,
} from "../../services/emailService.js";
import {
  scopeCabinet,
  doctorCabinetId,
} from "../../security/policies/index.js";
import { getBrand } from "../../utils/brand.js";
import {
  mapPatientPatchApiBodyToSql,
  type PatchPatientApiBody,
} from "./utils/patientPatchBodyMapper.js";
import type { PatchPatientSqlInput } from "../../repositories/patientRepository.js";
import { patchPatientBodySchema } from "./schemas/patientPatchSchema.js";

export async function patientsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      cabinet_id?: string;
      doctor_only?: string;
      q?: string;
      skip_count?: string;
    };
  }>("/api/v1/patients", async (req, reply) => {
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
    const doctor_only =
      req.query.doctor_only === "true" || req.query.doctor_only === "1";
    const skip_count =
      req.query.skip_count === "true" || req.query.skip_count === "1";
    const q = req.query.q ?? undefined;

    const scopedCabinetId = scopeCabinet(principal, cabinet_id);
    const { patients, total } = await patientRepo.listPatients({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
      cabinet_id: Number.isFinite(scopedCabinetId)
        ? scopedCabinetId
        : undefined,
      doctor_only: doctor_only || undefined,
      skip_count,
      q,
    });

    return reply.send({ patients, total });
  });

  /** GET /api/v1/patients/by-case-id/:caseId — lookup by case_id (for /case-management/id/:caseId) */
  app.get<{
    Params: { caseId: string };
    Querystring: { cabinet_id?: string };
  }>("/api/v1/patients/by-case-id/:caseId", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const caseId = parseInt(req.params.caseId, 10);
    if (!Number.isFinite(caseId)) {
      return reply.status(400).send({ error: "Invalid caseId" });
    }
    const cabinet_id =
      req.query.cabinet_id != null
        ? parseInt(req.query.cabinet_id, 10)
        : undefined;
    const scopedCabinetId = scopeCabinet(principal, cabinet_id);
    const patient = await patientRepo.getPatientByCaseId(
      caseId,
      Number.isFinite(scopedCabinetId) ? scopedCabinetId : undefined
    );
    if (!patient) {
      return reply.status(404).send({ error: "Patient not found" });
    }
    return reply.send({ patient });
  });

  app.get<{
    Params: { ref: string };
    Querystring: { cabinet_id?: string };
  }>("/api/v1/patients/:ref", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const { ref } = req.params;
    if (!ref?.trim()) {
      return reply.status(400).send({ error: "ref is required" });
    }
    const cabinet_id =
      req.query.cabinet_id != null
        ? parseInt(req.query.cabinet_id, 10)
        : undefined;
    const scopedCabinetId = scopeCabinet(principal, cabinet_id);
    const patient = await patientRepo.getPatientByRef(
      ref.trim(),
      Number.isFinite(scopedCabinetId) ? scopedCabinetId : undefined
    );
    if (!patient) {
      return reply.status(404).send({ error: "Patient not found" });
    }
    return reply.send({ patient });
  });

  app.patch<{
    Params: { ref: string };
    Body: PatchPatientApiBody & { skip_status_email?: boolean };
  }>(
    "/api/v1/patients/:ref",
    { schema: { body: patchPatientBodySchema } },
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const { ref } = req.params;
      if (!ref?.trim()) {
        return reply.status(400).send({ error: "ref is required" });
      }
      const body = (req.body ?? {}) as PatchPatientApiBody & {
        skip_status_email?: boolean;
      };
      const skipStatusEmail = body.skip_status_email === true;

      let merged: PatchPatientSqlInput;
      try {
        const mapped = mapPatientPatchApiBodyToSql(body);
        if (mapped == null) {
          return reply.status(400).send({ error: "No valid fields to update" });
        }
        merged = mapped;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 400) {
          return reply
            .status(400)
            .send({ error: (e as Error).message ?? "Bad request" });
        }
        throw e;
      }

      const existing = await patientRepo.getPatientByRef(
        ref.trim(),
        scopeCabinet(principal)
      );
      if (!existing) {
        return reply.status(404).send({ error: "Patient not found" });
      }

      if (
        existing.cabinet_id != null &&
        getBrand(existing.cabinet_id) === "Direct" &&
        Object.prototype.hasOwnProperty.call(
          merged,
          "aligner_monitoring_months"
        )
      ) {
        delete merged.aligner_monitoring_months;
        if (Object.keys(merged).length === 0) {
          return reply.status(400).send({ error: "No valid fields to update" });
        }
      }

      const prevStatus = existing.case_status ?? null;
      const updated = await patientRepo.patchPatient(ref, merged);
      if (!updated) {
        return reply.status(500).send({ error: "Patient update failed" });
      }
      if (
        !skipStatusEmail &&
        merged.case_status != null &&
        prevStatus !== merged.case_status
      ) {
        const newStatus = merged.case_status;
        if (newStatus === 6 || newStatus === 7 || newStatus === 8) {
          const cab =
            existing.cabinet_id != null
              ? await cabinetRepo.getCabinetById(existing.cabinet_id)
              : null;
          const doctorEmail = cab?.email?.trim() ?? "";
          const cabinetName = cab?.name ?? existing.cabinet ?? "";
          const patientDisplayName = existing.name;
          const caseId = existing.case_id;
          const brand =
            existing.cabinet_id != null ? getBrand(existing.cabinet_id) : "Lab";
          if (newStatus === 6) {
            scheduleTransactionalEmail("case_paused", caseId, () =>
              sendCasePausedEmail({
                doctorEmail,
                cabinetName,
                patientDisplayName,
                caseId,
                brand,
              })
            );
          } else if (newStatus === 8) {
            scheduleTransactionalEmail("case_sans_suite", caseId, () =>
              sendCaseSansSuiteEmail({
                doctorEmail,
                cabinetName,
                patientDisplayName,
                caseId,
                brand,
              })
            );
          } else if (newStatus === 7) {
            scheduleTransactionalEmail("case_delivered_company", caseId, () =>
              sendCaseDeliveredCompanyEmail({
                cabinetName,
                patientDisplayName,
                caseId,
              })
            );
          }
        }
      }
      const fresh = await patientRepo.getPatientByRef(
        ref.trim(),
        scopeCabinet(principal)
      );
      return reply.send({ ok: true, updated: true, patient: fresh });
    }
  );

  /** POST /api/v1/patients/:ref/accept — Accept price proposal, set delivery date, create Open boxes event */
  app.post<{
    Params: { ref: string };
    Body: { desiredDeliveryDate?: string };
  }>("/api/v1/patients/:ref/accept", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const { ref } = req.params;
    if (!ref?.trim()) {
      return reply.status(400).send({ error: "ref is required" });
    }
    const desiredDeliveryDate = req.body?.desiredDeliveryDate;
    if (!desiredDeliveryDate || typeof desiredDeliveryDate !== "string") {
      return reply.status(400).send({
        error: "desiredDeliveryDate is required (YYYY-MM-DD)",
      });
    }
    const cabinetId = scopeCabinet(principal);
    const patient = await patientRepo.acceptPatient(
      ref.trim(),
      desiredDeliveryDate,
      principal.userId,
      cabinetId ?? undefined,
      principal.role
    );
    if (!patient) {
      return reply.status(404).send({ error: "Patient not found" });
    }
    return reply.send({ ok: true, patient });
  });

  /** GET /api/v1/events/delivery — Open boxes: upcoming delivery events for Dr patients */
  app.get<{
    Querystring: { cabinet_id?: string };
  }>("/api/v1/events/delivery", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const cabinet_id =
      req.query.cabinet_id != null
        ? parseInt(req.query.cabinet_id, 10)
        : undefined;
    const cabinetId =
      principal.role === "doctor"
        ? doctorCabinetId(principal)
        : Number.isFinite(cabinet_id)
          ? cabinet_id
          : undefined;
    const events = await eventsRepo.listDeliveryEvents(cabinetId ?? undefined);
    return reply.send({ events });
  });
}
