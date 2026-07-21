import { config } from "../../../config.js";
import { logger } from "../../../logger.js";
import {
  formatUserDisplayName,
  getUserByEmail,
} from "../../../repositories/userRepository.js";
import { createPasswordResetToken } from "../../../repositories/passwordResetRepository.js";
import {
  getTransport,
  sendPasswordResetEmail,
} from "../../../services/emailService.js";

export type PasswordResetRequestResult =
  | { status: 200; body: { ok: true; found: boolean; message: string } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { ok: false; error: string } }
  | { status: 503; body: { ok: false; error: string } };

/**
 * Orchestrates "forgot password": lookup user, optional token + email, uniform HTTP outcomes.
 */
export async function runPasswordResetRequest(
  rawEmail: string
): Promise<PasswordResetRequestResult> {
  const email = String(rawEmail ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { status: 400, body: { error: "Email is required." } };
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return {
        status: 200,
        body: {
          ok: true,
          found: false,
          message: "No account is registered with this email address.",
        },
      };
    }

    if (!getTransport()) {
      logger.warn(
        { email },
        "Password reset: SMTP not configured (SMTP_PASSWORD missing on backend)"
      );
      return {
        status: 503,
        body: {
          ok: false,
          error:
            "We could not send email: the server mail settings are not configured. Ask an administrator to set SMTP_* in the backend environment.",
        },
      };
    }

    const token = await createPasswordResetToken(
      user.id,
      config.passwordResetTokenTtlMinutes
    );
    const base = config.appBaseUrl.replace(/\/$/, "");
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;

    const sent = await sendPasswordResetEmail(
      user.login,
      formatUserDisplayName(user),
      resetUrl
    );

    if (!sent) {
      logger.error({ email }, "Password reset: SMTP sendMail failed");
      return {
        status: 503,
        body: {
          ok: false,
          error:
            "We could not send the reset email. Please try again later or contact support.",
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        found: true,
        message: "A password reset link has been sent to your email address.",
      },
    };
  } catch (err) {
    logger.error({ err, email }, "Password reset request failed");
    return {
      status: 500,
      body: {
        ok: false,
        error: "Unable to process your request. Please try again later.",
      },
    };
  }
}
