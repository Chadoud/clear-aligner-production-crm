/**
 * List, create, get-by-id, update user — `/api/v1/users` (static paths before `:id`).
 */
import type { FastifyInstance } from "fastify";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listSidebarRights,
} from "../../../repositories/userRepository.js";
import { requirePrincipal, enforceCompany } from "../../../auth/principal.js";
import {
  SIDEBAR_RIGHT_NAMES,
  userHasAnySidebarName,
  userHasChildRightUnderParentName,
} from "../../../security/delegatedSidebarAccess.js";

const querySchema = {
  type: "object",
  properties: {
    status: { type: "integer", enum: [1, 2, -1], default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 500, default: 50 },
    offset: { type: "integer", minimum: 0, default: 0 },
    q: { type: "string" },
    cabinet_id: { type: "integer" },
    sort_by: {
      type: "string",
      enum: ["id", "login", "name", "enteringDate", "status"],
    },
    sort_order: { type: "string", enum: ["asc", "desc"] },
  },
};

export function registerUsersCrudRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      status?: number;
      limit?: number;
      offset?: number;
      q?: string;
      cabinet_id?: number;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    };
  }>(
    "/api/v1/users",
    { schema: { querystring: querySchema } },
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      const {
        status = 1,
        limit = 50,
        offset = 0,
        q,
        cabinet_id,
        sort_by,
        sort_order,
      } = request.query;
      const requestedCabinetId =
        cabinet_id != null && Number.isFinite(Number(cabinet_id))
          ? Number(cabinet_id)
          : undefined;

      if (principal.role === "doctor") {
        const fullList = await userHasAnySidebarName(
          principal.userId,
          SIDEBAR_RIGHT_NAMES.LIST_USERS
        );
        if (fullList) {
          const result = await listUsers({
            status,
            limit,
            offset,
            q,
            cabinet_id: requestedCabinetId,
            sortBy: sort_by,
            sortOrder: sort_order,
          });
          return reply.send(result);
        }
        const cid = principal.cabinetId;
        if (cid == null) {
          return reply.send({ users: [], total: 0 });
        }
        const result = await listUsers({
          status,
          limit,
          offset,
          q,
          cabinet_id: cid,
          sortBy: sort_by,
          sortOrder: sort_order,
        });
        return reply.send(result);
      }

      if (!enforceCompany(principal, reply)) return;
      const result = await listUsers({
        status,
        limit,
        offset,
        q,
        cabinet_id: requestedCabinetId,
        sortBy: sort_by,
        sortOrder: sort_order,
      });
      return reply.send(result);
    }
  );

  app.get("/api/v1/users/rights/list", async (request, reply) => {
    const principal = requirePrincipal(request, reply);
    if (!principal) return;
    try {
      const rights = await listSidebarRights();
      return reply.send({ rights });
    } catch (err) {
      return reply.status(500).send({
        error: "Failed to load rights",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  const createBodySchema = {
    type: "object",
    required: ["email", "password", "firstName", "lastName"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
      firstName: { type: "string" },
      lastName: { type: "string" },
      phone: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      address: { type: ["string", "null"] },
      zip: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      country: { type: ["string", "null"] },
      isCompany: { type: "boolean", default: false },
      cabinetId: { type: ["integer", "null"] },
    },
  };

  app.post<{
    Body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      website?: string | null;
      address?: string | null;
      zip?: string | null;
      city?: string | null;
      country?: string | null;
      isCompany?: boolean;
      cabinetId?: number | null;
    };
  }>(
    "/api/v1/users",
    { schema: { body: createBodySchema } },
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      const body = request.body ?? {};

      if (principal.role === "company") {
        if (!enforceCompany(principal, reply)) return;
      } else if (principal.role === "doctor") {
        const canAdd = await userHasAnySidebarName(
          principal.userId,
          SIDEBAR_RIGHT_NAMES.ADD_USER
        );
        if (!canAdd) {
          return reply.status(403).send({ error: "Forbidden" });
        }
      } else {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const fullList =
        principal.role === "doctor"
          ? await userHasAnySidebarName(
              principal.userId,
              SIDEBAR_RIGHT_NAMES.LIST_USERS
            )
          : true;

      let cabinetId = body.cabinetId ?? null;
      const isCompany =
        principal.role === "doctor" ? false : (body.isCompany ?? false);
      if (principal.role === "doctor") {
        if (!fullList) {
          cabinetId = principal.cabinetId ?? null;
        } else if (cabinetId == null) {
          cabinetId = principal.cabinetId ?? null;
        }
      }

      const user = await createUser({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        website: body.website,
        address: body.address,
        zip: body.zip,
        city: body.city,
        country: body.country,
        isCompany,
        cabinetId,
      });
      if (!user) {
        return reply.status(409).send({
          error: "User already exists",
          details: "A user with this email address already exists.",
        });
      }
      return reply.status(201).send(user);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/users/:id",
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      const id = parseInt(request.params.id, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid id" });
      const user = await getUserById(id);
      if (!user) return reply.status(404).send({ error: "User not found" });

      if (principal.role === "doctor") {
        if (principal.userId === id) {
          return reply.send(user);
        }
        const fullList = await userHasAnySidebarName(
          principal.userId,
          SIDEBAR_RIGHT_NAMES.LIST_USERS
        );
        if (fullList) {
          return reply.send(user);
        }
        const cid = principal.cabinetId;
        if (cid == null || user.cabinetId == null || user.cabinetId !== cid) {
          return reply.status(403).send({ error: "Forbidden" });
        }
        return reply.send(user);
      }

      if (!enforceCompany(principal, reply)) return;
      return reply.send(user);
    }
  );

  const updateBodySchema = {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      phone: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      address: { type: ["string", "null"] },
      zip: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      country: { type: ["string", "null"] },
      cabinetId: { type: ["integer", "null"] },
      isCompany: { type: "boolean" },
    },
  };

  app.put<{
    Params: { id: string };
    Body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      website?: string | null;
      address?: string | null;
      zip?: string | null;
      city?: string | null;
      country?: string | null;
      cabinetId?: number | null;
      isCompany?: boolean;
    };
  }>(
    "/api/v1/users/:id",
    { schema: { body: updateBodySchema } },
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      const id = parseInt(request.params.id, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid id" });
      const existing = await getUserById(id);
      if (!existing) return reply.status(404).send({ error: "User not found" });
      const body = request.body ?? {};

      if (principal.role === "company") {
        if (!enforceCompany(principal, reply)) return;
      } else if (principal.role === "doctor") {
        const canEdit = await userHasChildRightUnderParentName(
          principal.userId,
          "users",
          ["edit"]
        );
        if (!canEdit) {
          return reply.status(403).send({ error: "Forbidden" });
        }
        if (existing.isCompany) {
          return reply.status(403).send({ error: "Forbidden" });
        }
        const fullList = await userHasAnySidebarName(
          principal.userId,
          SIDEBAR_RIGHT_NAMES.LIST_USERS
        );
        if (!fullList) {
          if (existing.cabinetId !== principal.cabinetId) {
            return reply.status(403).send({ error: "Forbidden" });
          }
        }
      } else {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const updated = await updateUser(id, {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        website: body.website,
        address: body.address,
        zip: body.zip,
        city: body.city,
        country: body.country,
        cabinetId: body.cabinetId,
        isCompany: principal.role === "doctor" ? undefined : body.isCompany,
      });
      return reply.send(updated);
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/users/:id",
    async (request, reply) => {
      const principal = requirePrincipal(request, reply);
      if (!principal) return;
      if (!enforceCompany(principal, reply)) return;

      const id = parseInt(request.params.id, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid id" });

      if (principal.userId === id) {
        return reply
          .status(403)
          .send({ error: "You cannot delete your own account" });
      }

      const existing = await getUserById(id);
      if (!existing) return reply.status(404).send({ error: "User not found" });

      if (existing.isCompany) {
        return reply.status(403).send({
          error: "Cannot delete company or lab accounts",
        });
      }

      const deleted = await deleteUser(id);
      if (!deleted) return reply.status(404).send({ error: "User not found" });

      return reply.status(204).send();
    }
  );
}
