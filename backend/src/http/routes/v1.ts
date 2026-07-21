import type { FastifyInstance } from "fastify";
import { authRoutes } from "../../modules/auth/http/routes.js";
import { patientsRoutes } from "../../routes/v1/patients.js";
import { cabinetsRoutes } from "../../routes/v1/cabinets.js";
import { casesRoutes } from "../../routes/v1/cases.js";
import { chatRoutes } from "../../routes/v1/chat.js";
import { replyRoutes } from "../../routes/v1/replies.js";
import { userRoutes } from "../../routes/v1/users.js";
import { caseSheetsRoutes } from "../../modules/case-sheets/http/routes.js";
import { invoicesRoutes } from "../../routes/v1/invoices.js";
import { profileOverridesRoutes } from "../../routes/v1/profileOverrides.js";
import { profileMediaRoutes } from "../../routes/v1/profileMedia.js";
import { servicesOverridesRoutes } from "../../routes/v1/servicesOverrides.js";
import { doctorInvoiceSequenceRoutes } from "../../routes/v1/doctorInvoiceSequence.js";
import { treatmentPlanRoutes } from "../../routes/v1/treatmentPlan.js";
import { userNotesRoutes } from "../../routes/v1/userNotes.js";
import { cronDoctorBillingRemindersRoutes } from "../../routes/v1/cronDoctorBillingReminders.js";
import { realtimeRoutes } from "../../routes/v1/realtime.js";
import { internalRoutes } from "../../routes/v1/internal.js";
import { skipPluginRateLimit } from "../rateLimitPolicy.js";

export async function registerV1Routes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/status", { config: skipPluginRateLimit }, async () => ({
    ok: true,
    version: "v1",
  }));
  await app.register(authRoutes);
  await app.register(patientsRoutes);
  await app.register(cabinetsRoutes);
  await app.register(casesRoutes);
  await app.register(chatRoutes);
  await app.register(replyRoutes);
  await app.register(userRoutes);
  await app.register(caseSheetsRoutes);
  await app.register(treatmentPlanRoutes);
  await app.register(userNotesRoutes);
  await app.register(invoicesRoutes);
  await app.register(profileOverridesRoutes);
  await app.register(profileMediaRoutes);
  await app.register(servicesOverridesRoutes);
  await app.register(doctorInvoiceSequenceRoutes);
  await app.register(cronDoctorBillingRemindersRoutes);
  await app.register(realtimeRoutes);
  await app.register(internalRoutes);
}
