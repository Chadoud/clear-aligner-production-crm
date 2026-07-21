/**
 * Custom Hook: useInvoiceService
 *
 * Provides invoice service functions with lazy loading.
 * Handles dynamic imports internally to avoid Vite resolution issues.
 *
 * @module hooks/useInvoiceService
 */

import { useState, useEffect } from "react";
import { safeLogError } from "@/utils/safeLogError";

// Cache for loaded service
let invoiceServiceCache = null;

/**
 * Custom hook for invoice service
 * @returns {Object} Invoice service functions and loading state
 */
export const useInvoiceService = () => {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadService = async () => {
      if (!invoiceServiceCache) {
        try {
          const module = await import(
            /* @vite-ignore */ "../services/invoiceDataService.js"
          );
          invoiceServiceCache = {
            loadInvoices: module.loadInvoices,
            saveInvoices: module.saveInvoices,
            addInvoice: module.addInvoice,
            updateInvoice: module.updateInvoice,
            deleteInvoice: module.deleteInvoice,
            filterInvoicesByPatient: module.filterInvoicesByPatient,
            getInvoiceCountForPatient: module.getInvoiceCountForPatient,
          };
        } catch (error) {
          safeLogError(error, "Failed to load invoice service");
        }
      }
      setService(invoiceServiceCache);
      setLoading(false);
    };

    loadService();
  }, []);

  return { service, loading };
};
