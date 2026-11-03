import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("real employer AI mapping renders results, supports score filters and only retries on an explicit click", async ({
  page,
  request,
  context,
}) => {
  await page.goto("/login?role=employer");
  await page.getByLabel(/^Email/).fill("employer@example.test");
  await page.getByLabel(/^Mật khẩu$/, { exact: true }).fill("SafeFixture1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/employer$/);
  await expect(
    page.getByText("CV phù hợp từ 80%", { exact: true }),
  ).toBeVisible();
  await page.goto("/employer/candidates?match_score=80&sort=score");
  await expect(page.locator(".ec-candidate")).toHaveCount(1);
  await expect(page.locator(".ec-candidate")).toContainText("Ứng viên AI 1");
  await page.goto("/employer/candidates/1");
  const panel = page.getByRole("region", { name: "Đánh giá độ phù hợp" });
  await expect(panel.getByRole("meter")).toHaveAttribute("aria-valuenow", "84");
  await expect(panel).toContainText("Kỹ năng (40%)");
  await expect(panel).toContainText("Không ghi nhận kỹ năng còn thiếu");
  await expect(panel.getByText("Phân tích AI minh họa")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/ai-employer-desktop.png",
    fullPage: true,
  });
  await page.goto("/employer/candidates/2");
  await expect(
    panel.getByRole("button", { name: "Thử phân tích lại", exact: true }),
  ).toBeVisible();
  const before =
    (await (await request.get("http://127.0.0.1:4123/__test__/stats")).json())
      .data.requests["/api/applications/2/ai-analyze"] ?? 0;
  expect(before).toBe(0);
  expect(await panel.textContent()).not.toContain(
    "private provider credentials",
  );
  await panel
    .getByRole("button", { name: "Thử phân tích lại", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    /chờ phân tích|Đang phân tích/,
  );
  await expect(panel.getByRole("meter")).toHaveAttribute(
    "aria-valuenow",
    "84",
    { timeout: 10_000 },
  );
  expect(
    (await (await request.get("http://127.0.0.1:4123/__test__/stats")).json())
      .data.requests["/api/applications/2/ai-analyze"],
  ).toBe(1);
  await page.goto("/employer/candidates/3");
  await expect(panel).toContainText("Chưa có tệp CV để phân tích");
  await expect(
    panel.getByRole("button", { name: "Phân tích CV", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 360, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".ec-ai-panel")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await context.clearCookies();
  const denied = await request.get(
    "http://localhost:3123/api/backend/applications/1/ai-analysis",
  );
  expect(denied.status()).toBe(401);
});

test("candidate cannot read or trigger private AI assessments through the proxy", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill("candidate@example.test");
  await page.getByLabel(/^Mật khẩu$/, { exact: true }).fill("SafeFixture1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  expect(
    (
      await page.request.get("/api/backend/applications/1/ai-analysis")
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/backend/applications/1/ai-analyze", {
        headers: { Origin: "http://localhost:3123" },
      })
    ).status(),
  ).toBe(403);
});

test("stalled analysis stays read-only until the employer explicitly retries", async ({
  page,
  request,
}) => {
  await page.goto("/login?role=employer&returnTo=%2Femployer%2Fcandidates%2F4");
  await page.getByLabel(/^Email/).fill("employer@example.test");
  await page.getByLabel(/^Mật khẩu$/, { exact: true }).fill("SafeFixture1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/candidates\/4$/);
  const panel = page.getByRole("region", { name: "Đánh giá độ phù hợp" });
  await expect(panel).toContainText("Phân tích chưa hoàn tất");
  const retry = panel.getByRole("button", {
    name: "Thử phân tích lại",
    exact: true,
  });
  await expect(retry).toBeVisible();
  expect(
    (await (await request.get("http://127.0.0.1:4123/__test__/stats")).json())
      .data.requests["/api/applications/4/ai-analyze"] ?? 0,
  ).toBe(0);
  await retry.click();
  await expect(panel.getByRole("meter")).toHaveAttribute(
    "aria-valuenow",
    "84",
    { timeout: 10000 },
  );
  expect(
    (await (await request.get("http://127.0.0.1:4123/__test__/stats")).json())
      .data.requests["/api/applications/4/ai-analyze"],
  ).toBe(1);
});

test("admin discovers applications from a job and reads the shared AI assessment", async ({
  page,
}) => {
  await page.goto("/login?returnTo=%2Fadmin%2Fjobs%2F1");
  await page.getByLabel(/^Email/).fill("admin@example.test");
  await page.getByLabel(/^Mật khẩu$/, { exact: true }).fill("SafeFixture1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/jobs\/1$/);
  const list = page.getByRole("region", { name: "Hồ sơ ứng tuyển theo tin" });
  await expect(
    list.getByRole("link", { name: "Ứng viên AI 1 · Hồ sơ #1", exact: true }),
  ).toBeVisible();
  await list
    .getByRole("link", { name: "Ứng viên AI 1 · Hồ sơ #1", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/applications\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hồ sơ Ứng viên AI 1",
  );
  const panel = page.getByRole("region", { name: "Đánh giá độ phù hợp" });
  await expect(panel.getByRole("meter")).toHaveAttribute("aria-valuenow", "84");
  await expect(
    page.getByRole("link", { name: "Xem CV ứng tuyển (PDF)", exact: true }),
  ).toHaveAttribute("href", "/api/backend/applications/1/cv");
  await page.setViewportSize({ width: 360, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".ap-ai-detail")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/ai-admin-mobile.png",
    fullPage: true,
  });
});
