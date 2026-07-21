/**
 * SelectedServiceItem Component
 *
 * Displays a selected service with its details (code, name, VPT, Points, price)
 * and allows quantity modification via dropdown or custom input.
 *
 * @module components/Quotation/SelectedServiceItem
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CONFIG } from "@/config/constants.js";
import { calculateServicePrice } from "@/utils/calculations/priceCalculations.js";
import { formatCHF } from "@/utils/index.js";
import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import "./SelectedServiceItem.css";

const SelectedServiceItem = ({
  service,
  onRemove,
  onQuantityChange,
  /** When set, used as the displayed price for lab service (0.1) instead of points-based calculation. */
  labPriceOverride = null,
  /** When set (e.g. Lab total-based pricing), use this as line price; VPT/Points still show from service. */
  linePriceOverride = null,
}) => {
  const { t } = useTranslation();
  const initialQuantity = service.quantity || 1;
  const needsCustom = initialQuantity > CONFIG.FORM.QUANTITY_MAX;
  const [quantity, setQuantity] = useState(
    needsCustom ? CONFIG.FORM.QUANTITY_MAX : initialQuantity
  );
  const [isCustom, setIsCustom] = useState(needsCustom);
  const [customQuantity, setCustomQuantity] = useState(
    needsCustom ? String(initialQuantity) : ""
  );

  // Sync local quantity state with service prop changes
  useEffect(() => {
    if (service.quantity !== undefined && service.quantity !== null) {
      const newQuantity = parseInt(service.quantity);
      const needsCustomMode = newQuantity > CONFIG.FORM.QUANTITY_MAX;

      if (needsCustomMode) {
        setIsCustom(true);
        setCustomQuantity(String(newQuantity));
      } else {
        setIsCustom(false);
        setCustomQuantity("");
        setQuantity(newQuantity);
      }
    }
  }, [service.quantity, service.code]);

  const handleQuantityChange = (value) => {
    if (value === "custom") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setQuantity(parseInt(value, 10));
      onQuantityChange(value, false);
    }
  };

  const handleCustomQuantityChange = (e) => {
    const value = e.target.value;
    setCustomQuantity(value);
    onQuantityChange(value, true);
  };

  const useTotalBasedPrice =
    linePriceOverride != null && Number.isFinite(linePriceOverride);
  const serviceText = `${service.code} - ${service.service}`;
  const na = t("quotation.selectedNa");
  const vpt =
    service.vpt != null && service.vpt !== "" ? String(service.vpt) : na;
  const points =
    service.points != null &&
    service.points !== "" &&
    !Number.isNaN(Number(service.points))
      ? Number(service.points)
      : na;

  const effectiveQuantity = isCustom
    ? parseFloat(customQuantity) || 0
    : quantity;
  const price = useMemo(() => {
    if (useTotalBasedPrice) return linePriceOverride;
    if (
      service.code === "0.1" &&
      labPriceOverride != null &&
      Number.isFinite(labPriceOverride)
    ) {
      return labPriceOverride;
    }
    const serviceWithQty = { ...service, quantity: effectiveQuantity };
    return calculateServicePrice(serviceWithQty);
  }, [
    useTotalBasedPrice,
    linePriceOverride,
    service,
    effectiveQuantity,
    labPriceOverride,
  ]);

  return (
    <div className="selected-service-item" data-code={service.code}>
      <div className="service-info">
        <span className="service-text">{serviceText}</span>
        <div className="service-attributes">
          <span className="service-attr">
            {t("quotation.selectedVpt")}: {vpt}
          </span>
          <span className="service-attr">
            {t("quotation.selectedPoints")}: {points}
          </span>
          <span className="service-attr service-price">
            {Number.isFinite(price) ? formatCHF(price) : t("header.emDash")}
          </span>
        </div>
      </div>
      <div className="service-quantity-wrapper">
        <label className="quantity-label">{t("quotation.selectedQty")}</label>
        {!isCustom ? (
          <CustomSelect
            className="service-quantity-select"
            value={String(quantity)}
            onChange={handleQuantityChange}
            aria-label={t("quotation.selectedQuantityAria")}
            options={[
              ...Array.from({ length: CONFIG.FORM.QUANTITY_MAX }, (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
              })),
              { value: "custom", label: t("quotation.selectedCustom") },
            ]}
          />
        ) : (
          <input
            type="number"
            className="service-quantity-input"
            value={customQuantity}
            onChange={handleCustomQuantityChange}
            min="1"
            style={{ width: "70px", marginLeft: "6px" }}
          />
        )}
      </div>
      <button className="remove-service-btn" type="button" onClick={onRemove}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default SelectedServiceItem;
