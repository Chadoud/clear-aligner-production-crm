const META_RE =
  /^\[\[reply:([^|\]]+)\|(text|image|video|audio|file)\|([^|\]]*)\]\]\s*\n?([\s\S]*)$/i;
const LEGACY_RE = /^>\s*([^:\n]+):\s*([^\n]*)\n\n([\s\S]*)$/;

/** ERP / mobile: attachment-only placeholder in tbl_reply.reply_text */
export const CASE_ATTACHMENT_PLACEHOLDER = "(attachment)";

/** Mobile soft-delete — row kept, content cleared */
export const CASE_DELETED_PLACEHOLDER = "(deleted)";

function normalizedReplyText(rawText) {
  return String(rawText ?? "")
    .replace(/^\[mob_migration\]\s*/, "")
    .trim();
}

export function isCaseDeletedMessage(text, attachmentCount = 0) {
  if (normalizedReplyText(text) === CASE_DELETED_PLACEHOLDER) return true;
  return (
    normalizedReplyText(text) === CASE_ATTACHMENT_PLACEHOLDER &&
    Number(attachmentCount) === 0
  );
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseCaseReplyQuote(rawText) {
  const text = String(rawText ?? "");
  const meta = text.match(META_RE);
  if (meta) {
    const kind = meta[2].toLowerCase();
    const third = meta[3].trim();
    const legacyEmptyTextPreview = kind === "text" && !third;
    return {
      author: meta[1].trim(),
      kind,
      storedFilename: kind === "text" ? "" : third,
      previewText:
        kind === "text" ? (legacyEmptyTextPreview ? "" : third) : third,
      body: meta[4] ?? "",
    };
  }

  const legacy = text.match(LEGACY_RE);
  if (!legacy) return null;

  const author = legacy[1].trim();
  const preview = legacy[2].trim();
  const body = legacy[3] ?? "";
  return {
    author,
    kind: "text",
    storedFilename: "",
    previewText: preview,
    body,
  };
}

export function caseMessageDisplayBody(rawText) {
  const quote = parseCaseReplyQuote(rawText);
  if (quote) return quote.body.trim();
  return String(rawText ?? "").trim();
}

function replyPreviewLabel(quote, t) {
  if (quote.kind === "image") {
    return t("caseMgmt.discussion.messageActions.previewPhoto");
  }
  if (quote.kind === "video") {
    return t("caseMgmt.discussion.messageActions.previewVideo");
  }
  if (quote.kind === "audio") {
    return t("caseMgmt.discussion.messageActions.previewAudio");
  }
  return quote.previewText;
}

function messageKey(msg) {
  return `${msg.source}-${msg.id}`;
}

/** Resolve quoted message for legacy mobile payloads missing text preview. */
export function findCaseReplyTargetMessage(messages, fromMessage, quote) {
  const fromIdx = messages.findIndex(
    (m) => messageKey(m) === messageKey(fromMessage)
  );
  if (fromIdx <= 0) return null;

  const quoteAuthor = String(quote.author ?? "")
    .trim()
    .toLowerCase();

  for (let i = fromIdx - 1; i >= 0; i--) {
    const msg = messages[i];
    const author = String(msg.author ?? "")
      .trim()
      .toLowerCase();
    if (author !== quoteAuthor) continue;

    if (quote.storedFilename) {
      const hasFile = (msg.attachments ?? []).some(
        (a) =>
          a.storedFilename === quote.storedFilename ||
          a.filename === quote.storedFilename
      );
      if (hasFile) return msg;
      continue;
    }

    if (quote.kind !== "text") continue;

    if (quote.previewText && quote.previewText !== "text") {
      const body = caseMessageDisplayBody(msg.text).replace(/\s+/g, " ").trim();
      const preview = String(quote.previewText).replace(/\s+/g, " ").trim();
      if (
        body.startsWith(preview) ||
        preview.startsWith(body.slice(0, 120)) ||
        body.slice(0, 120) === preview
      ) {
        return msg;
      }
      continue;
    }

    return msg;
  }

  return null;
}

function resolveReplyPreviewText(
  quote,
  { t, messages, fromMessage, getMessagePreview }
) {
  if (quote.kind !== "text") return replyPreviewLabel(quote, t);

  let preview = String(quote.previewText ?? "").trim();
  if (
    (!preview || preview === "text") &&
    messages?.length &&
    fromMessage &&
    getMessagePreview
  ) {
    const target = findCaseReplyTargetMessage(messages, fromMessage, quote);
    if (target) preview = getMessagePreview(target);
  }
  return preview || replyPreviewLabel(quote, t);
}

/**
 * Render mobile [[reply:...]] payloads as CRM reply quote HTML.
 */
export function formatCaseReplyQuoteHtml(
  rawText,
  {
    t,
    plainTextFromMessageHtml,
    sanitizeHtml,
    messages,
    fromMessage,
    getMessagePreview,
  }
) {
  const quote = parseCaseReplyQuote(rawText);
  if (!quote) return null;

  const author = escapeHtml(quote.author || "—");
  let preview = resolveReplyPreviewText(quote, {
    t,
    messages,
    fromMessage,
    getMessagePreview,
  });
  if (quote.kind === "text") {
    preview =
      plainTextFromMessageHtml?.(preview, sanitizeHtml) ||
      String(preview ?? "").trim();
  }
  preview = escapeHtml(preview);

  const quoteHtml = `<span class="tab-chat-reply-quote"><b>${author}</b><br>${preview}</span>`;
  const body = escapeHtml((quote.body ?? "").trim());
  return body ? `${quoteHtml}<br><br>${body}` : quoteHtml;
}

/**
 * Discussion bubble HTML: mobile reply metadata or existing CRM quote markup.
 */
export function formatDiscussionMessageHtml(
  rawText,
  {
    t,
    plainTextFromMessageHtml,
    sanitizeHtml,
    messages,
    fromMessage,
    getMessagePreview,
  }
) {
  const text = String(rawText ?? "");
  if (!text || text === CASE_ATTACHMENT_PLACEHOLDER) return "";
  if (normalizedReplyText(text) === CASE_DELETED_PLACEHOLDER) return "";

  const replyHtml = formatCaseReplyQuoteHtml(text, {
    t,
    plainTextFromMessageHtml,
    sanitizeHtml,
    messages,
    fromMessage,
    getMessagePreview,
  });
  if (replyHtml) return replyHtml;

  return sanitizeHtml(text);
}
