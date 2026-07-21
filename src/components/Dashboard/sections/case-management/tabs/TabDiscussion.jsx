import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import { useRefreshCaseSheetOnMount } from "@/hooks";
import DOMPurify from "dompurify";
import { useAuth } from "@/context/AuthContext";
import {
  getDiscussionReplies,
  getChatMessages,
  postDiscussionReply,
  deleteReplyAttachment,
  deleteDiscussionMessage,
  updateDiscussionMessage,
  DISCUSSION_REPLY_TYPE,
  GENERAL_REPLY_TYPE,
} from "@/services/discussionService";
import { uploadCaseDoc } from "@/services/caseDocsService";
import { getDiscussionDocsBaseUrl, buildDocUrl } from "@/utils/docs/index.js";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import DocPreviewCard from "@/components/shared/DocPreviewCard";
import ChatComposeInput from "./ChatComposeInput";
import ImageLightbox from "./ImageLightbox";
import ChatMessageActionSheet from "./ChatMessageActionSheet";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { useChatMessageMenuTrigger } from "./useChatMessageMenuTrigger";
import DiscussionUnreadBadge from "@/components/shared/DiscussionUnreadBadge/DiscussionUnreadBadge";
import {
  plainTextFromMessageHtml,
  findImageAttachment,
  findMediaAttachment,
  findFileAttachment,
  downloadDocUrl,
  buildReplyQuotedHtml,
  getReplyTargetContext,
  getMessagePreview,
  getMessageKey,
  canMutateDiscussionMessage,
  canEditDiscussionMessage,
  isOwnDiscussionMessage,
} from "./chatMessageActions";
import { detectBrandFromPatient } from "../QuotationForm/config/detectBrand";
import {
  formatDiscussionMessageHtml,
  caseMessageDisplayBody,
  parseCaseReplyQuote,
  isCaseDeletedMessage,
  CASE_DELETED_PLACEHOLDER,
} from "@/utils/discussion/caseReplyQuote.js";

function markReplySoftDeleted(replies, messageKey) {
  return replies.map((m) =>
    getMessageKey(m) === messageKey
      ? { ...m, text: CASE_DELETED_PLACEHOLDER, attachments: [] }
      : m
  );
}

