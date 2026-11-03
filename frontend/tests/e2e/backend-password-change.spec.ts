import { expect, test, type APIRequestContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const mailbox = path.resolve(
  "../backend/storage/framework/testing/frontend-e2e/mailbox.jsonl",
);
const backend = "http://127.0.0.1:8127/api";
type Letter = { recipients: string[]; raw: string };

function letters(email: string): Letter[] {
  return existsSync(mailbox)
    ? readFileSync(mailbox, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Letter)
        .filter((letter) => letter.recipients.includes(email))
    : [];
}

function decoded(letter: Letter): string {
  return Buffer.from(
    letter.raw
      .replace(/=\r\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      ),
    "binary",
  ).toString("utf8");
}

function actionUrl(letter: Letter, route: string): string {
  const url = decoded(letter)
    .match(new RegExp(`href="([^"]*${route}\\?[^\\"]+)"`))?.[1]
    ?.replaceAll("&amp;", "&");
  expect(url).toBeTruthy();
  expect(new URL(url!).origin).toBe("http://localhost:3127");
  return url!;
}

async function loginToken(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const response = await request.post(`${backend}/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.token as string;
}

test("SMTP password-change confirmation keeps the old password until explicit confirmation and revokes sessions", async ({
  page,
}) => {
  const email = "password-change@frontend-e2e.test";
  const original = "OriginalPass1!";
  const changed = "ChangedPass2!";
  await page.goto("/register");
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Người đổi mật khẩu");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel(/^Ngày sinh/).fill("20/05/2000");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(original);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(original);
  for (const checkbox of await page.getByRole("checkbox").all()) {
    await checkbox.check();
  }
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await expect.poll(() => letters(email).length).toBe(1);
  const forgot = await page.request.post(`${backend}/forgot-password`, {
    data: { email },
  });
  expect(forgot.status()).toBe(200);
  expect((await forgot.json()).success).toBe(true);
  expect(letters(email)).toHaveLength(1);
  const unverifiedToken = await loginToken(page.request, email, original);
  const blockedChange = await page.request.put(
    `${backend}/user/change-password`,
    {
      headers: { Authorization: `Bearer ${unverifiedToken}` },
      data: {
        current_password: original,
        new_password: changed,
        new_password_confirmation: changed,
      },
    },
  );
  expect(blockedChange.status()).toBe(403);
  expect((await blockedChange.json()).code).toBe("email_verification_required");
  expect(letters(email)).toHaveLength(1);
  const unverifiedUser = await page.request.get(`${backend}/user`, {
    headers: { Authorization: `Bearer ${unverifiedToken}` },
  });
  expect(unverifiedUser.status()).toBe(200);
  expect((await unverifiedUser.json()).data.email_verified_at).toBeNull();
  await page.goto(actionUrl(letters(email)[0], "/verify-email"));
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?notice=verified$/);

  const firstToken = unverifiedToken;
  await page.goto("/login?returnTo=%2Faccount%2Fsecurity");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(original);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/security$/);
  await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill(original);
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(changed);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(changed);
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/email/i);
  await expect.poll(() => letters(email).length).toBe(2);
  const confirmation = letters(email)[1];
  expect(confirmation.raw).toContain("multipart/alternative");
  expect(confirmation.raw).toContain("Content-Type: text/plain");
  expect(confirmation.raw).toContain("Content-Type: text/html");
  const source = decoded(confirmation);
  expect(source).toContain("15 phút");
  expect(source).not.toContain(original);
  expect(source).not.toContain(changed);
  const confirmUrl = actionUrl(confirmation, "/confirm-password-change");
  const confirmationParams = new URL(confirmUrl).searchParams;

  const secondToken = await loginToken(page.request, email, original);
  expect(
    (
      await page.request.post(`${backend}/login`, {
        data: { email, password: changed },
      })
    ).status(),
  ).toBe(401);
  await page.goto(confirmUrl);
  await page.reload();
  const afterGetToken = await loginToken(page.request, email, original);
  expect(
    (
      await page.request.post(`${backend}/login`, {
        data: { email, password: changed },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.get(`${backend}/user`, {
        headers: { Authorization: `Bearer ${firstToken}` },
      })
    ).status(),
  ).toBe(200);

  await page
    .getByRole("button", { name: "Xác nhận đổi mật khẩu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?notice=changed$/);
  await expect(page.getByRole("status")).toContainText(/mật khẩu.*thành công/i);
  for (const token of [firstToken, secondToken, afterGetToken]) {
    expect(
      (
        await page.request.get(`${backend}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status(),
    ).toBe(401);
  }
  expect(
    (await page.request.get("/api/backend/candidate/profile")).status(),
  ).toBe(401);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(changed);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  expect(
    (
      await page.request.post(`${backend}/login`, {
        data: { email, password: original },
      })
    ).status(),
  ).toBe(401);
  const replay = await page.request.post(`${backend}/password/change/confirm`, {
    data: Object.fromEntries(confirmationParams),
  });
  expect(replay.status()).toBe(400);
  expect((await replay.json()).code).toBe("invalid_password_change_token");
});
