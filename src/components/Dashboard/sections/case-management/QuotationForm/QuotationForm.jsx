/**
 * QuotationForm Component
 *
 * Main form component for creating quotations with service selection,
 * preset configurations, and invoice generation.
 *
 * @module components/Quotation/QuotationForm
 */

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServices } from "@/context/ServicesContext.jsx";
import { useDashboard } from "@/context/DashboardContext";
import { extractClientInfo } from "@/services/clientInfoService.js";
import { dispatchPatientsRefresh } from "@/services/caseService";
import { updatePatientDemographics } from "@/services/patient/patientDemographicsService";
import {
  prepareInvoiceData,
  getInvoiceTotalMismatch,
  validateLabTreatmentDuration,
} from "@/utils/index.js";
import { calculateLabPrice } from "@/utils/calculations/priceCalculations.js";
import { useAutoScroll, useQuotationForm } from "@/hooks";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import { detectBrandFromPatient } from "./config/detectBrand";
import InvoiceMismatchModal from "./components/InvoiceMismatchModal";
import PresetSelector from "./PresetSelector";
import FormFields from "./FormFields";
import QuotationFormToggles from "./QuotationFormToggles";
import QuotationFormServicesSection from "./QuotationFormServicesSection";
import "./QuotationForm.css";

/**
 * QuotationForm Component
 *
 * @param {Object} props - Component props
 * @param {Function} props.onGenerateInvoice - Callback when invoice should be generated
 * @param {Function} props.onOpenSettings - Callback when settings should be opened
 * @returns {JSX.Element} QuotationForm component
 */
