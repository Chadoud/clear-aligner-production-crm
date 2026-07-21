/**
 * Resolve brand logo files for inline (CID) email attachments.
 * Public tree ships a generic mark under public/assets/brand/.
 * Override with EMAIL_LOGO_PATH.
 */
import { existsSync } from "fs";
import { join } from "path";
import type { Attachment } from "nodemailer/lib/mailer/index.js";

const BRAND_LOGO_REL = join("public", "assets", "brand", "logo.svg");

function resolveAssetPath(
  relPath: string,
  envOverride?: string
): string | null {
  const env = envOverride?.trim();
  if (env && existsSync(env)) return env;
  const candidates = [
    join(process.cwd(), "..", relPath),
    join(process.cwd(), relPath),
    join(process.cwd(), "..", "..", relPath),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Absolute path to the email logo SVG, or null if not found. */
export function resolveBrandMarkPath(): string | null {
  return resolveAssetPath(BRAND_LOGO_REL, process.env.EMAIL_LOGO_PATH);
}

/**
 * Build a nodemailer CID attachment for the brand logo (cid:brandlogo).
 * Brand argument is ignored — public tree ships one generic mark.
 */
export function buildBrandLogoAttachment(): Attachment | null {
  const path = resolveBrandMarkPath();
  if (!path) return null;
  return { filename: "logo.svg", path, cid: "brandlogo" };
}
