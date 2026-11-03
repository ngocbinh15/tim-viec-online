import { test, expect } from "@playwright/test";

for (const width of [1101, 1280, 1440, 1920]) {
  for (const mode of ["keyword", "location"]) {
    test(`search right edge slides closed with the left edge anchored: ${mode} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/jobs");
      const form = page.getByRole("search", {
        name: "Tìm việc nhanh",
        exact: true,
      });
      const initial = (await form.boundingBox())!;
      await form
        .getByRole("combobox", {
          name:
            mode === "keyword"
              ? "Việc làm, công ty hoặc kỹ năng"
              : "Địa điểm tìm nhanh",
          exact: true,
        })
        .click();
      await expect
        .poll(async () => (await form.boundingBox())!.width)
        .toBeGreaterThan(initial.width + 200);
      // Wait for both expansion and panel entrance to finish.
      await form.evaluate(async (node) => {
        await Promise.all(
          node.getAnimations().map((animation) => animation.finished),
        );
      });
      const frames = await form.evaluate(async (node) => {
        const backdrop = node
          .closest(".site-header")!
          .querySelector(".header-search-backdrop")!;
        const opened = node.getBoundingClientRect();
        const start = performance.now();
        const samples = [
          { time: 0, x: opened.x, right: opened.right, width: opened.width },
        ];
        backdrop.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true }),
        );
        await new Promise<void>((resolve) => {
          const sample = () => {
            const box = node.getBoundingClientRect();
            samples.push({
              time: performance.now() - start,
              x: box.x,
              right: box.right,
              width: box.width,
            });
            if (performance.now() - start < 650) requestAnimationFrame(sample);
            else resolve();
          };
          requestAnimationFrame(sample);
        });
        return samples;
      });
      expect(
        Math.max(...frames.map((frame) => frame.x)) -
          Math.min(...frames.map((frame) => frame.x)),
      ).toBeLessThan(1);
      expect(Math.abs(frames.at(-1)!.x - initial.x)).toBeLessThan(1);
      expect(Math.abs(frames.at(-1)!.width - initial.width)).toBeLessThan(1);
      const distance = frames[0].width - initial.width;
      // The panel retracts first. A snapped resize can pass endpoint and
      // monotonicity checks, so also verify actual intermediate geometry.
      expect(
        frames
          .filter((frame) => frame.time < 80)
          .every((frame) => Math.abs(frame.width - frames[0].width) < 1),
      ).toBe(true);
      const intermediateWidths = new Set(
        frames
          .filter((frame) => {
            const progress = (frames[0].width - frame.width) / distance;
            return progress > 0.02 && progress < 0.98;
          })
          .map((frame) => Math.round(frame.width)),
      );
      expect(
        intermediateWidths.size,
        JSON.stringify(frames),
      ).toBeGreaterThanOrEqual(3);
      for (let index = 1; index < frames.length; index++)
        expect(frames[index].right).toBeLessThanOrEqual(
          frames[index - 1].right + 1,
        );
    });
  }
}

test("closing preserves button width until the panel retracts, then interpolates its size", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/jobs");
  const form = page.getByRole("search", {
    name: "Tìm việc nhanh",
    exact: true,
  });
  await form
    .getByRole("combobox", {
      name: "Việc làm, công ty hoặc kỹ năng",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      form
        .locator('button[type="submit"]')
        .evaluate((node) => Math.round(node.getBoundingClientRect().width)),
    )
    .toBe(100);
  const samples = await form.evaluate(async (node) => {
    const button = node.querySelector('button[type="submit"]')!;
    const input = node.querySelector('input[name="keyword"]')!;
    const start = performance.now();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    const frames: { time: number; width: number }[] = [];
    await new Promise<void>((resolve) => {
      const sample = () => {
        const time = performance.now() - start;
        frames.push({ time, width: button.getBoundingClientRect().width });
        if (time < 500) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return frames;
  });
  expect(
    samples
      .filter((frame) => frame.time < 80)
      .every((frame) => frame.width > 98),
  ).toBe(true);
  expect(samples.some((frame) => frame.width > 35 && frame.width < 90)).toBe(
    true,
  );
  expect(samples.at(-1)!.width).toBeLessThan(30);
});

for (const width of [360, 1440]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`navbar search expansion and location sequencing at ${width}px motion=${reducedMotion}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/jobs?category_ids=1&sort=salary_desc");
      const form = page.getByRole("search", {
        name: "Tìm việc nhanh",
        exact: true,
      });
      const input = form.getByLabel("Việc làm, công ty hoặc kỹ năng", {
        exact: true,
      });
      const location = form.getByRole("combobox", {
        name: "Địa điểm tìm nhanh",
        exact: true,
      });
      const originalWidth = (await form.boundingBox())!.width;
      const originalLocationX = (await location.boundingBox())!.x;
      await input.click();
      const panel = page.getByRole("dialog", {
        name: "Gợi ý tìm việc",
        exact: true,
      });
      await expect(panel).toBeVisible();
      await expect(input).toBeFocused();
      await expect(form).toHaveAttribute("data-mode", "keyword");
      await expect
        .poll(async () => (await form.boundingBox())!.width)
        .toBeGreaterThanOrEqual(originalWidth);
      if (width > 1100)
        await expect
          .poll(async () => (await form.boundingBox())!.width)
          .toBeGreaterThan(originalWidth + 200);
      await panel.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      const backdrop = page.locator(
        '.header-search-backdrop[data-active="true"]',
      );
      await expect(backdrop).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("keyword.png") });
      await location.click();
      const popup = page.getByRole("dialog", {
        name: "Địa điểm tìm nhanh",
        exact: true,
      });
      await expect(popup).toBeVisible();
      await expect(form).toHaveAttribute("data-mode", "location");
      await expect(panel).toHaveCount(0);
      await expect(backdrop).toHaveCSS("opacity", "1");
      await popup.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      const timing = await popup.evaluate((element) => ({
        name: getComputedStyle(element).animationName,
        delay: getComputedStyle(element).animationDelay,
      }));
      expect(timing.name).toBe("header-location-drop");
      expect(parseFloat(timing.delay)).toBe(
        reducedMotion === "reduce" ? 0 : 0.18,
      );
      const bounds = (await popup.boundingBox())!;
      const triggerBounds = (await location.boundingBox())!;
      expect(
        Math.abs(
          bounds.x + bounds.width - triggerBounds.x - triggerBounds.width,
        ),
      ).toBeLessThanOrEqual(width === 360 ? 24 : 2);
      expect(bounds.y).toBeGreaterThanOrEqual(
        triggerBounds.y + triggerBounds.height,
      );
      if (width > 1100)
        expect(triggerBounds.x).toBeGreaterThan(originalLocationX + 50);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath("location.png") });
      await page
        .getByRole("textbox", { name: "Tìm tỉnh/thành phố", exact: true })
        .fill("ha noi");
      await page.keyboard.press("Enter");
      await expect(location).toHaveText("Hà Nội");
      await expect(location).toBeFocused();
      await expect(form).toHaveAttribute("data-mode", "idle");
      const collapseDelay = await form.evaluate((element) =>
        parseFloat(getComputedStyle(element).transitionDelay),
      );
      expect(collapseDelay).toBe(reducedMotion === "reduce" ? 0 : 0.1);
      await input.fill("React");
      await form
        .getByRole("button", { name: "Tìm việc nhanh", exact: true })
        .click();
      await expect(page).toHaveURL(/keyword=React/);
      expect(new URL(page.url()).searchParams.get("city")).toBe("Hà Nội");
      expect(new URL(page.url()).searchParams.get("sort")).toBe("salary_desc");
      expect(new URL(page.url()).searchParams.getAll("category_ids")).toEqual([
        "1",
      ]);
      await expect(form).toHaveAttribute("data-mode", "idle");
      await input.click();
      await page.keyboard.press("Escape");
      await expect(form).toHaveAttribute("data-mode", "idle");
      await input.click();
      await expect(backdrop).toBeVisible();
      // Click page content, not the browser's vertical scrollbar (width - 4).
      await backdrop.click({ position: { x: 24, y: 800 } });
      await expect(form).toHaveAttribute("data-mode", "idle");
    });
  }
}

test("search suggestions navigate and browser back restores a closed search", async ({
  page,
}) => {
  await page.goto("/jobs");
  const input = page.getByLabel("Việc làm, công ty hoặc kỹ năng", {
    exact: true,
  });
  await input.click();
  const panel = page.getByRole("dialog", {
    name: "Gợi ý tìm việc",
    exact: true,
  });
  await page.keyboard.press("ArrowDown");
  await expect(
    panel.getByRole("link", { name: "ReactJS", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await expect(
    page.getByRole("search", { name: "Tìm việc nhanh", exact: true }),
  ).toHaveAttribute("data-mode", "idle");
  await page.keyboard.press("ArrowDown");
  await expect(
    panel.getByRole("link", { name: "ReactJS", exact: true }),
  ).toBeFocused();
  await panel
    .getByRole("region", { name: "Việc làm đang tuyển", exact: true })
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/jobs\/\d+$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(
    page.getByRole("search", { name: "Tìm việc nhanh", exact: true }),
  ).toHaveAttribute("data-mode", "idle");
  await expect(
    page.getByRole("dialog", { name: "Gợi ý tìm việc", exact: true }),
  ).toHaveCount(0);
});
