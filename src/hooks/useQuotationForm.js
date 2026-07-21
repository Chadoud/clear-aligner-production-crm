/**
 * Custom Hook: useQuotationForm
 *
 * Manages form state and business logic for quotation form.
 *
 * @module hooks/useQuotationForm
 */

import { useState, useEffect, useCallback } from "react";
import { calculateTotalFromServices } from "@/utils/calculations/priceCalculations.js";
import { roundToNearest5Cents } from "@/utils/invoices/index.js";
import {
  getPresetPrice,
  getPresetDuration,
  getPresetSteps,
  getPresetVatRate,
  applyPresetServices,
} from "@/config/presets.js";
import {
  getDefaultQuantity,
  isExcludedFromDisplay,
} from "@/constants/serviceCodes.js";

/**
 * Custom hook for quotation form state management
 *
 * @param {Function} getServiceByCode - Function to get service by code (returns service with point_value)
 * @param {Array} services - Array of all available services (for change detection)
 * @returns {Object} Form state and handlers
 */
export const useQuotationForm = (getServiceByCode, services = []) => {
  const [brand, setBrand] = useState("");
  const [treatmentDuration, setTreatmentDuration] = useState("");
  /** Aligner steps (e.g. number of steps); stored on invoice and shown under duration. */
  const [treatmentSteps, setTreatmentSteps] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [presetConfig, setPresetConfig] = useState("");
  const [isPriceManuallySet, setIsPriceManuallySet] = useState(false);
  const [totalInvoiceFree, setTotalInvoiceFree] = useState(false);
  /** Scan Consultation: ON by default (like Quote, Monthly payment). Toggle adds/removes 4.8000 + 4.0970. */
  const [scanConsultationEnabled, setScanConsultationEnabled] = useState(true);
  const showFreeServices = scanConsultationEnabled;
  /** Quote toggle: ON by default. When ON, invoice is pending (excluded from totals). */
  const [isQuote, setIsQuote] = useState(true);
  /** Monthly payment (Direct only): enable payment arrangement. On by default. */
  const [monthlyPaymentEnabled, setMonthlyPaymentEnabled] = useState(true);
  /** Amount paid / down payment in CHF. Default 500. Use Down payment badge on invoice card to account it. */
  const [amountPaid, setAmountPaid] = useState("500");
  /** Number of months for payment (instalments). Default: treatment duration - 1. */
  const [numberOfMonthsForPayment, setNumberOfMonthsForPayment] = useState("");
  /** VAT rate from the active preset (e.g. 0.081 for 8.1%). 0 = no VAT display. */
  const [vatRate, setVatRate] = useState(0);

  // Reset form function
  const resetForm = useCallback(() => {
    setSelectedServices([]);
    setPresetConfig("");
    setTotalPrice("");
    setTreatmentDuration("");
    setTreatmentSteps("");
    setIsPriceManuallySet(false);
    setTotalInvoiceFree(false);
    setIsQuote(true);
    setScanConsultationEnabled(true);
    setMonthlyPaymentEnabled(true);
    setAmountPaid("500");
    setNumberOfMonthsForPayment("");
    setVatRate(0);
  }, []);

  // Auto-update total price when services change
  useEffect(() => {
    if (isPriceManuallySet) return;
    const priceConfig = getPresetPrice(presetConfig);
    if (priceConfig) return;

    const calculatedTotal = calculateTotalFromServices(selectedServices);
    if (calculatedTotal > 0) {
      setTotalPrice(roundToNearest5Cents(calculatedTotal).toFixed(2));
    } else if (selectedServices.length === 0) {
      setTotalPrice("");
    }
  }, [selectedServices, presetConfig, isPriceManuallySet]);

  // Default numberOfMonthsForPayment to treatment duration - 1 when duration changes
  useEffect(() => {
    const dur = parseInt(treatmentDuration, 10);
    if (Number.isFinite(dur) && dur > 1) {
      setNumberOfMonthsForPayment(String(Math.max(1, dur - 1)));
    }
  }, [treatmentDuration]);

  // Default down payment to 500 when monthly payment is enabled (Direct only)
  useEffect(() => {
    if (brand !== "Direct") return;
    if (monthlyPaymentEnabled && (amountPaid === "" || amountPaid === "0")) {
      setAmountPaid("500");
    }
  }, [brand, monthlyPaymentEnabled, amountPaid]);

  // For Lab (doctor patients): 500 CHF and monthly payment don't apply
  useEffect(() => {
    if (brand !== "Lab") return;
    if (monthlyPaymentEnabled) setMonthlyPaymentEnabled(false);
    if (amountPaid === "500") setAmountPaid("0");
    // Intentionally: run only when brand switches; avoid loops from amountPaid / monthlyPaymentEnabled
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps on [brand] only
  }, [brand]);

  // Scan Consultation: sync services when toggle or brand changes (default on for Direct)
  useEffect(() => {
    if (brand === "Lab") return;
    if (scanConsultationEnabled) {
      if (!selectedServices.some((s) => s.code === "4.8000")) {
        const toAdd = ["4.8000", "4.0970"]
          .map((code) => {
            const svc = getServiceByCode(code);
            return svc
              ? {
                  ...svc,
                  quantity: getDefaultQuantity(code),
                  quantityCustom: "",
                }
              : null;
          })
          .filter(Boolean);
        if (toAdd.length > 0) {
          setSelectedServices((prev) => [...prev, ...toAdd]);
        }
      }
    } else {
      setSelectedServices((prev) => {
        const filtered = prev.filter(
          (s) => s.code !== "4.8000" && s.code !== "4.0970"
        );
        return filtered.length === prev.length ? prev : filtered;
      });
    }
  }, [brand, scanConsultationEnabled, selectedServices, getServiceByCode]);

  // When catalog (services) changes, sync selected items with catalog vpt/points/point_value.
  useEffect(() => {
    setSelectedServices((prevServices) =>
      prevServices.map((selectedService) => {
        const catalogService = getServiceByCode(selectedService.code);
        if (!catalogService) return selectedService;
        const vpt = catalogService.vpt ?? selectedService.vpt;
        const points = catalogService.points ?? selectedService.points;
        const point_value =
          catalogService.point_value ?? selectedService.point_value ?? 1;
        if (
          vpt === selectedService.vpt &&
          points === selectedService.points &&
          point_value === (selectedService.point_value ?? 1)
        ) {
          return selectedService;
        }
        return { ...selectedService, vpt, points, point_value };
      })
    );
  }, [services, getServiceByCode]);

  // Service handlers
  const handleServiceSelect = useCallback(
    (code) => {
      if (!code || code === "" || code === "+ Add Services") return;
      if (selectedServices.find((s) => s.code === code)) return;

      const service = getServiceByCode(code);
      if (!service) return;

      setSelectedServices((prev) => [
        ...prev,
        {
          ...service,
          quantity: getDefaultQuantity(code),
          quantityCustom: "",
        },
      ]);
    },
    [selectedServices, getServiceByCode]
  );

  const removeService = useCallback((code) => {
    setSelectedServices((prev) => prev.filter((s) => s.code !== code));
  }, []);

  /** Remove multiple services by code (e.g. Scan Consultation: 4.8000 + 4.0970) */
  const removeServices = useCallback((codes) => {
    const set = new Set(codes);
    setSelectedServices((prev) => prev.filter((s) => !set.has(s.code)));
  }, []);

  const updateServiceQuantity = useCallback((code, quantity, isCustom) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.code === code
          ? {
              ...s,
              quantity: isCustom ? parseInt(quantity) || 1 : parseInt(quantity),
              quantityCustom: isCustom ? quantity : "",
            }
          : s
      )
    );
  }, []);

  // Preset handler
  const handlePresetChange = useCallback(
    (presetId) => {
      const previousPresetId = presetConfig;
      setPresetConfig(presetId);

      const updatedServices = applyPresetServices(
        presetId,
        selectedServices,
        getServiceByCode,
        previousPresetId
      );
      setSelectedServices(updatedServices);

      const priceConfig = getPresetPrice(presetId);
      if (priceConfig) {
        setIsPriceManuallySet(true);
        setTotalPrice(String(priceConfig.value || ""));
      } else {
        setIsPriceManuallySet(false);
      }

      // Use preset duration as default, but user can always change it (customizable)
      const durationConfig = getPresetDuration(presetId);
      if (durationConfig) {
        const durationVal = durationConfig.value ?? 0;
        setTreatmentDuration(String(durationVal));
      }

      const stepsConfig = getPresetSteps(presetId);
      if (stepsConfig) {
        setTreatmentSteps(String(stepsConfig.value ?? ""));
      } else {
        setTreatmentSteps("");
      }

      const presetVatRate = getPresetVatRate(presetId);
      setVatRate(presetVatRate ?? 0);
    },
    [presetConfig, selectedServices, getServiceByCode]
  );

  // Filter displayable services
  const displayableServices = selectedServices.filter(
    (service) => !isExcludedFromDisplay(service.code)
  );

  return {
    // State
    brand,
    treatmentDuration,
    treatmentSteps,
    totalPrice,
    selectedServices,
    presetConfig,
    showFreeServices,
    totalInvoiceFree,
    isQuote,
    monthlyPaymentEnabled,
    amountPaid,
    numberOfMonthsForPayment,
    vatRate,
    displayableServices,
    // Setters
    setBrand,
    setTreatmentDuration,
    setTreatmentSteps,
    setTotalPrice,
    setTotalInvoiceFree,
    setIsQuote,
    setScanConsultationEnabled,
    setMonthlyPaymentEnabled,
    setAmountPaid,
    setNumberOfMonthsForPayment,
    setIsPriceManuallySet,
    // Handlers
    handleServiceSelect,
    removeService,
    removeServices,
    updateServiceQuantity,
    handlePresetChange,
    resetForm,
  };
};
