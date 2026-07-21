import { apiClient as client } from "@/core/api/apiClientSingleton";

/**
 * @typedef {{ id: number, username: string, fullName: string|null, role: 'company'|'doctor', cabinetId: number|null, cabinetName?: string|null, rights?: number[] }} AuthUser
 * @typedef {{ token: string, user: AuthUser }} LoginResult
 */

/**
 * POST /api/v1/auth/login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<LoginResult>}
 * @throws {ApiError} on 401 or network failure
 */
export async function loginRequest(email, password) {
  const result = await client.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return result;
}

/**
 * GET /api/v1/auth/me — current user with rights (requires Bearer token).
 * @returns {Promise<{ user: AuthUser }>}
 */
export async function fetchMe() {
  return client.request("/api/v1/auth/me");
}
