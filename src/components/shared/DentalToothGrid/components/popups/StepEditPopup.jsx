import { useState } from "react";
import { createPortal } from "react-dom";
import { STRIPING_OPTIONS } from "../../config/constants.js";
import { StrippingOptionIcon } from "../../shared/DentalToothGridIcons.jsx";
import { formatGapLabel } from "../../config/dtgUtils.js";

export default function StepEditPopup({
  gapKey,
  step,
  isNew,
  onSave,
  onRemove,
  onClose,
}) {
  const initial = (step.stripings && step.stripings[0]) || null;
  const [selected, setSelected] = useState(initial);

  const handleCancel = () => {
    if (isNew) onRemove();
    onClose();
  };

  const handleSave = () => {
    if (selected) {
      onSave([selected]);
    }
  };

  return createPortal(
    <div className="dtg-popup-overlay" onClick={handleCancel}>
      <div
        className="dtg-popup-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dtg-popup-header">
          <span className="dtg-popup-title">
            <span className="dtg-step-chip-inline">{step.stepNum}</span>
            Step {step.stepNum} —{" "}
            <span style={{ fontSize: "0.85em", fontWeight: 400 }}>
              {formatGapLabel(gapKey)}
            </span>
          </span>
          <button
            type="button"
            className="dtg-popup-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>
        <div className="dtg-popup-body">
          <p className="dtg-popup-section-label">
            <i className="fas fa-cut" aria-hidden /> Striping{" "}
            <span className="dtg-popup-required">— required</span>
          </p>
          <div
            className="dtg-popup-radios"
            role="radiogroup"
            aria-label="Striping type"
          >
            {STRIPING_OPTIONS.map((opt) => (
              <label key={opt.id} className="dtg-popup-radio-item">
                <input
                  type="radio"
                  name="striping"
                  value={opt.id}
                  checked={selected === opt.id}
                  onChange={() => setSelected(opt.id)}
                />
                <StrippingOptionIcon optionId={opt.id} />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="dtg-popup-footer">
          <button
            type="button"
            className="dtg-popup-btn dtg-popup-btn--save"
            onClick={handleSave}
            disabled={!selected}
            aria-label="Save striping selection"
          >
            <i className="fas fa-check" aria-hidden /> Save
          </button>
          <button
            type="button"
            className="dtg-popup-btn dtg-popup-btn--remove"
            onClick={
              isNew
                ? handleCancel
                : () => {
                    onRemove();
                    onClose();
                  }
            }
          >
            <i className="fas fa-trash-alt" aria-hidden />{" "}
            {isNew ? "Cancel" : "Remove step"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
