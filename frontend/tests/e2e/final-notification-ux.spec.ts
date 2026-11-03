import { expect, test } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

for (const role of ["candidate", "employer"] as const) {
  const path =
    role === "candidate" ? "/account/notifications" : "/employer/notifications";
  const headingName =
    role === "candidate" ? "Ứng tuyển & tin nhắn" : "Thông báo của bạn";

  test(`${role}: reading notifications keeps keyboard focus in all and unread views`, async ({
    page,
  }) => {
    await loginMock(page, role, `${path}?read=all`);
    const actions = page.getByRole("button", {
      name: "Đánh dấu đã đọc",
      exact: true,
    });
    await expect(actions.first()).toBeVisible();
    const initialCount = await actions.count();
    expect(initialCount).toBeGreaterThan(1);
    await actions.first().focus();
    await page.keyboard.press("Enter");
    await expect(actions).toHaveCount(initialCount - 1);
    await expect(actions.first()).toBeFocused();
    await expect(page).toHaveURL(`${path}?read=all`);

    await page.getByRole("link", { name: /^Chưa đọc/ }).click();
    await expect(page).toHaveURL(`${path}?read=unread`);
    for (let remaining = initialCount - 1; remaining > 0; remaining--) {
      await actions.first().focus();
      await page.keyboard.press("Enter");
      await expect(actions).toHaveCount(remaining - 1);
      if (remaining > 1) await expect(actions.first()).toBeFocused();
    }
    await expect(
      page.getByRole("heading", { name: headingName, exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("heading", {
        name: "Không có thông báo trong mục này",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(`${path}?read=unread`);
  });

  test(`${role}: mark all read hands focus to the notification heading`, async ({
    page,
  }) => {
    await loginMock(page, role, `${path}?read=unread`);
    const markAll = page.getByRole("button", {
      name: "Đánh dấu tất cả đã đọc",
      exact: true,
    });
    await expect(markAll).toBeEnabled();
    await markAll.focus();
    await page.keyboard.press("Enter");
    await expect(markAll).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: headingName, exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(`${path}?read=unread`);
  });

  test(`${role}: unread notification links still navigate after marking read`, async ({
    page,
  }) => {
    await loginMock(page, role, `${path}?read=unread`);
    const link = page
      .locator("article[data-unread=true]")
      .first()
      .getByRole("link")
      .first();
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(href!);
  });
}
