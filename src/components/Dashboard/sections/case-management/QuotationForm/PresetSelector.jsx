/**
 * PresetSelector Component
 *
 * Renders preset selection radio buttons for pre-configured parameters.
 *
 * @module components/Quotation/PresetSelector
 */

import { getAllPresets, getPreset } from "@/config/presets.js";
import { useTranslation } from "react-i18next";

/**
 * PresetSelector Component
 *
 * @param {Object} props - Component props
 * @param {string} props.presetConfig - Currently selected preset ID
 * @param {Function} props.onPresetChange - Callback when preset changes
 * @param {string} [props.brand] - Current brand (Lab / Direct) to filter treatment presets
 * @returns {JSX.Element} PresetSelector component
 */
const PresetSelector = ({ presetConfig, onPresetChange, brand }) => {
  const { t } = useTranslation();
  const regularPresets = getAllPresets()
    .filter((preset) => !preset.id.startsWith("treatment-"))
    .filter((preset) => !preset.brand || preset.brand === brand);
  const treatmentPresets = getAllPresets()
    .filter((preset) => preset.id.startsWith("treatment-"))
    .filter((preset) => !preset.brand || preset.brand === brand)
    .sort((a, b) => {
      const presetA = getPreset(a.id);
      const presetB = getPreset(b.id);
      const priceA = presetA?.totalPrice?.value || 0;
      const priceB = presetB?.totalPrice?.value || 0;
      return priceA - priceB;
    });

  return (
    <div
      className="form-group form-group-full-width"
      data-testid="quotation-presets"
    >
      <label>{t("quotation.presetServicesLabel")}</label>
      <div className="preset-checkboxes">
        {regularPresets.map((preset) => (
          <label
            key={preset.id}
            className="preset-checkbox"
            title={preset.description}
          >
            <input
              type="radio"
              name="preset"
              value={preset.id}
              data-testid={`quotation-preset-${preset.id}`}
              checked={presetConfig === preset.id}
              onChange={(e) => onPresetChange(e.target.value)}
            />
            <span>{preset.label}</span>
          </label>
        ))}
      </div>
      <div className="preset-treatment-block">
        <label className="preset-section-label">
          {t("quotation.presetTreatmentLabel")}
        </label>
        <div className="preset-checkboxes">
          {treatmentPresets.map((preset) => {
            const presetData = getPreset(preset.id);
            const price = presetData?.totalPrice?.value || 0;
            return (
              <label
                key={preset.id}
                className="preset-checkbox"
                title={preset.description}
              >
                <input
                  type="radio"
                  name="preset"
                  value={preset.id}
                  data-testid={`quotation-preset-${preset.id}`}
                  checked={presetConfig === preset.id}
                  onChange={(e) => onPresetChange(e.target.value)}
                />
                <span>{price}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PresetSelector;
