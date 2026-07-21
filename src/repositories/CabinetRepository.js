import { apiClient as client } from "@/core/api/apiClientSingleton";

/**
 * @param {{ limit?: number, offset?: number }} opts
 * @returns {Promise<{ cabinets: Array, total: number }>}
 */
export async function fetchCabinets(opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return client.request(`/api/v1/cabinets${qs ? `?${qs}` : ""}`);
}

/**
 * @param {string} slug
 * @returns {Promise<Object>}
 */
export async function fetchCabinetBySlug(slug) {
  return client.request(`/api/v1/cabinets/${encodeURIComponent(slug)}`);
}

/**
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function fetchCabinetById(id) {
  return client.request(`/api/v1/cabinets/by-id/${id}`);
}

/**
 * Update an existing cabinet.
 * @param {string} slug - Cabinet slug (id)
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateCabinet(slug, data) {
  const payload = {
    name: data.name?.trim() || undefined,
    legalName: data.legalName?.trim() || undefined,
    phone: data.telephone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    website: data.website?.trim() || undefined,
    fax: data.fax?.trim() || undefined,
    address: data.address?.trim() || undefined,
    country: data.country?.trim() || undefined,
  };
  if (data.zipCity != null) {
    const parts = String(data.zipCity).trim().split(/\s+/);
    payload.zip = parts[0] || undefined;
    payload.city = parts.slice(1).join(" ").trim() || undefined;
  }
  return client.request(`/api/v1/cabinets/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * @param {string} slug
 * @param {File} file
 */
export async function uploadCabinetLogo(slug, file) {
  const formData = new FormData();
  formData.append("logo", file);
  return client.request(`/api/v1/cabinets/${encodeURIComponent(slug)}/logo`, {
    method: "POST",
    body: formData,
    timeoutMs: 60000,
  });
}

/** @param {string} slug */
export async function removeCabinetLogo(slug) {
  return client.request(`/api/v1/cabinets/${encodeURIComponent(slug)}/logo`, {
    method: "DELETE",
  });
}

/**
 * Create a new cabinet.
 * @param {Object} data
 * @param {string} data.name - Cabinet name (required)
 * @param {string} [data.legalName]
 * @param {string} [data.phone]
 * @param {string} [data.email]
 * @param {string} [data.website]
 * @param {string} [data.fax]
 * @param {string} [data.addressNum]
 * @param {string} [data.address]
 * @param {string} [data.zip]
 * @param {string} [data.city]
 * @param {string} [data.country]
 * @returns {Promise<{ cabinet: { id: number, slug: string, name: string } }>}
 */
export async function createCabinet(data) {
  return client.request("/api/v1/cabinets", {
    method: "POST",
    body: JSON.stringify({
      name: data.name?.trim() ?? "",
      legalName: data.legalName?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      website: data.website?.trim() || undefined,
      fax: data.fax?.trim() || undefined,
      addressNum: data.addressNum?.trim() || undefined,
      address: data.address?.trim() || undefined,
      zip: data.zip?.trim() || undefined,
      city: data.city?.trim() || undefined,
      country: data.country?.trim() || undefined,
    }),
  });
}
