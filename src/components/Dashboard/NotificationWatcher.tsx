import { useNotificationWatcher } from "@/hooks/useNotificationWatcher";

/** Mount once inside the dashboard shell to poll for new alerts and show toasts. */
export default function NotificationWatcher() {
  useNotificationWatcher();
  return null;
}
