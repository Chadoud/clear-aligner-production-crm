/**
 * i18n bootstrap: English default, French secondary. Locale persisted as `uiLocale` in appStorage.
 * Init once before React root render (see main.jsx). Runtime changes: Header toggle → changeLanguage + storage + document.lang.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import { getAppStorage } from "@/core/storage/appStorage";

export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type UiLocale = (typeof SUPPORTED_LOCALES)[number];

export const UI_LOCALE_STORAGE_KEY = "uiLocale";

const NAMESPACES = ["translation", "pdf"] as const;

function readStoredLocale(): UiLocale | null {
  const raw = getAppStorage().get<string>(UI_LOCALE_STORAGE_KEY);
  if (raw === "en" || raw === "fr") return raw;
  return null;
}

export function getInitialUiLocale(): UiLocale {
  return readStoredLocale() ?? "en";
}

export function persistUiLocale(lng: UiLocale): void {
  getAppStorage().set(UI_LOCALE_STORAGE_KEY, lng);
}

export function setDocumentHtmlLang(lng: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng === "fr" ? "fr" : "en";
}

type InitOptions = {
  /** In tests, pass bundled resources to avoid HTTP fetch. */
  resources?: Record<
    string,
    Partial<Record<(typeof NAMESPACES)[number], Record<string, unknown>>>
  >;
};

let initPromise: Promise<void> | null = null;

export function initI18n(options?: InitOptions): Promise<void> {
  if (initPromise) return initPromise;

  const lng = getInitialUiLocale();
  setDocumentHtmlLang(lng);

  initPromise = (async () => {
    if (i18n.isInitialized) return;

    const baseInit = {
      lng,
      fallbackLng: "en",
      supportedLngs: [...SUPPORTED_LOCALES] as string[],
      ns: [...NAMESPACES] as string[],
      defaultNS: "translation",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    };

    if (options?.resources) {
      await i18n.use(initReactI18next).init({
        ...baseInit,
        resources: options.resources as Record<
          string,
          Record<string, Record<string, unknown>>
        >,
      });
      return;
    }

    await i18n
      .use(HttpBackend)
      .use(initReactI18next)
      .init({
        ...baseInit,
        backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
      });
  })();

  return initPromise;
}

export { i18n };
