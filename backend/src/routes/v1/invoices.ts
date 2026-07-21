import type { FastifyInstance } from "fastify";
import * as invoiceRepo from "../../repositories/invoiceRepository.js";
import { requirePrincipal, enforceCompany } from "../../auth/principal.js";
import {
  SIDEBAR_RIGHT_NAMES,
  userHasAnySidebarName,
} from "../../security/delegatedSidebarAccess.js";
import { getCabinetById } from "../../repositories/cabinetRepository.js";
import {
  scheduleTransactionalEmail,
  sendDoctorBillingGeneratedEmail,
  sendDoctorBillingPaidEmail,
  type DoctorBillingEmailRow,
} from "../../services/emailService.js";
import { getBrand } from "../../utils/brand.js";
import {
  parseOptionalInt,
  requireNonEmptyParam,
  requireObjectBody,
} from "./utils/requestParsers.js";
import { logMutation } from "../../shared/utils/mutationLogger.js";

function parseDoctorBillingNotifyBody(body: Record<string, unknown>): {
  cabinetId: number;
  billMonthLabel: string;
  lineItems: DoctorBillingEmailRow[];
  pdfBuffer: Buffer | null;
} | null {
  const cabinetId = Number(body.cabinet_id);
  const billMonthLabel = String(
    body.bill_month_label ?? body.billMonthLabel ?? ""
  ).trim();
  const rawItems = body.line_items ?? body.lineItems;
  if (!Number.isFinite(cabinetId) || !billMonthLabel) return null;
  if (!Array.isArray(rawItems) || rawItems.length === 0) return null;

  const lineItems: DoctorBillingEmailRow[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const o = raw as Record<string, unknown>;
    const patientName = String(o.patientName ?? o.patient_name ?? "").trim();
    if (!patientName) continue;
    const amtRaw = o.amount ?? o.Amount;
    const amount = amtRaw == null || amtRaw === "" ? null : Number(amtRaw);
    lineItems.push({
      patientName,
      caseRef: String(o.caseRef ?? o.case_ref ?? "").trim() || undefined,
      invoiceRef:
        String(o.invoiceRef ?? o.invoice_ref ?? "").trim() || undefined,
      invoiceDate:
        String(o.invoiceDate ?? o.invoice_date ?? "").trim() || undefined,
      amount: Number.isFinite(amount as number) ? (amount as number) : null,
    });
  }
  if (lineItems.length === 0) return null;

  const b64raw = body.pdf_base64 ?? body.pdfBase64;
  let pdfBuffer: Buffer | null = null;
  if (typeof b64raw === "string" && b64raw.length > 0) {
    try {
      const buf = Buffer.from(b64raw, "base64");
      const magic = buf.subarray(0, 5).toString("ascii");
      if (buf.length > 20 && magic === "%PDF-") pdfBuffer = buf;
    } catch {
      pdfBuffer = null;
    }
  }

  return { cabinetId, billMonthLabel, lineItems, pdfBuffer };
}

