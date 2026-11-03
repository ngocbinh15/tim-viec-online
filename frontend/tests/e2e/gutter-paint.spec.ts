import { expect, test } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

test("locked menus retain desktop spacing after resizing from mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("/");
  await page.addStyleTag({
    content: "::-webkit-scrollbar {width:17px;height:17px}",
  });
  await page
    .getByRole("button", { name: "Trung tâm thông báo", exact: true })
    .first()
    .click();
  await expect(page.locator("body")).toHaveAttribute("data-scroll-locked");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("body")).toHaveAttribute("data-scroll-locked");
  await expect
    .poll(() =>
      page
        .locator(".site-header")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBe(1423);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  await expect
    .poll(() =>
      page
        .locator(".site-header")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBe(1423);
});

for (const width of [901, 1440]) {
  for (const area of ["jobs", "account", "employer", "home"] as const) {
    test(`locked ${area} backgrounds reach the viewport edge at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 1000 });
      if (area === "account")
        await loginMock(page, "candidate", "/account/jobs");
      else if (area === "employer")
        await loginMock(page, "employer", "/employer/candidates");
      else await page.goto(area === "home" ? "/" : "/jobs");
      await page.addStyleTag({
        content: "::-webkit-scrollbar {width:17px;height:17px}",
      });
      await page.evaluate(() => document.fonts.ready);
      if (area === "jobs") await page.locator(".job-sort-trigger").click();
      else if (area === "account")
        await page
          .getByRole("combobox", { name: "Trạng thái ứng tuyển", exact: true })
          .click();
      else if (area === "employer")
        await page
          .getByRole("combobox", {
            name: "Lọc theo tin tuyển dụng",
            exact: true,
          })
          .click();
      else
        await page
          .getByRole("button", { name: "Trung tâm thông báo", exact: true })
          .first()
          .click();
      await expect(page.locator("body")).toHaveAttribute("data-scroll-locked");
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      // Cover the entire exposed gutter, not just a single background pixel.
      const probes = await page.evaluate((area) => {
        const selectors =
          area === "employer"
            ? [".ep-header"]
            : area === "home"
              ? [".site-header", ".home-hero", ".site-footer"]
              : area === "account"
                ? [".site-header"]
                : [".site-header", ".page-intro"];
        return selectors.flatMap((selector) => {
          const rect = document
            .querySelector(selector)!
            .getBoundingClientRect();
          return [15, 20, 25].map((offset) => ({
            selector,
            inside: Math.floor(rect.right) - 3,
            y: Math.round(rect.top + scrollY + offset),
          }));
        });
      }, area);
      expect(
        await page.evaluate(() =>
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--page-scrollbar-gap",
            ),
          ),
        ),
      ).toBeGreaterThan(0);
      const screenshot = await page.screenshot({
        path: testInfo.outputPath("edge.png"),
        // Select closes on viewport resize; use the fixed sheet on home to
        // also inspect the footer in a full-page capture.
        fullPage: area === "home",
        animations: "disabled",
        scale: "css",
      });
      await expect(page.locator("body")).toHaveAttribute("data-scroll-locked");
      const differences = await page.evaluate(
        async ({ base64, probes, width }) => {
          const image = new Image();
          image.src = "data:image/png;base64," + base64;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          return probes.map((probe) => {
            const reference = context.getImageData(
              probe.inside,
              probe.y,
              1,
              1,
            ).data;
            let difference = 0;
            for (let x = probe.inside + 4; x < width - 1; x++) {
              const pixel = context.getImageData(x, probe.y, 1, 1).data;
              for (let channel = 0; channel < 3; channel++)
                difference = Math.max(
                  difference,
                  Math.abs(pixel[channel] - reference[channel]),
                );
            }
            return { selector: probe.selector, y: probe.y, difference };
          });
        },
        { base64: screenshot.toString("base64"), probes, width },
      );
      for (const probe of differences)
        expect(
          probe.difference,
          `${probe.selector} at ${probe.y}px`,
        ).toBeLessThanOrEqual(3);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.keyboard.press("Escape");
      await expect(page.locator("body")).not.toHaveAttribute(
        "data-scroll-locked",
      );
    });
  }
}
