/**
 * Cabinet (doctor) data — API only (live MySQL DB via backend).
 *
 * @module data/cabinets
 */

/**
 * @typedef {Object} CabinetListItem
 * @property {number} id
 * @property {string} slug
 * @property {string} name
 * @property {string} enteringDate
 * @property {string} email
 */

/**
 * @typedef {Object} CabinetEditShape
 * @property {string} slug
 * @property {string} name
 * @property {string} legalName
 * @property {string} telephone
 * @property {string} fax
 * @property {string} email
 * @property {string} website
 * @property {string} address
 * @property {string} zipCity
 * @property {string} country
 * @property {string[]} users
 * @property {Array<{ ref: string, name: string, status: string, enteringDate: string }>} cases
 */

import { formatDateDDMMYYYY } from "../utils/dates/index.js";
import {
  fetchCabinets,
  fetchCabinetById,
  fetchCabinetBySlug,
} from "../repositories/CabinetRepository.js";

let cabinetListCache = null;
let cabinetBySlugCache = null;
let cabinetsLoadPromise = null;

function addressFromRecord(record) {
  if (!record) return { address: "", zipCity: "", country: "" };
  const part = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "null") return null;
    return s;
  };
  const address =
    [part(record.address_num), part(record.address)]
      .filter(Boolean)
      .join(" ")
      .trim() || "";
  const zipCity =
    [record.zip, record.city].filter(Boolean).join(" ").trim() || "";
  return { address, zipCity, country: record.country ?? "" };
}

/**
 * Load cabinets from API and populate the cache.
 * @returns {Promise<void>}
 */
export async function loadCabinetsFromApi() {
  if (cabinetsLoadPromise) return cabinetsLoadPromise;

  cabinetsLoadPromise = (async () => {
    try {
      const data = await fetchCabinets({ limit: 1000 });
      const cabinets = data.cabinets ?? [];
      cabinetListCache = cabinets.map((c, i) => ({
        id: c.id ?? 619 - i,
        slug: String(c.slug ?? c.id ?? i),
        name: c.name ?? "",
        enteringDate: c.entered_at ? formatDateDDMMYYYY(c.entered_at) : "",
        email: c.email ?? "",
      }));
      cabinetBySlugCache = new Map(
        cabinets.map((c) => [String(c.slug ?? c.id), c])
      );
    } catch (e) {
      console.error("Cabinets API load failed:", e);
      cabinetListCache = [];
      cabinetBySlugCache = new Map();
    }
  })();

  try {
    await cabinetsLoadPromise;
  } finally {
    cabinetsLoadPromise = null;
  }
}

/** Clear cabinet caches so the next load refetches from the API. */
export function invalidateCabinetCache() {
  cabinetListCache = null;
  cabinetBySlugCache = null;
  cabinetsLoadPromise = null;
}

function upsertCabinetRecord(record) {
  if (!record) return;
  const slug = String(record.slug ?? record.id);
  if (!cabinetBySlugCache) cabinetBySlugCache = new Map();
  cabinetBySlugCache.set(slug, record);

  const listItem = {
    id: record.id,
    slug,
    name: record.name ?? "",
    enteringDate: record.entered_at
      ? formatDateDDMMYYYY(record.entered_at)
      : "",
    email: record.email ?? "",
  };
  if (!cabinetListCache) {
    cabinetListCache = [listItem];
    return;
  }
  const idx = cabinetListCache.findIndex(
    (c) => c.slug === slug || c.id === record.id
  );
  if (idx >= 0) cabinetListCache[idx] = listItem;
  else cabinetListCache.push(listItem);
}

/**
 * Resolve a cabinet for edit/detail views (works after hard refresh).
 * @param {string} slug
 * @returns {Promise<CabinetEditShape|null>}
 */
export async function ensureCabinetBySlug(slug) {
  const key = String(slug ?? "").trim();
  if (!key) return null;

  if (cabinetBySlugCache?.has(key)) {
    return getCabinetBySlug(key);
  }

  await loadCabinetsFromApi();
  if (cabinetBySlugCache?.has(key)) {
    return getCabinetBySlug(key);
  }

  try {
    const record = await fetchCabinetBySlug(key);
    upsertCabinetRecord(record);
    return getCabinetBySlug(key);
  } catch (e) {
    console.warn("Cabinet fetch failed:", key, e);
    return null;
  }
}

/**
 * Returns "Lab" — our own lab name used to separate internal cases.
 * @returns {string}
 */
export function getOurCabinetName() {
  return "Lab";
}

/**
 * @returns {CabinetListItem[]}
 */
export function getCabinetsList() {
  return cabinetListCache ?? [];
}

