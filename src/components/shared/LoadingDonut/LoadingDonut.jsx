import "./LoadingDonut.css";

/**
 * Centered donut loading indicator with "Loading..." text above.
 * Use as Suspense fallback or for any loading state.
 *
 * @param {string} [size="md"] - "sm" | "md" | "lg" for donut size
 * @param {string} [className] - Optional wrapper class
 * @param {string} [message="Loading..."] - Text above the donut
 */
export default function LoadingDonut({
  size = "md",
  className = "",
  message = "Loading...",
}) {
  return (
    <div
      className={`loading-donut-wrap loading-donut-wrap--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <span className="loading-donut-message">{message}</span>
      <div className="loading-donut" aria-hidden />
    </div>
  );
}
