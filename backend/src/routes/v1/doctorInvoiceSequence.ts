import type { FastifyInstance } from "fastify";
import * as seqRepo from "../../repositories/doctorInvoiceSequenceRepository.js";
import { requirePrincipal } from "../../auth/principal.js";

export async function doctorInvoiceSequenceRoutes(
  app: FastifyInstance
): Promise<void> {
  /** POST /api/v1/doctor-invoice-sequence — get and increment sequence for doctor/date */
  app.post<{
    Body: { doctorName: string; dateStr?: string };
  }>("/api/v1/doctor-invoice-sequence", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const body = req.body ?? {};
    const doctorName = body.doctorName ?? "";
    if (!doctorName || typeof doctorName !== "string") {
      return reply.status(400).send({ error: "doctorName is required" });
    }
    const seq = await seqRepo.getAndIncrementSequence(
      principal,
      doctorName.trim(),
      body.dateStr
    );
    return reply.send({ sequence: seq });
  });

  /** GET /api/v1/doctor-invoice-sequence — peek next sequence (no increment) */
  app.get<{
    Querystring: { doctorName: string; dateStr?: string };
  }>("/api/v1/doctor-invoice-sequence", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const doctorName = req.query?.doctorName ?? "";
    if (!doctorName || typeof doctorName !== "string") {
      return reply.status(400).send({ error: "doctorName is required" });
    }
    const seq = await seqRepo.peekNextSequence(
      principal,
      doctorName.trim(),
      req.query.dateStr
    );
    return reply.send({ sequence: seq });
  });
}
