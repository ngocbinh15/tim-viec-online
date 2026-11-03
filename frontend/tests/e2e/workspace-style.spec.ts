import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";
import { waitForSettledWorkspace } from "./helpers/workspace-ready";

async function appearance(locator: Locator, properties: string[]) {
  return locator.first().evaluate((element, keys) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      keys.map((key) => [key, style.getPropertyValue(key)]),
    );
  }, properties);
}

async function accountMenu(
  page: Page,
  triggerName = "Tài khoản cá nhân",
  screenshotPath?: string,
) {
  const trigger = page.getByRole("button", { name: triggerName, exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await waitForSettledWorkspace(page);
  const before = await page.getByRole("main").boundingBox();
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  expect(await page.getByRole("main").boundingBox()).toEqual(before);
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await menu.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  const styles = {
    panel: await appearance(menu, [
      "width",
      "padding",
      "border-radius",
      "border",
      "box-shadow",
      "font-family",
    ]),
    name: await appearance(menu.locator("strong"), [
      "font-size",
      "font-weight",
      "padding",
    ]),
    email: await appearance(menu.locator(".header-account-info > span"), [
      "font-size",
      "color",
      "overflow-wrap",
    ]),
    item: await appearance(menu.getByRole("menuitem"), [
      "font-size",
      "font-weight",
      "padding",
      "gap",
    ]),
  };
  if (screenshotPath) await menu.screenshot({ path: screenshotPath });
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  return styles;
}

async function logout(page: Page, triggerName = "Tài khoản cá nhân") {
  await page.getByRole("button", { name: triggerName, exact: true }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
}

for (const width of [390, 1440]) {
  test(`admin pages and role account menus follow the product style at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await loginMock(page, "candidate", "/account/profile");
    const candidateMenu = await accountMenu(
      page,
      undefined,
      width === 1440 ? testInfo.outputPath("candidate-menu.png") : undefined,
    );
    await logout(page);
    await loginMock(page, "employer", "/employer");
    expect(
      await accountMenu(
        page,
        undefined,
        width === 1440 ? testInfo.outputPath("employer-menu.png") : undefined,
      ),
    ).toEqual(candidateMenu);

    const typography = ["font-family", "font-size", "font-weight", "color"];
    const panel = [
      "border-color",
      "border-width",
      "border-style",
      "border-radius",
      "background-color",
      "box-shadow",
    ];
    const reference = {
      heading: await appearance(
        page.locator(".ep-page-heading h1"),
        typography,
      ),
      panel: await appearance(page.locator(".ep-panel"), panel),
      label: await appearance(page.locator(".ep-metric-top"), typography),
      value: await appearance(page.locator(".ep-metric strong"), typography),
      note: await appearance(page.locator(".ep-metric small"), typography),
      table: await appearance(
        page.locator(".ep-job-table th"),
        typography.concat("background-color", "border-color"),
      ),
      title: await appearance(page.locator(".ep-job-title"), typography),
      badge: await appearance(
        page.locator(".ep-badge-active"),
        typography.concat("background-color", "border-radius"),
      ),
    };
    if (width === 1440)
      await page.screenshot({ path: testInfo.outputPath("employer.png") });
    await page.goto("/employer/jobs");
    const statusColors = {
      closed: await appearance(page.locator(".ep-badge-closed"), [
        "color",
        "background-color",
      ]),
      expired: await appearance(page.locator(".ep-badge-expired"), [
        "color",
        "background-color",
      ]),
    };
    await logout(page);

    await page.goto("/login?returnTo=%2Fadmin");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    const adminTrigger = "Xem tài khoản quản trị viên";
    expect(
      await accountMenu(
        page,
        adminTrigger,
        width === 1440 ? testInfo.outputPath("admin-menu.png") : undefined,
      ),
    ).toEqual(candidateMenu);

    for (const route of [
      "/admin",
      "/admin/jobs",
      "/admin/users",
      "/admin/categories",
      "/admin/skills",
      "/admin/jobs/1",
      "/admin/jobs/4",
      "/admin/jobs/7",
    ]) {
      await page.goto(route);
      await waitForSettledWorkspace(page);
      expect(
        await appearance(page.locator(".ap-page-heading h1"), typography),
      ).toEqual(reference.heading);
      expect(await appearance(page.locator(".ap-panel"), panel)).toEqual(
        reference.panel,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (route === "/admin") {
        expect(
          await appearance(page.locator(".ap-metric-top"), typography),
        ).toEqual(reference.label);
        expect(
          await appearance(page.locator(".ap-metric strong"), typography),
        ).toEqual(reference.value);
        expect(
          await appearance(page.locator(".ap-metric small"), typography),
        ).toEqual(reference.note);
      }
      if (width === 1440 && route === "/admin/jobs") {
        expect(
          await appearance(
            page.locator(".ap-table th"),
            typography.concat("background-color", "border-color"),
          ),
        ).toEqual(reference.table);
        expect(
          await appearance(page.locator(".ap-cell-title"), typography),
        ).toEqual(reference.title);
        expect(
          await appearance(
            page.locator(".ap-badge-active"),
            typography.concat("background-color", "border-radius"),
          ),
        ).toEqual(reference.badge);
      }
      if (route === "/admin/jobs/4") {
        expect(
          await appearance(page.locator(".ap-badge-closed"), [
            "color",
            "background-color",
          ]),
        ).toEqual(statusColors.closed);
      }
      if (route === "/admin/jobs/7") {
        expect(
          await appearance(page.locator(".ap-badge-expired"), [
            "color",
            "background-color",
          ]),
        ).toEqual(statusColors.expired);
      }
      if (width === 1440)
        await page.screenshot({
          path: testInfo.outputPath(`${route.replaceAll("/", "-")}.png`),
        });
    }
    await page.goto("/admin/categories");
    const create = page.getByRole("button", {
      name: "Thêm ngành nghề",
      exact: true,
    });
    await create.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(create).toBeFocused();
    await logout(page, adminTrigger);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?/);
  });
}
