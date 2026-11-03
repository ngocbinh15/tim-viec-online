import { expect, test, type Page } from "@playwright/test";

async function recordMotion(page: Page) {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    const log: { target: string; duration: number; easing: string }[] = [];
    (window as unknown as { adminMotion: typeof log }).adminMotion = log;
    Element.prototype.animate = function (frames, options) {
      if (this.matches(".ap-content-slot, .ap-page-heading")) {
        log.push({
          target: this.className,
          duration:
            typeof options === "object"
              ? Number(options.duration)
              : Number(options),
          easing: typeof options === "object" ? (options.easing ?? "") : "",
        });
      }
      return original.call(this, frames, options);
    };
  });
}

async function login(page: Page) {
  await page.goto("/login?returnTo=%2Fadmin%2Fcategories");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
}

test("admin entrance replays on navigation without remounting shell or clearing filters", async ({
  page,
}) => {
  await recordMotion(page);
  await login(page);
  const motionCount = () =>
    page.evaluate(
      () =>
        (window as unknown as { adminMotion: unknown[] }).adminMotion.length,
    );
  await expect.poll(motionCount).toBeGreaterThanOrEqual(2);
  const initial = await motionCount();
  await page.getByPlaceholder("Tìm tên ngành nghề…").fill("cong nghe");
  await expect.poll(motionCount).toBe(initial);
  await page
    .locator(".ap-header")
    .evaluate((el) => el.setAttribute("data-persistent", "yes"));
  const geometry = await page.locator(".ap-sidebar").boundingBox();
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Kỹ năng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/skills$/);
  await expect.poll(motionCount).toBeGreaterThan(initial);
  const second = await motionCount();
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Ngành nghề", exact: true })
    .click();
  await expect(page.getByPlaceholder("Tìm tên ngành nghề…")).toHaveValue(
    "cong nghe",
  );
  await expect.poll(motionCount).toBeGreaterThan(second);
  await expect(page.locator(".ap-header")).toHaveAttribute(
    "data-persistent",
    "yes",
  );
  expect(await page.locator(".ap-sidebar").boundingBox()).toEqual(geometry);
  const entries = await page.evaluate(
    () =>
      (
        window as unknown as {
          adminMotion: { duration: number; easing: string }[];
        }
      ).adminMotion,
  );
  expect(
    entries.every(
      (entry) =>
        entry.duration === 240 && /cubic-bezier\(\s*0?\.22/.test(entry.easing),
    ),
  ).toBe(true);
});

test("admin reduced motion skips page movement and retains dialog focus handling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordMotion(page);
  await login(page);
  const opener = page.getByRole("button", {
    name: "Thêm ngành nghề",
    exact: true,
  });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const duration = await page
    .getByRole("dialog")
    .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(duration).toBeLessThanOrEqual(0.00001);
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  expect(
    await page.evaluate(
      () => (window as unknown as { adminMotion: unknown[] }).adminMotion,
    ),
  ).toEqual([]);
});

for (const width of [360, 1440]) {
  test(`admin pagination uses shared product dimensions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/jobs");
    const dimensions = (element: Element) => {
      const style = getComputedStyle(element);
      return {
        height: style.height,
        minWidth: style.minWidth,
        radius: style.borderRadius,
        background: style.backgroundColor,
        color: style.color,
      };
    };
    // Streamed HTML may exist in a hidden wrapper before Next.js reveals it.
    // Hidden flex children report min-width: 0px instead of the visible auto.
    const reference = page
      .locator('.pagination [aria-current="page"]')
      .filter({ visible: true });
    await expect(reference).toBeVisible();
    const expected = await reference.evaluate(dimensions);
    await login(page);
    const current = page
      .locator('.pagination [aria-current="page"]')
      .filter({ visible: true });
    await expect(current).toBeVisible();
    expect(await current.evaluate(dimensions)).toEqual(expected);
    await expect(page.locator(".pagination button")).toHaveCount(3);
  });
}
