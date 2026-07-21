import type { FastifyInstance } from "fastify";
import { findAndVerifyUser } from "../infrastructure/repository.js";
import { signToken } from "../domain/jwt.js";
import {
  getUserRights,
  getUserById,
  getUserByIdWithProfile,
  updateUserPassword,
  formatUserDisplayName,
  userProfileFullName,
} from "../../../repositories/userRepository.js";
import { getUserProfileImage } from "../../../repositories/userProfileImageRepository.js";
import { resolveStoredImageUrl } from "../../../utils/profileImageUrl.js";
import { isDualLabProfileAccount } from "../../../utils/dualLabProfileAccount.js";
import { getPrincipal } from "../../../auth/principal.js";
import { logger } from "../../../logger.js";
import {
  findValidResetByToken,
  markResetTokenUsed,
  invalidateAllResetTokensForUser,
} from "../../../repositories/passwordResetRepository.js";
import { sendPasswordChangedEmail } from "../../../services/emailService.js";
import { runPasswordResetRequest } from "../application/passwordResetRequest.js";
import {
  LOGIN_EMAIL,
  LOGIN_IP,
  RESET_CONSUME_IP,
  RESET_CONSUME_TOKEN,
  RESET_REQUEST_EMAIL,
  RESET_REQUEST_IP,
  clientIp,
  dualAuthRateLimitPreHandler,
  emailFromBody,
  skipPluginRateLimit,
  tokenFromBody,
} from "../../../http/rateLimitPolicy.js";

interface LoginBody {
  email: string;
  password: string;
}

const loginBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", maxLength: 200 },
    password: { type: "string", minLength: 1, maxLength: 200 },
  },
  additionalProperties: false,
} as const;

const passwordResetRequestSchema = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", format: "email", maxLength: 200 },
  },
  additionalProperties: false,
} as const;

const passwordResetSchema = {
  type: "object",
  required: ["token", "newPassword"],
  properties: {
    token: { type: "string", minLength: 1, maxLength: 500 },
    newPassword: { type: "string", minLength: 6, maxLength: 200 },
  },
  additionalProperties: false,
} as const;

async function authUserWithProfilePhoto<
  T extends {
    id: number;
    username: string;
    fullName: string | null;
    role: string;
    cabinetId: number | null;
    cabinetName?: string | null;
    rights: number[];
  },
