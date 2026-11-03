import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home follows the reference sections and submits the shared job search", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tìm Việc Làm Mơ Ước Của Bạn Tại Việt Nam",
  );
  await expect(page.locator(".site-header .header-search")).toHaveCount(0);
  await expect(page.getByTestId("home-job-card")).toHaveCount(6);
  await expect(page.locator(".home-category-card")).toHaveCount(5);
  await expect(page.locator(".home-company-card")).toHaveCount(6);
  await expect(
    page
      .getByRole("navigation", { name: "Nhóm việc làm nổi bật" })
      .getByRole("button"),
  ).toHaveCount(6);
  const keyword = page.getByLabel("Việc làm, công ty hoặc kỹ năng", {
    exact: true,
  });
  await expect(keyword).toHaveValue("");
  await expect(keyword).toHaveAttribute(
    "placeholder",
    "Tìm kiếm việc làm, công ty, kỹ năng",
  );
  await keyword.hover();
  await expect(keyword).toHaveCSS("box-shadow", "none");
  await keyword.focus();
  await expect(keyword).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".home-search")).toHaveCSS(
    "outline-style",
    "solid",
  );
  await keyword.fill("React");
  await page.getByRole("combobox", { name: "Địa điểm tìm việc" }).click();
  await page.getByRole("option", { name: "Hồ Chí Minh", exact: true }).click();
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).toHaveURL(/keyword=React/);
  expect(new URL(page.url()).searchParams.get("city")).toBe("Hồ Chí Minh");
  await expect(
    page.getByRole("search", { name: "Tìm việc nhanh" }),
  ).toBeVisible();
  await expect(page.getByTestId("job-card").first()).toContainText("React");
});

test("featured jobs resolve to their own details and guest save opens login", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.getByTestId("home-job-card").filter({ visible: true });
  await expect(cards).toHaveCount(6);
  // Read paired values atomically after the streamed carousel has arrived.
  const entries = await cards
    .getByRole("heading")
    .getByRole("link")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        title: element.textContent!.trim(),
        href: element.getAttribute("href")!,
      })),
    );
  const titles = entries.map((entry) => entry.title);
  const links = entries.map((entry) => entry.href);
  expect(new Set(links).size).toBe(6);
  const save = cards
    .first()
    .getByRole("link", { name: "Lưu việc làm", exact: true });
  await save.click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(links[0]);
  for (let index = 0; index < links.length; index++) {
    await page.goto(links[index]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      titles[index],
    );
    await expect(
      page.getByRole("link", { name: "Ứng tuyển ngay", exact: true }),
    ).toBeVisible();
  }
});

test("carousel, category arrows, trends, company links, brand and employer CTA work", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Nhóm việc làm 2", exact: true })
    .click();
  await expect(page.getByTestId("home-job-card").first()).toContainText(
    "DX Officer",
  );
  await expect(
    page.getByRole("button", { name: "Nhóm việc làm 2", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await page
    .getByRole("button", { name: "Nhóm việc làm 1", exact: true })
    .click();
  await expect(page.getByTestId("home-job-card").first()).toContainText(
    "Human Resources Manager",
  );
  await page
    .getByRole("button", { name: "Nhóm ngành tiếp theo", exact: true })
    .click();
  await expect(page.locator(".home-category-card").first()).toContainText(
    "Marketing",
  );
  await page
    .getByRole("button", { name: "Nhóm ngành trước", exact: true })
    .click();
  await expect(page.locator(".home-category-card").first()).toContainText(
    "Kinh doanh",
  );
  await page
    .locator(".home-trends")
    .getByRole("link", { name: "Laravel", exact: true })
    .click();
  await expect(page).toHaveURL(/keyword=Laravel/);
  await page
    .getByRole("banner")
    .getByRole("link", { name: "TimViecOnline — Tìm việc làm", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .locator(".home-category-card")
    .filter({ hasText: "Công nghệ thông tin" })
    .click();
  await expect(page).toHaveURL(/category_ids=1/);
  await page.goto("/");
  await page
    .locator(".home-company-card")
    .filter({ hasText: "FPT Software" })
    .click();
  await expect(page).toHaveURL(/\/companies\/1$/);
  await expect(
    page.getByRole("heading", { name: "FPT Software", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("company-job-card")).toHaveCount(3);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Bắt đầu tuyển dụng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?role=employer/);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Tạo tài khoản nhà tuyển dụng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/register\?role=employer/);
});

test("home and the custom location picker pass automated accessibility", async ({
  page,
}) => {
  // Audit final colors; entrance motion has its own regression coverage.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("home-job-card")).toHaveCount(6);
  await expect(page.locator(".home-company-card")).toHaveCount(6);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const city = page.getByRole("combobox", { name: "Địa điểm tìm việc" });
  await city.click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(city).toBeFocused();
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`home matches responsive structure without overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByTestId("home-job-card")).toHaveCount(6);
    await expect(page.locator(".home-employer")).toBeVisible();
    const header = (await page.locator(".site-header").boundingBox())!;
    expect(header.height).toBeCloseTo(69, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.evaluate(() => document.fonts.ready);
    if (width === 1440 || width === 390) {
      await page.screenshot({
        path: testInfo.outputPath("home.png"),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page
      .getByRole("button", { name: "Tất cả danh mục", exact: true })
      .click();
    const menu = page.getByRole("dialog", {
      name: "Tất cả danh mục",
      exact: true,
    });
    await expect(menu).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });
}
