import { test, expect } from "@playwright/test";

for (const path of ["/", "/jobs", "/companies/1", "/jobs/1"]) {
  test(`guest save goes directly to login from ${path}`, async ({ page }) => {
    await page.goto(path);
    const save = page
      .getByRole("link", { name: "Lưu việc làm", exact: true })
      .first();
    await expect(save).toBeVisible();
    const target = await save.getAttribute("href");
    expect(target).toMatch(/^\/login\?returnTo=%2Fjobs%2F\d+$/);
    await save.click();
    await expect(page).toHaveURL(new URL(target!, page.url()).href);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
  });
}

test("guest apply also opens login with the job return path", async ({
  page,
}) => {
  await page.goto("/jobs/1");
  await page.getByRole("link", { name: "Ứng tuyển ngay", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fjobs%2F1$/);
});
