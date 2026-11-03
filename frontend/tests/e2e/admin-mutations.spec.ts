import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function loginAdmin(page: Page, path: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(path)}`);
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

async function navigate(page: Page, name: string) {
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name, exact: name !== "Kiểm duyệt tin" })
    .click();
}

test("skill create, rename and delete persist across navigation and unlink job requirements", async ({
  page,
}) => {
  await loginAdmin(page, "/admin/jobs/5");
  const requirements = page
    .locator(".ap-detail-section")
    .filter({
      has: page.getByRole("heading", { name: "Kỹ năng yêu cầu", exact: true }),
    });
  await expect(
    requirements.getByText("ReactJS", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Kỹ năng");
  await page.getByRole("button", { name: "Thêm kỹ năng", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Tên kỹ năng/).fill("Kỹ năng kiểm thử riêng");
  await dialog
    .getByRole("button", { name: "Lưu vào bản xem trước", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const search = page.getByPlaceholder("Tìm tên kỹ năng…");
  await search.fill("Kỹ năng kiểm thử riêng");
  await page
    .getByRole("button", { name: "Sửa Kỹ năng kiểm thử riêng", exact: true })
    .click();
  await dialog.getByLabel(/^Tên kỹ năng/).fill("Kỹ năng kiểm thử đã sửa");
  await dialog
    .getByRole("button", { name: "Lưu vào bản xem trước", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await navigate(page, "Ngành nghề");
  await navigate(page, "Kỹ năng");
  await search.fill("Kỹ năng kiểm thử đã sửa");
  await expect(
    page.getByRole("cell", { name: "Kỹ năng kiểm thử đã sửa", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xóa Kỹ năng kiểm thử đã sửa", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Xóa khỏi danh mục", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("cell", { name: "Kỹ năng kiểm thử đã sửa", exact: true }),
  ).toHaveCount(0);
  await search.fill("ReactJS");
  await page.getByRole("button", { name: "Xóa ReactJS", exact: true }).click();
  await expect(dialog).toContainText("Tin và hồ sơ vẫn được giữ lại.");
  await dialog
    .getByRole("button", { name: "Xóa khỏi danh mục", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  // Use client navigation so the shared in-memory database is retained.
  await navigate(page, "Kiểm duyệt tin");
  await page.getByRole("button", { name: /^Tất cả tin/ }).click();
  await page
    .getByPlaceholder("Tiêu đề công việc hoặc tên công ty…")
    .fill("Frontend Developer React");
  await page
    .getByRole("link", {
      name: "Frontend Developer React / Next.js",
      exact: true,
    })
    .click();
  await expect(requirements).not.toContainText("ReactJS");
  await expect(requirements).toContainText("NextJS");
});

test("locking and unlocking a user survives navigation while admin accounts stay protected", async ({
  page,
}) => {
  await loginAdmin(page, "/admin/users");
  const search = page.getByPlaceholder("Họ tên hoặc địa chỉ email…");
  await search.fill("ngocmai@example.com");
  const row = page.getByRole("row").filter({ hasText: "ngocmai@example.com" });
  await expect(row.getByText("Hoạt động", { exact: true })).toBeVisible();
  await row
    .getByRole("button", { name: "Khóa tài khoản Phạm Ngọc Mai", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Khóa tài khoản", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await navigate(page, "Tổng quan");
  await navigate(page, "Tài khoản người dùng");
  await search.fill("ngocmai@example.com");
  await expect(row.getByText("Bị khóa", { exact: true })).toBeVisible();
  await row
    .getByRole("button", {
      name: "Mở khóa tài khoản Phạm Ngọc Mai",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Mở khóa tài khoản", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(row.getByText("Hoạt động", { exact: true })).toBeVisible();
  await search.fill("admin@timviec.vn");
  const admin = page.getByRole("row").filter({ hasText: "admin@timviec.vn" });
  await expect(admin.getByText("Được bảo vệ", { exact: true })).toBeVisible();
  await expect(
    admin.getByRole("button", { name: /^Khóa tài khoản/ }),
  ).toHaveCount(0);
});

test("admin list filters keep document scrolling and support keyboard pagination and accessible dialogs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await loginAdmin(page, "/admin/skills");
  const sort = page.getByRole("combobox", { name: "Sắp xếp", exact: true });
  await sort.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("dialog", { name: "Sắp xếp", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(sort).toHaveText("Thêm gần đây");
  await expect(sort).toBeFocused();
  const pagination = page.getByRole("navigation", {
    name: "Phân trang",
    exact: true,
  });
  await expect(
    pagination.getByRole("button", { name: /^Trang \d+$/ }),
  ).toHaveCount(3);
  const next = pagination.getByRole("button", {
    name: "Trang sau",
    exact: true,
  });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    pagination.getByRole("button", { name: "Trang 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Thêm kỹ năng", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Thêm kỹ năng",
    exact: true,
  });
  await expect(dialog.getByLabel(/^Tên kỹ năng/)).toBeFocused();
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
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
