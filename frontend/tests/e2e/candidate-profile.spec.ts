import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginMock } from "./helpers/mock-auth";
import { waitForSettledWorkspace } from "./helpers/workspace-ready";

test.beforeEach(async ({ page }) => {
  await loginMock(page);
});

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 /Kids [] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF",
);

test("PDF modal closes across cached navigation and its blob preview is recreated", async ({
  page,
}) => {
  await page.goto("/account/profile");
  await page.getByLabel("Chọn CV PDF", { exact: true }).setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  const download = page.getByRole("link", {
    name: "Tải CV xuống",
    exact: true,
  });
  await expect(download).toHaveAttribute("href", /^blob:/);
  const previous = await download.getAttribute("href");
  await page.getByRole("button", { name: "Xem trước CV", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Xem trước CV", exact: true }),
  ).toBeVisible();
  // A programmatic Next Link navigation models leaving while a portal is open.
  await page
    .locator(".site-header .brand")
    .evaluate((element) => (element as HTMLElement).click());
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".home-page")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(
    page.getByRole("dialog", { name: "Xem trước CV", exact: true }),
  ).toHaveCount(0);
  await expect(download).toHaveAttribute("href", /^blob:/);
  await expect(download).not.toHaveAttribute("href", previous!);
  const restoredUrl = await download.getAttribute("href");
  await page.getByRole("button", { name: "Xem trước CV", exact: true }).click();
  await expect(page.getByTitle("Nội dung CV PDF")).toHaveAttribute(
    "src",
    restoredUrl!,
  );
  await page
    .getByRole("button", { name: "Đóng xem trước CV", exact: true })
    .click();
});

test("avatar selection previews an image, rejects disguised content and can be removed", async ({
  page,
}) => {
  await page.goto("/account/profile");
  const picker = page.getByLabel("Ảnh đại diện", { exact: true });
  await picker.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(
    page.getByText("Chọn ảnh JPEG, PNG hoặc WebP không quá 2 MB.", {
      exact: true,
    }),
  ).toBeVisible();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=",
    "base64",
  );
  await picker.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByRole("img", { name: "Ảnh đại diện đã chọn", exact: true }),
  ).toHaveCount(2);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const upload = page.getByRole("button", {
      name: "Chọn ảnh đại diện",
      exact: true,
    });
    const remove = page.getByRole("button", { name: "Xóa ảnh", exact: true });
    await remove.scrollIntoViewIfNeeded();
    const uploadBounds = (await upload.boundingBox())!;
    const removeBounds = (await remove.boundingBox())!;
    expect(Math.abs(uploadBounds.y - removeBounds.y)).toBeLessThan(2);
    expect(removeBounds.x).toBeGreaterThan(uploadBounds.x + uploadBounds.width);
  }
  await page.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Ảnh đại diện đã chọn", exact: true }),
  ).toHaveCount(0);
});

test("profile preview edits locally, validates and never persists personal information", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto("/account/profile");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Minh An",
  );
  await page.getByLabel("Họ và tên", { exact: true }).fill("An");
  await page
    .getByLabel("Portfolio", { exact: true })
    .fill("javascript:alert(1)");
  await page
    .getByRole("button", { name: "Áp dụng bản xem trước", exact: true })
    .click();
  await expect(
    page.getByText(
      "Nhập liên kết HTTP(S) hợp lệ, không chứa thông tin đăng nhập.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByLabel("Portfolio", { exact: true })
    .fill("https://example.com");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Kiểm Thử");
  await page
    .getByRole("combobox", { name: "Tỉnh / Thành phố", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Tìm tỉnh/thành phố", exact: true })
    .fill("ha noi");
  await page.getByRole("option", { name: "Hà Nội", exact: true }).click();
  await page
    .getByRole("button", { name: "Áp dụng bản xem trước", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Kiểm Thử",
  );
  await expect(
    page.getByText(
      "Đã áp dụng cho bản xem trước. Thông tin chưa được lưu vào tài khoản.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toMatch(/Kiểm Thử|example\.com/);
  expect(writes).toEqual([]);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Minh An",
  );
});

test("CV validation, replace, preview and removal keep the previous valid file on an invalid edit", async ({
  page,
}) => {
  await page.goto("/account/profile");
  const picker = page.getByLabel("Chọn CV PDF", { exact: true });
  await picker.setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not pdf"),
  });
  await expect(
    page.getByText("Tệp không có định dạng PDF hợp lệ.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xem trước CV", exact: true }),
  ).toBeDisabled();
  await picker.setInputFiles({
    name: "CV-cua-toi.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toHaveAttribute("href", /^blob:/);
  await picker.setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(
    page.getByText("Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toHaveAttribute("download", "CV-cua-toi.pdf");
  await page.getByRole("button", { name: "Xem trước CV", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Xem trước CV", exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("Nội dung CV PDF")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Xóa CV", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Xem trước CV", exact: true }),
  ).toBeDisabled();
});

test("profile skills preserve the ten-skill cap and all selections can be removed", async ({
  page,
}) => {
  await page.goto("/account/profile");
  const skills = page.getByRole("group", {
    name: "Kỹ năng chuyên môn",
    exact: true,
  });
  await expect(skills.getByRole("checkbox")).toHaveCount(10);
  for (const checkbox of await skills.getByRole("checkbox").all())
    await checkbox.check();
  await expect(page.getByText("10/10", { exact: true })).toBeVisible();
  await skills.getByRole("checkbox", { name: "PHP", exact: true }).uncheck();
  await expect(page.getByText("9/10", { exact: true })).toBeVisible();
});

for (const width of [360, 768, 1440]) {
  test(`candidate profile fits ${width}px with accessible controls`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/account/profile");
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
      path: testInfo.outputPath("profile.png"),
      fullPage: true,
    });
  });
}

test("account profile requires login after the session is removed", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