/**
 * Get cabinet display name by id (sync, from cache).
 * Used when invoice has cabinet_id but no cabinet_nom (e.g. API payload before backend added cabinet_nom).
 * @param {number|string|null} cabinetId
 * @returns {string|null}
 */
export function getCabinetNameById(cabinetId) {
  if (cabinetId == null || !Number.isFinite(Number(cabinetId))) return null;
  const id = Number(cabinetId);
  const list = getCabinetsList();
  const cab = list.find((c) => c.id === id);
  const name = cab?.name ?? null;
  return name && String(name).trim() ? String(name).trim() : null;
}

/**
 * Convert cabinet API record to doctorInfo shape for invoice BILL TO section.
 * @param {Object} cabinet - Cabinet from API (id, name, legal_name, address, zip, city, country, phone, email)
 * @returns {{ name: string, address: string, phone: string, email: string }}
 */
export function cabinetToDoctorInfo(cabinet) {
  if (!cabinet) return null;
  const street =
    [cabinet.address_num, cabinet.address].filter(Boolean).join(" ").trim() ||
    cabinet.address ||
    "";
  const addressLine = [street, cabinet.zip, cabinet.city, cabinet.country]
    .filter(Boolean)
    .join(", ");
  return {
    name: cabinet.legal_name || cabinet.name || "",
    address: addressLine,
    phone: cabinet.phone || "",
    email: cabinet.email || "",
  };
}

/**
 * Fetch cabinet by id and return doctorInfo for invoice BILL TO section.
 * @param {number} cabinetId
 * @returns {Promise<{ name: string, address: string, phone: string, email: string } | null>}
 */
export async function fetchDoctorInfoByCabinetId(cabinetId) {
  if (cabinetId == null || !Number.isFinite(Number(cabinetId))) return null;
  try {
    const cabinet = await fetchCabinetById(Number(cabinetId));
    return cabinetToDoctorInfo(cabinet);
  } catch (e) {
    console.warn("Failed to fetch cabinet for doctor info:", e);
    return null;
  }
}

/**
 * Resolve doctorInfo for an invoice: use cabinet_id to fetch from tbl_cabinet when doctorInfo is missing.
 * @param {Object} invoice - Invoice with optional cabinet_id and doctorInfo
 * @returns {Promise<Object>} Invoice with doctorInfo populated (from cabinet fetch or existing)
 */
export async function resolveDoctorInfoForInvoice(invoice) {
  if (!invoice) return invoice;
  if (invoice.doctorInfo && typeof invoice.doctorInfo === "object") {
    return invoice;
  }
  const cabinetId = invoice.cabinet_id ?? invoice.cabinetId;
  if (cabinetId == null || !Number.isFinite(Number(cabinetId))) {
    return invoice;
  }
  const doctorInfo = await fetchDoctorInfoByCabinetId(Number(cabinetId));
  if (!doctorInfo) return invoice;
  return { ...invoice, doctorInfo };
}

/**
 * Get cabinet info for invoice BILL TO section (sync, from cache).
 * @param {string} slugOrName
 * @returns {{ name: string, address: string, phone: string, email: string } | null}
 */
export function getDoctorInfoForInvoice(slugOrName) {
  if (!slugOrName || String(slugOrName).trim() === "") return null;
  let cabinet = getCabinetBySlug(String(slugOrName).trim());
  if (!cabinet) {
    const list = getCabinetsList();
    const byName = list.find(
      (c) =>
        (c.name || "").toLowerCase() === String(slugOrName).trim().toLowerCase()
    );
    if (!byName) return null;
    cabinet = getCabinetBySlug(byName.slug);
  }
  if (!cabinet) return null;
  const addressLine = [cabinet.address, cabinet.zipCity, cabinet.country]
    .filter(Boolean)
    .join(", ");
  return {
    name: cabinet.legalName || cabinet.name || "",
    address: addressLine,
    phone: cabinet.telephone || "",
    email: cabinet.email || "",
  };
}

/**
 * @param {string} slug
 * @returns {CabinetEditShape|null}
 */
export function getCabinetBySlug(slug) {
  if (!cabinetBySlugCache?.has(slug)) return null;
  const c = cabinetBySlugCache.get(slug);
  const { address, zipCity, country } = addressFromRecord(c);
  const name = c.name ?? "";
  return {
    slug: String(slug),
    name,
    legalName: c.legal_name ?? name,
    telephone: c.phone ?? "",
    fax: c.fax ?? "",
    email: c.email ?? "",
    website: c.website ?? "",
    address,
    zipCity,
    country,
    users: [name ? name.toUpperCase() : ""],
    cases: [],
    logo: c.logo ?? null,
    logoUrl: c.logoUrl ?? null,
  };
}
