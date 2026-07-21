import { createPortal } from "react-dom";

/**
 * Modal to confirm deletion of an invoice (or other entity).
 * Portaled to document.body so the overlay covers fixed chrome (Patients panel, header).
 */
export default function DeleteConfirmModal({
  clientName,
  onConfirm,
  onCancel,
  isDeleting = false,
}) {
  return createPortal(
    <div
      className="delete-confirm-modal"
      onClick={isDeleting ? () => {} : onCancel}
    >
      <div
        className="delete-confirm-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-confirm-header">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Confirm Delete</h3>
        </div>
        <div className="delete-confirm-body">
          <p>
            Are you sure you want to delete the invoice for{" "}
            <strong>{clientName}</strong>?
          </p>
          <p className="delete-warning">This action cannot be undone.</p>
        </div>
        <div className="delete-confirm-actions">
          <button
            type="button"
            className="btn-base btn-base--cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-confirm-delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>{" "}
                Deleting...
              </>
            ) : (
              <>
                <i className="fas fa-trash"></i> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
