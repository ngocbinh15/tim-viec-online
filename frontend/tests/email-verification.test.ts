import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readVerificationLink,
  validateVerificationInput,
} from "../src/features/auth/email-verification";

test("verification links accept one bounded email and token without accepting array ambiguity", () => {
  const token = "a".repeat(64);
  assert.deepEqual(
    readVerificationLink({ email: " Person+tag@Example.test ", token }),
    {
      email: "person+tag@example.test",
      token,
      invalid: false,
    },
  );
  for (const params of [
    { email: ["person@example.test"], token },
    { email: "person@example.test", token: [token] },
    { email: "bad", token },
    { email: "person@example.test", token: "a".repeat(65) },
  ]) {
    assert.equal(readVerificationLink(params).invalid, true);
    assert.equal(readVerificationLink(params).token, "");
  }
});

test("missing token opens the resend form while malformed verification cannot submit", () => {
  assert.deepEqual(readVerificationLink({ email: "person@example.test" }), {
    email: "person@example.test",
    token: "",
    invalid: false,
  });
  assert.deepEqual(readVerificationLink({}), {
    email: "",
    token: "",
    invalid: false,
  });
  assert.deepEqual(
    validateVerificationInput({ email: "person@example.test" }, false),
    {},
  );
  assert.equal(
    validateVerificationInput({ email: "person@example.test" }, true).token,
    "Liên kết xác thực đã hết hạn hoặc không hợp lệ.",
  );
  assert.ok(validateVerificationInput({ email: "x".repeat(101) }, false).email);
});
