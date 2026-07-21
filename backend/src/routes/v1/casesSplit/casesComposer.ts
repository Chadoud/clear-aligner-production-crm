import type { FastifyInstance } from "fastify";
import { registerCasesCrudRoutes } from "./crudRoutes.js";
import { registerCasesDocsRoutes } from "./docsRoutes.js";
import { registerCasesDetailRoutes } from "./caseDetailRoutes.js";
import { registerCasesSuiviRoutes } from "./suiviRoutes.js";

/**
 * All /api/v1/cases* routes. Registration order preserves behaviour (e.g. /next-ref before /:id).
 */
export async function casesRoutes(app: FastifyInstance): Promise<void> {
  await registerCasesCrudRoutes(app);
  await registerCasesDocsRoutes(app);
  await registerCasesDetailRoutes(app);
  await registerCasesSuiviRoutes(app);
}
