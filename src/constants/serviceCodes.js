/**
 * Service Code Constants
 *
 * Centralized definitions of service codes used throughout the application.
 * This ensures consistency and makes it easier to maintain and update service codes.
 *
 * @module constants/serviceCodes
 */

/**
 * Service codes for fixed/crossed-out services
 */
export const SERVICE_CODES = {
  FIRST_CONSULTATION: "4.8000",
  SCAN_INTRA_EXTRA_ORAL: "4.0970",
  LAB_LAB: "0.1",
  PANORAMIQUE: "PANORAMIQUE",
  TRAITEMENT_ALIGNEMENT: "TRAITEMENT_ALIGNEMENT",
  BLANCHIMENT: "BLANCHIMENT",
  GOUTTIERE_THERMOFORMEE: "4.1750",
};

/**
 * Excluded-from-price codes — single source: `@aligner-crm/domain`.
 */
export {
  EXCLUDED_FROM_PRICE,
  isExcludedFromPrice,
  isPanoramiqueService,
} from "@aligner-crm/domain";

/**
 * Service codes that should be excluded from display
 */
export const EXCLUDED_FROM_DISPLAY = [SERVICE_CODES.TRAITEMENT_ALIGNEMENT];

/**
 * Service codes that are crossed out on the invoice
 */
export const CROSSED_OUT_SERVICES = [
  SERVICE_CODES.FIRST_CONSULTATION,
  SERVICE_CODES.SCAN_INTRA_EXTRA_ORAL,
  SERVICE_CODES.PANORAMIQUE,
];

/**
 * Default quantities for specific services
 */
export const DEFAULT_QUANTITIES = {
  [SERVICE_CODES.GOUTTIERE_THERMOFORMEE]: 25,
  [SERVICE_CODES.SCAN_INTRA_EXTRA_ORAL]: 6,
  DEFAULT: 1,
};

/**
 * Check if a service code should be excluded from display
 *
 * @param {string} code - Service code to check
 * @returns {boolean} True if service should be excluded from display
 */
export const isExcludedFromDisplay = (code) => {
  return EXCLUDED_FROM_DISPLAY.includes(code);
};

/**
 * Get default quantity for a service code
 *
 * @param {string} code - Service code
 * @returns {number} Default quantity for the service
 */
export const getDefaultQuantity = (code) => {
  return DEFAULT_QUANTITIES[code] || DEFAULT_QUANTITIES.DEFAULT;
};
