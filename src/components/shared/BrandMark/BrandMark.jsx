import PropTypes from "prop-types";

/**
 * Generic product mark for the public CRM tree (no client brand artwork).
 * Swap assets under public/assets/brand/ in private deployments if needed.
 */
export default function BrandMark({
  height = 32,
  width = "auto",
  textColor,
  className = "",
  ariaLabel = "Aligner CRM",
  style = {},
}) {
  const wrapperStyle = {
    display: "block",
    height: typeof height === "number" ? `${height}px` : height,
    width:
      width === "auto" || width == null
        ? "auto"
        : typeof width === "number"
          ? `${width}px`
          : width,
    flexShrink: 0,
    ...style,
  };

  const fill = textColor || "#2D3884";

  return (
    <span
      className={className}
      style={wrapperStyle}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 280 48"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block",
          height: "100%",
          width: "auto",
          objectFit: "contain",
        }}
      >
        <rect x="0" y="8" width="32" height="32" rx="6" fill={fill} />
        <text
          x="44"
          y="33"
          fontFamily="system-ui, Segoe UI, sans-serif"
          fontSize="22"
          fontWeight="700"
          fill={fill}
        >
          Aligner CRM
        </text>
      </svg>
    </span>
  );
}

BrandMark.propTypes = {
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  textColor: PropTypes.string,
  crossRed: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
  style: PropTypes.object,
  svgPreserveAspectRatio: PropTypes.string,
};
