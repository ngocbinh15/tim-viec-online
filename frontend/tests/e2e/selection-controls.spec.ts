import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [360, 1440]) {
  test(`all single job filters preserve document scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/jobs");
    for (const label of ["Hình thức làm việc", "Mức lương", "Cấp bậc"]) {
      const trigger = page.getByRole("combobox", { name: label, exact: true });
      await trigger.click();
      await expect(page.locator("body")).not.toHaveAttribute(
        "data-scroll-locked",
      );
      const before = await page.evaluate(() => scrollY);
        // Stay outside the popup even when it nearly fills a mobile viewport.
        await page.mouse.move(2, 650);
      await page.mouse.wheel(0, 180);
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(before);
      await expect(
        page.getByRole("dialog", { name: label, exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
  });
}

test("selected filters turn blue and clear independently without losing the search", async ({
  page,
}) => {
  await page.goto(
    "/jobs?keyword=React&category_ids=1&city=H%C3%A0+N%E1%BB%99i&job_type=remote&salary=10to20&level=Senior",
  );
  const fields = page.locator(".search-panel .selection-field");
  await expect(fields).toHaveCount(4);
  for (const field of await fields.all()) {
    await expect(field).toHaveAttribute("data-active", "true");
    await expect(field.locator(".selection-trigger")).toHaveCSS(
      "border-color",
      "rgb(0, 90, 255)",
    );
  }
  await page
    .getByRole("button", { name: "Xóa mức lương", exact: true })
    .click();
  await expect(page).not.toHaveURL(/salary=/);
  expect(new URL(page.url()).searchParams.get("job_type")).toBe("remote");
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("React");
  expect(new URL(page.url()).searchParams.get("city")).toBe("Hà Nội");
  await expect(
    page.getByRole("combobox", { name: "Mức lương", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Xóa ngành nghề", exact: true })
    .click();
  await expect(page).not.toHaveURL(/category_ids=/);
  expect(new URL(page.url()).searchParams.get("level")).toBe("Senior");
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Xóa ngành nghề", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(
      'select:not([aria-hidden="true"]):visible, input[type="date"]:visible',
    ),
  ).toHaveCount(0);
});

for (const width of [360, 1440]) {
  test(`custom menus support keyboard, empty search and fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/jobs");
    await expect(page.locator(".search-panel")).toBeVisible();
    if (width === 360) {
      for (const field of await page
        .locator(".search-panel .selection-field")
        .all()) {
        expect((await field.boundingBox())!.width).toBeGreaterThanOrEqual(120);
      }
    }
    const type = page.getByRole("combobox", {
      name: "Hình thức làm việc",
      exact: true,
    });
    await type.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("single-menu.png"),
      animations: "disabled",
    });
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(type).toHaveText("Thực tập");
    await expect(page).toHaveURL(/job_type=internship/);
    await expect(type).toBeFocused();
    const categories = page.getByRole("button", {
      name: "Ngành nghề",
      exact: true,
    });
    await categories.click();
    const dialog = page.getByRole("dialog", {
      name: "Ngành nghề",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await page
      .getByLabel("Tìm ngành nghề", { exact: true })
      .fill("khong-co-nganh-nay");
    await expect(dialog.getByRole("status")).toHaveText(
      "Không tìm thấy lựa chọn phù hợp.",
    );
    await page.getByLabel("Tìm ngành nghề", { exact: true }).fill("cong nghe");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("checkbox", { name: "Công nghệ thông tin / Phần mềm" }),
    ).toBeChecked();
    await expect(page).toHaveURL(/category_ids=1/);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("multiple-menu.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(categories).toBeFocused();
    await page
      .getByRole("button", { name: "Xóa ngành nghề", exact: true })
      .click();
    await expect(page).not.toHaveURL(/category_ids=/);
    await expect(categories).toBeFocused();
    const city = page.getByRole("combobox", { name: "Địa điểm tìm nhanh" });
    await city.click();
    await page.getByRole("option", { name: "Hà Nội", exact: true }).click();
    await expect(city).toHaveText("Hà Nội");
    await page
      .getByRole("button", { name: "Xóa địa điểm tìm nhanh", exact: true })
      .click();
    await expect(city).toHaveText("Tất cả địa điểm");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}
