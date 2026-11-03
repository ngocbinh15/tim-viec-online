import { defineConfig, devices } from "@playwright/test";

/** Genuine Laravel API; requires the dedicated local MariaDB instance on 33063. */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "backend*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  outputDir: "test-results/backend-browser",
  use: {
    baseURL: "http://localhost:3127",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/fixtures/smtp-server.mjs",
      port: 8129,
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: "php ../backend/scripts/frontend-e2e-server.php",
      url: "http://127.0.0.1:8127/up",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "php ../backend/scripts/frontend-e2e-server.php reverb",
      port: 8128,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run start -- --port 3127",
      url: "http://localhost:3127/login",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        AUTH_MODE: "api",
        AUTH_API_URL: "http://127.0.0.1:8127/api",
        AUTH_APP_URL: "http://localhost:3127",
        NEXT_PUBLIC_REVERB_APP_KEY: "frontend-e2e-public-key",
        NEXT_PUBLIC_REVERB_HOST: "127.0.0.1",
        NEXT_PUBLIC_REVERB_PORT: "8128",
        NEXT_PUBLIC_REVERB_SCHEME: "http",
      },
    },
  ],
});
