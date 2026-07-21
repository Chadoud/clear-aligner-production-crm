/**
 * Discussion service: fetch and post replies via tbl_reply API.
 * Doctor↔lab communication (visible to both).
 * General chat: patient, doctor, lab (reply_type 21).
 * Also fetches legacy tbl_chat messages to merge into Discussion.
 */

import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * Fetch legacy chat messages (tbl_chat) for a case.
 * Merged with replies in Discussion tab so chat history is not lost.
 *
 * @param {string|number} caseId - Case ID
 * @returns {Promise<{ caseId: number, messages: Array }>}
 */
export async function getChatMessages(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return { caseId: 0, messages: [] };

  const url = `/api/v1/cases/${encodeURIComponent(id)}/chat`;
  const res = await apiClient.request(url);
  const messages = res?.messages ?? [];
  return { caseId: res?.caseId ?? parseInt(id, 10), messages };
}

/** reply_type for discussion (doctor ↔ lab) */
export const DISCUSSION_REPLY_TYPE = 0;

/** reply_type for general chat (patient, doctor, lab) */
export const GENERAL_REPLY_TYPE = 21;

/**
 * Fetch discussion replies for a case.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @param {string} [type='discussion'] - 'discussion' | 'general'
 * @returns {Promise<{ caseId: number, replies: Array }>}
 */
export async function getDiscussionReplies(caseId, type = "discussion") {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return { caseId: 0, replies: [] };

  const typeParam = type === "general" ? "general" : "discussion";
  const url = `/api/v1/cases/${encodeURIComponent(id)}/replies?type=${encodeURIComponent(typeParam)}`;
  const res = await apiClient.request(url);
  const replies = res?.replies ?? [];
  return { caseId: res?.caseId ?? parseInt(id, 10), replies };
}

/**
 * Post a new discussion reply.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @param {string} text - Reply text
 * @param {number} [replyType=0] - Optional reply type
 * @param {Array<{ storedFilename: string, filename?: string }>} [attachments] - Attached files (from upload)
 * @returns {Promise<{ ok: boolean, id: number }>}
 */
export async function postDiscussionReply(
  caseId,
  text,
  replyType = 0,
  attachments = []
) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");

  const body = {
    text: String(text ?? "").trim(),
    replyType,
    attachments: Array.isArray(attachments) ? attachments : [],
  };
  return apiClient.request(`/api/v1/cases/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Delete a reply attachment.
 *
 * @param {string|number} caseId - Case ID
 * @param {number} replyId - Reply ID (tbl_reply.id)
 * @param {string} storedFilename - Stored filename (doc_name)
 */
export async function deleteReplyAttachment(caseId, replyId, storedFilename) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");
  if (replyId == null || !Number.isFinite(Number(replyId)))
    throw new Error("replyId is required");
  if (!storedFilename || typeof storedFilename !== "string")
    throw new Error("storedFilename is required");

  await apiClient.request(
    `/api/v1/cases/${encodeURIComponent(id)}/replies/${encodeURIComponent(
      replyId
    )}/attachments/${encodeURIComponent(storedFilename)}`,
    { method: "DELETE" }
  );
}

/**
 * Hard-delete a discussion reply (tbl_reply + attachments).
 */
export async function deleteDiscussionReply(caseId, replyId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");
  if (replyId == null || !Number.isFinite(Number(replyId)))
    throw new Error("replyId is required");

  await apiClient.request(
    `/api/v1/cases/${encodeURIComponent(id)}/replies/${encodeURIComponent(replyId)}`,
    { method: "DELETE" }
  );
}

/**
 * Hard-delete a legacy chat message (tbl_chat).
 */
export async function deleteChatMessage(caseId, chatId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");
  if (chatId == null || !Number.isFinite(Number(chatId)))
    throw new Error("chatId is required");

  await apiClient.request(
    `/api/v1/cases/${encodeURIComponent(id)}/chat/${encodeURIComponent(chatId)}`,
    { method: "DELETE" }
  );
}

/**
 * Hard-delete a merged discussion message (reply or chat).
 */
export async function deleteDiscussionMessage(caseId, msg) {
  if (!msg?.source || msg.id == null) throw new Error("Invalid message");
  if (msg.source === "chat") {
    return deleteChatMessage(caseId, msg.id);
  }
  return deleteDiscussionReply(caseId, msg.id);
}

/**
 * Update text on an own discussion message (reply or chat).
 */
export async function updateDiscussionMessage(caseId, msg, text) {
  if (!msg?.source || msg.id == null) throw new Error("Invalid message");
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("Message text is required");

  if (msg.source === "chat") {
    return apiClient.request(
      `/api/v1/cases/${encodeURIComponent(id)}/chat/${encodeURIComponent(msg.id)}`,
      { method: "PATCH", body: JSON.stringify({ text: trimmed }) }
    );
  }
  return apiClient.request(
    `/api/v1/cases/${encodeURIComponent(id)}/replies/${encodeURIComponent(msg.id)}`,
    { method: "PATCH", body: JSON.stringify({ text: trimmed }) }
  );
}

/**
 * Unread counts for General + Doctor channels (shared with mobile read cursors).
 *
 * @param {string|number} caseId
 * @returns {Promise<{ caseId: number, unreadGeneralCount: number, unreadDoctorCount: number, lastGeneralAt: string|null, lastDoctorAt: string|null, lastActivityAt: string|null }>}
 */
export async function getCaseChannelStats(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) {
    return {
      caseId: 0,
      unreadGeneralCount: 0,
      unreadDoctorCount: 0,
      lastGeneralAt: null,
      lastDoctorAt: null,
      lastActivityAt: null,
    };
  }

  const url = `/api/v1/cases/${encodeURIComponent(id)}/channel-stats`;
  const res = await apiClient.request(url);
  return {
    caseId: res?.caseId ?? parseInt(id, 10),
    unreadGeneralCount: Number(res?.unreadGeneralCount) || 0,
    unreadDoctorCount: Number(res?.unreadDoctorCount) || 0,
    lastGeneralAt: res?.lastGeneralAt ?? null,
    lastDoctorAt: res?.lastDoctorAt ?? null,
    lastActivityAt: res?.lastActivityAt ?? null,
  };
}

/**
 * Batch channel stats for multiple cases (case list badges).
 *
 * @param {Array<string|number>} caseIds
 * @returns {Promise<Record<string, { unreadGeneralCount: number, unreadDoctorCount: number }>>}
 */
export async function getBatchCaseChannelStats(caseIds) {
  const ids = [
    ...new Set(
      (Array.isArray(caseIds) ? caseIds : [])
        .map((id) => String(id).trim())
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return {};

  const url = `/api/v1/cases/channel-stats?ids=${encodeURIComponent(ids.join(","))}`;
  const res = await apiClient.request(url);
  const stats = res?.stats ?? {};
  const normalized = {};
  for (const [key, row] of Object.entries(stats)) {
    normalized[key] = {
      unreadGeneralCount: Number(row?.unreadGeneralCount) || 0,
      unreadDoctorCount: Number(row?.unreadDoctorCount) || 0,
    };
  }
  return normalized;
}
