import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  AuthApiError,
  parseLogin,
  parseUser,
} from "../../src/features/auth/api-contract";
import { authRequest } from "../../src/services/auth-request";
import { mockAuthRequest } from "../../src/services/mock-auth";

const credentials = {
  candidate: { email: "candidate@example.test", password: "Candidate@123" },
  employer: { email: "employer@example.test", password: "Employer@123" },
};
const originalMode = process.env.AUTH_MODE;
const originalNow = Date.now;
const tokens = new Set<string>();

function errorWith(status: number, code: string) {
  return (error: unknown) =>
    error instanceof AuthApiError &&
    error.status === status &&
    error.code === code;
}

async function login(
  role: keyof typeof credentials,
  extra: Record<string, unknown> = {},
) {
  const session = parseLogin(
    await authRequest("/login", { body: { ...credentials[role], ...extra } }),
  );
  tokens.add(session.token);
  return session;
}

describe("server-side mock authentication", { concurrency: false }, () => {
  beforeEach(() => {
    process.env.AUTH_MODE = "mock";
  });

  afterEach(async () => {
    Date.now = originalNow;
    process.env.AUTH_MODE = "mock";
    for (const token of tokens) await authRequest("/logout", { token });
    tokens.clear();
    if (originalMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = originalMode;
  });

  it("authenticates the two fixture accounts without exposing credential material", async () => {
    for (const role of ["candidate", "employer"] as const) {
      const session = await login(role);
      assert.match(session.token, /^mock_[a-f0-9]{64}$/);
      const user = parseUser(
        await authRequest("/user", { token: session.token }),
      );
      assert.equal(user.email, credentials[role].email);
      assert.equal(user.role, role);
      assert.equal(user.status, "active");
      assert.deepEqual(Object.keys(user).sort(), [
        "email",
        "id",
        "name",
        "role",
        "status",
      ]);
    }
    await assert.rejects(
      authRequest("/register", {
        body: {
          email: "third@example.test",
          password: "Third@123",
          role: "candidate",
        },
      }),
      errorWith(503, "mock_unsupported"),
    );
    await assert.rejects(
      authRequest("/login", {
        body: { email: "third@example.test", password: "Third@123" },
      }),
      errorWith(401, "invalid_credentials"),
    );
  });

  it("rejects an incorrect password and unknown account with the same response", async () => {
    const failures: AuthApiError[] = [];
    for (const email of [credentials.candidate.email, "missing@example.test"]) {
      await assert.rejects(
        authRequest("/login", { body: { email, password: "Incorrect@123" } }),
        (error: unknown) => {
          if (!(error instanceof AuthApiError)) return false;
          failures.push(error);
          return error.status === 401 && error.code === "invalid_credentials";
        },
      );
    }
    assert.equal(failures[0].message, failures[1].message);
  });

  it("takes identity and role from the server account rather than login payload", async () => {
    const session = await login("candidate", {
      role: "admin",
      id: 201,
      userId: 201,
    });
    const user = parseUser(
      await authRequest("/user", { token: session.token }),
    );
    assert.equal(user.role, "candidate");
    assert.equal(user.email, credentials.candidate.email);
    const employer = await login("employer", { role: "candidate" });
    assert.equal(
      parseUser(await authRequest("/user", { token: employer.token })).role,
      "employer",
    );
  });

  it("rejects missing, fabricated and modified session tokens", async () => {
    const session = await login("candidate");
    const last = session.token.endsWith("0") ? "1" : "0";
    for (const token of [
      undefined,
      "candidate",
      JSON.stringify({ role: "admin" }),
      `mock_${"0".repeat(64)}`,
      session.token.slice(0, -1) + last,
    ]) {
      await assert.rejects(
        authRequest("/user", { token }),
        errorWith(401, "unauthorized"),
      );
    }
    assert.equal(
      parseUser(await authRequest("/user", { token: session.token })).role,
      "candidate",
    );
  });

  it("expires ordinary and remembered sessions at their server-side deadlines", async () => {
    const started = originalNow();
    Date.now = () => started;
    const ordinary = await login("candidate");
    const remembered = await login("employer", { remember: true });
    assert.equal(Date.parse(ordinary.expires_at!) - started, 3_600_000);
    assert.equal(Date.parse(remembered.expires_at!) - started, 7 * 86_400_000);
    Date.now = () => started + 3_600_000 - 1;
    assert.equal(
      parseUser(await authRequest("/user", { token: ordinary.token })).role,
      "candidate",
    );
    Date.now = () => started + 3_600_000;
    await assert.rejects(
      authRequest("/user", { token: ordinary.token }),
      errorWith(401, "unauthorized"),
    );
    assert.equal(
      parseUser(await authRequest("/user", { token: remembered.token })).role,
      "employer",
    );
    Date.now = () => started + 7 * 86_400_000;
    await assert.rejects(
      authRequest("/user", { token: remembered.token }),
      errorWith(401, "unauthorized"),
    );
  });

  it("revokes the server session on logout and keeps logout idempotent", async () => {
    const session = await login("candidate");
    await authRequest("/logout", { token: session.token });
    await assert.rejects(
      authRequest("/user", { token: session.token }),
      errorWith(401, "unauthorized"),
    );
    await authRequest("/logout", { token: session.token });
  });

  it("never accepts mock sessions when API mode or disabled mode is selected", async () => {
    const session = await login("candidate");
    for (const mode of ["api", "preview", "invalid", undefined]) {
      if (mode === undefined) delete process.env.AUTH_MODE;
      else process.env.AUTH_MODE = mode;
      await assert.rejects(
        authRequest("/user", { token: session.token }),
        errorWith(401, "unauthorized"),
      );
      await assert.rejects(
        mockAuthRequest("/login", { body: credentials.candidate }),
        errorWith(401, "unauthorized"),
      );
    }
  });

  it("changes the password, revokes other sessions and restores the fixture afterward", async () => {
    const current = await login("candidate");
    const other = await login("candidate");
    const changedPassword = "Changed@456";
    let changed = false;
    try {
      await assert.rejects(
        authRequest("/user/change-password", {
          method: "PUT",
          token: current.token,
          body: {
            current_password: "Incorrect@123",
            password: changedPassword,
            password_confirmation: changedPassword,
          },
        }),
        errorWith(422, "validation_error"),
      );
      await authRequest("/user/change-password", {
        method: "PUT",
        token: current.token,
        body: {
          current_password: credentials.candidate.password,
          password: changedPassword,
          password_confirmation: changedPassword,
        },
      });
      changed = true;
      await assert.rejects(
        authRequest("/user", { token: other.token }),
        errorWith(401, "unauthorized"),
      );
      assert.equal(
        parseUser(await authRequest("/user", { token: current.token })).role,
        "candidate",
      );
      await assert.rejects(
        authRequest("/login", { body: credentials.candidate }),
        errorWith(401, "invalid_credentials"),
      );
      await login("candidate", { password: changedPassword });
    } finally {
      if (changed) {
        await authRequest("/user/change-password", {
          method: "PUT",
          token: current.token,
          body: {
            current_password: changedPassword,
            password: credentials.candidate.password,
            password_confirmation: credentials.candidate.password,
          },
        });
      }
    }
    await login("candidate");
  });
});
