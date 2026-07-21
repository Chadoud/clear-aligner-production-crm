#!/usr/bin/env node
/**
 * Apply backend/db schema + seed using SOURCE_DB_URL from backend/.env.
 * Usage (repo root): npm run db:setup | npm run db:reset
 */
import { createConnection } from "mysql2/promise";
import { config as loadDotenv } from "dotenv";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");
const repoRoot = resolve(backendRoot, "..");
const dbDir = join(backendRoot, "db");

loadDotenv({ path: join(backendRoot, ".env") });
loadDotenv({ path: join(repoRoot, ".env") });

const RESET = process.env.DB_RESET === "1" || process.argv.includes("--reset");
const url =
  process.env.SOURCE_DB_URL || "mysql://aligner:aligner@127.0.0.1:3306/aligner_crm";

function parseMysqlUrl(raw) {
  const u = new URL(raw);
  if (u.protocol !== "mysql:") {
    throw new Error(`SOURCE_DB_URL must start with mysql:// (got ${u.protocol})`);
  }
  const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!database) throw new Error("SOURCE_DB_URL must include a database name");
  return {
    host: u.hostname || "127.0.0.1",
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username || "root"),
    password: decodeURIComponent(u.password || ""),
    database,
  };
}

async function waitForServer(cfg, attempts = 40) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const conn = await createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        multipleStatements: true,
      });
      await conn.query("SELECT 1");
      return conn;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `MySQL not reachable at ${cfg.host}:${cfg.port}: ${lastErr?.message || lastErr}`
  );
}

async function applySqlFile(conn, filePath) {
  const sql = readFileSync(filePath, "utf8");
  if (!sql.trim()) return;
  console.log(`→ ${filePath.replace(repoRoot + "/", "")}`);
  await conn.query(sql);
}

async function main() {
  const cfg = parseMysqlUrl(url);
  console.log(
    `DB setup → ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}${RESET ? " (reset)" : ""}`
  );

  const server = await waitForServer(cfg);
  try {
    if (RESET) {
      await server.query(
        `DROP DATABASE IF EXISTS \`${cfg.database.replace(/`/g, "")}\``
      );
      console.log(`Dropped database ${cfg.database}`);
    }
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database.replace(/`/g, "")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await server.changeUser({ database: cfg.database });

    const schemaFiles = readdirSync(dbDir)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort();
    for (const f of schemaFiles) {
      await applySqlFile(server, join(dbDir, f));
    }

    const seedDir = join(dbDir, "seed");
    if (existsSync(seedDir)) {
      const seedFiles = readdirSync(seedDir)
        .filter((f) => /^\d+_.*\.sql$/.test(f))
        .sort();
      for (const f of seedFiles) {
        await applySqlFile(server, join(seedDir, f));
      }
    }

    console.log("DB setup complete.");
    console.log("Demo logins: lab@example.com / Doctor123!  ·  doctor@example.com / Doctor123!");
  } finally {
    await server.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
