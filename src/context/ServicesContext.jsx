/**
 * Services Context
 *
 * Provides global state management for services data, including loading,
 * caching, and brand-specific service lists.
 *
 * @module context/ServicesContext
 */

/**
 * @typedef {Object} ServicesContextValue
 * @property {Array<{ code: string, vpt?: number|null, points?: number|null, point_value?: number|null, [key: string]: unknown }>} services
 * @property {boolean} loading
 * @property {string|null} error
 * @property {(brand: string) => Promise<void>} loadServicesForBrand
 * @property {(code: string, field: string, value: number|null) => void} updateService
 * @property {(updatedServices: Array) => void} updateServices
 * @property {(code: string) => Object|undefined} getServiceByCode
 * @property {() => void} exportToJSON
 * @property {string} currentBrand - Brand whose services are currently loaded ('Direct' | 'Lab')
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { getBrandConfig } from "../config/constants.js";
import { apiClient } from "../core/api/apiClientSingleton.js";
import { ServicesApiClient } from "../core/api/ServicesApiClient";
import { logger } from "../core/logging/logger";
import { getAppStorage } from "../core/storage/appStorage";
import { isApiEnabled } from "../config/api";
import {
  getServicesOverrides,
  setServicesOverrides as apiSetServicesOverrides,
} from "../repositories/ServicesOverrideRepository.js";
import { hasAuthSession } from "@/core/auth/hasAuthSession.js";
import { runLoadServicesCatalog } from "../services/loadServicesCatalog.js";

export const ServicesContext = createContext();

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return context;
};

export const ServicesProvider = ({ children }) => {
  const storage = getAppStorage();
  const servicesApiClient = useRef(new ServicesApiClient());
  const servicesCache = useRef({});

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBrand, setCurrentBrand] = useState("Lab");

  const loadServicesForBrand = useCallback(
    async (brand) => {
      const sessionOk = hasAuthSession();
      if (isApiEnabled && sessionOk) {
        setLoading(true);
        setError(null);
      }

      const result = await runLoadServicesCatalog({
        brand,
        isApiEnabled,
        hasAuthSession: sessionOk,
        storage,
        cache: servicesCache.current,
        getServicesOverrides,
        apiClientRequest: (path, options) => apiClient.request(path, options),
        getStaticServicesJson: (path) =>
          servicesApiClient.current.getServices(path),
        getServicesJsonPath: (b) => getBrandConfig(b).SERVICES_JSON_PATH,
        onBeforeJsonFetch: () => {
          setLoading(true);
          setError(null);
        },
      });

      switch (result.kind) {
        case "api-ok":
          servicesCache.current[brand] = result.list;
          setServices(result.list);
          setCurrentBrand(brand);
          setLoading(false);
          setError(null);
          return result.list;
        case "api-fail":
          logger.error("Error loading services", result.err);
          setError(result.message);
          setLoading(false);
          return [];
        case "storage":
          servicesCache.current[brand] = result.list;
          setServices(result.list);
          setCurrentBrand(brand);
          setLoading(false);
          setError(null);
          return result.list;
        case "cache":
          setServices(result.list);
          setCurrentBrand(brand);
          setLoading(false);
          setError(null);
          return result.list;
        case "json-ok":
          servicesCache.current[brand] = result.list;
          setServices(result.list);
          setCurrentBrand(brand);
          setLoading(false);
          setError(null);
          return result.list;
        case "json-fail":
          logger.error("Error loading services", result.err);
          setError(result.message);
          setLoading(false);
          return [];
        default:
          return [];
      }
    },
    [storage]
  );

  const updateService = useCallback(
    (code, field, value) => {
      setServices((prev) => {
        const updated = prev.map((s) =>
          s.code === code ? { ...s, [field]: value } : s
        );
        if (servicesCache.current[currentBrand]) {
          servicesCache.current[currentBrand] = updated;
        }
        if (isApiEnabled) {
          apiSetServicesOverrides(currentBrand, { services: updated }).catch(
            (err) => logger.error("Error saving services:", err)
          );
        } else {
          try {
            storage.set(`services_${currentBrand}`, updated);
          } catch (err) {
            logger.error("Error saving services:", err);
          }
        }
        return updated;
      });
    },
    [currentBrand, storage]
  );

  const updateServices = useCallback(
    (updatedServices) => {
      setServices(updatedServices);
      if (servicesCache.current[currentBrand]) {
        servicesCache.current[currentBrand] = updatedServices;
      }
      if (isApiEnabled) {
        apiSetServicesOverrides(currentBrand, {
          services: updatedServices,
        }).catch((err) => logger.error("Error saving services:", err));
      } else {
        try {
          storage.set(`services_${currentBrand}`, updatedServices);
        } catch (err) {
          logger.error("Error saving services:", err);
        }
      }
    },
    [currentBrand, storage]
  );

  const getServiceByCode = useCallback(
    (code) => services.find((s) => s.code === code),
    [services]
  );

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(services, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentBrand === "Lab" ? "services-lab.json" : "services.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ServicesContext.Provider
      value={{
        services,
        loading,
        error,
        currentBrand,
        loadServicesForBrand,
        updateService,
        updateServices,
        getServiceByCode,
        exportToJSON,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};
