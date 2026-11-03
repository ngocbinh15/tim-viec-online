import { test, expect } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

const backendTitle = "Lập trình viên Backend Laravel (Middle)";
const frontendTitle = "Frontend Developer (React / Next.js)";

test("mobile applicants keep the list accessible behind a compact expandable filter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 1000 });
  await loginMock(page, "employer", "/employer/candidates");
  const toggle = page.getByRole("button", { name: "Bộ lọc", exact: true });
  const jobFilter = page.getByRole("combobox", {
    name: "Lọc theo tin tuyển dụng",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(jobFilter).toBeHidden();
  await toggle.click();
  await expect(jobFilter).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(jobFilter).toBeHidden();
  await expect(page.locator(".ec-applied-job").first()).toBeVisible();
});

test("applicants open a dedicated page with the correct job and return to the list", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/candidates");
  const rows = page.locator(".ec-candidate");
  await expect(rows).toHaveCount(6);
  await expect(page.locator(".ea-detail:visible")).toHaveCount(0);
  for (const row of await rows.all()) {
    await expect(row.locator(".ec-applied-job")).toBeVisible();
    await expect(row.locator(".ec-person-meta")).toContainText(
      /Tin #\d+ · Hồ sơ #\d+/,
    );
  }
  await page.getByRole("link", { name: /Xem hồ sơ Trần Thị Linh cho/ }).click();
  await expect(page).toHaveURL(/\/employer\/candidates\/2$/);
  const profile = page.locator(".ea-detail:visible");
  await expect(
    page.getByRole("heading", { name: "Trần Thị Linh", level: 1 }),
  ).toBeVisible();
  await expect(profile.locator(".ea-job-context")).toContainText(frontendTitle);
  await expect(profile.locator(".ea-job-context")).toContainText("Tin #2");
  await expect(
    profile.getByRole("link", { name: "Xem / sửa tin", exact: true }),
  ).toHaveAttribute("href", "/employer/jobs/2/edit");
  await profile
    .getByRole("link", { name: "Hồ sơ cùng tin", exact: true })
    .click();
  await expect(page).toHaveURL(/candidates\?job_id=2$/);
  await expect(rows).toHaveCount(3);
  for (const row of await rows.all())
    await expect(row.locator(".ec-applied-job")).toContainText(frontendTitle);
  await page.goBack();
  await expect(page).toHaveURL(/\/candidates\/2$/);
  await page
    .getByRole("link", { name: "Danh sách hồ sơ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/candidates$/);
});

test("detail back link preserves list sorting and pagination without carrying arbitrary return URLs", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/candidates?sort=newest&page=2");
  const first = page.locator(".ec-candidate").first().getByRole("link");
  const name = await first.getAttribute("aria-label");
  await first.click();
  await expect(
    page.getByRole("link", { name: "Danh sách hồ sơ", exact: true }),
  ).toHaveAttribute("href", "/employer/candidates?sort=newest&page=2");
  await page
    .getByRole("link", { name: "Danh sách hồ sơ", exact: true })
    .click();
  await expect(page).toHaveURL(/candidates\?sort=newest&page=2$/);
  await expect(
    page.locator(".ec-candidate").first().getByRole("link"),
  ).toHaveAttribute("aria-label", name!);
});

test("legacy application links resolve to guarded detail pages and missing applications show no profile", async ({
  page,
}) => {
  await loginMock(
    page,
    "employer",
    "/employer/candidates?application=1&job_id=1&sort=newest",
  );
  await expect(page).toHaveURL(/\/candidates\/1\?job_id=1&sort=newest$/);
  await expect(page.locator(".ea-detail:visible .ec-status")).toHaveText(
    "Đã ứng tuyển",
  );
  await expect(
    page.getByRole("link", { name: "Danh sách hồ sơ", exact: true }),
  ).toHaveAttribute("href", "/employer/candidates?job_id=1&sort=newest");
  await page.goto("/employer/candidates/999999");
  await expect(
    page.getByRole("heading", { name: "404", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ea-detail")).toHaveCount(0);
});

test("leaving a detail page closes its PDF and restores the reviewed state on return", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/candidates/1");
  await page
    .getByRole("button", { name: "Xem CV ứng tuyển", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  // Simulate client navigation while the modal is open; Activity can retain the route.
  await page
    .getByRole("link", {
      name: "Danh sách hồ sơ",
      exact: true,
      includeHidden: true,
    })
    .evaluate((node: HTMLAnchorElement) => node.click());
  await expect(page).toHaveURL(/\/candidates$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: /Xem hồ sơ Nguyễn Văn An cho/ }).click();
  await expect(page).toHaveURL(/\/candidates\/1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".ea-detail:visible .ec-status")).toHaveText(
    "Đang xem xét",
  );
  await expect(
    page.getByRole("button", { name: "Xem CV ứng tuyển", exact: true }),
  ).toBeEnabled();
});

test("notifications identify their job, open the matching sender conversation and share the unread badge", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/notifications");
  await expect(page.locator(".ep-unread-count")).toHaveText("3");
  const notification = page
    .locator(".em-not-item")
    .filter({ hasText: "Lê Minh Hoàng đã gửi tin nhắn" });
  await expect(notification.locator(".em-not-job-context")).toContainText(
    backendTitle,
  );
  await expect(notification.locator(".em-not-job-context")).toContainText(
    "Hồ sơ #3",
  );
  await notification
    .getByRole("link", { name: "Xem tin nhắn", exact: true })
    .click();
  await expect(page).toHaveURL(/messages\?conversation=4/);
  await expect(page.locator(".em-chat-detail")).toContainText("Lê Minh Hoàng");
  await expect(page.locator(".em-chat-detail")).toContainText(backendTitle);
  await page
    .locator(".ep-sidebar")
    .getByRole("link", { name: "Thông báo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
    .click();
  await expect(page.locator(".ep-unread-count")).toHaveCount(0);
});

test("job rows lead to applications and editing retains the same recruitment identity", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/jobs");
  const row = page
    .locator(".ep-job-table tbody tr")
    .filter({ hasText: backendTitle });
  await row
    .getByRole("link", { name: `Xem hồ sơ cho ${backendTitle}`, exact: true })
    .click();
  await expect(page).toHaveURL(/candidates\?job_id=1/);
  await expect(page.locator(".ec-filtered-title")).toHaveText(backendTitle);
  await page
    .locator(".ec-job-meta")
    .getByRole("link", { name: "Xem / sửa tin", exact: true })
    .click();
  await expect(page).toHaveURL(/jobs\/1\/edit$/);
  await expect(page.locator(".ep-edit-job-context")).toContainText("Mã tin #1");
  await expect(page.locator(".ep-edit-job-context")).toContainText(
    backendTitle,
  );
  await expect(page.locator(".ep-edit-job-context")).toContainText(
    "Đang tuyển",
  );
});
