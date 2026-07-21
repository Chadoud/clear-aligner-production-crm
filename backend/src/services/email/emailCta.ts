/**
 * Primary CTA button + fallback URL line for HTML emails (inline styles for clients).
 */
import { escapeHtml } from "./smtp.js";

export function emailPrimaryButtonHtml(href: string, label: string): string {
  return `<p style="margin:0 0 16px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(label)}</a></p>`;
}

export function emailSecondaryLinkLine(href: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.5;">If the button does not work, copy this link into your browser:<br/><span style="word-break:break-all;">${escapeHtml(href)}</span></p>`;
}
