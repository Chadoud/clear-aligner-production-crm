import "@testing-library/jest-dom";
import enTranslation from "../../public/locales/en/translation.json";
import frTranslation from "../../public/locales/fr/translation.json";
import enPdf from "../../public/locales/en/pdf.json";
import frPdf from "../../public/locales/fr/pdf.json";
import { initI18n } from "@/i18n";

// jsdom does not implement matchMedia (used by DashboardProvider layout breakpoints)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

await initI18n({
  resources: {
    en: {
      translation: enTranslation as Record<string, unknown>,
      pdf: enPdf as Record<string, unknown>,
    },
    fr: {
      translation: frTranslation as Record<string, unknown>,
      pdf: frPdf as Record<string, unknown>,
    },
  },
});
