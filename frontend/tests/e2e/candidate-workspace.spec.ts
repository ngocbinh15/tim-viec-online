import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginMock } from "./helpers/mock-auth";
import { waitForSettledWorkspace } from "./helpers/workspace-ready";

test.beforeEach(async ({ page }) => {
  await loginMock(page);
});

test("legacy alerts redirect to application and message notifications without a creation form", async ({
  page,
}) => {
  await page.goto("/account/alerts");
  await expect(page).toHaveURL(/\/account\/notifications$/);
  await expect(
    page.getByRole("heading", { name: "Ứng tuyển & tin nhắn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Thông báo", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/Tạo thông báo/)).toHaveCount(0);
  await expect(
    page.locator('a[href="/preview/alerts"], a[href="/account/alerts"]'),
  ).toHaveCount(0);
});

test("chat composer grows, respects IME and keeps the thread bounded while reading history", async ({
  page,
}) => {
  await page.goto("/account/messages?conversation=1");
  const composer = page.getByRole("textbox", {
    name: "Tin nhắn của bạn",
    exact: true,
  });
  const startHeight = (await composer.boundingBox())!.height;
  await composer.fill("Một dòng\n".repeat(12));
  await expect
    .poll(async () => (await composer.boundingBox())!.height)
    .toBeGreaterThan(startHeight);
  expect((await composer.boundingBox())!.height).toBeLessThanOrEqual(132);
  const initial = await page.locator(".cc-message:visible").count();
  await composer.dispatchEvent("keydown", {
    key: "Enter",
    isComposing: true,
  });
  await expect(page.locator(".cc-message:visible")).toHaveCount(initial);
  await composer.press("Control+Enter");
  await expect(composer).toHaveValue("Một dòng\n".repeat(12) + "\n");
  await expect(page.locator(".cc-message:visible")).toHaveCount(initial);
  await composer.press("Enter");
  await expect(page.locator(".cc-message:visible")).toHaveCount(initial + 1);
  await expect
    .poll(async () => (await composer.boundingBox())!.height)
    .toBe(startHeight);
  for (let index = 0; index < 3; index++) {
    await composer.fill(("Nội dung trao đổi " + index + " ").repeat(45));
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await expect(composer).toHaveValue("");
  }
  const history = page.getByRole("region", { name: /Nội dung hội thoại với/ });
  await history.evaluate((node) => {
    node.scrollTop = 0;
    node.dispatchEvent(new Event("scroll"));
  });
  await expect(
    page.getByRole("button", { name: "Xuống cuối", exact: true }),
  ).toBeVisible();
  await composer.fill("Bản nháp khi đọc tin cũ");
  expect(await history.evaluate((node) => node.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Xuống cuối", exact: true }).click();
  await expect
    .poll(() =>
      history.evaluate(
        (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
      ),
    )
    .toBeLessThan(2);
  await history.evaluate((node) => {
    node.scrollTop = 0;
    node.dispatchEvent(new Event("scroll"));
  });
  await expect(
    page.getByRole("button", { name: "Xuống cuối", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Đồng Hành Media/ }).click();
  await expect(page).toHaveURL(/conversation=2$/);
  await page.getByRole("button", { name: /FPT Software/ }).click();
  await expect(page).toHaveURL(/conversation=1$/);
  expect(await history.evaluate((node) => node.scrollTop)).toBe(0);
  expect(
    await page
      .locator(".cc-workspace:visible")
      .evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(900);
});

test("profile identity is shared with candidate pages and application notifications open their record", async ({
  page,
}) => {
  await page.goto("/account/profile");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Thanh An");
  await page
    .getByRole("button", { name: "Áp dụng bản xem trước", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Quản lý tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/settings$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Quản lý tài khoản",
  );
  await expect(
    page.getByRole("textbox", { name: "Họ và tên", exact: true }),
  ).toHaveValue("Nguyễn Thanh An");
  await expect(
    page.getByRole("complementary", {
      name: "Điều hướng tài khoản ứng viên",
      exact: true,
    }),
  ).toContainText("Nguyễn Thanh An");
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Thông báo", exact: true })
    .click();
  await page
    .locator(".cu-notification:visible")
    .filter({ hasText: "Hồ sơ của bạn đã được chấp nhận" })
    .getByRole("link", { name: "Theo dõi ứng tuyển", exact: true })
    .click();
  await expect(page).toHaveURL(/status=accepted#application-3$/);
  await expect(page.locator("#application-3:visible")).toContainText(
    "Trúng tuyển",
  );
});

test("my jobs supports shared pagination, SRS statuses, saved removal and browser history", async ({
  page,
}) => {
  await page.goto("/account/jobs");
  await expect(
    page.getByRole("heading", { name: "9 hồ sơ ứng tuyển", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cu-job:visible")).toHaveCount(6);
  await page
    .getByRole("combobox", { name: "Trạng thái ứng tuyển", exact: true })
    .click();
  await page.getByRole("option", { name: "Đang xem xét", exact: true }).click();
  await expect(page).toHaveURL(/status=waiting/);
  await expect(page.locator(".cu-status:visible")).toHaveCount(3);
  await expect(page.locator(".cu-status:visible").first()).toHaveText(
    "Đang xem xét",
  );
  await page
    .getByRole("navigation", { name: "Loại việc làm", exact: true })
    .getByRole("link", { name: /Việc đã lưu/ })
    .click();
  await page.getByRole("link", { name: "Trang 2", exact: true }).click();
  await expect(page.locator(".cu-job:visible")).toHaveCount(3);
  await page
    .getByRole("button", { name: /^Bỏ lưu / })
    .first()
    .click();
  const modal = page.getByRole("alertdialog");
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await page
    .getByRole("button", { name: /^Bỏ lưu / })
    .first()
    .click();
  await modal.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "8 việc làm đã lưu", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#my-jobs-heading:visible")).toBeFocused();
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Quản lý tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/settings$/);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "8 việc làm đã lưu", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "9 việc làm đã lưu", exact: true }),
  ).toBeVisible();
});

test("chat preserves per-thread drafts, validates, renders text safely and does not send over the network", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto("/account/messages?conversation=1");
  await expect(
    page.getByText(/Tin đã đóng \/ hết hạn\. Bạn vẫn có thể/),
  ).toBeVisible();
  const composer = page.getByLabel("Tin nhắn của bạn", { exact: true });
  await composer.fill("   ");
  await page.getByRole("button", { name: "Gửi", exact: true }).click();
  await expect(
    page.getByText("Nhập nội dung tin nhắn trước khi gửi.", { exact: true }),
  ).toBeVisible();
  await expect(composer).toBeFocused();
  await composer.fill("Bản nháp FPT");
  await page.getByRole("button", { name: /Đồng Hành Media/ }).click();
  await expect(composer).toHaveValue("");
  await composer.fill("Bản nháp khác");
  await page.getByRole("button", { name: /FPT Software/ }).click();
  await expect(composer).toHaveValue("Bản nháp FPT");
  const payload = '<img src=x onerror="window.bad=true">';
  await composer.fill(payload);
  await composer.press("Enter");
  await expect(page.locator(".cc-message:visible").last()).toContainText(
    payload,
  );
  await expect(page.locator(".cc-message:visible").last()).toContainText(
    "Chưa gửi",
  );
  await expect(page.locator(".cc-message:visible img")).toHaveCount(0);
  await expect(composer).toHaveValue("");
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Thông báo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/notifications$/);
  await page.goBack();
  await expect(page.locator(".cc-message:visible").last()).toContainText(
    payload,
  );
  expect(writes).toEqual([]);
  await page.goto("/account/messages?conversation=999");
  await expect(
    page.getByRole("heading", {
      name: "Không tìm thấy hội thoại",
      exact: true,
    }),
  ).toBeVisible();
});

test("mobile chat list/detail keeps controls reachable and returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/account/messages");
  await expect(
    page.getByLabel("Tin nhắn của bạn", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /FPT Software/ }).click();
  await expect(
    page.getByRole("heading", { name: "FPT Software", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Tin nhắn của bạn", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Danh sách hội thoại", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /FPT Software/ }),
  ).toBeFocused();
  await page.getByLabel("Tìm hội thoại", { exact: true }).fill("khongco");
  await expect(
    page.getByText("Không tìm thấy hội thoại", { exact: true }),
  ).toBeVisible();
});

test("notification read state and account preferences persist between preview pages only", async ({
  page,
}) => {
  await page.goto("/account/notifications?read=unread");
  await expect(page.locator(".cu-notification:visible")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Đánh dấu đã đọc", exact: true })
    .first()
    .click();
  await expect(page.locator(".cu-notification:visible")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
    .click();
  await expect(page.locator(".cu-notification:visible")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Quản lý tài khoản", exact: true })
    .click();
  const preference = page.getByRole("switch", { name: /Trạng thái ứng tuyển/ });
  await expect(preference).not.toBeChecked();
  await preference.click();
  await expect(preference).toBeChecked();
  await page
    .getByRole("navigation", { name: "Tài khoản ứng viên", exact: true })
    .getByRole("link", { name: "Thông báo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/notifications$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thông báo của bạn",
  );
  await expect(
    page.locator(".cu-notification[data-unread=true]:visible"),
  ).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/account\/settings$/);
  await expect(preference).toBeChecked();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.reload();
  // Preview preferences live only in the mounted workspace. API persistence is
  // covered separately by backend-email-preferences.spec.ts against Laravel.
  await expect(preference).not.toBeChecked();
});

for (const width of [360, 768, 1440]) {
  test(`candidate workspace pages remain accessible at ${width}px`, async ({
    page,
  }, testInfo) => {
    // Audit the settled page, not intermediate colors in its entrance fade.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "jobs",
      "messages?conversation=1",
      "notifications",
      "settings",
    ]) {
      await page.goto(`/account/${path}`);
      await waitForSettledWorkspace(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${path.split("?")[0]}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  });
}
