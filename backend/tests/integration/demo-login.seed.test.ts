/**
 * Smoke test: demo seed user can log in against a real MySQL.
 * Skips when SOURCE_DB_URL is unset or MySQL is unreachable (local unit runs).
 * CI runs db:setup first so this job always executes the assertion.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createConnection } from "mysql2/promise";
import { buildApp } from "../../src/index.js";

const DEMO_EMAIL = "lab@example.com";
const DEMO_PASSWORD = "Doctor123!";

async function mysqlReachable(): Promise<boolean> {
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

describe("demo seed login", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns JWT for lab@example.com / Doctor123!", async () => {
    const ready = await mysqlReachable();
    if (!ready) {
      console.warn(
        "[demo-login.seed] skip — MySQL/seed not available (run npm run db:setup)"
      );
      return;
    }

    app = await buildApp({ initStorage: true, trustProxy: false });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { token?: string; user?: { role?: string } };
    expect(typeof body.token).toBe("string");
    expect(body.token!.length).toBeGreaterThan(20);
    expect(body.user?.role).toBe("company");
  });
});
