/**
 * Per-user ACL routes — `/api/v1/users/:id/rights`.
 */
import type { FastifyInstance } from "fastify";
import {
  getUserById,
  getUserRights,
  updateUserRights,
} from "../../../repositories/userRepository.js";
import { requirePrincipal, enforceCompany } from "../../../auth/principal.js";

export function registerUsersRightsRoutes(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>(
    "/api/v1/users/:id/rights",
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      if (!enforceCompany(principal, reply)) return;
      const id = parseInt(request.params.id, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid id" });
      const user = await getUserById(id);
      if (!user) return reply.status(404).send({ error: "User not found" });
      try {
        const rights = await getUserRights(id);
        return reply.send({ rights });
      } catch (err) {
        return reply.status(500).send({
          error: "Failed to load user rights",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }
  );

  const updateRightsBodySchema = {
    type: "object",
    required: ["rights"],
    properties: {
      rights: {
        type: "array",
        items: { type: "integer" },
      },
    },
  };

  app.put<{
    Params: { id: string };
    Body: { rights: number[] };
  }>(
    "/api/v1/users/:id/rights",
    { schema: { body: updateRightsBodySchema } },
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      if (!enforceCompany(principal, reply)) return;
      const id = parseInt(request.params.id, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid id" });
      const user = await getUserById(id);
      if (!user) return reply.status(404).send({ error: "User not found" });
      const { rights } = request.body ?? { rights: [] };
      try {
        await updateUserRights(id, Array.isArray(rights) ? rights : []);
        const updated = await getUserRights(id);
        return reply.send({ rights: updated });
      } catch (err) {
        return reply.status(500).send({
          error: "Failed to update user rights",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }
  );
}
