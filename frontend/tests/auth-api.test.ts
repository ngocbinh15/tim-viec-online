import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthApiError,
  mapAuthApiError,
  parseLogin,
  parseUser,
  parsePendingPasswordChange,
  parseConfirmedPasswordChange,
} from "../src/features/auth/api-contract";

const user = {
  id: 1,
  name: "Nguyễn Văn An",
  email: "an@example.com",
  role: "candidate",
  status: "active",
};

test("user parser returns only known fields and preserves backend role/status", () => {
  assert.deepEqual(
    parseUser({ ...user, password: "secret", access_token: "secret" }),
    user,
  );
  assert.equal(
    parseUser({ ...user, role: "employer", status: "locked" }).status,
    "locked",
  );
  assert.equal(parseUser({ ...user, role: "admin" }).role, "admin");
});

test("password change requires a pending email confirmation contract before reporting accepted", () => {
  assert.deepEqual(
    parsePendingPasswordChange(
      { confirmation_required: true, email: user.email },
      user.email,
    ),
    { email: user.email },
  );
  assert.deepEqual(
    parseConfirmedPasswordChange(
      { confirmed: true, email: user.email },
      user.email,
    ),
    { email: user.email },
  );
  for (const value of [
    null,
    {},
    { confirmation_required: false, email: user.email },
    { confirmation_required: true, email: "different@example.test" },
  ]) {
    assert.throws(
      () => parsePendingPasswordChange(value, user.email),
      AuthApiError,
    );
  }
  for (const value of [
    null,
    {},
    { confirmed: false, email: user.email },
    { confirmed: true, email: "different@example.test" },
  ]) {
    assert.throws(
      () => parseConfirmedPasswordChange(value, user.email),
      AuthApiError,
    );
  }
});

test("password change mail and invalid confirmation errors preserve actionable safe codes", () => {
  const invalid = mapAuthApiError(
    400,
    { code: "invalid_password_change_token", message: "private token" },
    "confirm-password-change",
  );
  assert.equal(invalid.code, "invalid_password_change_token");
  assert.match(invalid.message, /hết hạn|không hợp lệ/);
  assert.doesNotMatch(invalid.message, /private/);
  const delivery = mapAuthApiError(
    503,
    { code: "mail_delivery_failed", message: "SMTP password" },
    "change-password",
  );
  assert.equal(delivery.code, "mail_delivery_failed");
  assert.match(delivery.message, /gửi.*email|email.*gửi/);
  assert.doesNotMatch(delivery.message, /SMTP password/);
});

test("user parser rejects malformed identity, role and account status", () => {
  for (const value of [
    null,
    [],
    "user",
    { ...user, id: "1" },
    { ...user, id: 0 },
    { ...user, id: 1.2 },
    { ...user, name: " " },
    { ...user, email: "bad-email" },
    { ...user, role: "superadmin" },
    { ...user, status: "unknown" },
    { ...user, role: ["candidate"] },
    { ...user, status: ["active"] },
  ]) {
    assert.throws(
      () => parseUser(value),
      (error) =>
        error instanceof AuthApiError && error.code === "invalid_response",
    );
  }
});

test("login parser supports both proposed token field names and validates supplied expiration", () => {
  assert.deepEqual(parseLogin({ access_token: "1|valid-token" }), {
    token: "1|valid-token",
  });
  const expires_at = new Date(Date.now() + 60_000).toISOString();
  assert.deepEqual(parseLogin({ token: "valid-token", expires_at }), {
    token: "valid-token",
    expires_at,
  });
  for (const value of [
    null,
    {},
    { token: "" },
    { token: "secret\r\nInjected" },
    { token: "a b" },
    { token: "a".repeat(2001) },
    { token: "valid", expires_at: "tomorrow" },
    { token: "valid", expires_at: "2020-01-01T00:00:00Z" },
  ]) {
    assert.throws(() => parseLogin(value), AuthApiError);
  }
});

