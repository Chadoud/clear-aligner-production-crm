import { createPortal } from "react-dom";
import type { ToastItem as ToastItemType } from "@/context/ToastContext";
import ToastItem from "./ToastItem";

interface ToastContainerProps {
  toasts: ToastItemType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (typeof document === "undefined" || toasts.length === 0) return null;

  return createPortal(
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}
