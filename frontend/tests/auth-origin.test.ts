import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isTrustedAuthOrigin,
  configuredDevHostnames,
} from "../src/lib/auth-origin";

const production = {
  NODE_ENV: "production",
  AUTH_APP_URL: "https://jobs.example.test",
  AUTH_TRUSTED_ORIGINS: "https://preview.ngrok-free.dev,http://localhost:3000",
};

test("production accepts only the configured canonical origin", () => {
  assert.equal(
    isTrustedAuthOrigin("https://jobs.example.test", production),
    true,
  );
  for (const origin of [
    null,
    "null",
    "http://jobs.example.test",
    "https://jobs.example.test:444",
    "https://evil.test",
    "https://preview.ngrok-free.dev",
    "http://localhost:3000",
  ]) {
    assert.equal(
      isTrustedAuthOrigin(origin, production),
      false,
      String(origin),
    );
  }
});

test("development accepts exact explicit origins including scheme and port", () => {
  const development = { ...production, NODE_ENV: "development" };
  assert.equal(
    isTrustedAuthOrigin("https://preview.ngrok-free.dev", development),
    true,
  );
  assert.equal(isTrustedAuthOrigin("http://localhost:3000", development), true);
  for (const origin of [
    "https://other.ngrok-free.dev",
    "https://random.trycloudflare.com",
    "http://localhost:4000",
    "http://preview.ngrok-free.dev",
    "http://127.0.0.1:3000",
  ]) {
    assert.equal(isTrustedAuthOrigin(origin, development), false, origin);
  }
});

test("invalid request origins and invalid configuration fail closed", () => {
  const malformed = [
    "https://user:pass@jobs.example.test",
    "https://jobs.example.test/path",
    "https://jobs.example.test?x=1",
    "https://jobs.example.test#x",
    "https://jobs.example.test?",
    "https://jobs.example.test#",
    "ftp://jobs.example.test",
    "https://*.example.test",
    "https://jobs.example.test,https://evil.test",
    " https://jobs.example.test",
    "https:jobs.example.test",
  ];
  for (const origin of malformed) {
    assert.equal(isTrustedAuthOrigin(origin, production), false, origin);
    assert.equal(
      isTrustedAuthOrigin("https://jobs.example.test", {
        ...production,
        AUTH_APP_URL: origin,
      }),
      false,
      origin,
    );
  }
  assert.equal(
    isTrustedAuthOrigin("https://jobs.example.test", {
      NODE_ENV: "production",
    }),
    false,
  );
  assert.equal(
    isTrustedAuthOrigin("http://jobs.example.test", {
      NODE_ENV: "production",
      AUTH_APP_URL: "http://jobs.example.test",
    }),
    false,
  );
  assert.equal(
    isTrustedAuthOrigin("http://localhost:3000", {
      NODE_ENV: "production",
      AUTH_APP_URL: "http://localhost:3000",
    }),
    true,
  );
});

test("development asset hosts come only from exact valid configured origins", () => {
  assert.deepEqual(
    configuredDevHostnames({ ...production, NODE_ENV: "development" }),
    ["jobs.example.test", "preview.ngrok-free.dev", "localhost"],
  );
  assert.deepEqual(configuredDevHostnames(production), []);
  assert.deepEqual(
    configuredDevHostnames({
      NODE_ENV: "development",
      AUTH_TRUSTED_ORIGINS:
        "https://*.ngrok-free.dev,https://user:pass@evil.test,https://example.test/path",
    }),
    [],
  );
});
