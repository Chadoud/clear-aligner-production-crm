/**
 * ServicesSelector Component
 *
 * Renders service selection dropdown and selected services list.
 *
 * @module components/Quotation/ServicesSelector
 */

import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import SelectedServiceItem from "./SelectedServiceItem.jsx";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * ServicesSelector Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.services - Available services
 * @param {Array} props.displayableServices - Services to display (filtered)
 * @param {Function} props.onServiceSelect - Callback when service is selected
 * @param {Function} props.onRemoveService - Callback when service is removed
 * @param {Function} props.onQuantityChange - Callback when service quantity changes
 * @param {number|null} [props.labPrice] - When total is fixed, derived lab (0.1) price to show instead of points-based
 * @param {Map<string,number>|null} [props.linePriceOverrides] - Lab: map of code -> CHF so each line shows --- for VPT/Points
 * @returns {JSX.Element} ServicesSelector component
 */
const ServicesSelector = ({
  services,
  displayableServices,
  labPrice = null,
  linePriceOverrides = null,
  onServiceSelect,
  onRemoveService,
  onQuantityChange,
}) => {
  const { t } = useTranslation();
  const addLabel = t("quotation.servicesAddPlaceholder");
  const selectOptions = useMemo(
    () => [
      { value: "", label: addLabel },
      ...services.map((service) => ({
        value: service.code,
        label: `${service.code} - ${service.service}`,
      })),
    ],
    [services, addLabel]
  );

  return (
    <div className="form-group">
      <label>{t("quotation.servicesDescriptionLabel")}</label>
      <CustomSelect
        id="servicesSelect"
        className="form-select"
        value=""
        onChange={(code) => code && onServiceSelect(code)}
        placeholder={addLabel}
        aria-label={t("quotation.servicesAddAria")}
        options={selectOptions}
      />
      <div
        id="selectedServicesList"
        className="selected-services-list"
        data-testid="quotation-selected-services"
      >
        {displayableServices.map((service, index) => (
          <SelectedServiceItem
            key={`${service.code}-${service.quantity}-${index}`}
            service={service}
            labPriceOverride={service.code === "0.1" ? labPrice : null}
            linePriceOverride={
              linePriceOverrides != null
                ? (linePriceOverrides.get(service.code) ?? null)
                : null
            }
            onRemove={() => onRemoveService(service.code)}
            onQuantityChange={(quantity, isCustom) =>
              onQuantityChange(service.code, quantity, isCustom)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default ServicesSelector;
