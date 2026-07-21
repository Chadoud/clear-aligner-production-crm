/**
 * Load / save invoices with local migration (ids + refs) when not on API.
 * @module services/invoiceDataServiceLoadSave
 */

import {
  loadInvoices as repoLoad,
  saveInvoices as repoSave,
} from "@/repositories/InvoiceRepository.js";
import { isApiEnabled } from "@/config/api.js";
import { ensureInvoiceIds, ensureInvoiceRefs } from "./merge.js";

/**
 * Load all invoices from storage (API or localStorage).
 * @param {{ caseId?: number }} [opts] - When caseId is set (API mode), fetches only that patient's invoices.
 * @returns {Promise<Array<Object>>} Array of invoice objects
 */
export const loadInvoices = async (opts = {}) => {
  try {
    const raw = await repoLoad(opts);
    const arr = Array.isArray(raw) ? raw : [];
    if (arr.length === 0) return arr;
    let { data, changed } = ensureInvoiceIds(arr);
    if (changed && !isApiEnabled) await repoSave(data);
    const refResult = ensureInvoiceRefs(data);
    if (refResult.changed && !isApiEnabled) {
      await repoSave(refResult.data);
      return refResult.data;
    }
    return refResult.data;
  } catch (error) {
    console.error("Error loading invoices from storage:", error);
    return [];
  }
};

/**
 * Save invoices to storage (localStorage only; API uses create/update/delete).
 * @param {Array<Object>} invoices
 * @returns {Promise<void>}
 */
export const saveInvoices = async (invoices) => {
  try {
    await repoSave(invoices);
  } catch (error) {
    console.error("Error saving invoices from storage:", error);
  }
};
