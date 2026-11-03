import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { latestRegistrationDob } from "../../src/features/auth/validation";

test("custom birthday calendar selects month/year and submits an ISO date", async ({
  page,
}) => {
  await page.goto("/register?role=employer");
  await expect(page.locator(".auth-story")).toHaveCount(0);
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  const trigger = page.getByRole("button", {
    name: "Chọn ngày sinh",
    exact: true,
  });
  await trigger.click();
  await expect(
    page.getByRole("combobox", { name: "Chọn năm sinh" }),
  ).toBeInViewport();
  await page.getByRole("combobox", { name: "Chọn năm sinh" }).click();
  await page.getByRole("option", { name: "2000", exact: true }).click();
  await page.getByRole("combobox", { name: "Chọn tháng sinh" }).click();
  await page.getByRole("option", { name: "Tháng 5", exact: true }).click();
  await page.locator('.birth-calendar button[data-day="20/5/2000"]').click();
  await expect(page.getByLabel("Ngày sinh", { exact: true })).toHaveValue(
    "20/05/2000",
  );
  await expect(page.locator('input[name="dob"]')).toHaveValue("2000-05-20");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    page.getByRole("combobox", { name: "Chọn năm sinh" }),
  ).toContainText("2000");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator(".birth-calendar")).not.toBeVisible();
});

test("invalid birthday edits replace the previous date and receive validation focus", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Minh Anh");
  await page.getByLabel("Email", { exact: true }).fill("preview@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("PreviewPass1!");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("PreviewPass1!");
  const birthday = page.getByLabel("Ngày sinh", { exact: true });
  await birthday.fill("20052000");
  await expect(birthday).toHaveValue("20/05/2000");
  await birthday.fill("29/02/2000");
  await expect(page.locator('input[name="dob"]')).toHaveValue("2000-02-29");
  await birthday.fill("31/04/2000");
  await expect(page.locator('input[name="dob"]')).toHaveValue("31/04/2000");
  // Model browsers that blur without focusing the button (null relatedTarget).
  await page.locator('.auth-form button[type="submit"]').evaluate((button) => {
    button.addEventListener(
      "pointerdown",
      () => {
        (document.activeElement as HTMLElement)?.blur();
      },
      { once: true },
    );
  });
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(birthday).toBeFocused();
  await expect(birthday).toHaveAttribute("aria-invalid", "true");
});

test("birthday calendar enforces age cutoff and stays accessible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/register");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const cutoff = latestRegistrationDob(today);
  const [year, month, day] = cutoff.split("-").map(Number);
  await page
    .getByRole("button", { name: "Chọn ngày sinh", exact: true })
    .click();
  const calendar = page.locator(".birth-calendar");
  const box = await calendar.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  const lastAllowed = calendar.locator(
    `button[data-day="${day}/${month}/${year}"]`,
  );
  await expect(lastAllowed).toBeEnabled();
  if (day < new Date(year, month, 0).getDate()) {
    await expect(
      calendar.locator(`button[data-day="${day + 1}/${month}/${year}"]`),
    ).toBeDisabled();
  }
  await expect(
    page.getByRole("button", { name: "Tháng sau", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("combobox", { name: "Chọn năm sinh" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await lastAllowed.click();
  await expect(page.locator('input[name="dob"]')).toHaveValue(cutoff);
});

test("preview validates registration, preserves fields and sends no credentials", async ({
  page,
  context,
}) => {
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") submissions.push(request.url());
  });
  await page.goto("/register");
  await page.getByRole("radio", { name: /Nhà tuyển dụng/ }).check();
  await expect(page.locator(".auth-preview")).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: /Nhà tuyển dụng/ }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByLabel("Họ và tên người liên hệ", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Họ và tên người liên hệ", { exact: true })
    .fill("Nguyễn Minh Anh");
  await page.getByLabel("Email", { exact: true }).fill("preview@example.test");
  await page.getByLabel(/^Ngày sinh/).fill("20/05/2000");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("PreviewPass1!");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("DifferentPass2!");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByText("Mật khẩu xác nhận chưa khớp.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("PreviewPass1!");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByText("Hiện chưa thể thực hiện yêu cầu. Vui lòng thử lại sau.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "preview@example.test",
  );
  expect(submissions).toEqual([]);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "timviec_session",
    ),
  ).toBe(false);
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage).not.toMatch(/PreviewPass1!|preview@example.test/);
});

test("invalid mock login supports password visibility without establishing a session", async ({
  page,
  context,
}) => {
  await page.goto("/login?returnTo=%2Fjobs%2F1");
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await page.getByLabel("Email", { exact: true }).fill("preview@example.test");
  await password.fill("Legacy");
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText(/Email hoặc mật khẩu không chính xác/),
  ).toBeVisible();
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "timviec_session",
    ),
  ).toBe(false);
  await page
    .getByRole("link", { name: "Quay lại xem việc làm", exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs\/1$/);
});

test("malformed reset links can request a fresh link", async ({ page }) => {
  for (const suffix of ["", "?email=invalid&token=x"]) {
    await page.goto(`/reset-password${suffix}`);
    await expect(page.locator(".auth-status[role='alert']")).toContainText(
      "Liên kết xác thực đã hết hạn hoặc không hợp lệ",
    );
    await expect(
      page.getByRole("link", { name: "Yêu cầu liên kết mới" }),
    ).toBeVisible();
    await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toHaveCount(
      0,
    );
  }
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`auth preview responsive at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password?email=preview%40example.test&token=sample-token",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator(".auth-form")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      if (width === 1440 || width === 360) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: testInfo.outputPath(`${path.split("?")[0].slice(1)}.png`),
          fullPage: true,
        });
      }
    }
    if (width === 360) {
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  });
}
