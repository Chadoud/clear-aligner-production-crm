import { config } from "../config.js";

type NotifyPayload = {
  caseId: number;
  channel: "general" | "doctor";
  event: "case:new-message" | "case:message-updated" | "case:message-deleted";
  payload: Record<string, unknown>;
};

/** CRM → mobile API bridge for cross-platform discussion sync. */
export async function notifyMobileCaseChannelEvent(
  body: NotifyPayload
): Promise<void> {
  const base = config.mobileApiBaseUrl.replace(/\/$/, "");
  const key = String(config.mobileInternalApiKey || "").trim();
  if (!base || !key) {
    console.warn(
      "[crm→mobile] skip case-channel-notify: MOBILE_API_BASE_URL or MOBILE_INTERNAL_API_KEY missing"
    );
    return;
  }

  try {
    const res = await fetch(`${base}/api/internal/case-channel-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Api-Key": key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.text()).trim().slice(0, 300);
      console.error(
        `[crm→mobile] case-channel-notify failed HTTP ${res.status}: ${detail || res.statusText}`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[crm→mobile] case-channel-notify error:", msg);
  }
}

/** New discussion message → mobile socket + FCM push (not used for edit/delete). */
export async function notifyMobileCaseChannelNewMessage(params: {
  caseId: number;
  channel: "general" | "doctor";
  senderUserId: number;
  senderName: string | null;
  text: string;
  attachmentsCount?: number;
  message: Record<string, unknown>;
}): Promise<void> {
  return notifyMobileCaseChannelEvent({
    caseId: params.caseId,
    channel: params.channel,
    event: "case:new-message",
    payload: {
      caseId: params.caseId,
      channel: params.channel,
      message: params.message,
    },
  });
}
