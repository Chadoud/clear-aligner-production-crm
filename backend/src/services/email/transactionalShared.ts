/**
 * Shared logo attachment and case CTAs for transactional emails.
 */
import { buildBrandLogoAttachment } from "./emailAssets.js";
import { emailPrimaryButtonHtml, emailSecondaryLinkLine } from "./emailCta.js";
import { crmCompanyCaseUrl, crmDoctorCaseUrl } from "./emailLinks.js";
import type { Attachment } from "nodemailer/lib/mailer/index.js";

/** Resolved once at startup; reused across all transactional sends. */
const _labLogo: Attachment | null = buildBrandLogoAttachment();
const _directLogo: Attachment | null = buildBrandLogoAttachment();

/** Whether the Lab logo is available as a CID attachment (backward compat). */
export const _useLogoCid = Boolean(_labLogo);

export function logoAttachments(): Attachment[] {
  return _labLogo ? [_labLogo] : [];
}

/** Returns the correct logo attachment(s) for the given brand. */
export function logoAttachmentsForBrand(brand: string): Attachment[] {
  const logo = brand === "Direct" ? _directLogo : _labLogo;
  return logo ? [logo] : [];
}

/** Whether a logo CID attachment is available for the given brand. */
export function hasLogoCidForBrand(brand: string): boolean {
  return brand === "Direct" ? Boolean(_directLogo) : Boolean(_labLogo);
}

export function caseCtaCompany(caseId: number): string {
  const url = crmCompanyCaseUrl(caseId);
  return (
    emailPrimaryButtonHtml(url, "Open case in CRM") +
    emailSecondaryLinkLine(url)
  );
}

export function caseCtaDoctor(caseId: number): string {
  const url = crmDoctorCaseUrl(caseId);
  return (
    emailPrimaryButtonHtml(url, "Open case in CRM") +
    emailSecondaryLinkLine(url)
  );
}

/**
 * Brand-aware doctor CTA.
 * For Direct: no button (returns empty string — Direct emails don't link to Lab).
 * For Lab: standard "Open case in CRM" button + fallback link.
 */
export function caseCtaDoctorForBrand(caseId: number, brand: string): string {
  if (brand === "Direct") return "";
  return caseCtaDoctor(caseId);
}

/**
 * Returns wrapHtmlEmail accent/contact options for the given brand.
 * Use when calling wrapHtmlEmail with brand-aware emails.
 */
export function brandWrapOptions(brand: string): {
  accentColor: string;
  contactBrandName: string;
} {
  if (brand === "Direct") {
    return { accentColor: "#00808c", contactBrandName: "Direct" };
  }
  return { accentColor: "#1e40af", contactBrandName: "Lab" };
}
