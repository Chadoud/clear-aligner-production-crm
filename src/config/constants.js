/**
 * Application Constants
 */

// Shared colors (same across brands)
const SHARED_RED = [231, 76, 60];
const SHARED_LIGHT_GREEN = [232, 245, 233];

// Brand-specific configurations
const BRAND_CONFIGS = {
  Direct: {
    SERVICES_JSON_PATH: "/services.json",
    LOGO: "/assets/brand/logo.svg",
    LOGO_PNG: "/assets/brand/logo.png",
    DOWN_WAVE: "/assets/brand/downWave.svg",
    QR_CODE_SECTION: "/assets/brand/qrPlaceholder.png",
    COLORS: {
      TEAL: [81, 161, 171],
      RED: SHARED_RED,
      LIGHT_GREEN: SHARED_LIGHT_GREEN,
    },
  },
  Lab: {
    SERVICES_JSON_PATH: "/services-lab.json",
    LOGO: "/assets/brand/logo.svg",
    LOGO_PNG: "/assets/brand/logo.png",
    DOWN_WAVE: "/assets/brand/downWave.svg",
    QR_CODE_SECTION: "/assets/brand/qrPlaceholder.png",
    COLORS: {
      TEAL: [45, 56, 132],
      RED: SHARED_RED,
      LIGHT_GREEN: SHARED_LIGHT_GREEN,
    },
  },
};

// Helper function to get brand config
export const getBrandConfig = (brand) => {
  return BRAND_CONFIGS[brand] || BRAND_CONFIGS["Direct"];
};

/** @param {string} [brand] */
export function getBrandHex(brand) {
  const { COLORS } = getBrandConfig(brand);
  const teal = COLORS.TEAL;
  return `#${teal.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const defaultBrandConfig = getBrandConfig("Direct");

export const CONFIG = {
  // API & Data
  SERVICES_JSON_PATH: "/services.json", // Default, will be overridden by brand

  // Invoice Settings
  INVOICE: {
    DEFAULT_ID: "#1",
    // Sample invoice header / QR-bill fields for local PDF preview.
    // Replace with your organisation details in a private ops config before production.
    COMPANY: {
      NAME: "Sample Dental Lab AG",
      ADDRESS: "Example Street 1, 8000 Zurich",
      WEBSITE: "www.example.com",
      PHONE: "+41 00 000 00 00",
    },
    PAYMENT: {
      IBAN: "CH93 0076 2011 6238 5295 7", // publicly documented sample IBAN (not a real account)
      RECIPIENT: "Sample Dental Lab AG",
      ADDRESS: "Example Street 1, 8000 Zurich",
    },
    COLORS: defaultBrandConfig.COLORS,
  },

  // Form Defaults
  FORM: {
    TREATMENT_DURATION_OPTIONS: [6, 12, 24],
    TOTAL_PRICE_OPTIONS: [3300, 3600, 3900],
    QUANTITY_MAX: 100,
    DEFAULT_POINT_VALUE: 1.0, // Default multiplier for converting points to prices
  },

  // Assets (served from public folder in Vite)
  ASSETS: {
    LOGO: defaultBrandConfig.LOGO,
    QR_CODE: "/assets/brand/qrPlaceholder.png",
    QR_CODE_SECTION: defaultBrandConfig.QR_CODE_SECTION,
    /** Doctor billing QR placeholder (swap for a real payment QR asset in private ops). */
    DOCTOR_BILLING_QR: "/assets/brand/qrPlaceholder.png",
    DOWN_WAVE: defaultBrandConfig.DOWN_WAVE,
    TEMPLATE_PATH: "/assets/brand/",
  },

  // PDF Settings
  PDF: {
    FORMAT: "a4",
    ORIENTATION: "p",
    UNIT: "mm",
  },

  // Brand configs
  BRAND_CONFIGS,
};

/**
 * Doctor-billing QR asset path. A single placeholder in this public tree —
 * replace with your real payment QR asset(s) in private ops before production.
 * @returns {string} Path to QR image
 */
export function getDoctorBillingQrPath() {
  return CONFIG.ASSETS.DOCTOR_BILLING_QR;
}
