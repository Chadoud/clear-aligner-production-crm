import "./steps.css";
import { useTranslation } from "react-i18next";
import { TREATMENT_OPTIONS } from "../config/treatmentOptions";

export default function StepPossibleTreatment({ data, onChange }) {
  const { t } = useTranslation();
  const toggleTreatment = (id) => {
    const current = data.treatments || [];
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    onChange({ treatments: next });
  };

  return (
    <div className="step-content">
      <h2 className="step-heading">
        <i className="fas fa-wrench" aria-hidden />{" "}
        {t("addNewCase.possibleTreatmentTitle")}
      </h2>
      <p className="step-description">
        {t("addNewCase.possibleTreatmentIntro")}
      </p>

      <div className="form-group">
        <span className="form-section-label">
          <i className="fas fa-list-check" aria-hidden />{" "}
          {t("addNewCase.possibleTreatmentOptionsLabel")}
        </span>
        <div className="step-treatment-grid">
          {TREATMENT_OPTIONS.map((opt) => (
            <label key={opt.id} className="step-checkbox-item">
              <input
                type="checkbox"
                checked={(data.treatments || []).includes(opt.id)}
                onChange={() => toggleTreatment(opt.id)}
              />
              <span>{t(opt.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
