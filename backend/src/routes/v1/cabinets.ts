import type { FastifyInstance } from "fastify";
import * as cabinetRepo from "../../repositories/cabinetRepository.js";
import { requirePrincipal, enforceCompany } from "../../auth/principal.js";
import { doctorCabinetId } from "../../security/policies/index.js";
import {
  SIDEBAR_RIGHT_NAMES,
  userHasAnySidebarName,
} from "../../security/delegatedSidebarAccess.js";
import { config } from "../../config.js";
import { readUploadedImage } from "../../utils/readUploadedImage.js";
import { saveProfileImageFile } from "../../utils/profileImageStorage.js";
import { resolveStoredImageUrl } from "../../utils/profileImageUrl.js";
import type { Cabinet } from "../../repositories/cabinetRepository.js";

function serializeCabinet(cabinet: Cabinet) {
  return {
    ...cabinet,
    logoUrl: resolveStoredImageUrl(cabinet.logo),
  };
}

async function assertCanEditCabinet(
  principal: NonNullable<ReturnType<typeof requirePrincipal>>,
  id: number,
  reply: import("fastify").FastifyReply
): Promise<boolean> {
  if (principal.role === "company") {
    return enforceCompany(principal, reply);
  }
  if (principal.role === "doctor") {
    const allowedCabinetId = doctorCabinetId(principal);
    if (allowedCabinetId !== id) {
      reply.status(403).send({ error: "Forbidden" });
      return false;
    }
    return true;
  }
  reply.status(403).send({ error: "Forbidden" });
  return false;
}

async function assertDoctorCanReadCabinet(
  principal: NonNullable<ReturnType<typeof requirePrincipal>>,
  id: number,
  reply: import("fastify").FastifyReply
): Promise<boolean> {
  if (principal.role !== "doctor") return true;
  const allowedCabinetId = doctorCabinetId(principal);
  if (allowedCabinetId !== id) {
    reply.status(403).send({ error: "Forbidden" });
    return false;
  }
  return true;
}

