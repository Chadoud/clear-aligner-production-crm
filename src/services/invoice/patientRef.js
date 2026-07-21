/**
 * Resolve patient ref from invoice client for status updates.
 * @module services/invoiceDataServicePatientRef
 */

import { getClientRef } from "@/utils/invoices/index.js";
import { safeTrim } from "@/utils/shared/index.js";

/**
 * Resolve patient ref from client (ref or name lookup with Mr/Mrs stripping).
 * @param {Object} client - Client object
 * @param {Function} getPatientByName - Lookup by name
 * @returns {string|null}
 */
export function getPatientRefFromClient(client, getPatientByName) {
  const ref = getClientRef(client);
  if (ref) return ref;
  const name = safeTrim(client?.name);
  if (!name) return null;
  let byName = getPatientByName(name);
  if (!byName?.ref && (name.startsWith("Mrs ") || name.startsWith("Mr "))) {
    byName = getPatientByName(name.replace(/^(Mrs|Mr)\s+/, "").trim());
  }
  return byName?.ref ?? null;
}
