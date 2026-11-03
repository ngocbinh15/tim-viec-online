import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "auth.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  outputDir: "test-results/auth-browser",
  use: { baseURL: "http://localhost:3119", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/fixtures/auth-api-server.mjs",
      url: "http://127.0.0.1:4119/health",
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: "npm run start -- --port 3119",
      url: "http://localhost:3119/login",
      env: {
        AUTH_MODE: "api",
        AUTH_API_URL: "http://127.0.0.1:4119/api",
        AUTH_APP_URL: "http://localhost:3119",
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
