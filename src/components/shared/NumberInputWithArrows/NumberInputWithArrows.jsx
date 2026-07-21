/**
 * NumberInputWithArrows – number input with up/down arrow buttons (like amount paid + stepper).
 * Supports integers (step=1) and decimals (step=0.01, 0.05, etc.) for currency.
 */

const clamp = (n, min, max) => Math.min(Math.max(Number(n), min), max);

const roundToStep = (value, step) => {
  if (step <= 0 || !Number.isFinite(step)) return value;
  const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 2) : 0;
  const rounded = Math.round(value / step) * step;
  return decimals ? Number(rounded.toFixed(decimals)) : Math.round(rounded);
};

/**
 * @param {Object} props
 * @param {string} props.value - current value (string, e.g. "12" or "500.50")
 * @param {(value: string) => void} props.onChange
 * @param {number} [props.min=1] - use 0 for currency
 * @param {number} [props.max=36] - use e.g. 999999.99 for currency
 * @param {number} [props.step=1] - use 0.01 or 0.05 for currency
 * @param {string} [props.placeholder]
 * @param {string} [props.id]
 * @param {string} [props['aria-label']]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 * @param {() => void} [props.onBlur]
 */
export default function NumberInputWithArrows({
  value,
  onChange,
  min = 1,
  max = 36,
  step = 1,
  placeholder = "Select",
  id,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
  className = "",
  disabled = false,
  onBlur,
}) {
  const isDecimal = step < 1;
  const parse = isDecimal ? (v) => parseFloat(v, 10) : (v) => parseInt(v, 10);
  const numValue =
    value === "" || value == null
      ? null
      : roundToStep(clamp(parse(value) || min, min, max), step);
  /* For decimals: show round numbers without .00 (350 not 350.00); non-integers as-is */
  const displayValue =
    value === "" || value == null
      ? ""
      : isDecimal
        ? (() => {
            const n = parseFloat(value, 10);
            return Number.isFinite(n) && Number.isInteger(n)
              ? String(n)
              : String(value);
          })()
        : String(numValue ?? value);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange("");
      return;
    }
    if (isDecimal) {
      /* Allow typing freely: "3", "32", "32.", "32.5" etc; only reject invalid or out-of-range */
      if (!/^\d*\.?\d*$/.test(raw)) return;
      const n = parseFloat(raw, 10);
      if (Number.isNaN(n)) {
        if (raw === ".") onChange(raw);
        return;
      }
      if (n < min || n > max) onChange(String(clamp(n, min, max)));
      else onChange(raw);
      return;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    onChange(String(clamp(n, min, max)));
  };

  const addStep = (current) => {
    const cur = current === "" ? min : parse(displayValue) || min;
    return roundToStep(clamp(cur + step, min, max), step);
  };
  const subStep = () => {
    if (displayValue === "") return roundToStep(min, step);
    const cur = parse(displayValue) || min;
    return roundToStep(clamp(cur - step, min, max), step);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onChange(String(addStep(displayValue)));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onChange(String(subStep()));
    }
  };

  const increment = () => {
    if (disabled) return;
    onChange(String(addStep(displayValue)));
  };

  const decrement = () => {
    if (disabled) return;
    onChange(String(subStep()));
  };

  return (
    <div className={`number-input-with-arrows ${className}`.trim()}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode={isDecimal ? "decimal" : "numeric"}
        className="form-input number-input-with-arrows-input"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        id={id}
        data-testid={dataTestId}
      />
      <div className="number-input-arrows" aria-hidden>
        <button
          type="button"
          className="number-arrow-btn number-arrow-up"
          onClick={increment}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Increase"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
            <path
              d="M1 5l4-4 4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="number-arrow-btn number-arrow-down"
          onClick={decrement}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Decrease"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
