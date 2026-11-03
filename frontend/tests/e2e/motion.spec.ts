import { test, expect } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`menus and sheets settle and guest save navigates with motion=${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const width = reducedMotion === "reduce" ? 360 : 1440;
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/jobs");

    const categories = page.getByRole("button", {
      name: "Tất cả danh mục",
      exact: true,
    });
    for (let index = 0; index < 2; index++) {
      await categories.click();
      const menu = page.getByRole("dialog", {
        name: "Tất cả danh mục",
        exact: true,
      });
      await expect(menu).toBeVisible();
      await menu.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      await expect(menu).toHaveCSS("opacity", "1");
      const header = await page.locator(".site-header").boundingBox();
      expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(
        header!.y + header!.height,
      );
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(categories).toBeFocused();
    }

    const save = page
      .getByRole("link", { name: "Lưu việc làm", exact: true })
      .first();
    await save.click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/jobs");

    const bell = page.getByRole("button", {
      name: "Trung tâm thông báo",
      exact: true,
    });
    await bell.click();
    const sheet = page.getByRole("dialog", { name: "Thông báo", exact: true });
    await expect(sheet).toBeVisible();
    await sheet.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await expect(sheet).toHaveCSS("opacity", "1");
    await sheet.getByRole("button", { name: "Đóng thông báo" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(bell).toBeFocused();

    if (reducedMotion === "reduce") {
      const slowAnimations = await page.evaluate(
        () =>
          document.getAnimations().filter((animation) => {
            const timing = animation.effect?.getTiming();
            return (
              timing &&
              (Number(timing.duration) > 1 || Number(timing.delay) > 0)
            );
          }).length,
      );
      expect(slowAnimations).toBe(0);
      await expect(page.getByTestId("job-card").first()).toHaveCSS(
        "opacity",
        "1",
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
