import { expect, test } from "@playwright/test";

test("login can return to public jobs while successful login keeps its private destination", async ({
  page,
}) => {
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    "/account/profile",
  );

  const loginUrl = page.url();
  await page
    .getByRole("link", { name: "Quay lại xem việc làm", exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(
    page.getByRole("heading", {
      name: "Tìm công việc phù hợp với bạn",
      exact: true,
    }),
  ).toBeVisible();

  await page.goto(loginUrl);
  await page
    .getByLabel("Email", { exact: true })
    .fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Candidate@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(
    page.getByRole("heading", { name: "Nguyễn Minh An", exact: true }),
  ).toBeVisible();
});
