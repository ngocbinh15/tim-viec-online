import { expect, test } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

for (const width of [390, 768, 1024, 1440]) {
  test(`account navigation retains its sidebar and dimensions at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await loginMock(page, "candidate", "/account/profile");
    const sidebar = page.locator(".cu-sidebar");
    await expect(sidebar).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await sidebar.evaluate((node) =>
      node.setAttribute("data-persistent-sidebar", "true"),
    );
    await page
      .locator(".site-header")
      .evaluate((node) => node.setAttribute("data-persistent-header", "true"));
    const initial = await sidebar.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      avatar: node.querySelector(".cu-avatar")!.getBoundingClientRect().width,
      card: node.querySelector(".cu-user-card")!.getBoundingClientRect().height,
    }));
    if (width > 900) expect(initial.width).toBe(265);
    for (const section of [
      "jobs",
      "messages",
      "notifications",
      "settings",
      "profile",
    ]) {
      const link = sidebar.locator(`a[href="/account/${section}"]`);
      const samples = await link.evaluate(async (node) => {
        const sidebar = document.querySelector(".cu-sidebar")!;
        const samples: {
          connected: boolean;
          width: number;
          opacity: string;
          footerTop: number;
          scrollY: number;
        }[] = [];
        const start = performance.now();
        (node as HTMLElement).click();
        await new Promise<void>((resolve) => {
          const sample = () => {
            samples.push({
              connected: sidebar.isConnected,
              width: sidebar.getBoundingClientRect().width,
              opacity: getComputedStyle(sidebar).opacity,
              scrollY: window.scrollY,
              footerTop: document
                .querySelector(".site-footer")!
                .getBoundingClientRect().top,
            });
            if (performance.now() - start < 500) requestAnimationFrame(sample);
            else resolve();
          };
          requestAnimationFrame(sample);
        });
        return samples;
      });
      await expect(page).toHaveURL(new RegExp(`/account/${section}$`));
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".cu-sidebar")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(sidebar).toHaveAttribute("data-persistent-sidebar", "true");
      await expect(page.locator(".site-header")).toHaveAttribute(
        "data-persistent-header",
        "true",
      );
      const dimensions = await sidebar.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        avatar: node.querySelector(".cu-avatar")!.getBoundingClientRect().width,
        card: node.querySelector(".cu-user-card")!.getBoundingClientRect()
          .height,
      }));
      expect(dimensions).toEqual(initial);
      expect(
        samples.every(
          (sample) =>
            sample.connected &&
            Math.abs(sample.width - initial.width) < 1 &&
            sample.opacity === "1",
        ),
      ).toBe(true);
      expect(
        samples.every((sample) => sample.footerTop >= 999),
        `${section}: footer ${Math.min(...samples.map((sample) => sample.footerTop))}, scroll ${Math.max(...samples.map((sample) => sample.scrollY))}`,
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      if (
        (width === 390 || width === 1440) &&
        (section === "messages" || section === "settings")
      )
        await page.screenshot({
          path: testInfo.outputPath(`${section}.png`),
          fullPage: true,
          animations: "disabled",
        });
    }
  });
}

for (const width of [390, 1024, 1440]) {
  test(`account menu preserves page geometry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await loginMock(page, "candidate", "/account/settings");
    await expect(page.locator(".cu-sidebar")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const geometry = () =>
      page.evaluate(() => ({
        header: document.querySelector(".site-header")!.getBoundingClientRect()
          .width,
        mainLeft: document.querySelector("main")!.getBoundingClientRect().left,
        mainWidth: document.querySelector("main")!.getBoundingClientRect()
          .width,
        viewport: document.documentElement.clientWidth,
        padding: getComputedStyle(document.body).paddingRight,
        margin: getComputedStyle(document.body).marginRight,
        scroll: scrollY,
      }));
    const before = await geometry();
    await page
      .getByRole("button", { name: "Tài khoản cá nhân", exact: true })
      .click();
    await expect(page.getByRole("menu")).toBeVisible();
    expect(await geometry()).toEqual(before);
    await expect(page.locator("body")).not.toHaveAttribute(
      "data-scroll-locked",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    expect(await geometry()).toEqual(before);
  });
}