>(user: T) {
  const profileImage = await getUserProfileImage(user.id);
  let directProfileImage: string | null = null;
  if (isDualLabProfileAccount({ login: user.username })) {
    directProfileImage = await getUserProfileImage(user.id, "direct");
  }
  return {
    ...user,
    profileImage,
    profileImageUrl: resolveStoredImageUrl(profileImage),
    directProfileImage,
    directProfileImageUrl: resolveStoredImageUrl(directProfileImage),
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>(
    "/api/v1/auth/login",
    {
      // Dual IP+email budgets (custom preHandler). Global @fastify/rate-limit
      // only runs once per request, so chaining two plugin hooks is a no-op.
      config: skipPluginRateLimit,
      preHandler: dualAuthRateLimitPreHandler(
        LOGIN_IP,
        (req) => clientIp(req),
        LOGIN_EMAIL,
        (req) => emailFromBody(req) || clientIp(req)
      ),
      schema: {
        body: loginBodySchema,
        response: {
          200: {
            type: "object",
            properties: {
              token: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  username: { type: "string" },
                  fullName: { type: ["string", "null"] },
                  role: { type: "string" },
                  cabinetId: { type: ["number", "null"] },
                  cabinetName: { type: ["string", "null"] },
                  rights: { type: "array", items: { type: "number" } },
                  profileImage: { type: ["string", "null"] },
                  profileImageUrl: { type: ["string", "null"] },
                  directProfileImage: { type: ["string", "null"] },
                  directProfileImageUrl: { type: ["string", "null"] },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          429: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      logger.info({ email }, "Login attempt");
      const user = await findAndVerifyUser(email, password);
      if (!user) {
        return reply.status(401).send({ error: "Invalid email or password." });
      }
      const token = signToken({
        sub: String(user.id),
        role: user.role,
        cabinetId: user.cabinetId,
        cabinetName: user.cabinetName,
      });
      const rights = await getUserRights(user.id);
      return reply.send({
        token,
        user: await authUserWithProfilePhoto({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          cabinetId: user.cabinetId,
          cabinetName: user.cabinetName,
          rights,
        }),
      });
    }
  );

  /** POST /api/v1/auth/password-reset-request — send reset link if user exists. */
  app.post<{ Body: { email: string } }>(
    "/api/v1/auth/password-reset-request",
    {
      schema: {
        body: passwordResetRequestSchema,
        response: {
          200: {
            type: "object",
            required: ["ok", "found", "message"],
            properties: {
              ok: { type: "boolean" },
              found: { type: "boolean" },
              message: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          500: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              error: { type: "string" },
            },
          },
          503: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
      config: skipPluginRateLimit,
      preHandler: dualAuthRateLimitPreHandler(
        RESET_REQUEST_IP,
        (req) => clientIp(req),
        RESET_REQUEST_EMAIL,
        (req) => emailFromBody(req) || clientIp(req)
      ),
    },
    async (request, reply) => {
      const out = await runPasswordResetRequest(request.body?.email ?? "");
      return reply.status(out.status).send(out.body);
    }
  );

  /** POST /api/v1/auth/password-reset — consume token and set new password. */
  app.post<{ Body: { token: string; newPassword: string } }>(
    "/api/v1/auth/password-reset",
    {
      config: skipPluginRateLimit,
      preHandler: dualAuthRateLimitPreHandler(
        RESET_CONSUME_IP,
        (req) => clientIp(req),
        RESET_CONSUME_TOKEN,
        (req) => tokenFromBody(req)
      ),
      schema: {
        body: passwordResetSchema,
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
          429: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const token = String(request.body?.token ?? "").trim();
      const newPassword = String(request.body?.newPassword ?? "");
      if (!token || !newPassword) {
        return reply.status(400).send({ error: "Invalid token or password." });
      }
      try {
        const resetRow = await findValidResetByToken(token);
        if (!resetRow) {
          return reply
            .status(400)
            .send({ error: "This reset link is invalid or has expired." });
        }
        const user = await getUserById(resetRow.user_id);
        if (!user) {
          await markResetTokenUsed(resetRow.id);
          return reply
            .status(400)
            .send({ error: "This reset link is invalid or has expired." });
        }

        await invalidateAllResetTokensForUser(user.id);
        await updateUserPassword(user.id, newPassword);
        await sendPasswordChangedEmail(user.login, formatUserDisplayName(user));

        return reply.send({ ok: true });
      } catch (err) {
        logger.error({ err }, "Password reset failed");
        return reply
          .status(400)
          .send({ error: "This reset link is invalid or has expired." });
      }
    }
  );

  /** GET /api/v1/auth/me — current user with rights (authenticated). */
  app.get(
    "/api/v1/auth/me",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  username: { type: "string" },
                  fullName: { type: ["string", "null"] },
                  role: { type: "string" },
                  cabinetId: { type: ["number", "null"] },
                  cabinetName: { type: ["string", "null"] },
                  rights: { type: "array", items: { type: "number" } },
                  profileImage: { type: ["string", "null"] },
                  profileImageUrl: { type: ["string", "null"] },
                  directProfileImage: { type: ["string", "null"] },
                  directProfileImageUrl: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const principal = getPrincipal(request);
      if (!principal) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const userRow = await getUserById(principal.userId);
      if (!userRow) {
        return reply.status(404).send({ error: "User not found" });
      }
      const rights = await getUserRights(principal.userId);
      const profileRow = await getUserByIdWithProfile(principal.userId);
      const cabinetNom = String(profileRow?.user_cabinet_nom ?? "").trim();
      /** Chat-visible name — same as mobile app and My Profile display name field. */
      const fullName = cabinetNom || userProfileFullName(userRow) || null;
      return reply.send({
        user: await authUserWithProfilePhoto({
          id: userRow.id,
          username: userRow.login,
          fullName,
          role: userRow.isCompany ? "company" : "doctor",
          cabinetId: principal.cabinetId,
          cabinetName: principal.cabinetName ?? null,
          rights,
        }),
      });
    }
  );
}
