import base from "./playwright.auth.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  ...base,
  testMatch: "admin-performance.spec.ts",
  outputDir: "test-results/admin-performance-browser",
});
