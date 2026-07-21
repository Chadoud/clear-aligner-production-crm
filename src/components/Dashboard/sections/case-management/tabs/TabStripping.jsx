import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRawPatient, useRefreshCaseSheetOnMount } from "@/hooks";
import { STRIPING_MAP } from "@/components/shared/DentalToothGrid/config/constants";
import {
  gapShortLabel,
  buildStepList,
  stepMatches,
  toSimpleStepId,
} from "@/components/shared/DentalToothGrid/config/dtgUtils";
import TreatmentPlanVisual from "@/components/shared/DentalToothGrid/components/treatmentPlan/TreatmentPlanVisual";
import TreatmentPlanSchemaVisual from "@/components/shared/DentalToothGrid/components/treatmentPlan/TreatmentPlanSchemaVisual";
import TreatmentPlanPreviewModal from "@/components/shared/DentalToothGrid/components/treatmentPlan/TreatmentPlanPreviewModal";
import "@/components/shared/DentalToothGrid/DentalToothGrid.css";
import "./TabStripping.css";

export default function TabStripping({
  patient,
  caseSheet = {},
  updateCaseSheet,
  refreshCaseSheet,
  isReadOnly = false,
}) {
  const { t } = useTranslation();
  const rawPatient = useRawPatient(patient?.ref);
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const [showPreview, setShowPreview] = useState(false);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [highlightedStep, setHighlightedStep] = useState(null);
  const effectiveHighlight = hoveredStep ?? highlightedStep;

  const treatmentSteps = useMemo(
    () => caseSheet.treatmentSteps || {},
    [caseSheet.treatmentSteps]
  );
  const stepList = useMemo(
    () => buildStepList(treatmentSteps),
    [treatmentSteps]
  );
  const dbStripping = rawPatient?.stripping ?? [];
  /** Last completed step in simple format, e.g. "17-16" */
  const lastCompletedStep = caseSheet.lastCompletedStep ?? null;

  const hasSteps = stepList.length > 0;

  /** Steps completed: step is done if it's at or before lastCompletedStep in the list */
  const completedSteps = useMemo(() => {
    const out = {};
    if (!lastCompletedStep) return out;
    const lastIdx = stepList.findIndex(
      (s) =>
        s.simpleId === lastCompletedStep ||
        toSimpleStepId(s.id) === lastCompletedStep
    );
    if (lastIdx < 0) return out;
    for (let i = 0; i <= lastIdx; i++) {
      out[stepList[i].id] = true;
    }
    return out;
  }, [stepList, lastCompletedStep]);

  /** Steps to show: all completed + the next one to do. List grows as user checks. */
  const visibleStepList = useMemo(() => {
    const firstUncheckedIdx = stepList.findIndex((s) => !completedSteps[s.id]);
    if (firstUncheckedIdx < 0) return stepList;
    return stepList.slice(0, firstUncheckedIdx + 1);
  }, [stepList, completedSteps]);

  /** Group by stepNum so same-step gaps appear on one row */
  const stepGroups = useMemo(() => {
    const byStep = new Map();
    visibleStepList.forEach((item) => {
      const n = item.stepNum;
      if (!byStep.has(n)) byStep.set(n, []);
      byStep.get(n).push(item);
    });
    return [...byStep.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([stepNum, items]) => ({ stepNum, items }));
  }, [visibleStepList]);

  const toggleStep = (id) => {
    if (isReadOnly) return;
    const step = stepList.find((s) => s.id === id);
    if (!step) return;
    const isCurrentlyDone = !!completedSteps[id];
    const simpleId = step.simpleId ?? toSimpleStepId(id);
    if (isCurrentlyDone) {
      const idx = stepList.findIndex((s) => s.id === id);
      const prevStep = idx > 0 ? stepList[idx - 1] : null;
      const nextLast = prevStep
        ? (prevStep.simpleId ?? toSimpleStepId(prevStep.id))
        : null;
      updateCaseSheet?.({ lastCompletedStep: nextLast });
    } else {
      updateCaseSheet?.({ lastCompletedStep: simpleId });
    }
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">
          {t("strippingTab.emptySelectPatient")}
        </p>
      </div>
    );
  }

  return (
    <div className="form-section tab-panel tab-stripping-panel">
      <h3 className="tab-panel-title">{t("strippingTab.title")}</h3>
      <p className="tab-panel-description">
        {t("strippingTab.description", { name: patient.name })}
      </p>

      {!isReadOnly && (
        <section className="tab-stripping-section tab-stripping-journey">
          <h4 className="sub-section-title">
            <i className="fas fa-route" aria-hidden />
            {t("strippingTab.stepTodoTitle")}
          </h4>
          {!hasSteps ? (
            <p className="tab-stripping-empty">
              {t("strippingTab.noStepsYet")}
            </p>
          ) : (
            <ul className="tab-stripping-todo-list">
              {stepGroups.map(({ stepNum, items }, groupIndex) => {
                const allDone = items.every((it) => completedSteps[it.id]);
                const allPreviousGroupsDone = stepGroups
                  .slice(0, groupIndex)
                  .every((g) => g.items.every((it) => completedSteps[it.id]));
                const firstUnchecked = items.find(
                  (it) => !completedSteps[it.id]
                );
                const hoverTarget = firstUnchecked ?? items[0];
                const isHovered = items.some((it) =>
                  stepMatches(hoveredStep, it.gapKey, it.stepIdx)
                );
                const isHighlighted = items.some((it) =>
                  stepMatches(highlightedStep, it.gapKey, it.stepIdx)
                );
                const isActive = isHovered || isHighlighted;
                return (
                  <li
                    key={`step-${stepNum}`}
                    className={`tab-stripping-todo-item ${!allDone && !allPreviousGroupsDone ? "tab-stripping-todo-item--disabled" : ""}`}
                    onMouseEnter={() =>
                      setHoveredStep({
                        gapKey: hoverTarget.gapKey,
                        stepIdx: hoverTarget.stepIdx,
                      })
                    }
                    onMouseLeave={() => setHoveredStep(null)}
                  >
                    <div
                      className={`tab-stripping-todo-row ${allDone ? "tab-stripping-todo-done" : ""} ${isActive ? "tab-stripping-todo-hovered" : ""}`}
                    >
                      <span className="tab-stripping-todo-step">
                        {t("strippingTab.stepPrefix", { step: stepNum })}
                      </span>
                      <span className="tab-stripping-todo-segments">
                        {items.map(({ id, gapKey, stepIdx, stripings }, i) => {
                          const done = completedSteps[id];
                          const isCheckable =
                            allPreviousGroupsDone &&
                            items
                              .slice(0, i)
                              .every((prev) => completedSteps[prev.id]);
                          const isDisabled = !done && !isCheckable;
                          const stripingLabels = stripings
                            .map((s) => STRIPING_MAP[s]?.label ?? s)
                            .join(", ");
                          return (
                            <span
                              key={gapKey}
                              className="tab-stripping-todo-segment-wrap"
                            >
                              {i > 0 && (
                                <span className="tab-stripping-todo-sep"></span>
                              )}
                              <label
                                className={`tab-stripping-todo-segment ${done ? "tab-stripping-todo-segment--done" : ""} ${isDisabled ? "tab-stripping-todo-segment--disabled" : ""}`}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setHoveredStep({ gapKey, stepIdx });
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!done}
                                  disabled={isDisabled}
                                  onChange={() => toggleStep(id)}
                                  className="tab-stripping-todo-checkbox"
                                />
                                {t("strippingTab.teethPrefix", {
                                  label: gapShortLabel(gapKey),
                                })}
                                {stripingLabels && (
                                  <span className="tab-stripping-todo-striping">
                                    {stripingLabels}
                                  </span>
                                )}
                              </label>
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="tab-stripping-section">
        <h4 className="sub-section-title">
          <i className="fas fa-file-medical-alt" aria-hidden />
          {t("strippingTab.treatmentSummaryTitle")}
        </h4>
        {hasSteps ? (
          <TreatmentPlanVisual
            treatmentSteps={treatmentSteps}
            highlightedStep={effectiveHighlight}
            hoveredStep={hoveredStep}
            onStepClick={(gapKey, stepIdx) =>
              setHighlightedStep((prev) =>
                prev?.gapKey === gapKey && prev?.stepIdx === stepIdx
                  ? null
                  : { gapKey, stepIdx }
              )
            }
            onStepHover={setHoveredStep}
          />
        ) : (
          <p className="tab-stripping-empty">
            {t("strippingTab.noTreatmentPlan")}
          </p>
        )}
      </section>

      <section className="tab-stripping-section">
        <div className="sub-section-title-row">
          <h4 className="sub-section-title">
            <i className="fas fa-tooth" aria-hidden />
            {t("strippingTab.visualPlanTitle")}
          </h4>
          {hasSteps && !isReadOnly && (
            <button
              type="button"
              className="tp-schema-preview-btn"
              onClick={() => setShowPreview(true)}
              aria-label={t("strippingTab.previewAria")}
            >
              <i className="fas fa-expand" aria-hidden />
              <span>{t("strippingTab.preview")}</span>
            </button>
          )}
        </div>
        {hasSteps ? (
          <div className="tp-schema-card">
            <TreatmentPlanSchemaVisual
              treatmentSteps={treatmentSteps}
              toothModules={caseSheet.toothModules || {}}
              highlightedStep={effectiveHighlight}
              showHeader={false}
            />
          </div>
        ) : (
          <p className="tab-stripping-empty">
            {t("strippingTab.noVisualPlan")}
          </p>
        )}
      </section>

      {dbStripping.length > 0 && (
        <section className="tab-stripping-section">
          <h4 className="sub-section-title">
            <i className="fas fa-database" aria-hidden />
            {t("strippingTab.dbDataTitle")}
          </h4>
          <div className="tab-stripping-table-wrap">
            <table className="tab-stripping-table">
              <thead>
                <tr>
                  <th>{t("strippingTab.colTooth")}</th>
                  <th>{t("strippingTab.colTaq")}</th>
                  <th>{t("strippingTab.colValue")}</th>
                </tr>
              </thead>
              <tbody>
                {dbStripping.map((row, i) => (
                  <tr key={i}>
                    <td>{row.tooth_num ?? "—"}</td>
                    <td>{row.tooth_taq ?? "—"}</td>
                    <td>{row.tooth_val ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showPreview && (
        <TreatmentPlanPreviewModal
          treatmentSteps={treatmentSteps}
          toothModules={caseSheet.toothModules || {}}
          onClose={() => setShowPreview(false)}
          patientName={patient.name}
        />
      )}
    </div>
  );
}
