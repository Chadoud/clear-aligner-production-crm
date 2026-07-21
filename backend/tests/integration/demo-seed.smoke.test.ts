/**
 * Seed smoke: cabinets, cases, and invoices exist after db:setup.
 * Skips when MySQL/seed unavailable (local unit runs without Compose).
 */
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createConnection } from "mysql2/promise";
import { buildApp } from "../../src/index.js";

const DEMO_EMAIL = "lab@example.com";
const DEMO_PASSWORD = "Doctor123!";

async function mysqlReady(): Promise<boolean> {
  const url = process.env.SOURCE_DB_URL;
  if (!url) return false;
  try {
    const u = new URL(url);
    const conn = await createConnection({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, "")),
      connectTimeout: 3000,
    });
    await conn.query("SELECT 1 FROM users WHERE user_name = ? LIMIT 1", [
      DEMO_EMAIL,
    ]);
    await conn.end();
    return true;
  } catch {
    return false;
  }
}

describe("demo seed smoke", () => {
  let app: FastifyInstance | undefined;
  let token = "";

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("exposes cabinets, patients, and a paid invoice for the lab user", async () => {
    if (!(await mysqlReady())) {
      console.warn("[demo-seed.smoke] skip — MySQL/seed not available");
      return;
    }

    app = await buildApp({ initStorage: true, trustProxy: false });
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    token = (login.json() as { token: string }).token;

    const cabinets = await app.inject({
      method: "GET",
      url: "/api/v1/cabinets?limit=100",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(cabinets.statusCode).toBe(200);
    const cabBody = cabinets.json() as { cabinets?: unknown[] };
    expect((cabBody.cabinets ?? []).length).toBeGreaterThanOrEqual(2);

    const patients = await app.inject({
      method: "GET",
      url: "/api/v1/patients?limit=50&offset=0&skip_count=1",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(patients.statusCode).toBe(200);
    const patBody = patients.json() as { patients?: unknown[] };
    expect((patBody.patients ?? []).length).toBeGreaterThanOrEqual(3);

    const invoices = await app.inject({
      method: "GET",
      url: "/api/v1/invoices?case_id=1005&limit=20",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(invoices.statusCode).toBe(200);
    const invBody = invoices.json() as {
      invoices?: Array<{ id?: string; invoiceStatus?: number }>;
    };
    const paid = (invBody.invoices ?? []).find(
      (i) => i.id === "demo-invoice-1005"
    );
    expect(paid).toBeTruthy();
    expect(paid?.invoiceStatus).toBe(3);
  });
});
