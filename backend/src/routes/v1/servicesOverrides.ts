import type { FastifyInstance } from "fastify";
import * as servicesRepo from "../../repositories/servicesRepository.js";
import { requirePrincipal } from "../../auth/principal.js";

export async function servicesOverridesRoutes(
  app: FastifyInstance
): Promise<void> {
  /** GET /api/v1/services-overrides/:brand — get services (each has point_value) */
  app.get<{ Params: { brand: string } }>(
    "/api/v1/services-overrides/:brand",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const { brand } = req.params;
      if (!brand?.trim()) {
        return reply.status(400).send({ error: "brand is required" });
      }
      const data = await servicesRepo.getServicesWithPointValue(brand.trim());
      return reply.send(data);
    }
  );

  /** PUT /api/v1/services-overrides/:brand — save services (with point_value per service) */
  app.put<{
    Params: { brand: string };
    Body: { services?: unknown[] };
  }>("/api/v1/services-overrides/:brand", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const { brand } = req.params;
    if (!brand?.trim()) {
      return reply.status(400).send({ error: "brand is required" });
    }
    const body = req.body ?? {};
    const b = brand.trim();

    if (Array.isArray(body.services) && body.services.length > 0) {
      const services = body.services
        .map((s) => {
          const o =
            s && typeof s === "object" ? (s as Record<string, unknown>) : {};
          return {
            code: String(o.code ?? ""),
            service: o.service != null ? String(o.service) : null,
            vpt: o.vpt != null ? Number(o.vpt) : null,
            points: o.points != null ? Number(o.points) : null,
            point_value: o.point_value != null ? Number(o.point_value) : 1,
          };
        })
        .filter((s) => s.code);
      await servicesRepo.replaceServices(b, services);
    }

    return reply.send({ ok: true });
  });
}
