import { useEffect, type ComponentType, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import * as ServicesContextModule from "@/context/ServicesContext.jsx";
import { BrandProvider, useBrand } from "@/context/BrandContext";
import { useServices } from "@/context/ServicesContext.jsx";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { PatientServiceProvider } from "@/context/PatientServiceContext.jsx";
import { i18n, persistUiLocale, setDocumentHtmlLang } from "@/i18n";
import type { UiLocale } from "@/i18n";

/**
 * Keeps ServicesContext in sync with BrandContext so that e.g. doctor invoicing
 * and quotation form always use the service list for the current brand.
 */
function ServicesBrandSync({ children }: { children: ReactNode }) {
  const { brand } = useBrand();
  const { token } = useAuth();
  const { loadServicesForBrand } = useServices();
  useEffect(() => {
    if (brand) {
      loadServicesForBrand(brand);
    }
  }, [brand, token, loadServicesForBrand]);
  return <>{children}</>;
}

function I18nLocaleSync({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onLang = (lng: string) => {
      if (lng === "en" || lng === "fr") persistUiLocale(lng as UiLocale);
      setDocumentHtmlLang(lng);
    };
    i18n.on("languageChanged", onLang);
    setDocumentHtmlLang(i18n.language);
    return () => {
      i18n.off("languageChanged", onLang);
    };
  }, []);
  return <>{children}</>;
}

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const ServicesProvider =
    ServicesContextModule.ServicesProvider as ComponentType<{
      children: ReactNode;
    }>;
  return (
    <I18nextProvider i18n={i18n}>
      <I18nLocaleSync>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>
              <BrandProvider>
                <ServicesProvider>
                  <PatientServiceProvider>
                    <ServicesBrandSync>{children}</ServicesBrandSync>
                  </PatientServiceProvider>
                </ServicesProvider>
              </BrandProvider>
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nLocaleSync>
    </I18nextProvider>
  );
};
