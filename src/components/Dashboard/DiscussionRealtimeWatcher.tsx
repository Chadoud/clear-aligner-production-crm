import { useDiscussionRealtimeToasts } from "@/hooks/useDiscussionRealtimeToasts";

/** Mount once in the dashboard shell for instant discussion message toasts. */
export default function DiscussionRealtimeWatcher() {
  useDiscussionRealtimeToasts();
  return null;
}
