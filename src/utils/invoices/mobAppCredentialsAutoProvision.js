/**
 * Resolves patient app credentials for the invoice PDF page.
 * Prefers invoice payload / DB stored values; provisions only when missing.
 */
import { apiClient } from "@/core/api/apiClientSingleton.js";
import {
  getMobAppPassword,
  storeMobAppPassword,
} from "./mobAppPasswordSession.js";

function trimOrNull(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/**
 * @param {number|string} caseId
 * @param {object} [invoiceData] - optional invoice payload (case_username, case_mob_app_password)
 * @returns {Promise<{ username: string | null; password: string } | null>}
 */
export async function ensureMobAppPasswordForCase(caseId, invoiceData = null) {
  if (caseId == null || String(caseId).trim() === "") return null;
  const id = Number(caseId);
  if (!Number.isFinite(id)) return null;

  const invoiceUsername = trimOrNull(
    invoiceData?.case_username ?? invoiceData?.caseUsername
  );
  const invoicePassword = trimOrNull(
    invoiceData?.case_mob_app_password ?? invoiceData?.mob_app_password_once
  );
  if (invoiceUsername && invoicePassword) {
    storeMobAppPassword(id, invoicePassword);
    return { username: invoiceUsername, password: invoicePassword };
  }

  const fromSession = getMobAppPassword(id);
  if (fromSession) {
    return { username: invoiceUsername, password: fromSession };
  }

  try {
    const caseRow = await apiClient.request(`/api/v1/cases/${id}`);
    const storedUser = trimOrNull(caseRow?.username);
    const storedPassword = trimOrNull(caseRow?.mob_app_password);
    if (storedUser && storedPassword) {
      storeMobAppPassword(id, storedPassword);
      return { username: storedUser, password: storedPassword };
    }
  } catch {
    // Fall through to first-time provision.
  }

  try {
    const result = await apiClient.request(
      `/api/v1/cases/${id}/provision-credentials`,
      { method: "POST" }
    );
    if (!result?.username) return null;
    const password = trimOrNull(result.password);
    if (password) {
      storeMobAppPassword(id, password);
      return { username: result.username, password };
    }
    return { username: result.username, password: null };
  } catch {
    return null;
  }
}
