import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

/**
 * Monorepo layout: repo-root `.env` (shared with Vite), then `backend/.env` overrides.
 * Must run before reading `process.env` anywhere else (import from `config.ts` first).
 */
export function loadEnv(): void {
  const srcDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.resolve(srcDir, "..");
  const appRoot = path.resolve(srcDir, "../..");
  dotenv.config({ path: path.join(appRoot, ".env") });
  dotenv.config({ path: path.join(backendRoot, ".env"), override: true });
}
