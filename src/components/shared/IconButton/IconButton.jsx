/**
 * IconButton – shared component for any button that shows an icon + label.
 *
 * Props:
 *   variant   – "primary" | "secondary" | "cancel" | "print" | "success" | "danger"
 *               Defaults to "secondary".
 *   icon      – FontAwesome class string, e.g. "fas fa-print". Omit for label-only.
 *   children  – Button label text.
 *   className – Extra class names appended after btn-base.
 *   disabled  – Boolean.
 *   type      – HTML button type (default "button").
 *   ...rest   – Any other native button props (onClick, aria-label, title, etc.).
 *
 * Usage:
 *   <IconButton variant="print" icon="fas fa-print" onClick={handlePrint}>
 *     Print
 *   </IconButton>
 */
export default function IconButton({
  variant = "secondary",
  icon,
  children,
  className = "",
  disabled = false,
  type = "button",
  ...rest
}) {
  const classes = ["btn-base", `btn-base--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled} {...rest}>
      {icon && <i className={icon} aria-hidden />}
      {children}
    </button>
  );
}
