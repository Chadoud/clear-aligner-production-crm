import { formatGapLabel } from "../../config/dtgUtils.js";

export default function GapZone({
  gapKey,
  arch,
  steps,
  isOver,
  isMidline,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onEditStep,
}) {
  const hasSteps = steps.length > 0;
  const isUpper = arch === "upper";

  const bubbles = (
    <div className="dtg-gap-bubbles">
      {steps.map((step, idx) => (
        <button
          key={idx}
          type="button"
          className={[
            "dtg-gap-bubble",
            (step.stripings || []).length > 0 ? "dtg-gap-bubble--striped" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={(e) => {
            e.stopPropagation();
            onEditStep?.(gapKey, idx);
          }}
          title={`Step ${step.stepNum}${(step.stripings || []).length > 0 ? ` + ${(step.stripings || []).length} striping` : ""} – click to edit`}
        >
          {step.stepNum}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={[
        "dtg-gap",
        isUpper ? "dtg-gap--upper" : "dtg-gap--lower",
        isOver ? "dtg-gap--over" : "",
        hasSteps ? "dtg-gap--has-steps" : "",
        isMidline ? "dtg-gap--midline" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={-1}
      aria-label={`Gap ${formatGapLabel(gapKey)}${hasSteps ? `, ${steps.length} step(s)` : ""}`}
    >
      {isUpper ? (
        <>
          <div className="dtg-gap-line" />
          {bubbles}
        </>
      ) : (
        <>
          {bubbles}
          <div className="dtg-gap-line" />
        </>
      )}
    </div>
  );
}
