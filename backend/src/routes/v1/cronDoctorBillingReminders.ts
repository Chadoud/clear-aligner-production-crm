/**
 * POST /api/v1/cron/doctor-billing-reminders — run unpaid doctor-bill reminder emails (scheduled job).
 * Auth: header X-Cron-Secret must match CRON_SECRET (path is unprotected so JWT is not required).
 */
import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { runDoctorBillingReminders } from "../../services/doctorBillingReminderService.js";

function readCronSecretHeader(
  headers: Record<string, unknown>
): string | undefined {
  const raw = headers["x-cron-secret"];
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0].trim();
  return undefined;
}

export async function cronDoctorBillingRemindersRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post("/api/v1/cron/doctor-billing-reminders", async (request, reply) => {
    const expected = config.cronSecret;
    if (!expected) {
      return reply
        .status(503)
        .send({ error: "Cron not configured (CRON_SECRET missing)" });
    }
    const got = readCronSecretHeader(
      request.headers as Record<string, unknown>
    );
    if (!got || got !== expected) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const result = await runDoctorBillingReminders();
    return reply.send(result);
  });
}
