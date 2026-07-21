/**
 * Reusable card primitive. Uses design tokens.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.highlight] - accent border/background
 * @param {boolean} [props.clickable] - hover + cursor
 * @param {() => void} [props.onClick]
 * @param {string} [props['aria-label']]
 * @param {boolean} [props.dot] - show filter-state dot indicator in top-right corner
 * @param {boolean} [props.dotActive] - true = dot uses dotColor; false = grey (inactive)
 * @param {string} [props.dotColor] - CSS color for the active dot state
 */
import "./Card.css";

export default function Card({
  children,
  className = "",
  highlight = false,
  clickable = false,
  onClick,
  "aria-label": ariaLabel,
  dot = false,
  dotActive = false,
  dotColor = "var(--primary-blue)",
}) {
  const classes = [
    "shared-card",
    highlight ? "shared-card--highlight" : "",
    clickable ? "shared-card--clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Wrapper = clickable || onClick ? "button" : "div";
  const wrapperProps =
    Wrapper === "button"
      ? { type: "button", onClick, "aria-label": ariaLabel }
      : {};

  return (
    <Wrapper className={classes} {...wrapperProps}>
      {dot && (
        <span
          className="shared-card-dot"
          style={dotActive ? { background: dotColor } : undefined}
          aria-hidden
        />
      )}
      {children}
    </Wrapper>
  );
}
