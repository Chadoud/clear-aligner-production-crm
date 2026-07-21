import { createPortal } from "react-dom";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  open,
  title = "Please confirm",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <h3 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h3>
        </div>
        <div className="confirm-dialog-body">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-btn confirm-dialog-btn-${confirmVariant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
