import { isDocImage, isDocVideo, isDocAudio } from "@/utils/docs/mediaType.js";
import { buildDocUrl } from "@/utils/docs/index.js";
import { isCaseDeletedMessage } from "@/utils/discussion/caseReplyQuote.js";

export function plainTextFromMessageHtml(html, sanitizeHtml) {
  if (!html || typeof html !== "string") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(html);
  return (tmp.textContent || "").replace(/\s+/g, " ").trim();
}

export function findMediaAttachment(attachments) {
  if (!attachments?.length) return null;
  return (
    attachments.find((a) => isDocImage(a.storedFilename, a.filename)) ??
    attachments.find((a) => isDocVideo(a.storedFilename, a.filename)) ??
    attachments.find((a) => isDocAudio(a.storedFilename, a.filename)) ??
    null
  );
}

export function findImageAttachment(attachments) {
  return (
    attachments?.find((a) => isDocImage(a.storedFilename, a.filename)) ?? null
  );
}

export function findFileAttachment(attachments) {
  return (
    attachments?.find(
      (a) =>
        !isDocImage(a.storedFilename, a.filename) &&
        !isDocVideo(a.storedFilename, a.filename) &&
        !isDocAudio(a.storedFilename, a.filename)
    ) ?? null
  );
}

export async function downloadDocUrl(docUrl, filename) {
  const a = document.createElement("a");
  a.href = docUrl;
  a.download = filename || "attachment";
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function primaryAttachmentForReply(msg) {
  const attachments = msg.attachments ?? [];
  const image = findImageAttachment(attachments);
  if (image) return { kind: "image", att: image };
  const video =
    attachments.find((a) => isDocVideo(a.storedFilename, a.filename)) ?? null;
  if (video) return { kind: "video", att: video };
  const audio =
    attachments.find((a) => isDocAudio(a.storedFilename, a.filename)) ?? null;
  if (audio) return { kind: "audio", att: audio };
  const file = findFileAttachment(attachments);
  if (file) return { kind: "file", att: file };
  return { kind: "text" };
}

/**
 * Reply compose bar context — text + optional media thumbnail (mobile parity).
 */
export function getReplyTargetContext(
  msg,
  { caseId, docsBaseUrl, t, sanitizeHtml }
) {
  const label = msg.author || "—";
  const { kind, att } = primaryAttachmentForReply(msg);
  let text = getMessagePreview(msg, sanitizeHtml, t);
  let thumbnailUrl = null;
  let showAudioIcon = false;

  if (kind === "image" && att && caseId && docsBaseUrl) {
    text = t("caseMgmt.discussion.messageActions.previewPhoto");
    thumbnailUrl = buildDocUrl(docsBaseUrl, caseId, att.storedFilename);
  } else if (kind === "video" && att && caseId && docsBaseUrl) {
    text = t("caseMgmt.discussion.messageActions.previewVideo");
    thumbnailUrl = buildDocUrl(docsBaseUrl, caseId, att.storedFilename);
  } else if (kind === "audio") {
    text = t("caseMgmt.discussion.messageActions.previewAudio");
    showAudioIcon = true;
  }

  return { label, text, kind, thumbnailUrl, showAudioIcon };
}

export function getMessagePreview(msg, sanitizeHtml, t) {
  const attachments = msg.attachments ?? [];
  if (isCaseDeletedMessage(msg.text, attachments.length)) {
    return t?.("caseMgmt.discussion.messageDeleted") ?? "Message deleted";
  }

  const textRaw = msg.text === "(attachment)" ? "" : msg.text;
  const plain = plainTextFromMessageHtml(textRaw, sanitizeHtml);
  if (plain) return plain.length > 120 ? `${plain.slice(0, 117)}…` : plain;

  const imageAtt = findImageAttachment(attachments);
  if (imageAtt) return imageAtt.filename || imageAtt.storedFilename || "Photo";
  const mediaAtt = findMediaAttachment(attachments);
  if (mediaAtt) return mediaAtt.filename || mediaAtt.storedFilename || "Media";
  const fileAtt = findFileAttachment(attachments);
  if (fileAtt) return fileAtt.filename || fileAtt.storedFilename || "File";
  return "Message";
}

export function buildReplyQuotedHtml(msg, sanitizeHtml) {
  const author = escapeHtml(msg.author || "—");
  const preview = escapeHtml(getMessagePreview(msg, sanitizeHtml));
  return `<span class="tab-chat-reply-quote"><b>${author}</b><br>${preview}</span><br><br>`;
}

export function getMessageKey(msg) {
  return `${msg.source}-${msg.id}`;
}

export const MESSAGE_MUTATION_WINDOW_MS = 5 * 60 * 1000;

export function isWithinMutationWindow(createdAt, nowMs = Date.now()) {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= MESSAGE_MUTATION_WINDOW_MS;
}

/** Message authored by the signed-in CRM user. */
export function isOwnDiscussionMessage(msg, currentUserId) {
  if (currentUserId == null || msg?.userId == null) return false;
  return Number(msg.userId) === Number(currentUserId);
}

/** Own message within 5-minute edit/delete window. */
export function canMutateDiscussionMessage(msg, currentUserId) {
  if (currentUserId == null || !msg?.userId) return false;
  if (Number(msg.userId) !== Number(currentUserId)) return false;
  return isWithinMutationWindow(msg.createdAt);
}

export function canEditDiscussionMessage(msg, currentUserId, plainText) {
  if (!canMutateDiscussionMessage(msg, currentUserId)) return false;
  const attachments = msg.attachments ?? [];
  if (isCaseDeletedMessage(msg.text, attachments.length)) return false;
  const text = String(plainText ?? "").trim();
  if (!text) return false;
  return attachments.length === 0 && msg.text !== "(attachment)";
}
