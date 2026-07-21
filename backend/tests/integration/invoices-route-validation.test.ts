import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/index.js";
import { signToken } from "../../src/auth/jwt.js";

describe("invoices route guard and validation", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ initStorage: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks invoice listing without auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/invoices",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for blank invoice id when authenticated", async () => {
    const token = signToken({
      sub: "1",
      role: "company",
      cabinetId: null,
      cabinetName: null,
    });
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/invoices/%20",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "id is required" });
  });
});
