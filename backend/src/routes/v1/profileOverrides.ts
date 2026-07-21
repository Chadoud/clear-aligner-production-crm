import type { FastifyInstance } from "fastify";
import * as userRepo from "../../repositories/userRepository.js";
import { getUserProfileImage } from "../../repositories/userProfileImageRepository.js";
import { requirePrincipal } from "../../auth/principal.js";
import { readUploadedImage } from "../../utils/readUploadedImage.js";
import { resolveStoredImageUrl } from "../../utils/profileImageUrl.js";
import {
  clearUserProfilePhoto,
  persistUserProfilePhoto,
  parseProfileContext,
} from "../../services/profilePhotoService.js";
import { syncMobUsersDoctorIdentity } from "../../repositories/mobUsersProfileImageRepository.js";
import { isDualLabProfileAccount } from "../../utils/dualLabProfileAccount.js";
import { mysqlDate, ns } from "../../db/mysql.js";
import type { MysqlRow } from "../../repositories/userRepositoryMappers.js";

type ProfileOverrides = Record<string, string>;

function formatBirthDateForApi(raw: unknown): string {
  const d = mysqlDate(raw);
  if (!d) return "";
  const y = d.getFullYear();
  if (y < 1900 || y > 2100) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTitleForApi(raw: unknown): string {
  const n = Number(raw);
  if (n === 2) return "2";
  if (n === 1) return "1";
  return "1";
}

/** Legacy ERP account details shared by doctor and company My Profile. */
function personalAccountFields(row: MysqlRow): ProfileOverrides {
  return {
    title: formatTitleForApi(row.user_gender),
    birth_date: formatBirthDateForApi(row.user_birthdate),
    function: ns(row.user_fonction) ?? "",
    phone: ns(row.user_phone) ?? "",
    website: ns(row.user_website) ?? "",
  };
}

function personalAccountUpdateFromOverrides(
  overrides: Record<string, string>
): {
  title?: string;
  birthDate?: string | null;
  function?: string | null;
  phone?: string | null;
  website?: string | null;
} {
  const out: {
    title?: string;
    birthDate?: string | null;
    function?: string | null;
    phone?: string | null;
    website?: string | null;
  } = {};
  if (overrides.title !== undefined) {
    out.title = String(overrides.title ?? "").trim() || "1";
  }
  if (overrides.birth_date !== undefined) {
    const raw = String(overrides.birth_date ?? "").trim();
    out.birthDate = raw || null;
  }
  if (overrides.function !== undefined) {
    out.function = String(overrides.function ?? "").trim() || null;
  }
  if (overrides.phone !== undefined) {
    out.phone = String(overrides.phone ?? "").trim() || null;
  }
  if (overrides.website !== undefined) {
    out.website = String(overrides.website ?? "").trim() || null;
  }
  return out;
}

/** Chat/header display name from CRM My Profile first + last name fields. */
function doctorProfileDisplayName(
  name: string,
  legalName: string
): string | null {
  const combined = [name, legalName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  return combined || null;
}

/** Doctor My Profile — personal identity (`users`), not practice (`tbl_cabinet`). */
function doctorUserToProfile(row: MysqlRow): ProfileOverrides {
  const first = (row.user_firstname ?? "").trim();
  const last = (row.user_lastname ?? "").trim();
  return {
    name: first,
    legal_name: last,
    email: (row.user_name ?? "").trim(),
    ...personalAccountFields(row),
    address: "",
    zip: "",
    city: "",
  };
}

function userToProfile(row: MysqlRow): ProfileOverrides {
  const first = (row.user_firstname ?? "").trim();
  const last = (row.user_lastname ?? "").trim();
  /** Chat-visible name — same column as mobile app `lab_profiles.default.name`. */
  const displayName = (row.user_cabinet_nom ?? "").trim();
  const fallbackName = `${first} ${last}`.trim() || (row.user_name ?? "");
  return {
    name: displayName || fallbackName,
    legal_name: last,
    first_name: first,
    last_name: last,
    email: row.user_name ?? "",
    ...personalAccountFields(row),
    address: row.user_cabinet_adresse ?? "",
    zip: row.user_cabinet_adresse_npa ?? "",
    city: row.user_cabinet_adresse_ville ?? "",
  };
}

function userToDirectProfile(row: {
  user_cabinet_nom_direct?: string | null;
  user_cabinet_adresse_direct?: string | null;
  user_cabinet_adresse_npa_direct?: string | null;
  user_cabinet_adresse_ville_direct?: string | null;
}): ProfileOverrides {
  return {
    name: row.user_cabinet_nom_direct ?? "",
    legal_name: row.user_cabinet_nom_direct ?? "",
    address: row.user_cabinet_adresse_direct ?? "",
    zip: row.user_cabinet_adresse_npa_direct ?? "",
    city: row.user_cabinet_adresse_ville_direct ?? "",
  };
}

function profilePhotoPayload(
  stored: string | null,
  context: "default" | "direct" = "default"
) {
  return {
    profileImage: stored,
    profileImageUrl: resolveStoredImageUrl(stored),
    context,
  };
}

export async function profileOverridesRoutes(
  app: FastifyInstance
): Promise<void> {
  /** GET /api/v1/profile-overrides — get current user's profile (from tbl_cabinet or users) */
  app.get("/api/v1/profile-overrides", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;

    if (principal.role === "doctor") {
      const userRow = await userRepo.getUserByIdWithProfile(principal.userId);
      const overrides = userRow ? doctorUserToProfile(userRow) : {};
      const profileImage = await getUserProfileImage(principal.userId);
      return reply.send({
        overrides,
        ...profilePhotoPayload(profileImage),
      });
    }

    const row = await userRepo.getUserByIdWithProfile(principal.userId);
    const overrides = row ? userToProfile(row) : {};
    const profileImage = await getUserProfileImage(principal.userId, "default");
    const dualLabProfile = isDualLabProfileAccount({ login: row?.user_name });
    const directOverrides =
      dualLabProfile && row ? userToDirectProfile(row) : {};
    const directProfileImage = dualLabProfile
      ? await getUserProfileImage(principal.userId, "direct")
      : null;
    return reply.send({
      overrides,
      ...profilePhotoPayload(profileImage, "default"),
      ...(dualLabProfile
        ? {
            direct: {
              overrides: directOverrides,
              ...profilePhotoPayload(directProfileImage, "direct"),
            },
          }
        : {}),
    });
  });

  /** PUT /api/v1/profile-overrides — save profile (to tbl_cabinet or users) */
  app.put<{ Body: Record<string, string> }>(
    "/api/v1/profile-overrides",
    async (req, reply) => {
      const principal = requirePrincipal(req, reply);
      if (!principal) return;
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return reply.status(400).send({ error: "Body must be a JSON object" });
      }
      const overrides = Object.fromEntries(
        Object.entries(body).filter(
          ([, v]) => v !== undefined && typeof v === "string"
        )
      ) as Record<string, string>;

      if (principal.role === "doctor") {
        const nameTrim = String(overrides.name ?? "").trim();
        const legalTrim = String(overrides.legal_name ?? "").trim();
        await userRepo.updateUser(principal.userId, {
          firstName: nameTrim,
          lastName: legalTrim,
          displayName: doctorProfileDisplayName(nameTrim, legalTrim),
          ...personalAccountUpdateFromOverrides(overrides),
        });
        await syncMobUsersDoctorIdentity(
          principal.userId,
          nameTrim || null,
          legalTrim || null
        );
      } else {
        const row = await userRepo.getUserByIdWithProfile(principal.userId);
        const dualLabProfile = isDualLabProfileAccount({
          login: row?.user_name,
        });
        const nameTrim = String(overrides.name ?? "").trim();
        const directNameTrim = String(overrides.direct_name ?? "").trim();
        await userRepo.updateUser(principal.userId, {
          firstName:
            overrides.first_name !== undefined
              ? String(overrides.first_name ?? "").trim()
              : undefined,
          lastName:
            overrides.last_name !== undefined
              ? String(overrides.last_name ?? "").trim()
              : undefined,
          displayName: nameTrim || null,
          address: overrides.address ?? undefined,
          zip: overrides.zip ?? undefined,
          city: overrides.city ?? undefined,
          ...personalAccountUpdateFromOverrides(overrides),
          ...(dualLabProfile
            ? {
                directDisplayName: directNameTrim || null,
                directAddress: overrides.direct_address ?? undefined,
                directZip: overrides.direct_zip ?? undefined,
                directCity: overrides.direct_city ?? undefined,
              }
            : {}),
        });
      }
      return reply.send({ ok: true });
    }
  );

  /** POST /api/v1/profile-overrides/photo — upload user profile photo (?context=default|direct) */
  app.post("/api/v1/profile-overrides/photo", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;

    try {
      const upload = await readUploadedImage(req);
      if (!upload) {
        return reply.status(400).send({ error: "Image file is required" });
      }
      const role = principal.role === "doctor" ? "doctor" : "company";
      const context = parseProfileContext(
        (req.query as { context?: string })?.context
      );
      if (context === "direct") {
        const row = await userRepo.getUserByIdWithProfile(principal.userId);
        if (!isDualLabProfileAccount({ login: row?.user_name })) {
          return reply
            .status(400)
            .send({ error: "Direct profile is only for the lab account" });
        }
      }
      if (context === "direct" && role !== "company") {
        return reply
          .status(400)
          .send({ error: "Direct profile is only for company accounts" });
      }
      const result = await persistUserProfilePhoto(
        principal.userId,
        role,
        upload.buffer,
        upload.filename,
        context
      );
      return reply.send(result);
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 400;
      const message = err instanceof Error ? err.message : "Upload failed";
      return reply.status(statusCode).send({ error: message });
    }
  });

  /** DELETE /api/v1/profile-overrides/photo — remove user profile photo (?context=default|direct) */
  app.delete("/api/v1/profile-overrides/photo", async (req, reply) => {
    const principal = requirePrincipal(req, reply);
    if (!principal) return;

    const role = principal.role === "doctor" ? "doctor" : "company";
    const context = parseProfileContext(
      (req.query as { context?: string })?.context
    );
    if (context === "direct") {
      const row = await userRepo.getUserByIdWithProfile(principal.userId);
      if (!isDualLabProfileAccount({ login: row?.user_name })) {
        return reply
          .status(400)
          .send({ error: "Direct profile is only for the lab account" });
      }
    }
    if (context === "direct" && role !== "company") {
      return reply
        .status(400)
        .send({ error: "Direct profile is only for company accounts" });
    }
    try {
      return reply.send(
        await clearUserProfilePhoto(principal.userId, role, context)
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 400;
      const message = err instanceof Error ? err.message : "Remove failed";
      return reply.status(statusCode).send({ error: message });
    }
  });
}
