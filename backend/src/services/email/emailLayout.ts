/**
 * Shared HTML layout and org contact block for transactional emails.
 * Contact details are configurable via ORG_CONTACT_* env (see .env.example).
 */
import { escapeHtml, FROM_EMAIL, FROM_NAME } from "./smtp.js";

const ORG_EMAIL =
  process.env.ORG_CONTACT_EMAIL?.trim() ||
  process.env.LAB_CONTACT_EMAIL?.trim() ||
  FROM_EMAIL;

const ORG_PHONE =
  process.env.ORG_CONTACT_PHONE?.trim() ||
  process.env.LAB_CONTACT_PHONE?.trim() ||
  "";

/** Use | or newlines between lines, e.g. "Line 1|Line 2|CH-1000 City" */
const ORG_ADDRESS_RAW =
  process.env.ORG_CONTACT_ADDRESS?.trim() ||
  process.env.LAB_CONTACT_ADDRESS?.trim() ||
  "";

const ORG_WEB =
  process.env.ORG_CONTACT_WEBSITE?.trim() ||
  process.env.LAB_CONTACT_WEBSITE?.trim() ||
  "https://www.example.com";

function contactTableRows(): string {
  const rows: string[] = [];

  rows.push(
    contactRow(
      "Email",
      `<a href="mailto:${escapeHtml(ORG_EMAIL)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(ORG_EMAIL)}</a>`
    )
  );

  if (ORG_PHONE) {
    const telHref = ORG_PHONE.replace(/[^\d+]/g, "");
    rows.push(
      contactRow(
        "Phone",
        `<a href="tel:${escapeHtml(telHref)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(ORG_PHONE)}</a>`
      )
    );
  }

  const addrLines = ORG_ADDRESS_RAW
    ? ORG_ADDRESS_RAW.split(/\||\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (addrLines.length > 0) {
    const inner = addrLines
      .map((line) => `<div style="margin:0 0 4px 0;">${escapeHtml(line)}</div>`)
      .join("");
    rows.push(contactRow("Address", inner));
  }

  const webLabel = ORG_WEB.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  rows.push(
    contactRow(
      "Website",
      `<a href="${escapeHtml(ORG_WEB)}" style="color:#2563eb;text-decoration:none;" target="_blank" rel="noopener noreferrer">${escapeHtml(webLabel)}</a>`
    )
  );

  return rows.join("");
}

/**
 * Logo via CID attachment or product title text (shared with transactional one-off headers).
 */
export function labLogoOrTitleHtml(useLogoCid: boolean, title: string): string {
  const esc = escapeHtml(title);
  if (useLogoCid) {
    return `<img src="cid:brandlogo" alt="${esc}" style="display:block;height:30px;width:auto;border:0;outline:none;text-decoration:none;" />`;
  }
  return `<p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${esc}</p>`;
}

function contactRow(label: string, valueHtml: string): string {
  return `<tr>
<td style="padding:8px 18px 8px 0;vertical-align:top;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</td>
<td style="padding:8px 0;font-size:14px;color:#1e293b;line-height:1.55;">${valueHtml}</td>
</tr>`;
}

function buildContactSectionHtml(brandName = "Lab"): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:22px;">
<tr><td>
<p style="margin:14px 0 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(brandName)} &mdash; contact</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">${contactTableRows()}</table>
</td></tr></table>`;
}

export interface WrapHtmlEmailOptions {
  /** Main HTML (paragraphs, tables, etc.) -- no outer html/body */
  bodyHtml: string;
  /** Shown before "Kind regards" (optional extra blocks) */
  preSignOffHtml?: string;
  /** Default: "{FROM_NAME} Customer Service" */
  signOffName?: string;
  /** Header title; default Lab -- used for <title> and text fallback when logo is unavailable */
  headerTitle?: string;
  /** Small subtitle under header; default "CRM notification" -- ignored when customHeaderInnerHtml is set */
  headerSubtitle?: string;
  /** If set, replaces the title+subtitle block inside the header entirely */
  customHeaderInnerHtml?: string;
  /** When true, renders the logo via cid:brandlogo (caller must attach it as a nodemailer attachment); falls back to text when false */
  useLogoCid?: boolean;
  /** If false, omit default sign-off lines (e.g. password email uses custom closing) */
  includeDefaultSignOff?: boolean;
  /** Brand accent color (hex) — used as top-border stripe and header accent; defaults to Lab blue */
  accentColor?: string;
  /** Brand name shown in the contact section label; defaults to "Lab" */
  contactBrandName?: string;
}

/**
 * Full responsive-friendly template: branded header, content card, sign-off, contact block, footer note.
 */
export function wrapHtmlEmail(options: WrapHtmlEmailOptions): string {
  const {
    bodyHtml,
    preSignOffHtml = "",
    signOffName = `${FROM_NAME} Customer Service`,
    headerTitle = FROM_NAME,
    headerSubtitle = "CRM notification",
    customHeaderInnerHtml,
    useLogoCid = false,
    includeDefaultSignOff = true,
    accentColor,
    contactBrandName,
  } = options;

  const accent = accentColor || "#1e40af";
  const resolvedContactBrand = contactBrandName || "Lab";

  let headerInner: string;
  if (customHeaderInnerHtml != null) {
    headerInner = customHeaderInnerHtml;
  } else {
    const titleBlock = labLogoOrTitleHtml(useLogoCid, headerTitle);
    const subtitleBlock = headerSubtitle
      ? `<p style="margin:6px 0 0;font-size:12px;color:#64748b;line-height:1.45;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${escapeHtml(headerSubtitle)}</p>`
      : "";
    headerInner = titleBlock + subtitleBlock;
  }

  const signOffBlock = includeDefaultSignOff
    ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.65;color:#334155;">Kind regards,</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#0f172a;"><strong>${escapeHtml(signOffName)}</strong></p>`
    : "";

  const contact = buildContactSectionHtml(resolvedContactBrand);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background-color:#f1f5f9;">
<tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:collapse;">
<tr><td style="background:${escapeHtml(accent)};border-radius:14px 14px 0 0;padding:0;height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:30px 30px 28px;">
${headerInner}
</td></tr>
<tr><td style="background:#ffffff;padding:20px 30px 26px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="font-size:15px;line-height:1.65;color:#334155;">${bodyHtml}</div>
${preSignOffHtml}
${signOffBlock}
${contact}
</td></tr>
<tr><td style="padding:22px 12px 8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.55;max-width:480px;margin-left:auto;margin-right:auto;">You received this email from <strong>${escapeHtml(resolvedContactBrand)}</strong> (<a href="mailto:${escapeHtml(ORG_EMAIL)}" style="color:#64748b;">${escapeHtml(ORG_EMAIL)}</a>). For questions, use the contact details above.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Standard paragraph spacing for body fragments */
export function emailP(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">${html}</p>`;
}
