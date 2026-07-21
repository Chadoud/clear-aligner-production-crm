import type { ToastItem as ToastItemType } from "@/context/ToastContext";

const ICONS: Record<ToastItemType["variant"], string> = {
  success: "fa-check-circle",
  error: "fa-exclamation-circle",
  info: "fa-info-circle",
  warning: "fa-exclamation-triangle",
  notification: "fa-bell",
};

interface ToastItemProps {
  toast: ToastItemType;
  onDismiss: (id: string) => void;
}

export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const role = toast.variant === "error" ? "alert" : "status";

  return (
    <div
      className={`toast-item toast-item--${toast.variant}`}
      role={role}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
    >
      <i className={`fas ${ICONS[toast.variant]}`} aria-hidden />
      <div className="toast-item-body">
        <span className="toast-item-message">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            className="toast-item-action"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        className="toast-item-close"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
      >
        <i className="fas fa-times" aria-hidden />
      </button>
    </div>
  );
}
