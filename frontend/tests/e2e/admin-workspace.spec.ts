import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForSettledWorkspace } from "./helpers/workspace-ready";

async function loginAdmin(page: Page, path = "/admin") {
  await page.goto(`/login?returnTo=${encodeURIComponent(path)}`);
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(
    page.getByRole("button", {
      name: "Xem tài khoản quản trị viên",
      exact: true,
    }),
  ).toBeVisible();
}

test("rejected catalog writes keep the dialog and entered name", async ({
  page,
}) => {
  await loginAdmin(page, "/admin/categories");
  await page
    .getByRole("button", { name: "Thêm ngành nghề", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByLabel(/^Tên ngành nghề/);
  await name.fill("Công nghệ thông tin / Phần mềm");
  await dialog
    .getByRole("button", { name: "Lưu vào bản xem trước", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue("Công nghệ thông tin / Phần mềm");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByRole("alert")).toContainText("Tên đã tồn tại");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Thêm ngành nghề", exact: true }),
  ).toBeFocused();
});

test("catalog edits survive navigation and respect category dependencies", async ({
  page,
}) => {
  await loginAdmin(page, "/admin/categories");
  await page
    .getByRole("button", { name: "Thêm ngành nghề", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Tên ngành nghề/).fill("Ngành kiểm thử tích hợp");
  await dialog.getByRole("button", { name: /Lưu|Thêm ngành nghề/ }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByPlaceholder("Tìm tên ngành nghề…").fill("nganh kiem thu");
  await expect(
    page.getByRole("cell", { name: "Ngành kiểm thử tích hợp", exact: true }),
  ).toBeVisible();
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Kỹ năng", exact: true })
    .click();
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Ngành nghề", exact: true })
    .click();
  await page.getByPlaceholder("Tìm tên ngành nghề…").fill("nganh kiem thu");
  await expect(
    page.getByRole("cell", { name: "Ngành kiểm thử tích hợp", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xóa Ngành kiểm thử tích hợp", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa khỏi danh mục", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả", exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("Tìm tên ngành nghề…").fill("cong nghe");
  await page
    .getByRole("button", {
      name: "Xóa Công nghệ thông tin / Phần mềm",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(/Không thể xóa|đang được sử dụng|đang có tin/)
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Xóa khỏi danh mục", exact: true }),
  ).toHaveCount(0);
});

test("deleting a reported job updates the list, sidebar and overview together", async ({
  page,
}) => {
  await loginAdmin(page, "/admin/jobs/2");
  await expect(page.locator(".ap-nav-count")).toHaveText("3");
  await page
    .getByRole("button", { name: "Xóa tin vi phạm", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Lý do vi phạm", { exact: false })
    .fill("Yêu cầu phí đặt cọc trái chính sách tuyển dụng.");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Xác nhận xóa tin", exact: true })
    .click();
  await expect(page.locator(".ap-nav-count")).toHaveText("2");
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Kiểm duyệt tin", exact: false })
    .click();
  await expect(page.locator(".ap-table")).not.toContainText(
    "Cộng tác viên nhập liệu tại nhà",
  );
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Tổng quan", exact: true })
    .click();
  await expect(page.locator(".ap-nav-count")).toHaveText("2");
  await expect(
    page.locator("#reportsTitle").locator("..").locator(".."),
  ).not.toContainText("Cộng tác viên nhập liệu tại nhà");
});

test("admin dialogs fit short screens and return keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loginAdmin(page, "/admin/jobs/2");
  const opener = page.getByRole("button", {
    name: "Xóa tin vi phạm",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
  await dialog
    .getByRole("button", { name: "Xác nhận xóa tin", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByRole("button", { name: "Xác nhận xóa tin", exact: true }),
  ).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

for (const width of [360, 1440]) {
  test(`admin pages fit ${width}px and share a persistent shell`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await loginAdmin(page);
    const pages = [
      ["Tổng quan", "/admin"],
      ["Kiểm duyệt tin", "/admin/jobs"],
      ["Tài khoản người dùng", "/admin/users"],
      ["Ngành nghề", "/admin/categories"],
      ["Kỹ năng", "/admin/skills"],
    ];
    await page
      .locator(".ap-header")
      .evaluate((el) => el.setAttribute("data-test-persistent", "yes"));
    for (const [name, path] of pages) {
      if (width === 360) {
        await page
          .getByRole("button", { name: "Mở điều hướng quản trị", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .getByRole("link", { name, exact: name !== "Kiểm duyệt tin" })
          .click();
      } else {
        await page
          .locator(".ap-sidebar")
          .getByRole("link", { name, exact: name !== "Kiểm duyệt tin" })
          .click();
      }
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await waitForSettledWorkspace(page);
      await expect(page.locator(".ap-header")).toHaveAttribute(
        "data-test-persistent",
        "yes",
      );
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
        path: testInfo.outputPath(`${path.split("/").pop() || "overview"}.png`),
        animations: "disabled",
      });
    }
  });
}
