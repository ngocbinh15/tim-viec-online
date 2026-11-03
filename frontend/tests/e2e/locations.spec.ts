import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [360, 1440]) {
  test(`home and navbar share all province options at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page
      .getByRole("combobox", { name: "Địa điểm tìm việc", exact: true })
      .click();
    const homeOptions = await page.getByRole("option").allTextContents();
    expect(homeOptions).toHaveLength(35); // 34 provinces + the all-locations choice.
    expect(homeOptions).toContain("An Giang");
    expect(homeOptions).toContain("Vĩnh Long");
    expect(homeOptions).not.toContain("Bình Dương");
    await page.getByRole("option", { name: "Vĩnh Long", exact: true }).click();
    await page
      .getByLabel("Việc làm, công ty hoặc kỹ năng", { exact: true })
      .fill("");
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await expect(page).toHaveURL(/city=/);
    expect(new URL(page.url()).searchParams.get("city")).toBe("Vĩnh Long");
    await expect(
      page.getByRole("heading", {
        name: "Không tìm thấy việc làm phù hợp với tiêu chí tìm kiếm",
      }),
    ).toBeVisible();
    const city = page.getByRole("combobox", {
      name: "Địa điểm tìm nhanh",
      exact: true,
    });
    await expect(city).toHaveText("Vĩnh Long");
    await city.click();
    expect(await page.getByRole("option").allTextContents()).toEqual(
      homeOptions,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Vĩnh Long", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(city).toBeFocused();
    await page.reload();
    await expect(city).toHaveText("Vĩnh Long");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}

test("city search accepts unaccented names, handles no matches, selects with keyboard and resets on close", async ({
  page,
}) => {
  await page.goto("/jobs?sort=salary_desc");
  const trigger = page.getByRole("combobox", {
    name: "Địa điểm tìm nhanh",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const search = page.getByRole("textbox", {
    name: "Tìm tỉnh/thành phố",
    exact: true,
  });
  await expect(search).toBeFocused();
  await search.fill("da nang");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(
    page.getByRole("option", { name: "Đà Nẵng", exact: true }),
  ).toBeVisible();
  await search.fill("khongcothanhphonay");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(
    page.getByText("Không tìm thấy tỉnh/thành phố.", { exact: true }),
  ).toBeVisible();
  await search.fill("ho chi minh");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Hồ Chí Minh", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Hồ Chí Minh");
  await expect(trigger).toBeFocused();
  expect(new URL(page.url()).searchParams.has("city")).toBe(false);
  await trigger.click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("option")).toHaveCount(35);
  await expect(
    page.getByRole("option", { name: "Hồ Chí Minh", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Tìm việc nhanh", exact: true })
    .click();
  await expect(page).toHaveURL(/city=/);
  expect(new URL(page.url()).searchParams.get("city")).toBe("Hồ Chí Minh");
  expect(new URL(page.url()).searchParams.get("sort")).toBe("salary_desc");
  await expect(page.getByTestId("job-card").first()).toContainText(
    "TP. Hồ Chí Minh",
  );
});
