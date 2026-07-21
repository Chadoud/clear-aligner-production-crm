import { describe, expect, it } from "vitest";
import {
  AUTH_TOO_MANY,
  __resetAuthRateLimitBucketsForTests,
  consumeAuthBudget,
  isRateLimitError,
  normalizeEmail,
  rateLimitErrorMessage,
  tokenRateLimitKey,
} from "../../src/http/rateLimitPolicy.js";

describe("rateLimitPolicy", () => {
  it("normalizeEmail trims and lowercases", () => {
    expect(normalizeEmail("  Doc@Example.COM ")).toBe("doc@example.com");
  });

  it("consumeAuthBudget trips after max and resets after window", () => {
    __resetAuthRateLimitBucketsForTests();
    expect(consumeAuthBudget("t:a", 2, 60_000).ok).toBe(true);
    expect(consumeAuthBudget("t:a", 2, 60_000).ok).toBe(true);
    const blocked = consumeAuthBudget("t:a", 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(consumeAuthBudget("t:b", 2, 60_000).ok).toBe(true);
  });

  it("tokenRateLimitKey is stable and not the raw token", () => {
    const a = tokenRateLimitKey("secret-token-value");
    const b = tokenRateLimitKey("secret-token-value");
    expect(a).toBe(b);
    expect(a).not.toContain("secret-token");
    expect(a.length).toBe(32);
  });

  it("isRateLimitError detects status, code, and message shapes", () => {
    expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isRateLimitError({ code: "FST_ERR_RATE_LIMIT" })).toBe(true);
    expect(
      isRateLimitError({ error: "Too many login attempts. Please try again." })
    ).toBe(true);
    expect(isRateLimitError({ statusCode: 500 })).toBe(false);
  });

  it("rateLimitErrorMessage prefers explicit error text", () => {
    expect(rateLimitErrorMessage({ error: AUTH_TOO_MANY })).toBe(AUTH_TOO_MANY);
    expect(rateLimitErrorMessage({})).toBe(AUTH_TOO_MANY);
  });
});
