/**
 * Unified document preview card — used across Private docs, Doc categories,
 * Patient file, and Discussion. Shows image thumbnail or file-type icon.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import VoiceMessagePlayer from "@/components/shared/VoiceMessagePlayer/VoiceMessagePlayer";
import "./DocPreviewCard.css";
import {
  getDocDisplayName,
  isDocVideo,
  isDocAudio,
  DOC_IMAGE_EXT_REGEX,
} from "@/utils/docs/index.js";

const IMAGE_EXT_REGEX = DOC_IMAGE_EXT_REGEX;

function getFileIcon(displayName, storedFilename) {
  const name = (displayName || storedFilename || "").toLowerCase();
  if (/\.pdf$/i.test(name)) return "fas fa-file-pdf";
  if (/\.(doc|docx)$/i.test(name)) return "fas fa-file-word";
  if (/\.(xls|xlsx)$/i.test(name)) return "fas fa-file-excel";
  if (/\.txt$/i.test(name)) return "fas fa-file-alt";
  if (/\.(stl|obj|ply|3mf)$/i.test(name)) return "fas fa-cube";
  return "fas fa-file-alt";
}

export default function DocPreviewCard({
  doc,
  docUrl,
  onImageClick,
  onDelete,
  allowDownload = true,
  variant = "grid",
  messageFirst = false,
}) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const displayName = getDocDisplayName(doc);
  const isImage = IMAGE_EXT_REGEX.test(
    displayName || doc?.storedFilename || ""
  );
  const isVideo = isDocVideo(doc?.storedFilename, displayName);
  const isAudio = isDocAudio(doc?.storedFilename, displayName);
  const isTextNote = /\.txt$/i.test(doc?.storedFilename || "");
  const voiceLabel = t("caseMgmt.discussion.voiceMessage", "Voice message");
  const hasMessage = doc?.message && String(doc.message).trim().length > 0;

  const handleImageError = (e) => {
    e.target.style.display = "none";
    e.target.parentElement?.classList.add("doc-preview-card-image--error");
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete || !doc?.storedFilename || deleting) return;
    setPendingDelete({ storedFilename: doc.storedFilename, displayName });
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.storedFilename);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const showActions = docUrl && !isTextNote && (allowDownload || onDelete);

  const actions = showActions && (
    <div className="doc-preview-card-actions">
      {allowDownload && (
        <a
          href={docUrl}
          download={displayName}
          className="doc-preview-card-btn doc-preview-card-btn--download"
          title="Download"
          aria-label={`Download ${displayName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <i className="fas fa-download" />
        </a>
      )}
      {onDelete && (
        <button
          type="button"
          className="doc-preview-card-btn doc-preview-card-btn--delete"
          title="Delete"
          aria-label={`Delete ${displayName}`}
          onClick={handleDeleteClick}
          disabled={deleting}
        >
          <i
            className={`fas ${deleting ? "fa-spinner fa-spin" : "fa-trash-alt"}`}
          />
        </button>
      )}
    </div>
  );

  if (!docUrl) {
    return (
      <div className={`doc-preview-card doc-preview-card--${variant}`}>
        <div className="doc-preview-card-file">
          <i className="fas fa-file-alt doc-preview-card-file-icon" />
          <span className="doc-preview-card-name">{displayName}</span>
        </div>
      </div>
    );
  }

  const previewBlock = (
    <>
      {messageFirst && hasMessage && (
        <div className="doc-preview-card-message">{doc.message}</div>
      )}
      {isImage ? (
        <div className="doc-preview-card-preview doc-preview-card-preview--image">
          <button
            type="button"
            className="doc-preview-card-image-wrap"
            onClick={() => onImageClick?.(docUrl, displayName)}
            aria-label={`View ${displayName}`}
          >
            <img
              src={docUrl}
              alt={displayName}
              className="doc-preview-card-image"
              loading="lazy"
              onError={handleImageError}
            />
            <span className="doc-preview-card-overlay" aria-hidden>
              <i className="fas fa-search-plus" />
            </span>
          </button>
        </div>
      ) : isAudio ? (
        <div className="doc-preview-card-preview doc-preview-card-preview--audio">
          <VoiceMessagePlayer src={docUrl} label={voiceLabel} />
        </div>
      ) : isVideo ? (
        <div className="doc-preview-card-preview doc-preview-card-preview--video">
          <video
            className="doc-preview-card-video"
            src={docUrl}
            controls
            preload="metadata"
            playsInline
            aria-label={`Play ${displayName}`}
          />
        </div>
      ) : isTextNote ? (
        <div className="doc-preview-card-preview doc-preview-card-preview--text">
          <i className="fas fa-file-alt doc-preview-card-file-icon" />
        </div>
      ) : (
        <div className="doc-preview-card-preview doc-preview-card-preview--file">
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="doc-preview-card-file-link"
          >
            <i
              className={`${getFileIcon(displayName, doc.storedFilename)} doc-preview-card-file-icon`}
            />
          </a>
        </div>
      )}
      {!messageFirst && hasMessage && variant !== "grid" && (
        <div className="doc-preview-card-message">{doc.message}</div>
      )}
    </>
  );

  const footerLabel = isAudio ? voiceLabel : displayName;

  const footerBlock = isAudio ? (
    <div className="doc-preview-card-footer doc-preview-card-footer--voice">
      <span className="doc-preview-card-voice-label" title={voiceLabel}>
        <i className="fas fa-microphone" aria-hidden />
        <span>{voiceLabel}</span>
      </span>
      {variant !== "bubble" && actions}
    </div>
  ) : (
    <div className="doc-preview-card-footer">
      <span className="doc-preview-card-name" title={footerLabel}>
        {footerLabel}
      </span>
      {doc?.size && <span className="doc-preview-card-size">{doc.size}</span>}
      {variant !== "bubble" && actions}
    </div>
  );

  const messageFrame =
    hasMessage && variant === "grid" ? (
      <div className="doc-preview-card-message-frame" title={doc.message}>
        {doc.message}
      </div>
    ) : null;

  const content =
    variant === "bubble" ? (
      <>
        <div className="doc-preview-card-bubble-content tab-docs-prives-bubble-content">
          {previewBlock}
          {footerBlock}
        </div>
        {actions && (
          <div className="doc-preview-card-bubble-actions tab-docs-prives-bubble-actions">
            {actions}
          </div>
        )}
      </>
    ) : (
      <>
        {previewBlock}
        {footerBlock}
        {messageFrame}
      </>
    );

  const wrapperClass = `doc-preview-card doc-preview-card--${variant}${isAudio ? " doc-preview-card--voice" : ""}`;
  const outerClass =
    variant === "bubble"
      ? "tab-chat-bubble-card tab-docs-prives-bubble"
      : "doc-preview-card-wrapper";

  return (
    <>
      <div className={outerClass}>
        {variant === "bubble" ? (
          content
        ) : (
          <div className={wrapperClass}>{content}</div>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Confirm Delete"
        message={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.displayName}"?`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </>
  );
}