/** Sanitize HTML for safe display: allows br, b, a, span, etc. but strips script/events. */
function sanitizeHtml(s) {
  if (typeof s !== "string") return "";
  return DOMPurify.sanitize(s, {
    ALLOWED_TAGS: ["br", "b", "i", "u", "a", "span", "p", "div"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

function getCaseId(patient) {
  if (!patient) return null;
  const id = patient.case_id;
  return id != null && Number.isFinite(id) ? String(id) : null;
}

const SUB_TABS = [
  { id: "discussion", replyType: DISCUSSION_REPLY_TYPE },
  { id: "general", replyType: GENERAL_REPLY_TYPE },
];

export default function TabDiscussion({
  patient,
  refreshCaseSheet,
  discussionChannelStats,
  refreshDiscussionChannelStats,
}) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const { user, token } = useAuth();
  const currentUserId = user?.id != null ? Number(user.id) : null;
  const caseId = getCaseId(patient);
  const isDirectPatient = detectBrandFromPatient(patient) === "Direct";
  const visibleSubTabs = useMemo(
    () =>
      isDirectPatient
        ? SUB_TABS.filter((tab) => tab.id === "general")
        : SUB_TABS,
    [isDirectPatient]
  );
  const [activeSubTab, setActiveSubTab] = useState("discussion");
  const effectiveSubTab = isDirectPatient ? "general" : activeSubTab;
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState(null);
  const [pendingEditMessage, setPendingEditMessage] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [editingMessage, setEditingMessage] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachedPreviews, setAttachedPreviews] = useState([]);
  const fileInputRef = useRef(null);
  const composeRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const tabChatRootRef = useRef(null);

  const closeMessageMenu = useCallback(() => setMessageMenu(null), []);

  const requestEditMessage = useCallback((msg, plainText) => {
    setPendingEditMessage(msg);
    setEditDraft(plainText);
  }, []);

  const confirmEditMessage = useCallback(async () => {
    if (!caseId || !pendingEditMessage || editingMessage) return;
    const trimmed = String(editDraft ?? "").trim();
    if (!trimmed) return;
    setEditingMessage(true);
    try {
      await updateDiscussionMessage(caseId, pendingEditMessage, trimmed);
      setReplies((prev) =>
        prev.map((m) =>
          getMessageKey(m) === getMessageKey(pendingEditMessage)
            ? { ...m, text: trimmed }
            : m
        )
      );
      setError(null);
      setPendingEditMessage(null);
      setEditDraft("");
    } catch (err) {
      setError(err?.message || t("caseMgmt.discussion.editFailed"));
    } finally {
      setEditingMessage(false);
    }
  }, [caseId, pendingEditMessage, editDraft, editingMessage, t]);

  const canMutateMessage = useCallback(
    (msg) => canMutateDiscussionMessage(msg, currentUserId),
    [currentUserId]
  );

  const requestDeleteMessage = useCallback((msg) => {
    setPendingDeleteMessage(msg);
  }, []);

  const confirmDeleteMessage = useCallback(async () => {
    if (!caseId || !pendingDeleteMessage || deletingMessage) return;
    setDeletingMessage(true);
    try {
      await deleteDiscussionMessage(caseId, pendingDeleteMessage);
      setReplies((prev) =>
        markReplySoftDeleted(prev, getMessageKey(pendingDeleteMessage))
      );
      setError(null);
      setPendingDeleteMessage(null);
    } catch (err) {
      setError(err?.message || t("caseMgmt.discussion.deleteFailed"));
    } finally {
      setDeletingMessage(false);
    }
  }, [caseId, pendingDeleteMessage, deletingMessage, t]);

  const startReply = useCallback((msg) => {
    setReplyingTo(msg);
    requestAnimationFrame(() => composeRef.current?.focus());
  }, []);

  const openMessageMenu = useCallback(
    (payload) => {
      const msg = payload?.msg ?? payload;
      if (isCaseDeletedMessage(msg.text, (msg.attachments ?? []).length)) {
        return;
      }
      const textRaw = msg.text === "(attachment)" ? "" : msg.text;
      const quote = parseCaseReplyQuote(textRaw);
      const plainText = quote
        ? caseMessageDisplayBody(textRaw)
        : plainTextFromMessageHtml(textRaw, sanitizeHtml);
      const attachments = msg.attachments ?? [];
      const docsBaseUrl = getDiscussionDocsBaseUrl();
      const imageAtt = findImageAttachment(attachments);
      const mediaAtt = findMediaAttachment(attachments);
      const fileAtt = findFileAttachment(attachments);
      const actions = [];

      actions.push({
        id: "reply",
        label: t("caseMgmt.discussion.messageActions.reply"),
        icon: "fas fa-reply",
        onClick: () => startReply(msg),
      });

      if (plainText) {
        actions.push({
          id: "copy",
          label: t("caseMgmt.discussion.messageActions.copy"),
          icon: "fas fa-copy",
          onClick: () => {
            navigator.clipboard?.writeText(plainText).catch(() => {});
          },
        });
      }

      if (imageAtt) {
        actions.push({
          id: "draw",
          label: t("caseMgmt.discussion.messageActions.drawOnReply"),
          icon: "fas fa-pen",
          onClick: () => startReply(msg),
        });
        const docUrl = buildDocUrl(
          docsBaseUrl,
          caseId,
          imageAtt.storedFilename
        );
        actions.push({
          id: "view",
          label: t("caseMgmt.discussion.messageActions.viewPhoto"),
          icon: "fas fa-image",
          onClick: () => {
            if (docUrl) {
              setLightbox({
                src: docUrl,
                alt: imageAtt.filename || imageAtt.storedFilename,
              });
            }
          },
        });
      }

      const isOwn = isOwnDiscussionMessage(msg, currentUserId);

      if (mediaAtt && isOwn) {
        const docUrl = buildDocUrl(
          docsBaseUrl,
          caseId,
          mediaAtt.storedFilename
        );
        actions.push({
          id: "save",
          label: t("caseMgmt.discussion.messageActions.save"),
          icon: "fas fa-download",
          onClick: () => {
            if (docUrl) {
              void downloadDocUrl(
                docUrl,
                mediaAtt.filename || mediaAtt.storedFilename
              );
            }
          },
        });
      }

      if (fileAtt && isOwn) {
        const docUrl = buildDocUrl(docsBaseUrl, caseId, fileAtt.storedFilename);
        actions.push({
          id: "open",
          label: fileAtt.filename || fileAtt.storedFilename,
          icon: "fas fa-file-alt",
          onClick: () => {
            if (docUrl) window.open(docUrl, "_blank", "noopener,noreferrer");
          },
        });
      }

      if (
        canMutateMessage(msg) &&
        canEditDiscussionMessage(msg, currentUserId, plainText)
      ) {
        actions.push({
          id: "edit",
          label: t("caseMgmt.discussion.messageActions.edit"),
          icon: "fas fa-edit",
          onClick: () => requestEditMessage(msg, plainText),
        });
      }

      if (canMutateMessage(msg)) {
        actions.push({
          id: "delete",
          label: t("caseMgmt.discussion.messageActions.delete"),
          icon: "fas fa-trash-alt",
          destructive: true,
          onClick: () => requestDeleteMessage(msg),
        });
      }

      setMessageMenu({
        messageKey: getMessageKey(msg),
        actions,
      });
    },
    [
      caseId,
      t,
      startReply,
      canMutateMessage,
      currentUserId,
      requestDeleteMessage,
      requestEditMessage,
    ]
  );

  const { onBubbleClick, onBubbleContextMenu } =
    useChatMessageMenuTrigger(openMessageMenu);

  const channelUnread = discussionChannelStats ?? {
    unreadGeneralCount: 0,
    unreadDoctorCount: 0,
  };

  const fetchReplies = useCallback(async () => {
    if (!caseId) {
      setReplies([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [{ replies: r }, { messages: chatMsgs }] = await Promise.all([
        getDiscussionReplies(caseId, effectiveSubTab),
        getChatMessages(caseId),
      ]);
      const repliesWithSource = (r ?? []).map((m) => ({
        ...m,
        source: "reply",
        sortKey: m.createdAt ?? "",
      }));
      const chatWithSource = (chatMsgs ?? []).map((m) => ({
        ...m,
        source: "chat",
        attachments: [],
        sortKey: m.createdAt ?? "",
      }));
      const merged = [...repliesWithSource, ...chatWithSource].sort(
        (a, b) => new Date(a.sortKey) - new Date(b.sortKey)
      );
      setReplies(merged);
      await refreshDiscussionChannelStats?.();
    } catch (err) {
      setError(err?.message || t("caseMgmt.discussion.loadFailed"));
      setReplies([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, effectiveSubTab, t, refreshDiscussionChannelStats]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  useEffect(() => {
    if (!token || !caseId) return undefined;
    const socket = io(window.location.origin, {
      auth: { token },
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const onUpdated = (data) => {
      if (Number(data?.caseId) !== Number(caseId)) return;
      const messageKey = String(data?.messageId ?? "");
      if (!messageKey) return;
      const nextText = data.text ?? undefined;
      setReplies((prev) =>
        prev.map((m) => {
          if (getMessageKey(m) !== messageKey) return m;
          const text = nextText ?? m.text;
          const deleted = isCaseDeletedMessage(
            text,
            (m.attachments ?? []).length
          );
          return {
            ...m,
            text,
            attachments: deleted ? [] : m.attachments,
          };
        })
      );
    };

    const onDeleted = (data) => {
      if (Number(data?.caseId) !== Number(caseId)) return;
      const messageKey = String(data?.messageId ?? "");
      if (!messageKey) return;
      setReplies((prev) => markReplySoftDeleted(prev, messageKey));
    };

    socket.on("crm:case:message-updated", onUpdated);
    socket.on("crm:case:message-deleted", onDeleted);
    return () => {
      socket.off("crm:case:message-updated", onUpdated);
      socket.off("crm:case:message-deleted", onDeleted);
      socket.disconnect();
    };
  }, [token, caseId]);

  useEffect(() => {
    const entries = attachedFiles.map((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return {
        file,
        kind: isImage ? "image" : isVideo ? "video" : "file",
        previewUrl: isImage || isVideo ? URL.createObjectURL(file) : null,
      };
    });
    setAttachedPreviews(entries);
    return () => {
      entries.forEach((entry) => {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      });
    };
  }, [attachedFiles]);

  const sendReply = async () => {
    const draftText = draft.trim();
    const hasFiles = attachedFiles.length > 0;
    if ((!draftText && !hasFiles) || !caseId || sending) return;
    const replyType =
      effectiveSubTab === "general"
        ? GENERAL_REPLY_TYPE
        : DISCUSSION_REPLY_TYPE;
    setSending(true);
    try {
      const attachments = [];
      if (hasFiles) {
        for (const file of attachedFiles) {
          const doc = await uploadCaseDoc(caseId, file, "documents");
          if (doc?.storedFilename) {
            attachments.push({
              storedFilename: doc.storedFilename,
              filename: doc.filename ?? file.name,
            });
          }
        }
        setAttachedFiles([]);
      }
      const text = replyingTo
        ? `${buildReplyQuotedHtml(replyingTo, sanitizeHtml)}${draftText}`
        : draftText;
      await postDiscussionReply(caseId, text, replyType, attachments);
      setDraft("");
      setReplyingTo(null);
      await fetchReplies();
    } catch (err) {
      setError(err?.message || t("caseMgmt.discussion.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">
          {t("caseMgmt.discussion.emptyPatient")}
        </p>
      </div>
    );
  }

  if (loading && replies.length === 0) {
    return (
      <div className="form-section tab-panel tab-panel-loading">
        <LoadingDonut size="md" message={t("caseMgmt.discussion.loading")} />
      </div>
    );
  }

  const subTabDescription =
    effectiveSubTab === "general"
      ? t("caseMgmt.discussion.descGeneral", { name: patient.name })
      : t("caseMgmt.discussion.descDoctor", { name: patient.name });

  const showChat = true;

  return (
    <div
      className={`form-section tab-panel tab-chat${messageMenu ? " tab-chat--menu-open" : ""}`}
      ref={tabChatRootRef}
    >
      <h3 className="tab-panel-title">{t("caseMgmt.discussion.title")}</h3>
      {visibleSubTabs.length > 1 && (
        <div
          className="tab-discussion-subtabs"
          role="tablist"
          aria-label={t("caseMgmt.discussion.chatTypeAria")}
        >
          {visibleSubTabs.map((tab) => {
            const tabLabel =
              tab.id === "discussion"
                ? t("caseMgmt.discussion.tabDoctor")
                : t("caseMgmt.discussion.tabGeneral");
            const unreadCount =
              tab.id === "discussion"
                ? channelUnread.unreadDoctorCount
                : channelUnread.unreadGeneralCount;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSubTab === tab.id}
                aria-label={
                  unreadCount > 0
                    ? `${tabLabel} (${unreadCount} unread)`
                    : tabLabel
                }
                className={`tab-discussion-subtab ${activeSubTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                {tabLabel}
                <DiscussionUnreadBadge count={unreadCount} />
              </button>
            );
          })}
        </div>
      )}
      <p className="tab-panel-description">{subTabDescription}</p>
      {error && (
        <div className="tab-panel-error" role="alert">
          {error}
        </div>
      )}
      <>
        <div
          className="tab-chat-messages"
          ref={messagesScrollRef}
          role="log"
          aria-live="polite"
        >
          {(() => {
            const hasContent = (m) => {
              const atts = m.attachments ?? [];
              if (isCaseDeletedMessage(m.text, atts.length)) return true;
              const text =
                m.text === "(attachment)" ? "" : (m.text ?? "").trim();
              return text.length > 0 || atts.length > 0;
            };
            const visibleReplies = replies.filter(hasContent);
            return visibleReplies.length === 0 ? (
              <p className="tab-chat-empty">
                {t("caseMgmt.discussion.emptyReplies")}
              </p>
            ) : (
              <ul className="tab-chat-list">
                {visibleReplies.map((msg) => {
                  const isOwn =
                    currentUserId != null &&
                    msg.userId != null &&
                    Number(msg.userId) === currentUserId;
                  const attachments = msg.attachments ?? [];
                  const isDeleted = isCaseDeletedMessage(
                    msg.text,
                    attachments.length
                  );
                  const textToShow = isDeleted
                    ? ""
                    : msg.text === "(attachment)"
                      ? ""
                      : formatDiscussionMessageHtml(msg.text, {
                          t,
                          plainTextFromMessageHtml,
                          sanitizeHtml,
                          messages: visibleReplies,
                          fromMessage: msg,
                          getMessagePreview: (m) =>
                            getMessagePreview(m, sanitizeHtml, t),
                        });
                  const docsBaseUrl = getDiscussionDocsBaseUrl();
                  const messageKey = getMessageKey(msg);
                  return (
                    <li
                      key={messageKey}
                      className={`tab-chat-bubble ${isOwn ? "tab-chat-bubble--own" : "tab-chat-bubble--other"}${messageMenu?.messageKey === messageKey ? " tab-chat-bubble--menu-focus" : ""}`}
                      data-message-key={messageKey}
                    >
                      <div
                        className="tab-chat-bubble-card"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => onBubbleClick(e, { msg })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onBubbleClick(e, { msg });
                          }
                        }}
                        onContextMenu={(e) => onBubbleContextMenu(e, { msg })}
                      >
                        <span className="tab-chat-bubble-meta">
                          {msg.author || "—"} · {msg.date} {msg.time}
                        </span>
                        {attachments.length > 0 && !isDeleted && (
                          <div className="tab-chat-bubble-attachments doc-cards-grid">
                            {attachments.map((att, i) => {
                              const docUrl = buildDocUrl(
                                docsBaseUrl,
                                caseId,
                                att.storedFilename
                              );
                              const isOwn = isOwnDiscussionMessage(
                                msg,
                                currentUserId
                              );
                              const canDeleteAttachment =
                                isOwn &&
                                canMutateMessage(msg) &&
                                msg.source === "reply";
                              return (
                                <DocPreviewCard
                                  key={`${att.storedFilename}-${i}`}
                                  doc={{
                                    storedFilename: att.storedFilename,
                                    filename: att.filename,
                                  }}
                                  docUrl={docUrl}
                                  allowDownload={isOwn}
                                  onImageClick={(src, alt) => {
                                    setLightbox({ src, alt });
                                  }}
                                  onDelete={
                                    canDeleteAttachment
                                      ? async (storedFilename) => {
                                          await deleteReplyAttachment(
                                            caseId,
                                            msg.id,
                                            storedFilename
                                          );
                                          await fetchReplies();
                                        }
                                      : undefined
                                  }
                                  variant="grid"
                                />
                              );
                            })}
                          </div>
                        )}
                        {isDeleted ? (
                          <p className="tab-chat-bubble-deleted">
                            {t("caseMgmt.discussion.messageDeleted")}
                          </p>
                        ) : (
                          textToShow && (
                            <p
                              className="tab-chat-bubble-text"
                              dangerouslySetInnerHTML={{
                                __html: textToShow,
                              }}
                            />
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
        {lightbox && (
          <ImageLightbox
            src={lightbox.src}
            alt={lightbox.alt}
            onClose={() => setLightbox(null)}
          />
        )}
        <ChatMessageActionSheet
          open={!!messageMenu?.actions?.length}
          actions={messageMenu?.actions ?? []}
          focusMessageKey={messageMenu?.messageKey ?? null}
          messagesScrollRef={messagesScrollRef}
          tabChatRootRef={tabChatRootRef}
          onClose={closeMessageMenu}
        />
        <ConfirmDialog
          open={!!pendingDeleteMessage}
          title={t("caseMgmt.discussion.messageActions.deleteConfirmTitle")}
          message={t("caseMgmt.discussion.messageActions.deleteConfirm")}
          confirmLabel={t("caseMgmt.discussion.messageActions.delete")}
          cancelLabel={t("caseMgmt.discussion.messageActions.cancel")}
          confirmVariant="danger"
          onConfirm={confirmDeleteMessage}
          onCancel={() => !deletingMessage && setPendingDeleteMessage(null)}
        />
        {pendingEditMessage && (
          <div
            className="tab-chat-edit-overlay"
            role="dialog"
            aria-modal="true"
          >
            <div className="tab-chat-edit-dialog">
              <h3 className="tab-chat-edit-title">
                {t("caseMgmt.discussion.messageActions.editConfirmTitle")}
              </h3>
              <textarea
                className="tab-chat-edit-textarea"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={4}
                disabled={editingMessage}
              />
              <div className="tab-chat-edit-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={editingMessage}
                  onClick={() => {
                    if (!editingMessage) {
                      setPendingEditMessage(null);
                      setEditDraft("");
                    }
                  }}
                >
                  {t("caseMgmt.discussion.messageActions.cancel")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={editingMessage || !String(editDraft).trim()}
                  onClick={confirmEditMessage}
                >
                  {editingMessage
                    ? t("caseMgmt.discussion.sending")
                    : t("caseMgmt.discussion.messageActions.saveEdit")}
                </button>
              </div>
            </div>
          </div>
        )}
        {showChat &&
          replyingTo &&
          (() => {
            const replyCtx = getReplyTargetContext(replyingTo, {
              caseId,
              docsBaseUrl: getDiscussionDocsBaseUrl(),
              t,
              sanitizeHtml,
            });
            return (
              <div className="tab-chat-reply-bar">
                <div className="tab-chat-reply-bar-content">
                  <span className="tab-chat-reply-bar-label">
                    {t("caseMgmt.discussion.messageActions.replyingTo", {
                      name: replyCtx.label,
                    })}
                  </span>
                  <span className="tab-chat-reply-bar-preview">
                    {replyCtx.text}
                  </span>
                </div>
                {replyCtx.thumbnailUrl && replyCtx.kind === "image" ? (
                  <div className="tab-chat-reply-bar-thumb">
                    <img src={replyCtx.thumbnailUrl} alt="" />
                  </div>
                ) : null}
                {replyCtx.thumbnailUrl && replyCtx.kind === "video" ? (
                  <div className="tab-chat-reply-bar-thumb tab-chat-reply-bar-thumb--video">
                    <video
                      src={replyCtx.thumbnailUrl}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <i className="fas fa-play-circle" aria-hidden />
                  </div>
                ) : null}
                {replyCtx.showAudioIcon ? (
                  <div className="tab-chat-reply-bar-thumb tab-chat-reply-bar-thumb--audio">
                    <i className="fas fa-microphone" aria-hidden />
                  </div>
                ) : null}
                <button
                  type="button"
                  className="tab-chat-reply-bar-cancel"
                  onClick={() => setReplyingTo(null)}
                  aria-label={t(
                    "caseMgmt.discussion.messageActions.cancelReply"
                  )}
                >
                  <i className="fas fa-times" aria-hidden />
                </button>
              </div>
            );
          })()}
        {showChat && attachedPreviews.length > 0 && (
          <div className="tab-chat-attached-files">
            {attachedPreviews.map((entry, i) => (
              <div
                key={`${entry.file.name}-${i}`}
                className={`tab-chat-attached-item${entry.kind !== "file" ? " tab-chat-attached-item--media" : ""}`}
              >
                {entry.previewUrl && entry.kind === "image" ? (
                  <img
                    className="tab-chat-attached-thumb"
                    src={entry.previewUrl}
                    alt=""
                  />
                ) : null}
                {entry.previewUrl && entry.kind === "video" ? (
                  <div className="tab-chat-attached-thumb-wrap tab-chat-attached-thumb-wrap--video">
                    <video
                      className="tab-chat-attached-thumb"
                      src={entry.previewUrl}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <i className="fas fa-play-circle" aria-hidden />
                  </div>
                ) : null}
                {entry.kind === "file" ? (
                  <span className="tab-chat-attached-name">
                    {entry.file.name}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="tab-chat-attached-remove"
                  onClick={() =>
                    setAttachedFiles((prev) =>
                      prev.filter((_, idx) => idx !== i)
                    )
                  }
                  aria-label={t("caseMgmt.discussion.removeAttachmentAria", {
                    name: entry.file.name,
                  })}
                >
                  <i className="fas fa-times" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
        {showChat && (
          <div className="tab-chat-compose">
            <ChatComposeInput
              ref={composeRef}
              value={draft}
              onChange={setDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              placeholder={t("caseMgmt.discussion.replyPlaceholder")}
              ariaLabel={t("caseMgmt.discussion.replyAria")}
              disabled={sending}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              className="tab-chat-file-input-hidden"
              aria-hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setAttachedFiles((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="tab-chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label={t("caseMgmt.discussion.attachFileAria")}
              title={t("caseMgmt.discussion.attachFileTitle")}
            >
              <i className="fas fa-paperclip" aria-hidden />
            </button>
            <button
              type="button"
              className="tab-chat-send"
              onClick={sendReply}
              disabled={
                (!draft.trim() && attachedFiles.length === 0) || sending
              }
              aria-busy={sending}
              title={t("caseMgmt.discussion.sendButtonTitle")}
            >
              <i
                className="fas fa-paper-plane tab-chat-send-icon"
                aria-hidden
              />
              <span className="tab-chat-send-label">
                {sending
                  ? t("caseMgmt.discussion.sending")
                  : t("caseMgmt.discussion.send")}
              </span>
            </button>
            <span className="tab-chat-hint">
              {t("caseMgmt.discussion.composeKeyboardHint")}
            </span>
          </div>
        )}
      </>
    </div>
  );
}
