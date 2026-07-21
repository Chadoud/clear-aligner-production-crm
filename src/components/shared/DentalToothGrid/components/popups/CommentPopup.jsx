import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function CommentPopup({
  toothNum,
  /** When set (e.g. stripping plan step), replaces “tooth N” in the title. */
  subtitle,
  initialText,
  hasExisting,
  onSave,
  onRemove,
  onClose,
  placeholder,
}) {
  const [text, setText] = useState(initialText);
  const taRef = useRef(null);
  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const resolvedPlaceholder =
    placeholder ?? "Enter your clinical comment for this tooth…";

  return createPortal(
    <div className="dtg-popup-overlay" onClick={onClose}>
      <div
        className="dtg-popup-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dtg-popup-header">
          <span className="dtg-popup-title">
            <i
              className="fas fa-exclamation-triangle"
              style={{ color: "#ea580c" }}
              aria-hidden
            />{" "}
            Comment —{" "}
            {subtitle != null ? (
              <strong>{subtitle}</strong>
            ) : (
              <>
                tooth <strong>{toothNum}</strong>
              </>
            )}
          </span>
          <button
            type="button"
            className="dtg-popup-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>
        <div className="dtg-popup-body">
          <textarea
            ref={taRef}
            className="dtg-popup-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={resolvedPlaceholder}
            rows={4}
          />
        </div>
        <div className="dtg-popup-footer">
          {hasExisting && (
            <button
              type="button"
              className="dtg-popup-btn dtg-popup-btn--remove"
              onClick={onRemove}
            >
              <i className="fas fa-trash-alt" aria-hidden /> Remove
            </button>
          )}
          <button
            type="button"
            className="dtg-popup-btn dtg-popup-btn--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dtg-popup-btn dtg-popup-btn--save"
            onClick={() => onSave(text.trim())}
          >
            <i className="fas fa-check" aria-hidden /> Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
