import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/index.js";
import {
  AUTH_TOO_MANY,
  LOGIN_EMAIL,
  LOGIN_IP,
  __resetAuthRateLimitBucketsForTests,
} from "../../src/http/rateLimitPolicy.js";

async function postLogin(
  app: FastifyInstance,
  email: string,
  headers: Record<string, string> = {}
) {
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { "content-type": "application/json", ...headers },
    payload: { email, password: "wrong-password-for-rate-limit-test" },
  });
}

describe("auth login rate limits", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    __resetAuthRateLimitBucketsForTests();
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns 429 after per-email budget for the same address", async () => {
    app = await buildApp({ initStorage: false, trustProxy: false });
    const email = "rate-limit-email@example.com";
    for (let i = 0; i < LOGIN_EMAIL.max; i += 1) {
      const res = await postLogin(app, email);
      expect([401, 500, 503]).toContain(res.statusCode);
    }
    const blocked = await postLogin(app, email);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toBe(AUTH_TOO_MANY);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("returns 429 from per-IP budget when spraying many emails", async () => {
    app = await buildApp({ initStorage: false, trustProxy: false });
    for (let i = 0; i < LOGIN_IP.max; i += 1) {
      const res = await postLogin(app, `spray-${i}@example.com`);
      expect([401, 500, 503]).toContain(res.statusCode);
    }
    const blocked = await postLogin(app, "spray-overflow@example.com");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toBe(AUTH_TOO_MANY);
  });

  it("does not split buckets on X-Forwarded-For when trustProxy is off", async () => {
    app = await buildApp({ initStorage: false, trustProxy: false });
    const email = "no-trust-proxy@example.com";
    for (let i = 0; i < LOGIN_EMAIL.max; i += 1) {
      await postLogin(app, email, { "x-forwarded-for": "203.0.113.10" });
    }
    const blocked = await postLogin(app, email, {
      "x-forwarded-for": "203.0.113.99",
    });
    expect(blocked.statusCode).toBe(429);
  });

  it("still rate-limits by email across distinct forwarded client IPs", async () => {
    app = await buildApp({ initStorage: false, trustProxy: 1 });
    const email = "stuffing@example.com";
    for (let i = 0; i < LOGIN_EMAIL.max; i += 1) {
      const res = await postLogin(app, email, {
        "x-forwarded-for": `198.51.100.${i + 1}`,
      });
      expect([401, 500, 503]).toContain(res.statusCode);
    }
    const blocked = await postLogin(app, email, {
      "x-forwarded-for": "198.51.100.200",
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toBe(AUTH_TOO_MANY);
  });

  it("uses distinct per-IP buckets for different X-Forwarded-For values", async () => {
    app = await buildApp({ initStorage: false, trustProxy: 1 });
    for (let i = 0; i < LOGIN_IP.max; i += 1) {
      const res = await postLogin(app, `ip-a-${i}@example.com`, {
        "x-forwarded-for": "203.0.113.50",
      });
      expect([401, 500, 503]).toContain(res.statusCode);
    }
    const blockedOnA = await postLogin(app, "ip-a-overflow@example.com", {
      "x-forwarded-for": "203.0.113.50",
    });
    expect(blockedOnA.statusCode).toBe(429);

    const otherIpStillOk = await postLogin(app, "ip-b-ok@example.com", {
      "x-forwarded-for": "203.0.113.51",
    });
    expect([401, 500, 503]).toContain(otherIpStillOk.statusCode);
  });

  it("keeps /health available (rateLimit: false)", async () => {
    app = await buildApp({ initStorage: false, trustProxy: false });
    for (let i = 0; i < 5; i += 1) {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
    }
  });
});
