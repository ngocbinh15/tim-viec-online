import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixture = "http://127.0.0.1:4119";
async function stats(request: APIRequestContext) {
  return (await (await request.get(`${fixture}/__test__/stats`)).json())
    .data as {
    requests: Record<string, number>;
    waiting: string[];
  };
}
async function hold(request: APIRequestContext, paths: string[]) {
  await request.post(`${fixture}/__test__/hold`, { data: { paths } });
}
async function login(page: Page) {
  await page.goto("/login?returnTo=%2Fadmin");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("AdminTest1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".ap-profile")).toBeVisible();
}
test.afterEach(async ({ request }) => {
  await hold(request, []);
});

test("admin navigation reuses bootstrap and details keep their full content", async ({
  page,
  request,
}) => {
  await login(page);
  const before = (await stats(request)).requests["/api/workspace/bootstrap"];
  await page
    .locator(".ap-header")
    .evaluate((header) => header.setAttribute("data-persisted", "yes"));
  for (const [name, path] of [
    ["Tài khoản người dùng", "/admin/users"],
    ["Ngành nghề", "/admin/categories"],
    ["Kỹ năng", "/admin/skills"],
    ["Kiểm duyệt tin", "/admin/jobs"],
  ]) {
    await page
      .locator(".ap-sidebar")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect((await stats(request)).requests["/api/workspace/bootstrap"]).toBe(
    before,
  );
  await expect(page.locator('.ap-header[data-persisted="yes"]')).toBeVisible();
  await page.getByRole("button", { name: /^Tất cả tin/ }).click();
  await hold(request, ["/api/admin/jobs/1"]);
  try {
    await page
      .getByRole("link", {
        name: "Kiểm tra tin Auth contract job",
        exact: true,
      })
      .click();
    await expect(
      page.locator('.ap-main [data-admin-loading="detail"]'),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/admin-detail-loading.png",
      animations: "disabled",
    });
  } finally {
    await hold(request, []);
  }
  await expect(
    page.getByText("Contract job description", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Contract requirements", { exact: true }),
  ).toBeVisible();
  expect((await stats(request)).requests["/api/workspace/bootstrap"]).toBe(
    before,
  );
});

for (const width of [360, 1440]) {
  test(`initial admin skeleton retains workspace shape at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await hold(request, ["/api/workspace/bootstrap"]);
    const signedIn = login(page);
    try {
      await expect
        .poll(async () => (await stats(request)).waiting)
        .toContain("/api/workspace/bootstrap");
      await expect(
        page.getByRole("status", {
          name: "Đang tải dữ liệu quản trị",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator(".admin-page .ap-header")).toBeVisible();
      await expect(page.getByRole("main")).toHaveCount(1);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `test-results/admin-initial-loading-${width}.png`,
        animations: "disabled",
      });
    } finally {
      await hold(request, []);
    }
    await signedIn;
  });
}

test("section skeleton appears during delayed navigation and revoked sessions still leave admin", async ({
  page,
  request,
}) => {
  await login(page);
  for (const [name, section] of [
    ["Tài khoản người dùng", "users"],
    ["Ngành nghề", "categories"],
    ["Kiểm duyệt tin", "jobs"],
  ]) {
    await hold(request, ["/api/user"]);
    try {
      await page
        .locator(".ap-sidebar")
        .getByRole("link", { name, exact: true })
        .click();
      await expect(
        page.locator(`.ap-main [data-admin-loading="${section}"]`),
      ).toBeVisible();
      await expect(page.locator(".ap-header")).toBeVisible();
    } finally {
      await hold(request, []);
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await request.post(`${fixture}/api/logout`, {
    headers: { Authorization: "Bearer test-admin-token" },
    data: {},
  });
  await page
    .locator(".ap-sidebar")
    .getByRole("link", { name: "Kỹ năng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fskills$/);
});
