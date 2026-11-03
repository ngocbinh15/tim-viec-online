import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: [
    "auth.spec.ts",
    "ai.spec.ts",
    "backend*.spec.ts",
    "admin-performance.spec.ts",
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: "list",
  outputDir: "test-results/mock-browser",
  use: { baseURL: "http://localhost:3117", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start -- --port 3117",
    env: { AUTH_MODE: "mock", AUTH_APP_URL: "http://localhost:3117" },
    url: "http://localhost:3117/jobs",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
