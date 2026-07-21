/**
 * Pre-configured Parameter Presets
 *
 * Aggregates brand-specific presets (Lab vs Direct)
 * from separate files. Do not mix brand presets in this file; edit presetsLab.js
 * or presetsDirect.js instead.
 *
 * @example Adding a new preset:
 * - Lab only: add to presetsLab.js
 * - Direct only: add to presetsDirect.js
 *
 * @module config/presets
 */

import { PRESETS_LAB } from "./presetsLab.js";
import { PRESETS_DIRECT } from "./presetsDirect.js";

/** Merged presets: Lab + Direct (no mixing of brand content here) */
export const PRESETS = {
  ...PRESETS_LAB,
  ...PRESETS_DIRECT,
};

/**
 * Get preset configuration by ID
 * @param {string} presetId - The preset identifier
 * @returns {Object|null} Preset configuration or null if not found
 */
export const getPreset = (presetId) => {
  return PRESETS[presetId] || null;
};

/**
 * Get all available presets
 * @returns {Array} Array of preset objects with id and label
 */
export const getAllPresets = () => {
  return Object.values(PRESETS).map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    brand: preset.brand,
  }));
};

/**
 * Get all service codes that belong to a preset (services it adds)
 * @param {string} presetId - The preset identifier
 * @returns {Array} Array of service codes that this preset adds
 */
export const getPresetServiceCodes = (presetId) => {
  const preset = getPreset(presetId);
  if (!preset) return [];

  return preset.services.map((s) => s.code);
};

/**
 * Get all service codes that should be removed for a preset
 * @param {string} presetId - The preset identifier
 * @returns {Array} Array of service codes to remove
 */
export const getPresetServicesToRemove = (presetId) => {
  const preset = getPreset(presetId);
  if (!preset) return [];

  const presetServiceCodes = preset.services.map((s) => s.code);
  return [...new Set([...presetServiceCodes, ...preset.servicesToRemove])];
};

/**
 * Apply preset configuration to services
 * @param {string} presetId - The preset identifier
 * @param {Array} currentServices - Current selected services
 * @param {Function} getServiceByCode - Function to get service by code
 * @param {string|null} previousPresetId - Previous preset ID to remove its services first
 * @returns {Array} Updated services array
 */
export const applyPresetServices = (
  presetId,
  currentServices,
  getServiceByCode,
  previousPresetId = null
) => {
  const preset = getPreset(presetId);
  if (!preset) return currentServices;

  let updatedServices = [...currentServices];

  if (previousPresetId && previousPresetId !== presetId) {
    const previousPresetServiceCodes = getPresetServiceCodes(previousPresetId);
    updatedServices = updatedServices.filter(
      (service) => !previousPresetServiceCodes.includes(service.code)
    );
  }

  preset.services.forEach((presetService) => {
    if (presetService.quantity === 0) {
      updatedServices = updatedServices.filter(
        (service) => service.code !== presetService.code
      );
      return;
    }

    const existingIndex = updatedServices.findIndex(
      (s) => s.code === presetService.code
    );

    if (presetService.custom) {
      if (existingIndex >= 0) {
        updatedServices[existingIndex] = {
          ...updatedServices[existingIndex],
          quantity: presetService.quantity,
          quantityCustom: "",
        };
      } else {
        updatedServices.push({
          code: presetService.code,
          service: presetService.service,
          vpt: presetService.vpt,
          points: presetService.points,
          quantity: presetService.quantity,
          quantityCustom: "",
        });
      }
    } else {
      const service = getServiceByCode(presetService.code);
      if (service) {
        if (existingIndex >= 0) {
          updatedServices[existingIndex] = {
            ...service,
            ...updatedServices[existingIndex],
            quantity: presetService.quantity,
            quantityCustom: "",
            points: service.points,
            vpt: service.vpt,
          };
        } else {
          updatedServices.push({
            ...service,
            quantity: presetService.quantity,
            quantityCustom: "",
            points: service.points,
            vpt: service.vpt,
          });
        }
      }
    }
  });

  return updatedServices;
};

/**
 * Get preset price configuration
 * @param {string} presetId - The preset identifier
 * @returns {Object|null} Price configuration { type: 'preset'|'custom', value: number } or null
 */
export const getPresetPrice = (presetId) => {
  const preset = getPreset(presetId);
  return preset?.totalPrice || null;
};

/**
 * Get preset treatment duration configuration
 * @param {string} presetId - The preset identifier
 * @returns {Object|null} Duration configuration { type: 'preset'|'custom', value: number } or null
 */
export const getPresetDuration = (presetId) => {
  const preset = getPreset(presetId);
  return preset?.treatmentDuration || null;
};

/**
 * Get preset treatment steps (aligner steps count for invoice display).
 * @param {string} presetId - The preset identifier
 * @returns {Object|null} Steps configuration { type: 'preset'|'custom', value: number } or null
 */
export const getPresetSteps = (presetId) => {
  const preset = getPreset(presetId);
  return preset?.treatmentSteps ?? null;
};

/**
 * Get preset VAT rate (e.g. 0.081 for 8.1%), or null if the preset has no VAT.
 * @param {string} presetId - The preset identifier
 * @returns {number|null} VAT rate (0–1) or null
 */
export const getPresetVatRate = (presetId) => {
  const preset = getPreset(presetId);
  const rate = preset?.vatRate;
  return typeof rate === "number" && rate > 0 ? rate : null;
};
