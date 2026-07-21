/**
 * FormFields – form inputs for treatment duration.
 * @module components/Quotation/FormFields
 */

import { useTranslation } from "react-i18next";
import NumberInputWithArrows from "@/components/shared/NumberInputWithArrows/NumberInputWithArrows";

/**
 * @param {Object} props
 * @param {string} props.treatmentDuration
 * @param {Function} props.onDurationChange
 * @param {string} [props.treatmentSteps]
 * @param {Function} [props.onStepsChange]
 * @param {boolean} [props.showTreatmentDuration=true]
 * @param {boolean} [props.showAlignerMonitoring=false]
 * @param {string} [props.alignerMonitoringMonths]
 * @param {Function} [props.onAlignerMonitoringChange]
 * @param {Function} [props.onAlignerMonitoringBlur]
 * @param {boolean} [props.alignerMonitoringSaving=false]
 */
const FormFields = ({
  treatmentDuration,
  onDurationChange,
  treatmentSteps = "",
  onStepsChange,
  showTreatmentDuration = true,
  showAlignerMonitoring = false,
  alignerMonitoringMonths = "",
  onAlignerMonitoringChange,
  onAlignerMonitoringBlur,
  alignerMonitoringSaving = false,
}) => {
  const { t } = useTranslation();
  const durationValue =
    treatmentDuration === "" || treatmentDuration == null
      ? ""
      : String(treatmentDuration);
  const stepsValue =
    treatmentSteps === "" || treatmentSteps == null
      ? ""
      : String(treatmentSteps);
  const monitoringValue =
    alignerMonitoringMonths === "" || alignerMonitoringMonths == null
      ? ""
      : String(alignerMonitoringMonths);

  return (
    <>
      {/* Treatment Duration + Steps – hidden when a SERVICES preset is selected */}
      {showTreatmentDuration && (
        <div className="quotation-form-duration-steps-row">
          <div className="form-group form-group-inline">
            <label
              id="treatment-duration-label"
              htmlFor="treatment-duration-select"
            >
              {t("quotation.formDurationLabel")}
            </label>
            <div className="price-input-wrapper">
              <NumberInputWithArrows
                id="treatment-duration-select"
                value={durationValue}
                onChange={onDurationChange}
                aria-label={t("quotation.formDurationAria")}
                placeholder={t("quotation.formDurationPlaceholder")}
                min={1}
                max={36}
              />
              <span className="input-suffix">
                {t("quotation.formMonthsSuffix")}
              </span>
            </div>
          </div>
          <div className="form-group form-group-inline">
            <label id="treatment-steps-label" htmlFor="treatment-steps-input">
              {t("quotation.formStepsLabel")}
            </label>
            <div className="price-input-wrapper">
              <NumberInputWithArrows
                id="treatment-steps-input"
                value={stepsValue}
                onChange={onStepsChange ?? (() => {})}
                aria-label={t("quotation.formStepsAria")}
                placeholder={t("header.emDash")}
                min={0}
                max={99}
              />
            </div>
          </div>
        </div>
      )}
      {showAlignerMonitoring && (
        <div className="quotation-form-monitoring-row">
          <div className="form-group form-group-inline">
            <label
              id="aligner-monitoring-label"
              htmlFor="aligner-monitoring-months"
            >
              {t("quotation.formAlignerMonitoringLabel")}
            </label>
            <div className="price-input-wrapper">
              <NumberInputWithArrows
                id="aligner-monitoring-months"
                value={monitoringValue}
                onChange={onAlignerMonitoringChange ?? (() => {})}
                onBlur={onAlignerMonitoringBlur}
                aria-label={t("quotation.formAlignerMonitoringAria")}
                placeholder={t("quotation.formDurationPlaceholder")}
                min={1}
                max={36}
                disabled={alignerMonitoringSaving}
              />
              <span className="input-suffix">
                {t("quotation.formMonthsSuffix")}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormFields;