export async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  /** GET /api/v1/invoices — list invoices (company: all, doctor: own cabinet). Use case_id for patient-scoped fetch. */
  app.get<{
    Querystring: {
      cabinet_id?: string;
      case_id?: string;
      limit?: string;
      offset?: string;
    };
  }>("/api/v1/invoices", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const cabinetId = parseOptionalInt(req.query.cabinet_id);
    const caseId = parseOptionalInt(req.query.case_id);
    const limit = parseOptionalInt(req.query.limit);
    const offset = parseOptionalInt(req.query.offset);
    const billingFull =
      principal.role === "doctor"
        ? await userHasAnySidebarName(
            principal.userId,
            SIDEBAR_RIGHT_NAMES.DOCTORS_BILLING
          )
        : false;
    const invoices = await invoiceRepo.listInvoices(principal, {
      cabinet_id: Number.isFinite(cabinetId) ? cabinetId : undefined,
      case_id: Number.isFinite(caseId) ? caseId : undefined,
      limit,
      offset,
      companyEquivalentScope: billingFull,
    });
    return reply.send({ invoices });
  });

  /** POST /api/v1/invoices — create invoice */
  app.post<{ Body: Record<string, unknown> }>(
    "/api/v1/invoices",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const body = requireObjectBody(req.body, reply);
      if (!body) return;
      await invoiceRepo.initInvoiceStorage();
      const invoice = await invoiceRepo.createInvoice(
        principal,
        body as Record<string, unknown>
      );
      logMutation({
        correlationId: req.id,
        action: "create",
        resource: "invoice",
        resourceId: (invoice as { id?: unknown })?.id as number | undefined,
        userId: principal.userId,
        cabinetId: principal.cabinetId ?? null,
      });
      return reply.status(201).send(invoice);
    }
  );

  /**
   * POST /api/v1/invoices/doctor-billing-notify — company only. One email to the doctor after a doctor bill PDF is generated (HTML table + PDF attachment).
   */
  app.post<{
    Body: Record<string, unknown>;
  }>(
    "/api/v1/invoices/doctor-billing-notify",
    { bodyLimit: 30 * 1024 * 1024 },
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      if (!enforceCompany(principal, reply)) return;

      const raw = req.body;
      const body =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      const parsed = parseDoctorBillingNotifyBody(body);
      if (!parsed) {
        return reply.status(400).send({
          error:
            "cabinet_id, bill_month_label, and non-empty line_items[] (each with patientName) are required; pdf_base64 optional (PDF)",
        });
      }

      const { cabinetId, billMonthLabel, lineItems, pdfBuffer } = parsed;

      const cab = await getCabinetById(cabinetId);
      const doctorEmail = cab?.email?.trim() ?? "";
      if (!doctorEmail) {
        return reply
          .status(400)
          .send({ error: "Cabinet has no email configured" });
      }

      const cabinetName = cab?.name?.trim() ?? "";
      const brand = getBrand(cabinetId);
      scheduleTransactionalEmail("doctor_billing_generated", undefined, () =>
        sendDoctorBillingGeneratedEmail({
          doctorEmail,
          cabinetName,
          billMonthLabel,
          lineItems,
          pdfBuffer,
          brand,
        })
      );

      return reply.send({ ok: true });
    }
  );

  /**
   * POST /api/v1/invoices/doctor-billing-paid-notify — company only.
   * One email to the doctor when a billed doctor group is marked as paid.
   */
  app.post<{
    Body: Record<string, unknown>;
  }>("/api/v1/invoices/doctor-billing-paid-notify", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    if (!enforceCompany(principal, reply)) return;

    const raw = req.body;
    const body =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const parsed = parseDoctorBillingNotifyBody(body);
    if (!parsed) {
      return reply.status(400).send({
        error:
          "cabinet_id, bill_month_label, and non-empty line_items[] (each with patientName) are required",
      });
    }

    const { cabinetId, billMonthLabel, lineItems } = parsed;
    const cab = await getCabinetById(cabinetId);
    const doctorEmail = cab?.email?.trim() ?? "";
    if (!doctorEmail) {
      return reply
        .status(400)
        .send({ error: "Cabinet has no email configured" });
    }

    const cabinetName = cab?.name?.trim() ?? "";
    const brand = getBrand(cabinetId);
    scheduleTransactionalEmail("doctor_billing_paid", undefined, () =>
      sendDoctorBillingPaidEmail({
        doctorEmail,
        cabinetName,
        billMonthLabel,
        lineItems,
        brand,
      })
    );

    return reply.send({ ok: true });
  });

  /** PUT /api/v1/invoices/:id — update invoice */
  app.put<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>("/api/v1/invoices/:id", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const id = requireNonEmptyParam(req.params.id, "id", reply);
    if (!id) return;
    const body = requireObjectBody(req.body, reply);
    if (!body) return;
    const updated = await invoiceRepo.updateInvoice(principal, id, body);
    if (!updated) {
      return reply.status(404).send({ error: "Invoice not found" });
    }
    logMutation({
      correlationId: req.id,
      action: "update",
      resource: "invoice",
      resourceId: id,
      userId: principal.userId,
      cabinetId: principal.cabinetId ?? null,
    });
    return reply.send(updated);
  });

  /** DELETE /api/v1/invoices/:id — delete invoice */
  app.delete<{ Params: { id: string } }>(
    "/api/v1/invoices/:id",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const id = requireNonEmptyParam(req.params.id, "id", reply);
      if (!id) return;
      const deleted = await invoiceRepo.deleteInvoice(principal, id);
      if (!deleted) {
        return reply.status(404).send({ error: "Invoice not found" });
      }
      logMutation({
        correlationId: req.id,
        action: "delete",
        resource: "invoice",
        resourceId: id,
        userId: principal.userId,
        cabinetId: principal.cabinetId ?? null,
      });
      return reply.status(204).send();
    }
  );
}
