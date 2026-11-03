import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginMock } from "./helpers/mock-auth";

for (const width of [360, 1440]) {
  test(`candidate notification drawer shares read state, routes and accessible layout at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await loginMock(page, "candidate", "/account/notifications");
    const trigger = page.getByRole("button", {
      name: "Trung tâm thông báo",
      exact: true,
    });
    await expect(page.locator(".header-unread-count:visible")).toHaveText("2");
    await expect(trigger).toHaveAccessibleDescription("2 thông báo chưa đọc");
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Thông báo", exact: true });
    await expect(drawer.locator(".notification-item")).toHaveCount(3);
    await expect(drawer).not.toContainText("Hiện chưa thể tải thông báo");
    await expect(drawer.locator("time").first()).toHaveAttribute(
      "title",
      /\d{2}\/\d{2}\/\d{4}/,
    );
    const message = drawer
      .locator(".notification-item")
      .filter({ hasText: "FPT Software đã gửi tin nhắn mới" });
    await message
      .getByRole("button", { name: "Đánh dấu đã đọc", exact: true })
      .click();
    await expect(message).toHaveAttribute("data-unread", "false");
    await expect(page.locator(".header-unread-count")).toHaveText("1");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath("notification-drawer.png"),
      animations: "disabled",
    });
    await drawer
      .getByRole("button", { name: "Đọc tất cả", exact: true })
      .click();
    await expect(
      drawer.getByRole("button", { name: "Đọc tất cả", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".header-unread-count")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Đóng thông báo", exact: true })
      .click();
    await expect(trigger).toBeFocused();
    await expect(
      page.locator(".cu-notification[data-unread=true]:visible"),
    ).toHaveCount(0);
    await trigger.click();
    await drawer
      .getByRole("link", { name: /Hồ sơ của bạn đã được chấp nhận/ })
      .click();
    await expect(page).toHaveURL(/status=accepted#application-3$/);
    await expect(page.locator("#application-3:visible")).toContainText(
      "Trúng tuyển",
    );
    await expect(drawer).toBeHidden();
    await expect(page.getByText(/Match Score|Phân tích AI/)).toHaveCount(0);
  });
}

test("public navbar gives employers direct recruitment destinations", async ({
  page,
}) => {
  await loginMock(page, "employer", "/jobs");
  await page.goto("/jobs");
  await page
    .getByRole("button", { name: "Tất cả danh mục", exact: true })
    .click();
  const menu = page.getByRole("dialog", {
    name: "Tất cả danh mục",
    exact: true,
  });
  await expect(
    menu.getByRole("heading", { name: "Tuyển dụng của tôi", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("link", { name: "Tin tuyển dụng", exact: true }),
  ).toHaveAttribute("href", "/employer/jobs");
  await expect(
    menu.getByRole("link", { name: "Thông báo", exact: true }),
  ).toHaveAttribute("href", "/employer/notifications");
  await menu.getByRole("link", { name: "Hồ sơ ứng viên", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/candidates$/);
});

test("notification drawer closes when browser history hides its cached page", async ({
  page,
}) => {
  await loginMock(page, "candidate", "/jobs");
  await page.locator('[data-testid="job-card"] h2 a').first().click();
  await expect(page).toHaveURL(/\/jobs\/\d+$/);
  const detailUrl = page.url();
  await page
    .getByRole("button", { name: "Trung tâm thông báo", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Thông báo", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(
    page.getByRole("dialog", { name: "Thông báo", exact: true }),
  ).toBeHidden();
  await page.goForward();
  await expect(page).toHaveURL(detailUrl);
  await expect(
    page.getByRole("dialog", { name: "Thông báo", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Trung tâm thông báo", exact: true }),
  ).toBeEnabled();
  await page.goto("/account/notifications");
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Việc làm của tôi", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Trung tâm thông báo", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Thông báo", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/account\/notifications$/);
  await expect(
    page.getByRole("dialog", { name: "Thông báo", exact: true }),
  ).toBeHidden();
});
