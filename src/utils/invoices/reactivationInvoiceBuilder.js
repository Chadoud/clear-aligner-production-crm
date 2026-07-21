/**
 * Builds invoice payload for reactivation preset (3rd reactivation).
 *
 * @module utils/invoices/reactivationInvoiceBuilder
 */

import {
  getPreset,
  getPresetPrice,
  applyPresetServices,
} from "@/config/presets.js";
import { prepareInvoiceData } from "./invoiceData.js";
import { formatTodayDDMMYYYY } from "../dates/dateUtils.js";

const REACTIVATION_PRESET_BY_BRAND = {
  Direct: "es-reactivation",
  Lab: "sa-reactivation",
};

/**
 * Build invoice payload for reactivation preset in quote mode.
 * @param {Object} patient - Patient object (name, cabinet_id, case_id, etc.)
 * @param {string} newRef - New ref after reactivation (e.g. "5677-3")
 * @param {string} brand - "Lab" or "Direct"
 * @param {Function} getServiceByCode - (code) => service from catalog
 * @returns {Object|null} Invoice payload for addInvoice, or null if preset/brand unknown
 */
export function buildReactivationInvoicePayload(
  patient,
  newRef,
  brand,
  getServiceByCode
) {
  const presetId = REACTIVATION_PRESET_BY_BRAND[brand];
  if (!presetId) return null;

  const preset = getPreset(presetId);
  if (!preset) return null;

  const selectedServices = applyPresetServices(
    presetId,
    [],
    getServiceByCode,
    null
  );
  if (!selectedServices.length) return null;

  const priceConfig = getPresetPrice(presetId);
  const totalPrice = priceConfig?.value ?? 300;

  const clientInfo = {
    name: patient?.name ?? "",
    ref: newRef,
    email: patient?.email ?? null,
    born: patient?.born ?? null,
  };

  const invoiceData = prepareInvoiceData({
    clientInfo,
    brand,
    showFreeServices: false,
    treatmentDuration: preset.treatmentDuration?.value ?? null,
    totalPrice: String(totalPrice),
    selectedServices,
    getServiceByCode,
    isQuote: true,
    monthlyPaymentEnabled: false,
    amountPaid: 0,
    numberOfMonthsForPayment: 0,
  });

  return {
    ...invoiceData,
    case_id: patient?.case_id ?? null,
    cabinet_id: patient?.cabinet_id ?? null,
    generatedDate: formatTodayDDMMYYYY(),
  };
}