export async function cabinetsRoutes(app: FastifyInstance): Promise<void> {
  /** POST /api/v1/cabinets — create a new cabinet */
  app.post<{
    Body: {
      name: string;
      legalName?: string;
      phone?: string;
      email?: string;
      website?: string;
      fax?: string;
      addressNum?: string;
      address?: string;
      zip?: string;
      city?: string;
      country?: string;
    };
  }>("/api/v1/cabinets", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    if (principal.role === "company") {
      if (!enforceCompany(principal, reply)) return;
    } else if (principal.role === "doctor") {
      const canAdd = await userHasAnySidebarName(
        principal.userId,
        SIDEBAR_RIGHT_NAMES.ADD_CABINET
      );
      if (!canAdd) {
        return reply.status(403).send({ error: "Forbidden" });
      }
    } else {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = req.body ?? {};
    const name = String(body.name ?? "").trim();
    if (!name) {
      return reply.status(400).send({ error: "name is required" });
    }
    const existing = await cabinetRepo.getCabinetByName(name);
    if (existing) {
      return reply
        .status(409)
        .send({ error: "A cabinet with this name already exists" });
    }
    const { id, slug } = await cabinetRepo.insertCabinet({
      name,
      legal_name: body.legalName ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      website: body.website ?? null,
      fax: body.fax ?? null,
      address_num: body.addressNum ?? null,
      address: body.address ?? null,
      zip: body.zip ?? null,
      city: body.city ?? null,
      country: body.country ?? null,
    });
    return reply.status(201).send({ cabinet: { id, slug, name } });
  });

  app.get<{
    Querystring: { limit?: string; offset?: string };
  }>("/api/v1/cabinets", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const limit =
      req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset =
      req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;

    if (principal.role === "doctor") {
      const doctorCabinet =
        principal.cabinetId != null
          ? await cabinetRepo.getCabinetById(principal.cabinetId)
          : null;
      return reply.send({
        cabinets: doctorCabinet ? [serializeCabinet(doctorCabinet)] : [],
        total: doctorCabinet ? 1 : 0,
      });
    }

    if (!enforceCompany(principal, reply)) return;
    const { cabinets, total } = await cabinetRepo.listCabinets({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return reply.send({ cabinets: cabinets.map(serializeCabinet), total });
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/cabinets/by-id/:id",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid id" });
      if (principal.role === "doctor") {
        if (!(await assertDoctorCanReadCabinet(principal, id, reply))) return;
      }
      const cabinet = await cabinetRepo.getCabinetById(id);
      if (!cabinet)
        return reply.status(404).send({ error: "Cabinet not found" });
      return reply.send(serializeCabinet(cabinet));
    }
  );

  /** GET /api/v1/cabinets/:slug — by slug (numeric slug = cabinet id) */
  app.get<{ Params: { slug: string } }>(
    "/api/v1/cabinets/:slug",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const slug = req.params.slug?.trim();
      if (!slug) return reply.status(400).send({ error: "Slug is required" });
      const id = parseInt(slug, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid slug" });
      if (principal.role === "doctor") {
        if (!(await assertDoctorCanReadCabinet(principal, id, reply))) return;
      }
      const cabinet = await cabinetRepo.getCabinetById(id);
      if (!cabinet)
        return reply.status(404).send({ error: "Cabinet not found" });
      return reply.send(serializeCabinet(cabinet));
    }
  );

  /** PUT /api/v1/cabinets/:slug — update cabinet (company: any; doctor: own cabinet only) */
  app.put<{
    Params: { slug: string };
    Body: {
      name?: string;
      legalName?: string;
      phone?: string;
      email?: string;
      website?: string;
      fax?: string;
      addressNum?: string;
      address?: string;
      zip?: string;
      city?: string;
      country?: string;
    };
  }>("/api/v1/cabinets/:slug", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;
    const slug = req.params.slug?.trim();
    if (!slug) return reply.status(400).send({ error: "Slug is required" });
    const id = parseInt(slug, 10);
    if (!Number.isFinite(id))
      return reply.status(400).send({ error: "Invalid slug" });
    if (principal.role === "company") {
      if (!enforceCompany(principal, reply)) return;
    } else if (principal.role === "doctor") {
      if (!(await assertCanEditCabinet(principal, id, reply))) return;
    } else {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = req.body ?? {};
    const updated = await cabinetRepo.updateCabinet(id, {
      name: body.name,
      legal_name: body.legalName,
      phone: body.phone,
      email: body.email,
      website: body.website,
      fax: body.fax,
      address_num: body.addressNum,
      address: body.address,
      zip: body.zip,
      city: body.city,
      country: body.country,
    });
    if (!updated) return reply.status(404).send({ error: "Cabinet not found" });
    return reply.send(serializeCabinet(updated));
  });

  /** POST /api/v1/cabinets/:slug/logo — upload cabinet logo (multipart field: logo or cabinet_logo) */
  app.post<{ Params: { slug: string } }>(
    "/api/v1/cabinets/:slug/logo",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const slug = req.params.slug?.trim();
      if (!slug) return reply.status(400).send({ error: "Slug is required" });
      const id = parseInt(slug, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid slug" });
      if (!(await assertCanEditCabinet(principal, id, reply))) return;

      try {
        const upload = await readUploadedImage(req);
        if (!upload) {
          return reply.status(400).send({ error: "Image file is required" });
        }
        const saved = await saveProfileImageFile(
          upload.buffer,
          upload.filename,
          config.profileDir
        );
        const updated = await cabinetRepo.updateCabinetLogo(
          id,
          saved.storedPath
        );
        if (!updated) {
          return reply.status(404).send({ error: "Cabinet not found" });
        }
        return reply.send(serializeCabinet(updated));
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode ?? 400;
        const message = err instanceof Error ? err.message : "Upload failed";
        return reply.status(statusCode).send({ error: message });
      }
    }
  );

  /** DELETE /api/v1/cabinets/:slug/logo — remove cabinet logo */
  app.delete<{ Params: { slug: string } }>(
    "/api/v1/cabinets/:slug/logo",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const slug = req.params.slug?.trim();
      if (!slug) return reply.status(400).send({ error: "Slug is required" });
      const id = parseInt(slug, 10);
      if (!Number.isFinite(id))
        return reply.status(400).send({ error: "Invalid slug" });
      if (!(await assertCanEditCabinet(principal, id, reply))) return;

      const updated = await cabinetRepo.updateCabinetLogo(id, "");
      if (!updated)
        return reply.status(404).send({ error: "Cabinet not found" });
      return reply.send(serializeCabinet(updated));
    }
  );
}
