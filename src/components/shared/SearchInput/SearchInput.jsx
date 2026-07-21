import "./SearchInput.css";

/**
 * @param {Object} props
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {string} [props.placeholder="Search"]
 * @param {string} [props.label] - e.g. "search:"
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel]
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  label,
  className = "",
  ariaLabel = "Search",
}) {
  const input = (
    <input
      type="text"
      className={`search-input ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );

  if (label) {
    return (
      <label className="search-input-label">
        {label}
        {input}
      </label>
    );
  }
  return input;
}