test("API errors never expose backend messages or unknown validation field keys", () => {
  const hostile = {
    message: "SQL error with private credentials",
    errors: {
      email: ["private@example.com already exists"],
      password: ["internal password rule"],
      internal_token: ["secret"],
    },
  };
  const error = mapAuthApiError(422, hostile, "register");
  assert.deepEqual(Object.keys(error.fieldErrors).sort(), [
    "email",
    "password",
  ]);
  assert.doesNotMatch(JSON.stringify(error), /private|secret|SQL|internal/);
  assert.doesNotMatch(error.message, /SQL|private/);
  assert.equal(
    mapAuthApiError(422, { code: "email_taken" }, "register").fieldErrors.email
      .length,
    1,
  );
  assert.equal(
    mapAuthApiError(422, hostile, "forgot-password").fieldErrors.password,
    undefined,
  );
});

test("API errors map authentication, throttling, unavailable routes and transport failures safely", () => {
  assert.equal(mapAuthApiError(401, {}, "login").code, "unauthorized");
  assert.equal(
    mapAuthApiError(401, {}, "login").message,
    "Email hoặc mật khẩu không chính xác",
  );
  assert.equal(
    mapAuthApiError(403, { code: "account_locked" }, "login").message,
    "Tài khoản của bạn đã bị khóa bởi quản trị viên",
  );
  assert.match(
    mapAuthApiError(403, { code: "temporarily_locked" }, "login").message,
    /khôi phục tài khoản/,
  );
  assert.equal(
    mapAuthApiError(400, { code: "invalid_reset_token" }, "reset-password")
      .message,
    "Liên kết xác thực đã hết hạn hoặc không hợp lệ",
  );
  assert.deepEqual(
    mapAuthApiError(
      400,
      { code: "invalid_current_password" },
      "change-password",
    ).fieldErrors.current_password,
    ["Mật khẩu hiện tại không chính xác"],
  );
  assert.deepEqual(
    mapAuthApiError(422, { code: "email_taken" }, "register").fieldErrors.email,
    ["Email đã được sử dụng"],
  );
  assert.equal(mapAuthApiError(403, {}, "user").code, "forbidden");
  assert.equal(mapAuthApiError(419, {}, "logout").code, "session_expired");
  assert.equal(mapAuthApiError(429, {}, "reset-password").code, "rate_limited");
  assert.equal(mapAuthApiError(404, {}, "register").code, "not_available");
  assert.equal(
    mapAuthApiError(503, { message: "ECONNREFUSED upstream-host" }, "login")
      .code,
    "service_unavailable",
  );
});

test("reset token verification maps expired links without exposing upstream messages", () => {
  const error = mapAuthApiError(
    400,
    { code: "invalid_reset_token", message: "private token" },
    "verify-reset-token",
  );
  assert.equal(error.code, "invalid_reset_token");
  assert.equal(error.message, "Liên kết xác thực đã hết hạn hoặc không hợp lệ");
  assert.equal(
    mapAuthApiError(503, {}, "verify-reset-token").code,
    "service_unavailable",
  );
});

test("email verification state distinguishes legacy, pending and verified users", () => {
  assert.equal(parseUser(user).email_verified_at, undefined);
  assert.equal(
    parseUser({ ...user, email_verified_at: null }).email_verified_at,
    null,
  );
  const timestamp = "2026-10-27T00:00:00.000000Z";
  assert.equal(
    parseUser({ ...user, email_verified_at: timestamp }).email_verified_at,
    timestamp,
  );
  for (const value of [false, 1, "yesterday", "", "2026-99-99T00:00:00Z", []]) {
    assert.throws(
      () => parseUser({ ...user, email_verified_at: value }),
      AuthApiError,
    );
  }
});

test("email verification errors explain expiry, required confirmation and throttling safely", () => {
  const expired = mapAuthApiError(
    400,
    { code: "invalid_verification_token", message: "private token" },
    "verify-email",
  );
  assert.equal(expired.code, "invalid_verification_token");
  assert.match(expired.message, /hết hạn|không hợp lệ/);
  assert.doesNotMatch(expired.message, /private/);
  assert.equal(
    mapAuthApiError(429, {}, "resend-verification").code,
    "rate_limited",
  );
  assert.equal(
    mapAuthApiError(403, { code: "email_verification_required" }, "user").code,
    "email_verification_required",
  );
  assert.match(
    mapAuthApiError(
      403,
      { code: "email_verification_required" },
      "change-password",
    ).message,
    /đổi mật khẩu/,
  );
});
