/**
 * DentalToothGrid – anatomical FDI dental schema.
 *
 * Features:
 *   • Drag-and-drop modules onto teeth (6 module types)
 *   • Per-tooth comment popup
 *   • Inter-dental gap zones for treatment steps (1,3,5…31)
 *   • Drag-and-drop step bubbles onto gaps
 *   • Per-step striping editor (mesial / distal / mesio-distal 0.10 mm)
 *   • Dynamic visual treatment plan summary below the schema
 *
 * Quadrant layout (screen left = patient right):
 *   Upper: 18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28
 *   Lower: 48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38
 *
 * Props:
 *   value, onChange, toothComments, onCommentChange,
 *   treatmentSteps, onTreatmentStepsChange,
 *   patientName?
 */
import { useDentalToothGrid } from "./hooks/useDentalToothGrid.js";
import {
  UPPER_Q1,
  UPPER_Q2,
  LOWER_Q4,
  LOWER_Q3,
  STEP_NUMBERS,
} from "./config/constants.js";
import { buildGapKey } from "./config/dtgUtils.js";
import {
  MODULES,
  MODULE_MAP,
  ModuleIcon,
  STRIPPING_V2_COMPANY_ONLY_MODULE_IDS,
  STRIPPING_V2_ONLY_MODULE_IDS,
} from "./shared/DentalToothGridIcons.jsx";
import Tooth from "./components/schema/Tooth.jsx";
import GapZone from "./components/schema/GapZone.jsx";
import CommentPopup from "./components/popups/CommentPopup.jsx";
import StepEditPopup from "./components/popups/StepEditPopup.jsx";
import TreatmentPlanVisual from "./components/treatmentPlan/TreatmentPlanVisual.jsx";
import TreatmentPlanSchemaVisual from "./components/treatmentPlan/TreatmentPlanSchemaVisual.jsx";
import TreatmentPlanPreviewModal from "./components/treatmentPlan/TreatmentPlanPreviewModal.jsx";
import "./DentalToothGrid.css";

