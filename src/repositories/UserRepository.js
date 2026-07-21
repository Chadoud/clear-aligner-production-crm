import { apiClient as client } from "@/core/api/apiClientSingleton";

/**
 * @param {{ status?: number, limit?: number, offset?: number, q?: string, cabinet_id?: number, sortBy?: string, sortOrder?: string }} opts
 * @param {import("@/types/api").ApiClientOptions} [requestOpts]
 * @returns {Promise<{ users: Array, total: number }>}
 */
export async function fetchUsers(opts = {}, requestOpts = {}) {
  const params = new URLSearchParams();
  if (opts.status !== undefined) params.set("status", String(opts.status));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  if (opts.cabinet_id != null && Number.isFinite(opts.cabinet_id))
    params.set("cabinet_id", String(opts.cabinet_id));
  if (opts.sortBy) params.set("sort_by", opts.sortBy);
  if (opts.sortOrder) params.set("sort_order", opts.sortOrder);

  const qs = params.toString();
  return client.request(`/api/v1/users${qs ? `?${qs}` : ""}`, {
    timeoutMs: 30000,
    ...requestOpts,
  });
}

/**
 * @param {number} id
 * @returns {Promise<object>}
 */
export async function fetchUserById(id) {
  return client.request(`/api/v1/users/${id}`);
}

/**
 * Create a new user. Company (superadmin) only.
 * @param {{ email: string, password: string, firstName: string, lastName: string, phone?: string|null, website?: string|null, isCompany?: boolean, cabinetId?: number|null }} data
 * @returns {Promise<object>}
 */
export async function createUser(data) {
  return client.request("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update user data. Company (superadmin) only.
 * @param {number} id
 * @param {{ firstName?: string, lastName?: string, phone?: string|null, website?: string|null, cabinetId?: number|null, isCompany?: boolean }} data
 * @returns {Promise<object>}
 */
export async function updateUser(id, data) {
  return client.request(`/api/v1/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Permanently delete a user. Company (superadmin) only.
 * Works for active, pending, and refused registrations.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteUser(id) {
  return client.request(`/api/v1/users/${id}`, { method: "DELETE" });
}

/**
 * Fetch list of all rights (sidebar items). Company only.
 * @returns {Promise<{ rights: Array<{ id: number, identify: string, name: string, parentId: number, hasChildren: number }> }>}
 */
export async function fetchRightsList() {
  return client.request("/api/v1/users/rights/list");
}

/**
 * Fetch user's assigned rights. Company only.
 * @param {number} userId
 * @returns {Promise<{ rights: number[] }>}
 */
export async function fetchUserRights(userId) {
  return client.request(`/api/v1/users/${userId}/rights`);
}

/**
 * Update user's rights. Company only.
 * @param {number} userId
 * @param {number[]} rights
 * @returns {Promise<{ rights: number[] }>}
 */
export async function updateUserRights(userId, rights) {
  return client.request(`/api/v1/users/${userId}/rights`, {
    method: "PUT",
    body: JSON.stringify({ rights }),
  });
}
