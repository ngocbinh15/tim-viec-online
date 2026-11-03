import { expect, test, type Locator, type Page } from "@playwright/test";

const surfaces = [
  ".site-header",
  ".page-intro",
  ".search-panel",
  ".results-layout",
  ".site-footer",
];

async function geometry(page: Page) {
  return page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const rect = Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        )
          .find((element) => element.checkVisibility())!
          .getBoundingClientRect();
        return { selector, left: rect.left, width: rect.width };
      }),
    surfaces,
  );
}

test("geometry ignores retained hidden result pages", async ({ page }) => {
  await page.goto("/jobs");
  await expect(
    page.locator(".results-layout").filter({ visible: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const hidden = document.createElement("div");
    hidden.style.display = "none";
    hidden.append(document.querySelector(".results-layout")!.cloneNode(true));
    document.body.prepend(hidden);
  });
  const result = (await geometry(page)).find(
    (item) => item.selector === ".results-layout",
  )!;
  expect(result.width).toBeGreaterThan(0);
  await verifyMenu(
    page,
    page.locator(".job-sort-trigger").filter({ visible: true }),
    true,
  );
});

async function verifyMenu(page: Page, trigger: Locator, modal: boolean) {
  // Bring the trigger into view before establishing the baseline on mobile.
  await trigger.scrollIntoViewIfNeeded();
  const baseline = await geometry(page);
  const samples = await trigger.evaluate(async (node, selectors) => {
    const samples: { selector: string; left: number; width: number }[][] = [];
    (node as HTMLElement).click();
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const sample = () => {
        samples.push(
          selectors.map((selector) => {
            const rect = Array.from(
              document.querySelectorAll<HTMLElement>(selector),
            )
              .find((element) => element.checkVisibility())!
              .getBoundingClientRect();
            return { selector, left: rect.left, width: rect.width };
          }),
        );
        if (performance.now() - start < 250) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return samples;
  }, surfaces);
  await expect(page.locator(".selection-menu:visible")).toHaveCount(1);
  if (modal)
    await expect(page.locator("body")).toHaveAttribute("data-scroll-locked");
  else
    await expect(page.locator("body")).not.toHaveAttribute(
      "data-scroll-locked",
    );
  samples.push(await geometry(page));
  for (const sample of samples) {
    for (let index = 0; index < sample.length; index++) {
      expect(
        Math.abs(sample[index].left - baseline[index].left),
        `${baseline[index].selector} left while opening`,
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(sample[index].width - baseline[index].width),
        `${baseline[index].selector} width while opening`,
      ).toBeLessThanOrEqual(1);
    }
  }
  await page.keyboard.press("Escape");
  const closingDrift = await page.evaluate(async (baseline) => {
    let maximum = 0;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const sample = () => {
        for (const before of baseline) {
          const rect = Array.from(
            document.querySelectorAll<HTMLElement>(before.selector),
          )
            .find((element) => element.checkVisibility())!
            .getBoundingClientRect();
          maximum = Math.max(
            maximum,
            Math.abs(rect.left - before.left),
            Math.abs(rect.width - before.width),
          );
        }
        if (performance.now() - start < 250) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return maximum;
  }, baseline);
  expect(closingDrift, "page geometry while closing").toBeLessThanOrEqual(1);
  await expect(page.locator(".selection-menu:visible")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
  const after = await geometry(page);
  for (let index = 0; index < after.length; index++) {
    expect(
      Math.abs(after[index].left - baseline[index].left),
      `${baseline[index].selector} left after closing`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(after[index].width - baseline[index].width),
      `${baseline[index].selector} width after closing`,
    ).toBeLessThanOrEqual(1);
  }
  await expect(trigger).toBeFocused();
}

for (const width of [360, 900, 901, 1440]) {
  for (const short of width > 900 ? [false, true] : [false]) {
    test(`filters preserve page geometry at ${width}px on ${short ? "short" : "scrolling"} pages`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: short ? 3000 : 900 });
      await page.goto(short ? "/jobs?keyword=khong-co-viec-xxxxxxxx" : "/jobs");
      await page.addStyleTag({
        content: "::-webkit-scrollbar { width: 17px; height: 17px; }",
      });
      await expect(
        page.locator(".results-layout").filter({ visible: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (width > 900) {
        await page.evaluate(() => {
          const root = document.documentElement;
          // Headless Chromium may hide native scrollbars while CSS still
          // reserves their gutter. Reproduce Windows' classic clientWidth
          // metric so Radix must exercise its nonzero gap compensation.
          if (root.clientWidth === innerWidth) {
            Object.defineProperty(root, "clientWidth", {
              configurable: true,
              get: () => Math.round(root.getBoundingClientRect().width),
            });
          }
        });
        // Ensure this actually exercises a classic scrollbar gutter, not an
        // overlay-only environment where the original bug cannot be seen.
        expect(
          await page.evaluate(
            () => innerWidth - document.documentElement.clientWidth,
          ),
        ).toBeGreaterThan(0);
      }
      if (short)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight,
          ),
        ).toBe(true);
      for (const label of ["Hình thức làm việc", "Mức lương", "Cấp bậc"]) {
        await verifyMenu(
          page,
          page.getByRole("combobox", { name: label, exact: true }),
          false,
        );
      }
      await verifyMenu(
        page,
        page.locator(".job-sort-trigger").filter({ visible: true }),
        true,
      );
      await verifyMenu(
        page,
        page.getByRole("button", { name: "Ngành nghề", exact: true }),
        false,
      );
      await verifyMenu(
        page,
        page.getByRole("combobox", { name: "Địa điểm tìm nhanh", exact: true }),
        false,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    });
  }
}
