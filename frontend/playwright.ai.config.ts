import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "ai.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "test-results/ai-browser",
  use: { baseURL: "http://localhost:3123", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/fixtures/auth-api-server.mjs",
      url: "http://127.0.0.1:4123/health",
      env: { AI_CONTRACT_FIXTURE: "1", FIXTURE_PORT: "4123" },
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: "npm run start -- --port 3123",
      url: "http://localhost:3123/login",
      env: {
        AUTH_MODE: "api",
        AUTH_API_URL: "http://127.0.0.1:4123/api",
        AUTH_APP_URL: "http://localhost:3123",
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
