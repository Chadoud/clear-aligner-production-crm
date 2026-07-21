/**
 * Invoice persistence — API when VITE_USE_API=true, else localStorage.
 * @module repositories/InvoiceRepository
 */

import { getAppStorage } from "../core/storage/appStorage";
import { apiClient } from "../core/api/apiClientSingleton.js";
import { isApiEnabled } from "../config/api";
import { safeLogError } from "@/utils/safeLogError";

const STORAGE_KEY = "generatedInvoices";

function readLegacy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Load invoices from storage. When API on, fetches from backend.
 * @param {{ caseId?: number }} [opts] - When caseId is set, fetches only that patient's invoices (indexed).
 * @returns {Promise<Array<Object>>}
 */
export async function loadInvoices(opts = {}) {
  if (isApiEnabled) {
    try {
      const params = new URLSearchParams();
      if (opts.caseId != null && Number.isFinite(opts.caseId)) {
        params.set("case_id", String(opts.caseId));
        params.set("limit", "100");
      } else {
        params.set("limit", "5000");
      }
      const res = await apiClient.request(
        `/api/v1/invoices?${params.toString()}`
      );
      const list = res?.invoices ?? res;
      return Array.isArray(list) ? list : [];
    } catch (err) {
      safeLogError(err, "Invoice API load failed");
      return [];
    }
  }

  const storage = getAppStorage();
  let data = storage.get(STORAGE_KEY);
  if (data == null) {
    const legacy = readLegacy();
    if (Array.isArray(legacy)) {
      storage.set(STORAGE_KEY, legacy);
      data = legacy;
    } else {
      data = [];
    }
  }
  return data;
}

/**
 * Save invoices. When API on, each invoice is managed individually — this replaces all (used for migration/backfill only).
 * For normal ops with API on, use createInvoice, updateInvoice, deleteInvoice.
 * @param {Array<Object>} invoices
 * @returns {Promise<void>}
 */
export async function saveInvoices(invoices) {
  if (isApiEnabled) {
    // When API on, we don't bulk-save. Callers use create/update/delete.
    return;
  }

  getAppStorage().set(STORAGE_KEY, invoices);
}

/**
 * Create invoice via API. Only used when isApiEnabled.
 * @param {Object} invoice - Must include cabinet_id when company user
 * @returns {Promise<Object>}
 */
export async function createInvoiceApi(invoice) {
  if (!isApiEnabled) return null;
  try {
    const res = await apiClient.request("/api/v1/invoices", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
    return res;
  } catch (err) {
    safeLogError(err, "Invoice API create failed");
    throw err;
  }
}

/**
 * Update invoice via API. Only used when isApiEnabled.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object|null>}
 */
export async function updateInvoiceApi(id, updates) {
  if (!isApiEnabled) return null;
  try {
    return await apiClient.request(
      `/api/v1/invoices/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      }
    );
  } catch (err) {
    safeLogError(err, "Invoice API update failed");
    throw err;
  }
}

/**
 * Delete invoice via API. Only used when isApiEnabled.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteInvoiceApi(id) {
  if (!isApiEnabled) return false;
  try {
    await apiClient.request(`/api/v1/invoices/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    // 404 → invoice was already deleted or never persisted; treat as success
    if (err?.status === 404) return true;
    safeLogError(err, "Invoice API delete failed");
    throw err;
  }
}

/**
 * Notify doctor (cabinet email) once after generating a doctor bill PDF in CRM. Company session only.
 * @param {{ cabinet_id: number, bill_month_label: string, line_items: Array<Record<string, unknown>>, pdf_base64?: string }} payload
 * @returns {Promise<void>}
 */
export async function notifyDoctorBillingGeneratedApi(payload) {
  if (!isApiEnabled) return;
  const {
    cabinet_id,
    bill_month_label,
    line_items,
    pdf_base64: pdfBase64,
  } = payload ?? {};
  try {
    await apiClient.request("/api/v1/invoices/doctor-billing-notify", {
      method: "POST",
      body: JSON.stringify({
        cabinet_id,
        bill_month_label,
        line_items,
        ...(pdfBase64 ? { pdf_base64: pdfBase64 } : {}),
      }),
    });
  } catch (err) {
    safeLogError(err, "Doctor billing notify API failed");
    throw err;
  }
}

/**
 * Notify doctor once after marking a billed doctor group as fully paid.
 * @param {{ cabinet_id: number, bill_month_label: string, line_items: Array<Record<string, unknown>> }} payload
 * @returns {Promise<void>}
 */
export async function notifyDoctorBillingPaidApi(payload) {
  if (!isApiEnabled) return;
  const { cabinet_id, bill_month_label, line_items } = payload ?? {};
  try {
    await apiClient.request("/api/v1/invoices/doctor-billing-paid-notify", {
      method: "POST",
      body: JSON.stringify({
        cabinet_id,
        bill_month_label,
        line_items,
      }),
    });
  } catch (err) {
    safeLogError(err, "Doctor billing paid notify API failed");
    throw err;
  }
}
