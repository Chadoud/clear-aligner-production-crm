import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/index.js";
import { AUTH_TOO_MANY } from "../../src/http/rateLimitPolicy.js";

describe("rate-limit error normalization", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ initStorage: false });
    app.get("/_test-rate-limit", async () => {
      throw {
        statusCode: 429,
        code: "FST_ERR_RATE_LIMIT",
        error: AUTH_TOO_MANY,
      };
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("maps FST_ERR_RATE_LIMIT to HTTP 429 with auth message", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/_test-rate-limit",
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe(AUTH_TOO_MANY);
  });
});
