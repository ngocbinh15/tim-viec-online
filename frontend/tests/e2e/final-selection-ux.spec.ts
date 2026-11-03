import { expect, test } from "@playwright/test";

for (const width of [360, 1440]) {
  test(`single filters resume the document tab order at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/jobs");
    const filters = page.getByRole("region", { name: "Bộ lọc việc làm" });
    const categories = filters.getByRole("button", {
      name: "Ngành nghề",
      exact: true,
    });
    const type = filters.getByRole("combobox", {
      name: "Hình thức làm việc",
      exact: true,
    });
    const salary = filters.getByRole("combobox", {
      name: "Mức lương",
      exact: true,
    });
    const level = filters.getByRole("combobox", {
      name: "Cấp bậc",
      exact: true,
    });
    const clear = filters.getByRole("link", { name: "Xóa bộ lọc" });
    const documentWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    for (const [trigger, previous, next] of [
      [type, categories, salary],
      [salary, type, level],
      [level, salary, clear],
    ]) {
      for (const backwards of [false, true]) {
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", {
          name: (await trigger.getAttribute("aria-label"))!,
          exact: true,
        });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("option").first()).toBeFocused();
        await expect(page.locator("body")).not.toHaveAttribute(
          "data-scroll-locked",
        );
        expect(
          await page.evaluate(() => document.documentElement.clientWidth),
        ).toBe(documentWidth);
        await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
        await expect(backwards ? previous : next).toBeFocused();
        await expect(dialog).toHaveCount(0);
        // Exit animation cleanup must not return focus to the old trigger.
        await expect(backwards ? previous : next).toBeFocused();
      }
    }

    // The adjacent clear control remains reachable when a value is selected.
    const typeMenu = page.getByRole("dialog", {
      name: "Hình thức làm việc",
      exact: true,
    });
    await type.focus();
    await page.keyboard.press("ArrowDown");
    await expect(typeMenu.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(type).toHaveText("Thực tập");
    await expect(typeMenu).toHaveCount(0);
    await expect(type).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(typeMenu.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Tab");
    const clearType = page.getByRole("button", {
      name: "Xóa hình thức làm việc",
      exact: true,
    });
    await expect(clearType).toBeFocused();
    await expect(typeMenu).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(salary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("dialog", { name: "Mức lương", exact: true })
        .getByRole("listbox"),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(salary).toBeFocused();
  });

  test(`searchable city menu exits naturally from input and options at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const form = page.getByRole("search", { name: "Tìm kiếm việc làm" });
    const hero = page.locator(".home-hero > .home-container:visible");
    // Measure the tab-order layout after the shared hero entrance completes.
    await expect(hero).toHaveCSS("animation-name", "content-arrive");
    await hero.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await expect(hero).toHaveCSS("transform", "none");
    const trigger = form.getByRole("combobox", {
      name: "Địa điểm tìm việc",
      exact: true,
    });
    const previous = form.getByRole("textbox", {
      name: "Việc làm, công ty hoặc kỹ năng",
      exact: true,
    });
    const next = form.getByRole("button", { name: "Tìm kiếm", exact: true });
    const before = await form.boundingBox();

    for (const fromOption of [false, true]) {
      for (const backwards of [false, true]) {
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", {
          name: "Địa điểm tìm việc",
          exact: true,
        });
        const search = dialog.getByRole("textbox", {
          name: "Tìm tỉnh/thành phố",
          exact: true,
        });
        await expect(search).toBeFocused();
        await search.fill("da nang");
        await expect(dialog.getByRole("option")).toHaveCount(1);
        if (fromOption) {
          await page.keyboard.press("ArrowDown");
          await expect(
            dialog.getByRole("option", { name: "Đà Nẵng", exact: true }),
          ).toBeFocused();
        }
        await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
        await expect(backwards ? previous : next).toBeFocused();
        await expect(dialog).toHaveCount(0);
        await expect(backwards ? previous : next).toBeFocused();
        const after = await form.boundingBox();
        expect(before).not.toBeNull();
        expect(after).not.toBeNull();
        for (const dimension of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(after![dimension] - before![dimension])).toBeLessThan(
            0.05,
          );
        }
        await expect(page.locator("body")).not.toHaveAttribute(
          "data-scroll-locked",
        );
      }
    }
    await trigger.click();
    await expect(
      page.getByRole("textbox", { name: "Tìm tỉnh/thành phố", exact: true }),
    ).toHaveValue("");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
}
