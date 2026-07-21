import { loginRequest } from "@/repositories/AuthRepository";
import { apiClient as client } from "@/core/api/apiClientSingleton";
import { ApiError } from "@/core/errors/ApiError";

/**
 * Orchestrates login: calls the API, validates the response shape.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: import('@/repositories/AuthRepository').AuthUser }>}
 * @throws {ApiError} with status 401 for invalid credentials, or other codes for server errors
 */
export async function login(email, password) {
  if (!email?.trim()) throw new ApiError("Email is required", 400);
  if (!password) throw new ApiError("Password is required", 400);

  const result = await loginRequest(email.trim().toLowerCase(), password);

  if (!result?.token || !result?.user) {
    throw new ApiError("Unexpected response from authentication server", 500);
  }

  return result;
}

/**
 * Request a password reset link.
 * @param {string} email
 * @returns {Promise<{ ok: boolean, found: boolean, message: string }>}
 */
export async function requestPasswordReset(email) {
  const value = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!value) throw new ApiError("Email is required", 400);
  return client.request("/api/v1/auth/password-reset-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: value }),
  });
}

/**
 * Complete password reset using token.
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function resetPassword(token, newPassword) {
  const value = String(newPassword ?? "");
  if (!token?.trim()) throw new ApiError("Reset token is required", 400);
  if (!value || value.length < 6)
    throw new ApiError("Password must be at least 6 characters", 400);
  await client.request("/api/v1/auth/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token.trim(), newPassword: value }),
  });
}
