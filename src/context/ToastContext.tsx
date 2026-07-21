import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastContainer } from "@/components/shared/Toast/ToastContainer";

export type ToastVariant =
  | "success"
  | "error"
  | "info"
  | "warning"
  | "notification";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
  dedupeKey?: string;
}

export interface ToastItem extends Required<Pick<ToastInput, "message">> {
  id: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  show: (input: ToastInput) => string | null;
  success: (
    message: string,
    options?: Omit<ToastInput, "message" | "variant">
  ) => string | null;
  error: (
    message: string,
    options?: Omit<ToastInput, "message" | "variant">
  ) => string | null;
  info: (
    message: string,
    options?: Omit<ToastInput, "message" | "variant">
  ) => string | null;
  warning: (
    message: string,
    options?: Omit<ToastInput, "message" | "variant">
  ) => string | null;
  notification: (
    message: string,
    options?: Omit<ToastInput, "message" | "variant">
  ) => string | null;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 4;
const DEDUPE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  info: 4000,
  warning: 5000,
  notification: 5000,
};

let toastCounter = 0;

function nextToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dedupeRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput): string | null => {
      const variant = input.variant ?? "info";
      const duration = input.duration ?? DEFAULT_DURATIONS[variant];

      if (input.dedupeKey) {
        const now = Date.now();
        const lastShown = dedupeRef.current.get(input.dedupeKey);
        if (lastShown != null && now - lastShown < DEDUPE_TTL_MS) {
          return null;
        }
        dedupeRef.current.set(input.dedupeKey, now);
      }

      const id = nextToastId();
      const toast: ToastItem = {
        id,
        message: input.message,
        variant,
        duration,
        action: input.action,
      };

      setToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS));

      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismiss]
  );

  const makeVariant = useCallback(
    (variant: ToastVariant) =>
      (message: string, options?: Omit<ToastInput, "message" | "variant">) =>
        show({ ...options, message, variant }),
    [show]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: makeVariant("success"),
      error: makeVariant("error"),
      info: makeVariant("info"),
      warning: makeVariant("warning"),
      notification: makeVariant("notification"),
      dismiss,
    }),
    [show, dismiss, makeVariant]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
