import { expect, test, type Page } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

async function loginAdmin(page: Page) {
  await page.goto("/login?returnTo=%2Fadmin");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

for (const role of ["employer", "admin"] as const) {
  test(`${role} mobile drawer and account menu close across browser history`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    if (role === "employer") await loginMock(page, role);
    else await loginAdmin(page);
    const root = role === "employer" ? "/employer" : "/admin";
    const prefix = role === "employer" ? "ep" : "ap";
    const destination = `${root}/jobs`;
    await page.locator(`.${prefix}-sidebar a[href="${destination}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await page.setViewportSize({ width: 360, height: 900 });
    const trigger = page.getByRole("button", {
      name:
        role === "employer"
          ? "Mở điều hướng nhà tuyển dụng"
          : "Mở điều hướng quản trị",
      exact: true,
    });
    const drawer = page.getByRole("dialog");
    await trigger.click();
    await expect(drawer).toBeVisible();
    await expect(page.locator("body")).toHaveAttribute("data-scroll-locked");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${root}$`));
    await expect(drawer).toBeHidden();
    await expect(page.locator("body")).not.toHaveAttribute(
      "data-scroll-locked",
    );
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(drawer).toBeHidden();
    await trigger.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveAttribute(
      "data-scroll-locked",
    );

    const account = page.getByRole("button", {
      name:
        role === "employer"
          ? "Tài khoản cá nhân"
          : "Xem tài khoản quản trị viên",
      exact: true,
    });
    await account.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${root}$`));
    await expect(page.getByRole("menu")).toBeHidden();
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.getByRole("menu")).toBeHidden();
    await account.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(account).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}
