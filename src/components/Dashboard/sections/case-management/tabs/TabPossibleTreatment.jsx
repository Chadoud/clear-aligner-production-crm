import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import { useTranslation } from "react-i18next";
import { TREATMENT_OPTIONS } from "../config/treatmentOptions";
import { useRefreshCaseSheetOnMount } from "@/hooks";

export default function TabPossibleTreatment({
  patient,
  caseSheet = {},
  updateCaseSheet,
  refreshCaseSheet,
  sheetLoading,
  isReadOnly = false,
}) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const treatments = caseSheet.treatments ?? [];

  const toggleTreatment = (id) => {
    if (isReadOnly) return;
    const next = treatments.includes(id)
      ? treatments.filter((t) => t !== id)
      : [...treatments, id];
    updateCaseSheet({ treatments: next });
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">
          {t("caseMgmt.possibleTreatment.emptyPatient")}
        </p>
      </div>
    );
  }

  if (sheetLoading) {
    return (
      <div className="form-section tab-panel tab-panel-loading">
        <LoadingDonut
          size="md"
          message={t("caseMgmt.possibleTreatment.loading")}
        />
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">
        {t("caseMgmt.possibleTreatment.title")}
      </h3>
      <p className="tab-panel-description">
        {t("caseMgmt.possibleTreatment.description", { name: patient.name })}
      </p>
      <div className="form-group">
        <span className="form-section-label">
          {t("caseMgmt.possibleTreatment.optionsLabel")}
        </span>
        <div className="tab-treatment-grid">
          {TREATMENT_OPTIONS.map((opt) => (
            <label key={opt.id} className="tab-checkbox-item">
              <input
                type="checkbox"
                checked={treatments.includes(opt.id)}
                onChange={() => toggleTreatment(opt.id)}
                disabled={isReadOnly}
              />
              <span>{t(opt.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
