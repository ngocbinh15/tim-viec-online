import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginMock } from "./helpers/mock-auth";

for (const width of [360, 1440]) {
  for (const role of ["guest", "candidate", "employer"] as const) {
    test(`${role} missing pages have a branded recovery path and one main at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      if (role !== "guest") await loginMock(page, role);
      const path =
        role === "guest"
          ? "/missing-page-audit"
          : role === "candidate"
            ? "/account/missing-page-audit"
            : "/employer/candidates/999999";
      const response = await page.goto(path);
      if (role === "guest") expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "404", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.locator("header:visible")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath("recovery.png") });
      const label =
        role === "guest"
          ? "Khám phá việc làm"
          : role === "candidate"
            ? "Về hồ sơ của bạn"
            : "Về tin tuyển dụng";
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(
          (role === "guest"
            ? "/jobs"
            : role === "candidate"
              ? "/account/profile"
              : "/employer/jobs") + "$",
        ),
      );
      await expect(page.getByRole("main")).toHaveCount(1);
    });
  }
}
