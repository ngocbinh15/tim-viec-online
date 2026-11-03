import { expect, test } from "@playwright/test";

test("email switches persist server choices, roll back failed saves, and retry failed reads", async ({
  page,
}) => {
  await page.goto("/login?returnTo=%2Faccount%2Fsettings");
  await page
    .getByLabel("Email", { exact: true })
    .fill("candidate@frontend-e2e.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserTest1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/settings$/);
  const reset = await page.request.put("/api/backend/user/email-preferences", {
    headers: { Origin: "http://localhost:3127" },
    data: { applications: false, messages: false },
  });
  expect(reset.ok()).toBeTruthy();
  await page.reload();
  const applications = page.getByRole("switch", {
    name: /Trạng thái ứng tuyển/,
  });
  const messages = page.getByRole("switch", { name: /Tin nhắn mới/ });
  await expect(applications).toBeEnabled();
  await expect(applications).not.toBeChecked();
  await expect(messages).not.toBeChecked();

  let release!: () => void;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/backend/user/email-preferences", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    await paused;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false }),
    });
  });
  await applications.click();
  await expect(applications).toBeChecked();
  await expect(applications).toBeDisabled();
  await expect(messages).toBeDisabled();
  release();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(applications).not.toBeChecked();
  await expect(applications).toBeEnabled();
  await page.unroute("**/api/backend/user/email-preferences");

  await applications.click();
  await expect(page.getByRole("status")).toHaveText("Đã lưu cài đặt email.");
  await expect(applications).toBeChecked();
  await page.reload();
  await expect(applications).toBeEnabled();
  await expect(applications).toBeChecked();
  await expect(messages).not.toBeChecked();

  await page.route(
    "**/api/backend/user/email-preferences",
    async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false }),
      });
    },
    { times: 1 },
  );
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(applications).toBeDisabled();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(applications).toBeEnabled();
  await expect(applications).toBeChecked();
});
