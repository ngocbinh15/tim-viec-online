import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { AuthApiError, type AuthApiPath } from "@/features/auth/api-contract";
import type { AuthUser } from "@/features/auth/types";
import type { AuthRequestOptions } from "./auth-request";
import { authMockEnabled } from "./auth-mode";

type Account = { user: AuthUser; salt: string; passwordHash: string };
type Session = { userId: number; expiresAt: number };
type Store = {
  accounts: Account[];
  sessions: Map<string, Session>;
  attempts: Map<string, { count: number; resetsAt: number }>;
};

// Public demo credentials are documented in docs/plans/mock-auth.md.
// This process-local store is deliberately separate from the Laravel adapter.
const globalStore = globalThis as typeof globalThis & {
  __timviecMockAuth?: Store;
};
function store(): Store {
  return (globalStore.__timviecMockAuth ??= {
    accounts: [
      {
        user: {
          id: 1,
          name: "Quản Trị Viên",
          email: "admin@example.test",
          role: "admin",
          status: "active",
        },
        salt: "timviec-admin-demo-v1",
        passwordHash:
          "cbf0c03f47db2deff0be4abf848109b6870a80606f09e407182ecc91bfdc594abb564acb558e6c6d04a8e489ddd18b6292e3ebc74ff5386be6c552127abc694e",
      },
      {
        user: {
          id: 101,
          name: "Nguyễn Minh An",
          email: "candidate@example.test",
          role: "candidate",
          status: "active",
        },
        salt: "timviec-candidate-demo-v1",
        passwordHash:
          "6f930465453528747800aea4589e7f0b2b6541dfe502efb569bb313e743a8e481f455c034f897bd37938f97e2278f4405572cc55e34cb865f6546d689bb4bce4",
      },
      {
        user: {
          id: 201,
          name: "Trần Thu Hà",
          email: "employer@example.test",
          role: "employer",
          status: "active",
        },
        salt: "timviec-employer-demo-v1",
        passwordHash:
          "a70cc9de2f11151534826712c2af087a3f03a493f3b81b38503938df4d904859ed4d403e3d00cd541db0e81c175b58c3ee819c213980387781dffb7277b000f4",
      },
    ],
    sessions: new Map(),
    attempts: new Map(),
  });
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

function unauthorized(): never {
  throw new AuthApiError(
    401,
    "unauthorized",
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  );
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function current(token?: string) {
  if (!token || !/^mock_[a-f0-9]{64}$/.test(token)) unauthorized();
  const key = digest(token);
  const session = store().sessions.get(key);
  if (!session || session.expiresAt <= Date.now()) {
    store().sessions.delete(key);
    unauthorized();
  }
  const account = store().accounts.find(
    (item) => item.user.id === session.userId,
  );
  if (!account || account.user.status !== "active") unauthorized();
  return { account, key };
}

function prune() {
  const now = Date.now();
  for (const [key, session] of store().sessions)
    if (session.expiresAt <= now) store().sessions.delete(key);
  for (const [key, attempt] of store().attempts)
    if (attempt.resetsAt <= now) store().attempts.delete(key);
}

export async function mockAuthRequest(
  path: AuthApiPath,
  { body = {}, token }: AuthRequestOptions = {},
): Promise<unknown> {
  if (!authMockEnabled()) unauthorized();
  prune();
  if (path === "/login") {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (email.length > 100 || password.length > 512)
      throw new AuthApiError(
        401,
        "invalid_credentials",
        "Email hoặc mật khẩu không chính xác",
      );
    // Bound both hashing work and map growth. This is an in-process demo
    // throttle; Laravel must enforce its own limits when the API is enabled.
    const attempt = store().attempts.get(email);
    if ((attempt?.count ?? 0) >= 10 || store().attempts.size >= 1000)
      throw new AuthApiError(
        429,
        "too_many_attempts",
        "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.",
      );
    store().attempts.set(email, {
      count: (attempt?.count ?? 0) + 1,
      resetsAt: attempt?.resetsAt ?? Date.now() + 60_000,
    });
    const account = store().accounts.find((item) => item.user.email === email);
    const reference = account ?? store().accounts[0];
    const passwordHash = await derive(password, reference.salt);
    if (
      !timingSafeEqual(
        passwordHash,
        Buffer.from(reference.passwordHash, "hex"),
      ) ||
      !account
    )
      throw new AuthApiError(
        401,
        "invalid_credentials",
        "Email hoặc mật khẩu không chính xác",
      );
    if (account.user.status !== "active")
      throw new AuthApiError(
        403,
        "account_locked",
        "Tài khoản của bạn đã bị khóa bởi quản trị viên",
      );
    store().attempts.delete(email);
    if (store().sessions.size >= 1000)
      throw new AuthApiError(
        503,
        "session_limit",
        "Chưa thể đăng nhập. Vui lòng thử lại sau.",
      );
    const sessionToken = `mock_${randomBytes(32).toString("hex")}`;
    const expiresAt =
      Date.now() + (body.remember === true ? 7 * 24 * 3600_000 : 3600_000);
    store().sessions.set(digest(sessionToken), {
      userId: account.user.id,
      expiresAt,
    });
    return {
      token: sessionToken,
      expires_at: new Date(expiresAt).toISOString(),
    };
  }
  if (path === "/user") return { ...current(token).account.user };
  if (path === "/logout") {
    if (token && /^mock_[a-f0-9]{64}$/.test(token))
      store().sessions.delete(digest(token));
    return null;
  }
  if (path === "/user/change-password") {
    const { account, key } = current(token);
    const previous =
      typeof body.current_password === "string" ? body.current_password : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (
      previous.length > 512 ||
      password.length < 8 ||
      password.length > 32 ||
      password !== body.password_confirmation
    )
      throw new AuthApiError(
        422,
        "validation_error",
        "Thông tin mật khẩu không hợp lệ.",
      );
    const oldHash = await derive(previous, account.salt);
    if (!timingSafeEqual(oldHash, Buffer.from(account.passwordHash, "hex")))
      throw new AuthApiError(
        422,
        "validation_error",
        "Mật khẩu hiện tại không chính xác",
        { current_password: ["Mật khẩu hiện tại không chính xác"] },
      );
    if (previous === password)
      throw new AuthApiError(
        422,
        "validation_error",
        "Mật khẩu mới không được trùng với mật khẩu hiện tại",
        { password: ["Mật khẩu mới không được trùng với mật khẩu hiện tại"] },
      );
    const newSalt = randomBytes(16).toString("hex");
    const newHash = (await derive(password, newSalt)).toString("hex");
    // Revalidate after asynchronous hashing, then update the pair atomically.
    current(token);
    account.salt = newSalt;
    account.passwordHash = newHash;
    for (const [sessionKey, session] of store().sessions)
      if (session.userId === account.user.id && sessionKey !== key)
        store().sessions.delete(sessionKey);
    return null;
  }
  // Exactly two seeded accounts. Do not simulate delivered emails or accept a
  // registration that would disappear on the next server restart.
  throw new AuthApiError(
    503,
    "mock_unsupported",
    "Chức năng này hiện chưa khả dụng. Vui lòng thử lại sau.",
  );
}
