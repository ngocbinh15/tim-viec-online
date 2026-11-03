import { expect, type Page } from "@playwright/test";

/** Wait for real workspace content, rather than headings in session fallbacks. */
export async function waitForSettledWorkspace(page: Page) {
  await expect(
    page
      .locator(
        [
          ".cu-profile-header h1",
          ".cu-title h1",
          ".ep-page-heading h1",
          ".ea-identity h1",
          ".ap-page-heading h1",
        ].join(", "),
      )
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("main").evaluate(async (element) => {
    await document.fonts.ready;
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}
