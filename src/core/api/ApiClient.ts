import type { ApiClientOptions } from "@/types/api";
import { ApiError } from "@/core/errors/ApiError";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_UNAUTHORIZED_EVENT,
} from "@/constants/authStorage";

function getAuthHeaders(): Record<string, string> {
  try {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // sessionStorage unavailable (e.g. SSR or private mode restriction)
  }
  return {};
}

function handleUnauthorized(): void {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    const path = window.location.pathname;
    const isPublicAuthPage =
      path.startsWith("/login") ||
      path === "/forgot-password" ||
      path === "/reset-password";
    if (!isPublicAuthPage) {
      window.location.href = "/login";
    }
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultHttpStatusMessage(status: number): string | undefined {
  switch (status) {
    case 413:
      return "The file is too large. Maximum size is 2 MB.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 429:
      return "Too many requests. Please try again later.";
    default:
      return undefined;
  }
}

export class ApiClient {
  constructor(private readonly baseUrl = "") {}

  async request<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
    const {
      timeoutMs = 10000,
      retries = 0,
      headers: extraHeaders,
      ...fetchOptions
    } = options;

    const authHeaders = getAuthHeaders();
    const hasBody =
      fetchOptions.body != null &&
      (typeof fetchOptions.body === "string"
        ? fetchOptions.body.length > 0
        : true);
    const isFormData = fetchOptions.body instanceof FormData;
    const mergedHeaders: HeadersInit = {
      ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...(extraHeaders as Record<string, string> | undefined),
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...fetchOptions,
          headers: mergedHeaders,
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401) handleUnauthorized();
          let serverMessage: string | undefined;
          try {
            const errBody: unknown = await response.json();
            if (
              errBody &&
              typeof errBody === "object" &&
              "error" in errBody &&
              typeof (errBody as { error: unknown }).error === "string"
            ) {
              serverMessage = (errBody as { error: string }).error;
            }
          } catch {
            /* non-JSON error body */
          }
          const userMessage =
            serverMessage ?? defaultHttpStatusMessage(response.status);
          throw new ApiError(
            userMessage ?? `Request failed for ${path}`,
            response.status,
            undefined,
            userMessage
          );
        }
        if (response.status === 204) return {} as T;
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (attempt < retries) await delay(150 * (attempt + 1));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ApiError(`Request failed for ${path}`, undefined, lastError);
  }
}