const QuotationForm = ({ patient, onGenerateInvoice, onOpenSettings }) => {
  const { t } = useTranslation();
  const { setSelectedPatient } = useDashboard();
  const {
    services,
    getServiceByCode,
    loading,
    error,
    currentBrand,
    loadServicesForBrand,
  } = useServices();
  const formActionsRef = useRef(null);

  // Form state management hook
  const {
    brand,
    treatmentDuration,
    treatmentSteps,
    totalPrice,
    presetConfig,
    showFreeServices,
    totalInvoiceFree,
    isQuote,
    setIsQuote,
    monthlyPaymentEnabled,
    numberOfMonthsForPayment,
    displayableServices,
    selectedServices,
    setBrand,
    setTreatmentDuration,
    setTreatmentSteps,
    setTotalPrice,
    setIsPriceManuallySet,
    setTotalInvoiceFree,
    setScanConsultationEnabled,
    setMonthlyPaymentEnabled,
    amountPaid,
    setAmountPaid,
    setNumberOfMonthsForPayment,
    vatRate,
    handleServiceSelect,
    removeService,
    updateServiceQuantity,
    handlePresetChange,
    resetForm,
  } = useQuotationForm(getServiceByCode, services);

  const [mismatchModal, setMismatchModal] = useState(null);
  const [alignerMonitoringMonths, setAlignerMonitoringMonths] = useState("");
  const [alignerMonitoringSaving, setAlignerMonitoringSaving] = useState(false);
  const pendingInvoiceDataRef = useRef(null);

  // Only show form when context has loaded services for this brand (avoids wrong dropdown / empty presets)
  const servicesMatchBrand = !brand || currentBrand === brand;
  const showFormContent = servicesMatchBrand && !loading;

  useAutoScroll(displayableServices, presetConfig, { formActionsRef });

  useEffect(() => {
    const v = patient?.aligner_monitoring_months;
    setAlignerMonitoringMonths(
      v != null && Number.isFinite(Number(v)) ? String(v) : ""
    );
  }, [patient?.case_id, patient?.aligner_monitoring_months]);

  const handleAlignerMonitoringSave = useCallback(async () => {
    if (!patient?.ref || brand !== "Lab") return;
    const trimmed = String(alignerMonitoringMonths ?? "").trim();
    const stored = patient.aligner_monitoring_months;
    const storedStr =
      stored != null && Number.isFinite(Number(stored)) ? String(stored) : "";
    if (trimmed === storedStr) return;

    setAlignerMonitoringSaving(true);
    try {
      const body =
        trimmed === ""
          ? { aligner_monitoring_months: null }
          : { aligner_monitoring_months: Math.floor(Number(trimmed)) };
      await updatePatientDemographics(patient.ref, body);
      dispatchPatientsRefresh();
      setSelectedPatient?.({
        ...patient,
        aligner_monitoring_months: body.aligner_monitoring_months ?? null,
      });
    } catch (err) {
      window.alert(err?.message || "Could not save monitoring duration.");
      const v = patient?.aligner_monitoring_months;
      setAlignerMonitoringMonths(
        v != null && Number.isFinite(Number(v)) ? String(v) : ""
      );
    } finally {
      setAlignerMonitoringSaving(false);
    }
  }, [alignerMonitoringMonths, brand, patient, setSelectedPatient]);

  // For Lab: total is source of truth; only lab (0.1) gets the remainder. Others use quantity×vpt×points.
  const linePriceOverrides = useMemo(() => {
    if (brand !== "Lab") return null;
    const total = parseFloat(totalPrice);
    if (!Number.isFinite(total) || total <= 0 || selectedServices.length === 0)
      return null;
    const hasLab = selectedServices.some((s) => s.code === "0.1");
    if (!hasLab) return null;
    const labPrice = calculateLabPrice(total, selectedServices, vatRate);
    const map = new Map();
    map.set("0.1", labPrice);
    return map;
  }, [brand, totalPrice, selectedServices, vatRate]);

  // Derived lab price when total is fixed (points-based brands only)
  const labPrice = useMemo(() => {
    if (brand === "Lab") return null;
    const total = parseFloat(totalPrice);
    if (!Number.isFinite(total) || total <= 0) return null;
    const hasLab = selectedServices.some((s) => s.code === "0.1");
    if (!hasLab) return null;
    return calculateLabPrice(total, selectedServices, vatRate);
  }, [brand, totalPrice, selectedServices, vatRate]);

  useEffect(() => {
    const detectedBrand = detectBrandFromPatient(patient);
    if (detectedBrand == null) return;
    if (brand !== detectedBrand) {
      resetForm();
      setBrand(detectedBrand);
      loadServicesForBrand(detectedBrand);
      // 500 CHF down payment and monthly payment apply only to Direct cabinet
      if (detectedBrand === "Lab") {
        setAmountPaid("0");
        setMonthlyPaymentEnabled(false);
      }
    }
  }, [
    patient,
    brand,
    setBrand,
    resetForm,
    loadServicesForBrand,
    setAmountPaid,
    setMonthlyPaymentEnabled,
  ]);

  // Build client for invoice: use patient when available, else DOM extraction.
  const getClientInfo = useCallback(
    () => extractClientInfo(patient),
    [patient]
  );

  // Generate invoice handler
  const handleGenerate = useCallback(
    (e) => {
      e.preventDefault();
      const isTreatmentPreset =
        !presetConfig || presetConfig.startsWith("treatment-");
      const durationError = validateLabTreatmentDuration({
        brand,
        showTreatmentDuration: isTreatmentPreset,
        treatmentDuration,
      });
      if (durationError) {
        window.alert(durationError);
        return;
      }
      const clientInfo = getClientInfo();
      const doctorInfo = undefined; // Resolved from cabinet_id when rendering
      const effectiveTotal = totalInvoiceFree ? "0" : totalPrice;
      const invoiceData = prepareInvoiceData({
        clientInfo,
        brand,
        showFreeServices,
        treatmentDuration,
        treatmentSteps,
        totalPrice: effectiveTotal,
        selectedServices,
        getServiceByCode,
        doctorInfo,
        isQuote,
        monthlyPaymentEnabled,
        amountPaid: parseFloat(amountPaid) || 0,
        numberOfMonthsForPayment: parseInt(numberOfMonthsForPayment, 10) || 1,
        vatRate,
      });
      const mismatch = getInvoiceTotalMismatch(invoiceData);
      if (mismatch.mismatch) {
        pendingInvoiceDataRef.current = invoiceData;
        setMismatchModal({
          sumFromLines: mismatch.sumFromLines,
          totalPrice: mismatch.totalPrice,
        });
        return;
      }
      onGenerateInvoice(invoiceData);
    },
    [
      getClientInfo,
      presetConfig,
      treatmentDuration,
      treatmentSteps,
      totalPrice,
      totalInvoiceFree,
      selectedServices,
      brand,
      showFreeServices,
      getServiceByCode,
      onGenerateInvoice,
      isQuote,
      monthlyPaymentEnabled,
      numberOfMonthsForPayment,
      amountPaid,
      vatRate,
    ]
  );

  // Price change handler
  const handlePriceChange = useCallback(
    (value) => {
      setIsPriceManuallySet(true);
      setTotalPrice(value);
    },
    [setIsPriceManuallySet, setTotalPrice]
  );

  const handleMismatchFixTotal = useCallback(() => {
    if (!mismatchModal) return;
    const { sumFromLines } = mismatchModal;
    setTotalPrice(String(sumFromLines));
    setTotalInvoiceFree(false);
    setMismatchModal(null);
    pendingInvoiceDataRef.current = null;
    const clientInfo = getClientInfo();
    const doctorInfo = undefined; // Resolved from cabinet_id when rendering
    const fixedData = prepareInvoiceData({
      clientInfo,
      brand,
      showFreeServices,
      treatmentDuration,
      treatmentSteps,
      totalPrice: String(sumFromLines),
      selectedServices,
      getServiceByCode,
      doctorInfo,
      isQuote,
      monthlyPaymentEnabled,
      amountPaid: parseFloat(amountPaid) || 0,
      numberOfMonthsForPayment: parseInt(numberOfMonthsForPayment, 10) || 1,
      vatRate,
    });
    onGenerateInvoice(fixedData);
  }, [
    mismatchModal,
    getClientInfo,
    setTotalPrice,
    setTotalInvoiceFree,
    brand,
    showFreeServices,
    treatmentDuration,
    treatmentSteps,
    selectedServices,
    getServiceByCode,
    onGenerateInvoice,
    isQuote,
    monthlyPaymentEnabled,
    numberOfMonthsForPayment,
    amountPaid,
    vatRate,
  ]);

  const handleMismatchContinueAnyway = useCallback(() => {
    const data = pendingInvoiceDataRef.current;
    setMismatchModal(null);
    pendingInvoiceDataRef.current = null;
    if (data) onGenerateInvoice(data);
  }, [onGenerateInvoice]);

  const handleMismatchCancel = useCallback(() => {
    setMismatchModal(null);
    pendingInvoiceDataRef.current = null;
  }, []);

  if (brand && (loading || !showFormContent)) {
    if (loading) {
      return (
        <div className="form-section tab-panel">
          <h3 className="tab-panel-title">{t("caseTabs.createInvoice")}</h3>
          <p className="tab-panel-description">{t("quotation.tabIntro")}</p>
          <LoadingDonut
            size="md"
            message={t("quotation.loadingBrandServices", { brand })}
          />
        </div>
      );
    }
    const message = error
      ? t("quotation.errorWithMessage", { message: error })
      : t("quotation.loadServicesFailed", { brand });
    return (
      <div className="form-section tab-panel">
        <h3 className="tab-panel-title">{t("caseTabs.createInvoice")}</h3>
        <p className="tab-panel-description">{t("quotation.tabIntro")}</p>
        <p className="tab-panel-hint">{message}</p>
        <button type="button" onClick={() => loadServicesForBrand(brand)}>
          {t("quotation.retry")}
        </button>
      </div>
    );
  }

  if (!brand && loading) {
    return (
      <div className="form-section tab-panel">
        <h3 className="tab-panel-title">{t("caseTabs.createInvoice")}</h3>
        <p className="tab-panel-description">{t("quotation.tabIntro")}</p>
        <LoadingDonut size="md" message={t("quotation.loadingShort")} />
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">{t("caseTabs.createInvoice")}</h3>
      <p className="tab-panel-description">{t("quotation.tabIntro")}</p>
      <form className="quotation-form" onSubmit={handleGenerate}>
        {/* Show all form content only when a brand is selected */}
        {brand && (
          <>
            <QuotationFormToggles
              brand={brand}
              isQuote={isQuote}
              onQuoteChange={setIsQuote}
              showFreeServices={showFreeServices}
              totalInvoiceFree={totalInvoiceFree}
              onScanConsultationChange={setScanConsultationEnabled}
              onFreeChange={setTotalInvoiceFree}
              monthlyPaymentEnabled={monthlyPaymentEnabled}
              onMonthlyPaymentChange={setMonthlyPaymentEnabled}
            />

            <PresetSelector
              presetConfig={presetConfig}
              onPresetChange={handlePresetChange}
              brand={brand}
            />

            <div className="form-grid">
              <FormFields
                treatmentDuration={treatmentDuration}
                onDurationChange={setTreatmentDuration}
                treatmentSteps={treatmentSteps}
                onStepsChange={setTreatmentSteps}
                showTreatmentDuration={
                  !presetConfig || presetConfig.startsWith("treatment-")
                }
                showAlignerMonitoring={brand === "Lab"}
                alignerMonitoringMonths={alignerMonitoringMonths}
                onAlignerMonitoringChange={setAlignerMonitoringMonths}
                onAlignerMonitoringBlur={() =>
                  void handleAlignerMonitoringSave()
                }
                alignerMonitoringSaving={alignerMonitoringSaving}
              />
            </div>

            <QuotationFormServicesSection
              services={services}
              displayableServices={displayableServices}
              labPrice={labPrice}
              linePriceOverrides={linePriceOverrides}
              onServiceSelect={handleServiceSelect}
              onRemoveService={removeService}
              onQuantityChange={updateServiceQuantity}
              totalPrice={totalPrice}
              totalInvoiceFree={totalInvoiceFree}
              onPriceChange={handlePriceChange}
              monthlyPaymentEnabled={monthlyPaymentEnabled}
              numberOfMonthsForPayment={numberOfMonthsForPayment}
              onNumberOfMonthsForPaymentChange={setNumberOfMonthsForPayment}
              amountPaid={amountPaid}
              onAmountPaidChange={setAmountPaid}
              treatmentDuration={treatmentDuration}
              brand={brand}
            />

            {/* Form Actions */}
            <div className="form-actions" ref={formActionsRef}>
              <button
                type="button"
                className="btn-settings"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenSettings?.();
                }}
              >
                <i className="fas fa-cog"></i>
                {t("quotation.settings")}
              </button>
              <button
                type="submit"
                className="btn-generate"
                data-testid="quotation-preview"
              >
                <i className="fas fa-file-pdf"></i>
                {t("quotation.previewInvoice")}
              </button>
            </div>
          </>
        )}
      </form>

      {mismatchModal && (
        <InvoiceMismatchModal
          totalPrice={mismatchModal.totalPrice}
          sumFromLines={mismatchModal.sumFromLines}
          onFixTotal={handleMismatchFixTotal}
          onContinueAnyway={handleMismatchContinueAnyway}
          onCancel={handleMismatchCancel}
        />
      )}
    </div>
  );
};

export default QuotationForm;
