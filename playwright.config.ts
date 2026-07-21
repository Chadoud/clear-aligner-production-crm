import { defineConfig, devices } from "@playwright/test";

const frontendPort = 3000;
const apiPort = 4000;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev:backend",
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        PORT: String(apiPort),
        NODE_ENV: "development",
        SOURCE_DB_URL:
          process.env.SOURCE_DB_URL ||
          "mysql://aligner:aligner@127.0.0.1:3306/aligner_crm",
        JWT_SECRET: process.env.JWT_SECRET || "e2e-template-jwt-secret",
        CORS_ORIGIN: `http://127.0.0.1:${frontendPort}`,
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        VITE_USE_API: "true",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
