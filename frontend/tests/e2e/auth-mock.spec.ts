import { test, expect } from "@playwright/test";
import { loginMock, logoutMock, mockAccounts } from "./helpers/mock-auth";

test("anonymous requests cannot open private routes or legacy preview aliases", async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const path of [
    "/account/profile",
    "/account/jobs?tab=saved",
    "/account/messages?conversation=1",
    "/account/notifications",
    "/account/settings",
    "/account/security",
    "/account/alerts",
    "/preview/profile",
    "/preview/jobs",
    "/preview/messages?conversation=1",
    "/preview/notifications",
    "/preview/settings",
    "/preview/alerts",
    "/employer",
    "/admin",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.locator(".cu-profile, .cc-workspace, .cu-job"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
  }
});

test("a candidate logs in through the existing form and retains a private session after refresh", async ({
  page,
  context,
}) => {
  await loginMock(page);
  await expect(page).toHaveURL(/\/jobs$/);
  const cookie = (await context.cookies()).find(
    (item) => item.name === "timviec_session",
  );
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  expect(cookie?.value).not.toContain(mockAccounts.candidate.password);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "timviec_session",
  );
  await page.goto("/account/profile");
  await expect(page.getByLabel("Email đăng nhập", { exact: true })).toHaveValue(
    mockAccounts.candidate.email,
  );
  await page.reload();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(page.getByLabel("Email đăng nhập", { exact: true })).toHaveValue(
    mockAccounts.candidate.email,
  );
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(storage).not.toContain(mockAccounts.candidate.password);
  expect(storage).not.toContain(cookie!.value);
});

test("login returns a candidate to the requested profile and legacy aliases resolve to protected routes", async ({
  page,
}) => {
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    "/account/profile",
  );
  await page
    .getByLabel("Email", { exact: true })
    .fill(mockAccounts.candidate.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(mockAccounts.candidate.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await page.goto("/preview/messages?conversation=1");
  await expect(page).toHaveURL(/\/account\/messages\?conversation=1$/);
  await expect(
    page.getByLabel("Tin nhắn của bạn", { exact: true }),
  ).toBeVisible();
});

test("logout removes authorization for fresh requests and cached browser navigation", async ({
  page,
  context,
}) => {
  await loginMock(page, "candidate", "/account/profile");
  await expect(page).toHaveURL(/\/account\/profile$/);
  await logoutMock(page);
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/account\//);
  await page.goto("/account/messages?conversation=1");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(
    page.getByLabel("Tin nhắn của bạn", { exact: true }),
  ).toHaveCount(0);
});

test("candidate and employer sessions cannot cross role boundaries", async ({
  page,
  context,
}) => {
  await loginMock(page);
  for (const path of ["/employer", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/jobs$/);
  }
  await context.clearCookies();
  await loginMock(page, "employer", "/account/profile");
  await expect(page).toHaveURL(/\/employer$/);
  for (const path of [
    "/account/profile",
    "/account/messages",
    "/preview/profile",
    "/admin",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/employer$/);
    await expect(page.getByLabel("Chọn CV PDF", { exact: true })).toHaveCount(
      0,
    );
  }
  await page.reload();
  await expect(page).toHaveURL(/\/employer$/);
  await logoutMock(page);
  await page.goto("/employer");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test("fabricated cookies and browser storage cannot impersonate a candidate", async ({
  page,
  context,
}) => {
  await page.goto("/jobs");
  await page.evaluate(() => {
    localStorage.setItem("user", JSON.stringify({ id: 1, role: "candidate" }));
    sessionStorage.setItem("authenticated", "true");
  });
  for (const value of [
    "candidate",
    "invalid-or-expired-token",
    Buffer.from(
      JSON.stringify({
        id: 1,
        role: "candidate",
        expiresAt: Date.now() + 86_400_000,
      }),
    ).toString("base64url"),
  ]) {
    await context.addCookies([
      {
        name: "timviec_session",
        value,
        url: "http://localhost:3117",
        httpOnly: true,
      },
    ]);
    await page.goto("/account/profile");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByLabel("Chọn CV PDF", { exact: true })).toHaveCount(
      0,
    );
    await context.clearCookies();
  }
});

test("external and unauthorized return paths cannot bypass role routing", async ({
  page,
  context,
}) => {
  for (const returnTo of [
    "https://example.com/steal",
    "//example.com/steal",
    "/employer",
    "/admin",
  ]) {
    await loginMock(page, "candidate", returnTo);
    await expect(page).toHaveURL(/\/jobs$/);
    await context.clearCookies();
  }
});
