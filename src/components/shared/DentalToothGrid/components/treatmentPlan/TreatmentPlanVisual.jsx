/**
 * Treatment plan summary: each arch as a horizontal baseline; for every gap with steps,
 * a vertical connector drops down to step bubble(s), then lines to striping tags.
 * Hover card shows striping icons for the hovered step.
 */
import {
  UPPER_GAP_KEYS,
  LOWER_GAP_KEYS,
  STRIPING_MAP,
} from "../../config/constants.js";
import { gapShortLabel, stepMatches } from "../../config/dtgUtils.js";
import { StrippingOptionIcon } from "../../shared/DentalToothGridIcons.jsx";

export default function TreatmentPlanVisual({
  treatmentSteps,
  highlightedStep = null,
  hoveredStep = null,
  onStepClick = null,
  onStepHover = null,
}) {
  const hasUpperSteps = UPPER_GAP_KEYS.some(
    (k) => treatmentSteps[k]?.length > 0
  );
  const hasLowerSteps = LOWER_GAP_KEYS.some(
    (k) => treatmentSteps[k]?.length > 0
  );
  if (!hasUpperSteps && !hasLowerSteps) return null;

  const renderArch = (gapKeys, label) => {
    const entries = [];
    gapKeys.forEach((gapKey) => {
      const steps = treatmentSteps[gapKey] || [];
      steps.forEach((step, stepIdx) => {
        entries.push({ gapKey, step, stepIdx });
      });
    });
    entries.sort((a, b) => a.step.stepNum - b.step.stepNum);
    if (entries.length === 0) return null;

    return (
      <div className="tp-arch-row">
        <span className="tp-arch-label">{label}</span>
        <div className="tp-gaps-row">
          {entries.map(({ gapKey, step, stepIdx }) => {
            const isHighlighted = stepMatches(highlightedStep, gapKey, stepIdx);
            const isHovered = stepMatches(hoveredStep, gapKey, stepIdx);
            const isClickable = Boolean(onStepClick);
            const isHoverable = Boolean(onStepHover);
            const stripings = step.stripings || [];
            return (
              <div
                key={`${gapKey}-${stepIdx}-${step.stepNum}`}
                className={`tp-gap-col${isHighlighted ? " tp-gap-col--highlighted" : ""}${isClickable ? " tp-gap-col--clickable" : ""}`}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={
                  isClickable ? () => onStepClick(gapKey, stepIdx) : undefined
                }
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onStepClick(gapKey, stepIdx);
                        }
                      }
                    : undefined
                }
                onMouseEnter={
                  isHoverable
                    ? () => onStepHover({ gapKey, stepIdx })
                    : undefined
                }
                onMouseLeave={isHoverable ? () => onStepHover(null) : undefined}
                aria-pressed={isClickable ? isHighlighted : undefined}
              >
                {isHovered && (
                  <div className="tp-step-hover-card" role="tooltip">
                    <div className="tp-step-hover-card-header">
                      <span className="tp-step-hover-card-step">
                        Step {step.stepNum}
                      </span>
                      <span className="tp-step-hover-card-gap">
                        Teeth {gapShortLabel(gapKey)}
                      </span>
                    </div>
                    {stripings.length > 0 ? (
                      <div className="tp-step-hover-card-stripings">
                        {stripings.map((sid) => (
                          <div
                            key={sid}
                            className="tp-step-hover-card-striping-item"
                            title={STRIPING_MAP[sid]?.label ?? sid}
                          >
                            <StrippingOptionIcon optionId={sid} />
                            <span>{STRIPING_MAP[sid]?.label ?? sid}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tp-step-hover-card-empty">
                        No striping
                      </div>
                    )}
                  </div>
                )}
                <span className="tp-gap-label">{gapShortLabel(gapKey)}</span>
                <div className="tp-gap-connector-top" />
                <div className="tp-gap-tick" />
                <div className="tp-step-entry">
                  <div className="tp-step-connector-line" />
                  <div className="tp-step-bubble">{step.stepNum}</div>
                  {stripings.length > 0 && (
                    <>
                      <div className="tp-step-striping-line" />
                      <div className="tp-step-stripings">
                        {stripings.map((sid) => (
                          <span key={sid} className="tp-striping-tag">
                            {STRIPING_MAP[sid]?.short ?? sid}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="tp-visual">
      <div className="tp-visual-header">
        <i className="fas fa-file-medical-alt" aria-hidden />
        <span>Treatment plan summary</span>
      </div>
      {renderArch(UPPER_GAP_KEYS, "Upper")}
      {renderArch(LOWER_GAP_KEYS, "Lower")}
    </div>
  );
}
