import { i18n } from "@/i18n";

/** case_notif_reason = 1 means new invoice/quote created. */
export const INVOICE_CREATED_REASON = 1;

function tHeader(key, options) {
  return i18n.t(key, options);
}

/** Returns a short label for the beware notification reason. */
export function getBewareNotificationReason(scope, patient) {
  if (patient?.case_notif_reason === INVOICE_CREATED_REASON) {
    return tHeader("header.bewareInvoice");
  }
  return scope === "company"
    ? tHeader("header.bewareDoctorReplied")
    : tHeader("header.bewareLabReplied");
}

/** Returns the tab to open when clicking a beware patient. */
export function getBewareTab(patient) {
  return patient?.case_notif_reason === INVOICE_CREATED_REASON
    ? "invoice-generated"
    : "discussion";
}

/** Formats delivery date as "X days remaining" (future) or "X days overdue" (past). */
export function formatDeliveryDays(dateStr) {
  if (!dateStr) return tHeader("header.emDash");
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return tHeader("header.emDash");
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  d.setHours(12, 0, 0, 0);
  const diffMs = d - now;
  const diffDays = Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000));

  let label;
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    label =
      months === 1
        ? tHeader("header.deliveryDuration1Month")
        : tHeader("header.deliveryDurationMonths", { count: months });
  } else if (diffDays >= 7) {
    const weeks = Math.floor(diffDays / 7);
    label =
      weeks === 1
        ? tHeader("header.deliveryDuration1Week")
        : tHeader("header.deliveryDurationWeeks", { count: weeks });
  } else {
    label =
      diffDays === 1
        ? tHeader("header.deliveryDuration1Day")
        : tHeader("header.deliveryDurationDays", { count: diffDays });
  }

  if (diffMs < 0) return tHeader("header.deliveryOverdue", { context: label });
  return tHeader("header.deliveryRemaining", { context: label });
}

/** Formats timestamp as relative time: "5 min ago", "2 hours ago", "Yesterday", etc. */
export function formatTimeAgo(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return tHeader("header.timeAgoJustNow");
  if (diffMin < 60) return tHeader("header.timeAgoMinutes", { count: diffMin });
  if (diffHours < 24) {
    return diffHours === 1
      ? tHeader("header.timeAgoHoursOne")
      : tHeader("header.timeAgoHoursMany", { count: diffHours });
  }
  if (diffDays === 1) return tHeader("header.timeAgoYesterday");
  if (diffDays < 7)
    return tHeader("header.timeAgoDaysAgo", { count: diffDays });
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1
      ? tHeader("header.timeAgoWeeksOne")
      : tHeader("header.timeAgoWeeksMany", { count: weeks });
  }
  const locale = i18n.language === "fr" ? "fr-CH" : "en-GB";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
