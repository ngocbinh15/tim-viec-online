import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 1440]) {
  test(`notification drawer slides without shifting the page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/jobs");
    const trigger = page.getByRole("button", {
      name: "Trung tâm thông báo",
      exact: true,
    });
    await expect(trigger).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const samples = await trigger.evaluate(async (node) => {
      const pageContent = document.querySelector("main")!;
      const baseline = pageContent.getBoundingClientRect();
      const samples: {
        left: number;
        width: number;
        drawerLeft: number;
        state: string | null;
      }[] = [];
      const capture = async () => {
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const frame = () => {
            const rect = pageContent.getBoundingClientRect();
            const drawer = document.querySelector(".header-notifications");
            samples.push({
              left: rect.left - baseline.left,
              width: rect.width - baseline.width,
              drawerLeft: drawer?.getBoundingClientRect().left ?? innerWidth,
              state: drawer?.getAttribute("data-state") ?? null,
            });
            if (performance.now() - start < 400) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
      };
      (node as HTMLElement).click();
      await capture();
      (document.querySelector(".notification-close") as HTMLElement).click();
      await capture();
      return samples;
    });
    expect(
      samples.every(
        (sample) => Math.abs(sample.left) < 1 && Math.abs(sample.width) < 1,
      ),
    ).toBe(true);
    const opening = samples
      .filter((sample) => sample.state === "open")
      .map((sample) => sample.drawerLeft);
    const closing = samples
      .filter((sample) => sample.state === "closed")
      .map((sample) => sample.drawerLeft);
    expect(opening.length).toBeGreaterThan(3);
    expect(closing.length).toBeGreaterThan(3);
    expect(opening[0] - opening.at(-1)!).toBeGreaterThan(80);
    expect(closing.at(-1)! - closing[0]).toBeGreaterThan(80);
    expect(
      opening.every(
        (left, index) => index === 0 || left <= opening[index - 1] + 1,
      ),
    ).toBe(true);
    expect(
      closing.every(
        (left, index) => index === 0 || left >= closing[index - 1] - 1,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("dialog", { name: "Thông báo", exact: true }),
    ).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test("navbar keyword and location submit the existing job query contract", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/jobs?page=2");
  const search = page.getByRole("search", { name: "Tìm việc nhanh" });
  await search
    .getByLabel("Việc làm, công ty hoặc kỹ năng", { exact: true })
    .fill("React");
  await search.getByRole("combobox", { name: "Địa điểm tìm nhanh" }).click();
  await page.getByRole("option", { name: "Hà Nội", exact: true }).click();
  await search.getByRole("button", { name: "Tìm việc nhanh" }).click();
  await expect(page).toHaveURL(/keyword=React/);
  const url = new URL(page.url());
  expect(url.searchParams.get("city")).toBe("Hà Nội");
  expect(url.searchParams.has("page")).toBe(false);
  await expect(
    search.getByLabel("Việc làm, công ty hoặc kỹ năng", { exact: true }),
  ).toHaveValue("React");
  await expect(
    search.getByRole("combobox", { name: "Địa điểm tìm nhanh" }),
  ).toHaveText("Hà Nội");
  const filters = page.getByRole("region", { name: "Bộ lọc việc làm" });
  await expect(filters.locator('input[name="keyword"]')).toBeHidden();
  await expect(filters.locator('select[name="city"]')).toHaveCount(0);
  await filters.getByRole("combobox", { name: "Hình thức làm việc" }).click();
  await page.getByRole("option", { name: "Từ xa", exact: true }).click();
  await expect(page).toHaveURL(/job_type=remote/);
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("React");
  expect(new URL(page.url()).searchParams.get("city")).toBe("Hà Nội");
  await search.getByLabel("Việc làm, công ty hoặc kỹ năng").fill("PHP");
  await search.getByRole("button", { name: "Tìm việc nhanh" }).click();
  await expect(page).toHaveURL(/keyword=PHP/);
  expect(new URL(page.url()).searchParams.get("job_type")).toBe("remote");
});

test("navbar menus dismiss, restore focus and navigate without fake account data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/jobs");
  const categories = page.getByRole("button", {
    name: "Tất cả danh mục",
    exact: true,
  });
  await categories.click();
  const mega = page.getByRole("dialog", {
    name: "Tất cả danh mục",
    exact: true,
  });
  await expect(mega).toBeVisible();
  expect((await mega.boundingBox())!.y).toBeGreaterThanOrEqual(69);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(categories).toBeFocused();
  await categories.click();
  await page
    .getByRole("heading", { name: "24 việc làm phù hợp", exact: true })
    .click();
  await expect(mega).toBeHidden();
  await categories.click();
  await mega.getByRole("link", { name: "IT Jobs", exact: true }).click();
  await expect(page).toHaveURL(/category_ids=1/);
  await expect(mega).toBeHidden();
  const account = page.getByRole("button", {
    name: "Tài khoản cá nhân",
    exact: true,
  });
  await account.click();
  await expect(
    page.getByRole("menuitem", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  const bell = page.getByRole("button", {
    name: "Trung tâm thông báo",
    exact: true,
  });
  await bell.click();
  const notifications = page.getByRole("dialog", {
    name: "Thông báo",
    exact: true,
  });
  await expect(notifications).toContainText("Đăng nhập để xem thông báo");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(bell).toBeFocused();
});
