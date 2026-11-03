import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowedBackendPath,
  cacheablePublicRead,
} from "../src/features/api/paths";
import { ApiError } from "../src/features/api/client";
import { profileEmailVerifiedAt } from "../src/features/candidate-workspace/types";
import {
  loadEmailPreferences,
  saveEmailPreferences,
} from "../src/features/candidate-workspace/email-preferences";

test("profile email changes invalidate ownership while authoritative timestamps refresh it", () => {
  const verified = "2026-10-27T08:30:00.000000Z";
  assert.equal(
    profileEmailVerifiedAt(
      "first@example.test",
      "second@example.test",
      verified,
      undefined,
    ),
    null,
  );
  assert.equal(
    profileEmailVerifiedAt(
      "first@example.test",
      " FIRST@EXAMPLE.TEST ",
      verified,
      undefined,
    ),
    verified,
  );
  assert.equal(
    profileEmailVerifiedAt(
      "first@example.test",
      "first@example.test",
      verified,
      null,
    ),
    null,
  );
  assert.equal(
    profileEmailVerifiedAt(
      "first@example.test",
      "first@example.test",
      null,
      verified,
    ),
    verified,
  );
  assert.equal(
    profileEmailVerifiedAt(
      "first@example.test",
      "first@example.test",
      verified,
      "invalid",
    ),
    null,
  );
});

test("email preference endpoints require private reads and explicit update methods", () => {
  assert.equal(allowedBackendPath("/user/email-preferences"), true);
  assert.equal(allowedBackendPath("/user/email-preferences", "PUT"), true);
  assert.equal(allowedBackendPath("/user/email-preferences", "POST"), false);
  assert.equal(allowedBackendPath("/user/email-preferences", "DELETE"), false);
  assert.equal(cacheablePublicRead("/user/email-preferences"), false);
});

test("preferences load and save only accept confirmed boolean server data", async () => {
  const original = globalThis.fetch;
  const requests: { url: string; method: string; body: unknown }[] = [];
  globalThis.fetch = async (url, init) => {
    requests.push({
      url: String(url),
      method: init?.method ?? "GET",
      body: init?.body,
    });
    return Response.json({
      success: true,
      data: { applications: false, messages: true },
    });
  };
  try {
    assert.deepEqual(await loadEmailPreferences(), {
      applications: false,
      messages: true,
    });
    assert.deepEqual(
      await saveEmailPreferences({ applications: true, messages: false }),
      {
        applications: false,
        messages: true,
      },
    );
    assert.deepEqual(requests, [
      {
        url: "/api/backend/user/email-preferences",
        method: "GET",
        body: undefined,
      },
      {
        url: "/api/backend/user/email-preferences",
        method: "PUT",
        body: '{"applications":true,"messages":false}',
      },
    ]);
    for (const data of [
      null,
      {},
      { applications: "false", messages: true },
      { applications: false },
    ]) {
      globalThis.fetch = async () => Response.json({ success: true, data });
      await assert.rejects(
        loadEmailPreferences(),
        (error: unknown) => error instanceof ApiError && error.status === 502,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("a rejected preference update never returns a false success", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        code: "email_verification_required",
        message: "Vui lòng xác thực email.",
      },
      { status: 403 },
    );
  try {
    await assert.rejects(
      saveEmailPreferences({ applications: true, messages: false }),
      (error: unknown) => error instanceof ApiError && error.status === 403,
    );
  } finally {
    globalThis.fetch = original;
  }
});