export default function DentalToothGrid({
  value = {},
  onChange,
  toothComments = {},
  onCommentChange = () => {},
  treatmentSteps = {},
  onTreatmentStepsChange = () => {},
  patientName = null,
  readOnly = false,
  /** When false, hides TreatmentPlanVisual, TreatmentPlanSchemaVisual, TreatmentPlanPreviewModal (e.g. for doctors creating a case). */
  showVisualTreatmentPlan = true,
  /** When false, hides only the "Treatment plan summary" card. */
  showTreatmentPlanSummary = true,
  /** "doctor" = hide lab-only modules (holding/rotation clips + strip brackets) in the tooth schema palette. */
  scope = "company",
}) {
  const {
    selectedModule,
    setSelectedModule,
    dragOverTooth,
    commentPopup,
    setCommentPopup,
    selectedStep,
    setSelectedStep,
    dragOverGap,
    stepEditPopup,
    showPreview,
    setShowPreview,
    setHighlightedSummaryStep,
    hoveredSummaryStep,
    setHoveredSummaryStep,
    effectiveHighlight,
    applyModule,
    removeModule,
    saveComment,
    removeComment,
    saveStepStripings,
    removeStep,
    openStepEdit,
    closeStepEdit,
    handleModuleDragStart,
    handleModuleDragEnd,
    handleToothDragOver,
    handleToothDragLeave,
    handleToothDrop,
    handleStepDragStart,
    handleStepDragEnd,
    handleGapDragOver,
    handleGapDragLeave,
    handleGapDrop,
    handleGapClick,
    value: gridValue,
    treatmentSteps: gridSteps,
  } = useDentalToothGrid({
    value,
    onChange,
    toothComments,
    onCommentChange,
    treatmentSteps,
    onTreatmentStepsChange,
  });

  const visibleModules = MODULES.filter((m) => {
    if (STRIPPING_V2_ONLY_MODULE_IDS.includes(m.id)) return false;
    if (
      scope === "doctor" &&
      STRIPPING_V2_COMPANY_ONLY_MODULE_IDS.includes(m.id)
    )
      return false;
    return true;
  });

  const getModules = (num) =>
    (gridValue[num] || []).map((id) => MODULE_MAP[id]).filter(Boolean);
  const activeMod = MODULE_MAP[selectedModule];

  const renderQuadrant = (teeth, arch) => {
    const elements = [];
    teeth.forEach((num, i) => {
      elements.push(
        <Tooth
          key={num}
          num={num}
          arch={arch}
          modules={getModules(num)}
          hasComment={!!toothComments[num]}
          dragOver={dragOverTooth === num}
          onDragOver={handleToothDragOver(num)}
          onDragLeave={handleToothDragLeave}
          onDrop={handleToothDrop(num)}
          onClick={() => selectedModule && applyModule(num, selectedModule)}
          onRemoveModule={removeModule}
          onEditComment={(n) => setCommentPopup({ toothNum: n })}
        />
      );
      if (i < teeth.length - 1) {
        const gapKey = buildGapKey(arch, num, teeth[i + 1]);
        const steps = gridSteps[gapKey] || [];
        elements.push(
          <GapZone
            key={gapKey}
            gapKey={gapKey}
            arch={arch}
            steps={steps}
            isOver={!readOnly && dragOverGap === gapKey}
            onDragOver={readOnly ? undefined : handleGapDragOver(gapKey)}
            onDragLeave={readOnly ? undefined : handleGapDragLeave}
            onDrop={readOnly ? undefined : handleGapDrop(gapKey)}
            onClick={readOnly ? undefined : () => handleGapClick(gapKey)}
            onEditStep={
              readOnly ? undefined : (key, idx) => openStepEdit(key, idx, false)
            }
          />
        );
      }
    });
    return elements;
  };

  const renderMidlineGap = (arch) => {
    const t1 = arch === "upper" ? 11 : 41;
    const t2 = arch === "upper" ? 21 : 31;
    const gapKey = buildGapKey(arch, t1, t2);
    const steps = gridSteps[gapKey] || [];
    return (
      <GapZone
        key={gapKey}
        gapKey={gapKey}
        arch={arch}
        steps={steps}
        isOver={!readOnly && dragOverGap === gapKey}
        isMidline
        onDragOver={readOnly ? undefined : handleGapDragOver(gapKey)}
        onDragLeave={readOnly ? undefined : handleGapDragLeave}
        onDrop={readOnly ? undefined : handleGapDrop(gapKey)}
        onClick={readOnly ? undefined : () => handleGapClick(gapKey)}
        onEditStep={
          readOnly ? undefined : (key, idx) => openStepEdit(key, idx, false)
        }
      />
    );
  };

  return (
    <div className="dtg-wrap">
      <div className="dtg-section-label">
        <i className="fas fa-puzzle-piece" aria-hidden /> Tooth modules
      </div>
      <div className="dtg-palette" role="toolbar" aria-label="Tooth modules">
        {visibleModules.map((mod) => (
          <div
            key={mod.id}
            className={`dtg-palette-btn ${selectedModule === mod.id ? "dtg-palette-btn--active" : ""}`}
            draggable
            onDragStart={() => handleModuleDragStart(mod.id)}
            onDragEnd={handleModuleDragEnd}
            onClick={() =>
              setSelectedModule((p) => (p === mod.id ? null : mod.id))
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              setSelectedModule((p) => (p === mod.id ? null : mod.id))
            }
            aria-pressed={selectedModule === mod.id}
            style={{ "--mod-color": mod.color, "--mod-bg": mod.bg }}
          >
            <span className="dtg-palette-icon">
              <ModuleIcon mod={mod} svgSize={18} />
            </span>
            <span className="dtg-palette-text">
              <span className="dtg-palette-label">{mod.label}</span>
              {mod.sublabel && (
                <span className="dtg-palette-sub">{mod.sublabel}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {!readOnly && (
        <>
          <div className="dtg-section-label">
            <i className="fas fa-list-ol" aria-hidden /> Treatment steps — drag
            or click a step, then click a gap between teeth
          </div>
          <p className="dtg-section-intro">
            Each step number (bubble) corresponds to the number of aligners for
            that step.
          </p>
          <div
            className="dtg-steps-palette-wrap"
            role="region"
            aria-label="Treatment steps scroll"
          >
            <div
              className="dtg-steps-palette"
              role="toolbar"
              aria-label="Treatment steps"
            >
              {STEP_NUMBERS.map((num) => (
                <div
                  key={num}
                  className={`dtg-step-chip ${selectedStep === num ? "dtg-step-chip--active" : ""}`}
                  draggable
                  onDragStart={() => handleStepDragStart(num)}
                  onDragEnd={handleStepDragEnd}
                  onClick={() =>
                    setSelectedStep((p) => (p === num ? null : num))
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    setSelectedStep((p) => (p === num ? null : num))
                  }
                  aria-pressed={selectedStep === num}
                  title={`Select step ${num} to place`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="dtg-hint" role="status">
        <i className="fas fa-info-circle" aria-hidden />
        {activeMod ? (
          <>
            {" "}
            Drag or click a tooth to apply <strong>{activeMod.label}</strong>.
          </>
        ) : !readOnly && selectedStep != null ? (
          <>
            {" "}
            Click a gap between teeth to place step{" "}
            <strong>{selectedStep}</strong>.
          </>
        ) : readOnly && showVisualTreatmentPlan ? (
          " View the treatment plan below."
        ) : readOnly ? (
          " View the dental schema above."
        ) : (
          " Drag a module onto a tooth • drag a step bubble onto a gap between teeth."
        )}
      </p>

      <div className="dtg-schema">
        <div className="dtg-arch-header">
          <span className="dtg-side">Right</span>
          <span className="dtg-arch-title">Upper teeth</span>
          <span className="dtg-side">Left</span>
        </div>
        <div className="dtg-arch dtg-arch--upper">
          <div className="dtg-quadrant">
            {renderQuadrant(UPPER_Q1, "upper")}
          </div>
          {renderMidlineGap("upper")}
          <div className="dtg-quadrant">
            {renderQuadrant(UPPER_Q2, "upper")}
          </div>
        </div>
        <div className="dtg-occlusal-line" aria-hidden />
        <div className="dtg-arch dtg-arch--lower">
          <div className="dtg-quadrant">
            {renderQuadrant(LOWER_Q4, "lower")}
          </div>
          {renderMidlineGap("lower")}
          <div className="dtg-quadrant">
            {renderQuadrant(LOWER_Q3, "lower")}
          </div>
        </div>
        <div className="dtg-arch-header">
          <span className="dtg-side">Right</span>
          <span className="dtg-arch-title">Lower teeth</span>
          <span className="dtg-side">Left</span>
        </div>
      </div>

      {showVisualTreatmentPlan && (
        <>
          {showTreatmentPlanSummary && (
            <TreatmentPlanVisual
              treatmentSteps={gridSteps}
              highlightedStep={effectiveHighlight}
              hoveredStep={hoveredSummaryStep}
              onStepClick={(gapKey, stepIdx) =>
                setHighlightedSummaryStep((prev) =>
                  prev?.gapKey === gapKey && prev?.stepIdx === stepIdx
                    ? null
                    : { gapKey, stepIdx }
                )
              }
              onStepHover={setHoveredSummaryStep}
            />
          )}

          <div className="tp-schema-card">
            <TreatmentPlanSchemaVisual
              treatmentSteps={gridSteps}
              toothModules={gridValue}
              highlightedStep={effectiveHighlight}
              onPreviewClick={() => setShowPreview(true)}
            />
          </div>

          {showPreview && (
            <TreatmentPlanPreviewModal
              treatmentSteps={gridSteps}
              toothModules={gridValue}
              onClose={() => setShowPreview(false)}
              patientName={patientName}
            />
          )}
        </>
      )}

      {commentPopup && (
        <CommentPopup
          toothNum={commentPopup.toothNum}
          initialText={toothComments[commentPopup.toothNum] || ""}
          hasExisting={
            !!(gridValue[commentPopup.toothNum] || []).includes("comment")
          }
          onSave={(text) => saveComment(commentPopup.toothNum, text)}
          onRemove={() => removeComment(commentPopup.toothNum)}
          onClose={() => setCommentPopup(null)}
        />
      )}

      {stepEditPopup &&
        (() => {
          const { gapKey, stepIdx, isNew } = stepEditPopup;
          const step = (gridSteps[gapKey] || [])[stepIdx];
          if (!step) return null;
          return (
            <StepEditPopup
              gapKey={gapKey}
              stepIdx={stepIdx}
              step={step}
              isNew={isNew}
              onSave={(stripings) =>
                saveStepStripings(gapKey, stepIdx, stripings, step)
              }
              onRemove={() => removeStep(gapKey, stepIdx)}
              onClose={closeStepEdit}
            />
          );
        })()}
    </div>
  );
}
