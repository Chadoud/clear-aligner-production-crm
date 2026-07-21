import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/index.js";

describe("API auth guard", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ initStorage: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows unprotected status route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/status",
    });
    expect(res.statusCode).toBe(200);
  });

  it("blocks protected routes without auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/patients",
    });
    expect(res.statusCode).toBe(401);
  });
});
