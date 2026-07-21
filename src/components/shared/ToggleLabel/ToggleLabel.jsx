/**
 * Reusable toggle (checkbox) with label.
 * Used in QuotationForm toggles and invoice card toggles.
 *
 * @module components/shared/ToggleLabel
 */

/**
 * @param {Object} props
 * @param {string} props.label - Label text
 * @param {boolean} props.checked - Checked state
 * @param {function(boolean): void} props.onChange - Called with new checked value
 * @param {string} [props.labelClassName] - Class for label wrapper (default: "toggle-label")
 * @param {string} [props.textClassName] - Class for label text (default: "toggle-label-text")
 * @param {boolean} [props.disabled] - Disable the toggle
 */
export default function ToggleLabel({
  label,
  checked,
  onChange,
  labelClassName = "toggle-label",
  textClassName = "toggle-label-text",
  disabled = false,
}) {
  return (
    <label className={labelClassName}>
      <span className={textClassName}>{label}</span>
      <div className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="toggle-input"
          disabled={disabled}
        />
        <span className="toggle-slider"></span>
      </div>
    </label>
  );
}
