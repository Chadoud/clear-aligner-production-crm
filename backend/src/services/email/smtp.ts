/**
 * Shared SMTP transport and HTML mail helper — single place for env, logging, and validation.
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer/index.js";
import { logger } from "../../logger.js";

export const SMTP_HOST = process.env.SMTP_HOST?.trim() || "smtp.example.com";
export const SMTP_PORT = parseInt(process.env.SMTP_PORT?.trim() || "587", 10);
export const SMTP_USER = process.env.SMTP_USER?.trim() || "noreply@example.com";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD?.trim();

/** From address — set FROM_EMAIL / ORG_CONTACT_EMAIL in production. */
export const FROM_EMAIL =
  process.env.FROM_EMAIL?.trim() ||
  process.env.ORG_CONTACT_EMAIL?.trim() ||
  "noreply@example.com";
export const FROM_NAME =
  process.env.FROM_NAME?.trim() || "Clear Aligner Production CRM";

/**
 * Lab-facing notifications (legacy labMail). Override for staging or shared inboxes.
 */
export const LAB_NOTIFICATION_EMAIL =
  process.env.LAB_NOTIFICATION_EMAIL?.trim() || FROM_EMAIL;

let transportWarned = false;

export function getTransport(): Transporter | null {
  if (!SMTP_PASSWORD) {
    if (!transportWarned) {
      transportWarned = true;
      logger.warn(
        "SMTP_PASSWORD not set — transactional emails will be skipped. Set SMTP_* in .env."
      );
    }
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 3) return false;
  return /\S+@\S+\.\S+/.test(trimmed);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function maskEmailForLog(email: string): string {
  return email.replace(/(.{2}).*(@.*)/, "$1***$2");
}

export interface SendHtmlMailOptions {
  to: string;
  subject: string;
  html: string;
  /** Optional display name for the To header */
  toName?: string;
  /** Inline images (cid:…), PDFs, etc. */
  attachments?: Attachment[];
  /** Structured log fields (emailKind, caseId, etc.) */
  logContext?: Record<string, unknown>;
}

/**
 * Send one HTML message. Never throws — logs errors.
 * @returns true only if the message was accepted by the SMTP transport.
 */
export async function sendHtmlMail(
  options: SendHtmlMailOptions
): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  const { to, subject, html, toName, attachments, logContext } = options;
  if (!isValidEmail(to)) {
    logger.warn({ ...logContext, to }, "Email skipped: invalid recipient");
    return false;
  }

  try {
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    });
    logger.info(
      { ...logContext, subject, to: maskEmailForLog(to) },
      "Email sent"
    );
    return true;
  } catch (err) {
    logger.error(
      { err, ...logContext, to: maskEmailForLog(to) },
      "Email send failed"
    );
    return false;
  }
}
