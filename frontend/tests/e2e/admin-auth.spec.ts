import { test, expect, type Page } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

async function loginAdmin(page: Page, returnTo: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test("admin routes and legacy previews require authentication regardless of query", async ({
  page,
}) => {
  for (const path of [
    "/admin",
    "/admin/users",
    "/admin/categories",
    "/admin/skills",
    "/admin/jobs",
    "/admin/jobs/1",
    "/admin/jobs/1?preview=true",
    "/admin/jobs/1?preview=1",
    "/admin/preview",
    "/admin/users/preview",
    "/admin/categories/preview",
    "/admin/skills/preview",
    "/admin/jobs/preview",
    "/admin/jobs/1/preview",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.locator(".admin-page")).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("returnTo")).toMatch(
      /^\/admin(?:\/|$)/,
    );
  }
});

test("candidate and employer cannot enter any admin preview or detail", async ({
  page,
}) => {
  for (const role of ["candidate", "employer"] as const) {
    await loginMock(page, role);
    for (const path of [
      "/admin/users",
      "/admin/jobs/1?preview=true",
      "/admin/skills/preview",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        role === "candidate" ? /\/jobs$/ : /\/employer$/,
      );
      await expect(page.locator(".admin-page")).toHaveCount(0);
    }
    await page.context().clearCookies();
  }
});

test("admin login preserves deep links and authenticated previews redirect canonically", async ({
  page,
}) => {
  await loginAdmin(page, "/admin/jobs/1");
  await expect(page).toHaveURL(/\/admin\/jobs\/1$/);
  await expect(page.locator(".admin-page")).toBeVisible();
  await page.goto("/admin/jobs/1/preview");
  await expect(page).toHaveURL(/\/admin\/jobs\/1$/);
  await page.goto("/admin/categories/preview");
  await expect(page).toHaveURL(/\/admin\/categories$/);
  for (const path of [
    "/admin/jobs/0",
    "/admin/jobs/01",
    "/admin/jobs/999999",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Không tìm thấy nội dung quản trị" }),
    ).toBeVisible();
  }
});
