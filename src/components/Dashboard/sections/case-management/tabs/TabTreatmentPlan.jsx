import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DentalToothGrid from "@/components/shared/DentalToothGrid/DentalToothGrid";
import StrippingAttachmentsV2 from "@/components/shared/DentalToothGrid/components/treatmentPlan/StrippingAttachmentsV2";
import StrippingV2PreviewModal from "@/components/shared/DentalToothGrid/components/treatmentPlan/StrippingV2PreviewModal";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";

export default function TabTreatmentPlan({
  patient,
  caseSheet = {},
  updateCaseSheet,
  saveNow,
  sheetLoading,
  isReadOnly = false,
}) {
  const { t } = useTranslation();
  const [uiVersion, setUiVersion] = useState("new");
  const [v2PrintScene, setV2PrintScene] = useState(null);
  const v2SaveTimerRef = useRef(null);

  const handleV2SceneChange = useCallback(
    (payload) => {
      updateCaseSheet({ strippingV2: payload });
      if (v2SaveTimerRef.current) clearTimeout(v2SaveTimerRef.current);
      v2SaveTimerRef.current = setTimeout(() => {
        v2SaveTimerRef.current = null;
        saveNow?.();
      }, 600);
    },
    [updateCaseSheet, saveNow]
  );
  const handleV2PrintPreview = useCallback(
    (scene) => setV2PrintScene(scene),
    []
  );

  useEffect(
    () => () => {
      if (v2SaveTimerRef.current) {
        clearTimeout(v2SaveTimerRef.current);
        v2SaveTimerRef.current = null;
      }
      /** performSave no-ops when nothing changed (incl. React Strict Mode dev remount). */
      saveNow?.();
    },
    [saveNow]
  );

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">
          {isReadOnly
            ? t("casePlan.emptySelectPatientStripping")
            : t("casePlan.emptySelectPatientTreatment")}
        </p>
      </div>
    );
  }

  if (sheetLoading) {
    return (
      <div className="form-section tab-panel tab-panel-loading">
        <LoadingDonut size="md" message={t("casePlan.loadingTreatmentPlan")} />
      </div>
    );
  }

  const v2Props = {
    initialScene:
      caseSheet.strippingV2 == null ? undefined : caseSheet.strippingV2,
    onPrintPreview: handleV2PrintPreview,
    readOnly: false,
    scope: isReadOnly ? "doctor" : "company",
    restrictedToDoctorOwnedEdits: isReadOnly,
    hideAlignerSteps: isReadOnly,
    onSceneChange: handleV2SceneChange,
  };

  if (isReadOnly) {
    return (
      <div className="form-section tab-panel">
        <h3 className="tab-panel-title">{t("casePlan.panelTitle")}</h3>
        <p className="tab-panel-description">
          {t("casePlan.panelDescriptionDoctor", { name: patient.name })}
        </p>
        <StrippingAttachmentsV2 {...v2Props} />
        {v2PrintScene != null && (
          <StrippingV2PreviewModal
            scene={v2PrintScene}
            patientName={patient.name}
            onClose={() => setV2PrintScene(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">{t("casePlan.panelTitle")}</h3>
      <p className="tab-panel-description">
        {t("casePlan.panelDescriptionCompany", { name: patient.name })}
      </p>
      <div className="tab-treatment-plan-version-switch" role="group">
        <span className="tab-treatment-plan-version-label">
          {t("casePlan.experienceLabel")}
        </span>
        <button
          type="button"
          className={`tab-treatment-plan-version-btn ${uiVersion === "current" ? "is-active" : ""}`}
          onClick={() => setUiVersion("current")}
          aria-pressed={uiVersion === "current"}
        >
          {t("casePlan.experienceOld")}
        </button>
        <button
          type="button"
          className={`tab-treatment-plan-version-btn ${uiVersion === "new" ? "is-active" : ""}`}
          onClick={() => setUiVersion("new")}
          aria-pressed={uiVersion === "new"}
        >
          {t("casePlan.experienceNew")}
        </button>
      </div>

      {uiVersion === "new" ? (
        <>
          <StrippingAttachmentsV2 {...v2Props} />
          {v2PrintScene != null && (
            <StrippingV2PreviewModal
              scene={v2PrintScene}
              patientName={patient.name}
              onClose={() => setV2PrintScene(null)}
            />
          )}
        </>
      ) : (
        <DentalToothGrid
          value={caseSheet.toothModules || {}}
          onChange={(modules) => updateCaseSheet({ toothModules: modules })}
          toothComments={caseSheet.toothComments || {}}
          onCommentChange={(toothNum, text) => {
            const next = { ...(caseSheet.toothComments || {}) };
            if (text == null) delete next[toothNum];
            else next[toothNum] = text;
            updateCaseSheet({ toothComments: next });
          }}
          treatmentSteps={caseSheet.treatmentSteps || {}}
          onTreatmentStepsChange={(steps) =>
            updateCaseSheet({ treatmentSteps: steps })
          }
          patientName={patient.name}
          readOnly={false}
          scope="company"
          showTreatmentPlanSummary={false}
        />
      )}
    </div>
  );
}
