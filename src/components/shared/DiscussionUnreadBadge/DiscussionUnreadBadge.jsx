/** iOS-style red unread badge for discussion channels. */
import "./discussionUnreadBadge.css";

export function formatDiscussionUnreadCount(count) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  if (n > 99) return "99+";
  return String(n);
}

export default function DiscussionUnreadBadge({ count, className = "" }) {
  const label = formatDiscussionUnreadCount(count);
  if (!label) return null;

  const isDot = label.length === 1;
  const classes = [
    "discussion-unread-badge",
    isDot ? "discussion-unread-badge--dot" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      {label}
    </span>
  );
}
