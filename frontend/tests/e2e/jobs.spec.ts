import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public list, real pagination, detail and guest auth handoff", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/jobs");
  await expect(
    page.getByRole("heading", { name: "24 việc làm phù hợp" }),
  ).toBeVisible();
  await expect(page.getByTestId("job-card")).toHaveCount(6);
  await page.getByRole("link", { name: "Trang 2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("link", { name: "Trang 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByTestId("job-card")
    .first()
    .getByRole("heading")
    .getByRole("link")
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mô tả công việc" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ứng tuyển ngay" }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Quay lại xem việc làm" }).click();
  await expect(page).toHaveURL(/\/jobs\/\d+$/);
  expect(errors).toEqual([]);
});

test("accent-insensitive search and browser back preserve URL and form", async ({
  page,
}) => {
  await page.goto("/jobs");
  await page.getByLabel("Việc làm, công ty hoặc kỹ năng").fill("dong hanh");
  await page
    .getByRole("button", { name: "Tìm việc nhanh", exact: true })
    .click();
  await expect(page).toHaveURL(/keyword=dong\+hanh/);
  await expect(page.getByTestId("job-card").first()).toContainText(
    "Đồng Hành Media",
  );
  await page
    .getByLabel("Việc làm, công ty hoặc kỹ năng")
    .fill("khongtimthayxyz");
  await page
    .getByRole("button", { name: "Tìm việc nhanh", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Không tìm thấy việc làm phù hợp với tiêu chí tìm kiếm",
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Việc làm, công ty hoặc kỹ năng")).toHaveValue(
    "dong hanh",
  );
  await expect(page.getByTestId("job-card").first()).toContainText(
    "Đồng Hành Media",
  );
  await page.reload();
  await expect(page.getByLabel("Việc làm, công ty hoặc kỹ năng")).toHaveValue(
    "dong hanh",
  );
});

test("multiple categories, type and salary combine; clear removes query", async ({
  page,
}) => {
  await page.goto("/jobs?page=3");
  await page.getByRole("button", { name: "Ngành nghề", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Công nghệ thông tin / Phần mềm" })
    .check();
  await page.getByRole("checkbox", { name: "Thiết kế đồ họa & UI/UX" }).check();
  await page.keyboard.press("Escape");
  // Each category starts a navigation. Wait for both changes to commit before
  // opening another popup, whose DOM can otherwise be replaced mid-click.
  await expect(page).toHaveURL(/category_ids=1&category_ids=4/);
  await expect(page.locator(".search-panel form")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByRole("combobox", { name: "Hình thức làm việc", exact: true })
    .click();
  await page.getByRole("option", { name: "Từ xa", exact: true }).click();
  await expect(page).toHaveURL(/job_type=remote/);
  await page.getByRole("combobox", { name: "Mức lương", exact: true }).click();
  await page
    .getByRole("option", { name: "Từ 10 – 20 triệu", exact: true })
    .click();
  await expect(page).toHaveURL(/category_ids=1&category_ids=4/);
  await expect(page).toHaveURL(/salary=10to20/);
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await expect(page.getByTestId("job-card").first()).toContainText(
    "20 - 25 triệu VNĐ",
  );
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Mức lương", exact: true }),
  ).toHaveText("Tất cả mức lương");
  await expect(
    page.getByLabel("Hình thức làm việc", { exact: true }),
  ).toHaveText("Từ xa");
  await page.reload();
  await page.getByRole("button", { name: "Ngành nghề", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Thiết kế đồ họa & UI/UX" }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Ngành nghề", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("link", { name: "Xóa bộ lọc", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByTestId("job-card")).toHaveCount(6);
});

test("save opens login directly and retains the selected job", async ({
  page,
}) => {
  await page.goto("/jobs");
  const save = page
    .getByRole("link", { name: "Lưu việc làm", exact: true })
    .first();
  const target = await save.getAttribute("href");
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    new URL(target!, page.url()).searchParams.get("returnTo"),
  );
});

test("closed, expired and invalid jobs have honest states", async ({
  page,
}) => {
  for (const id of [19, 20]) {
    await page.goto(`/jobs/${id}`);
    await expect(
      page.getByRole("button", { name: "Đã ngừng nhận hồ sơ" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Tin tuyển dụng này đã đóng hoặc hết hạn nộp hồ sơ."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ứng tuyển ngay" }),
    ).toHaveCount(0);
  }
  await page.goto("/jobs/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy việc làm" }),
  ).toBeVisible();
  await expect(page.locator("main#main")).toHaveCount(1);
});

test("search, details and guest login pass automated accessibility checks", async ({
  page,
}) => {
  // Audit settled colors, rather than opacity during staggered card entry.
  // Full-motion behavior is covered separately in motion.spec.ts.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/jobs", "/jobs/1", "/jobs/invalid", "/login"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Ngành nghề", exact: true }).click();
  await page.getByLabel("Tìm ngành nghề", { exact: true }).fill("cong nghe");
  await expect(
    page.getByRole("checkbox", { name: "Công nghệ thông tin / Phần mềm" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Thiết kế đồ họa & UI/UX" }),
  ).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Ngành nghề", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("link", { name: "Lưu việc làm", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  const login = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(login.violations).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`list and detail do not overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/jobs", "/jobs/1"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const logo = page.locator(".brand-mark").first();
      await expect(logo).toBeVisible();
      await expect(
        page.getByRole("search", { name: "Tìm việc nhanh" }),
      ).toBeVisible();
      await expect
        .poll(() =>
          logo.evaluate((image) => (image as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      if (width === 360 || width === 1440) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: testInfo.outputPath(
            path === "/jobs" ? "jobs.png" : "detail.png",
          ),
          fullPage: true,
        });
      }
    }
    if (width < 900) {
      const menu = page.getByRole("button", { name: "Tất cả danh mục" });
      await menu.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const header = await page.locator(".site-header").boundingBox();
      const menuBounds = await page.getByRole("dialog").boundingBox();
      expect(menuBounds!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
    }
    if (width === 360) {
      await page.getByLabel("Việc làm, công ty hoặc kỹ năng").fill("React");
      await page.getByRole("combobox", { name: "Địa điểm tìm nhanh" }).click();
      await page.getByRole("option", { name: "Hà Nội", exact: true }).click();
      await page
        .getByRole("button", { name: "Tìm việc nhanh", exact: true })
        .click();
      await expect(page).toHaveURL(/keyword=React/);
      await expect(page.getByTestId("job-card").first()).toContainText("React");
    }
  });
}
