import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginMock, logoutMock } from "./helpers/mock-auth";

const pdf = {
  name: "cv-ung-tuyen.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n%%EOF"),
};

async function jobNine(page: Page) {
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Tất cả việc làm", exact: true })
    .click();
  await page.getByRole("link", { name: "Trang 2", exact: true }).click();
  await page.locator('[data-testid="job-card"] h2 a[href="/jobs/9"]').click();
  await expect(page).toHaveURL(/\/jobs\/9$/);
}

test("application validates a PDF, submits once and preserves its CV and letter in history", async ({
  page,
}) => {
  await loginMock(page, "candidate", "/jobs/9");
  await page
    .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Nộp hồ sơ ứng tuyển",
    exact: true,
  });
  await expect(
    modal.getByRole("radio", { name: /CV trong hồ sơ/ }),
  ).toBeDisabled();
  await modal.getByRole("button", { name: "Xác nhận ứng tuyển" }).click();
  await expect(modal.getByRole("alert")).toHaveText(
    "Vui lòng chọn CV PDF để ứng tuyển.",
  );
  await modal
    .getByLabel("Chọn CV PDF", { exact: true })
    .setInputFiles({ ...pdf, buffer: Buffer.from("fake PDF") });
  await expect(modal.getByRole("alert")).toHaveText(
    "Tệp không có định dạng PDF hợp lệ.",
  );
  await modal.getByLabel("Chọn CV PDF", { exact: true }).setInputFiles(pdf);
  await expect(modal.getByText(/Đã chọn: cv-ung-tuyen/)).toBeVisible();
  await modal
    .getByLabel(/Thư giới thiệu/)
    .fill("Tôi có kinh nghiệm phù hợp với vị trí này.");
  await page.evaluate(() => {
    const original = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = function () {
      const read = original.bind(this);
      return new Promise<ArrayBuffer>((resolve, reject) => {
        (window as unknown as { releaseCvRead: () => void }).releaseCvRead =
          () => {
            Blob.prototype.arrayBuffer = original;
            read().then(resolve, reject);
          };
      });
    };
  });
  await modal.getByRole("button", { name: "Xác nhận ứng tuyển" }).click();
  await expect(
    modal.getByRole("button", { name: "Đóng", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
  await modal
    .getByRole("form")
    .evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await page.evaluate(() =>
    (window as unknown as { releaseCvRead: () => void }).releaseCvRead(),
  );
  await expect(modal).toHaveCount(0);
  const historyLink = page.getByRole("link", {
    name: "Đã ứng tuyển",
    exact: true,
  });
  await expect(historyLink).toBeFocused();
  await historyLink.click();
  await expect(
    page.getByRole("heading", { name: "10 hồ sơ ứng tuyển", exact: true }),
  ).toBeVisible();
  const first = page.locator(".cu-job").first();
  await expect(first).toContainText("Đã ứng tuyển");
  await first
    .getByRole("button", { name: "Hồ sơ đã nộp", exact: true })
    .click();
  const snapshot = page.getByRole("dialog", {
    name: "Hồ sơ đã nộp",
    exact: true,
  });
  await expect(snapshot).toContainText("cv-ung-tuyen.pdf");
  await expect(snapshot).toContainText(
    "Tôi có kinh nghiệm phù hợp với vị trí này.",
  );
  await expect(
    snapshot.getByRole("link", { name: "Tải CV đã nộp" }),
  ).toHaveAttribute("href", /^blob:/);
  const preview = snapshot.getByRole("button", {
    name: "Xem CV đã nộp",
    exact: true,
  });
  await preview.click();
  await expect(snapshot.locator("iframe")).toHaveAttribute("src", /^blob:/);
  await expect(snapshot.locator("iframe")).toHaveAttribute(
    "title",
    "CV đã nộp",
  );
  await snapshot
    .getByRole("button", { name: "Ẩn xem trước CV", exact: true })
    .click();
  await expect(snapshot.locator("iframe")).toHaveCount(0);
  await expect(first.locator(".cu-status")).toHaveText("Đã ứng tuyển");
  await page.keyboard.press("Escape");
  await expect(snapshot).toBeHidden();
  await first
    .getByRole("button", { name: "Hồ sơ đã nộp", exact: true })
    .click();
  await expect(snapshot.locator("iframe")).toHaveCount(0);
  await expect
    .poll(async () => {
      const href = await snapshot
        .getByRole("link", { name: "Tải CV đã nộp" })
        .getAttribute("href");
      if (!href) return false;
      return page.evaluate(async (url) => {
        try {
          return (await (await fetch(url)).text()).startsWith("%PDF-");
        } catch {
          return false;
        }
      }, href);
    })
    .toBe(true);
  await page
    .locator(".site-header .brand:visible")
    .evaluate((link) => (link as HTMLElement).click());
  await expect(page).toHaveURL(/\/$/);
  await expect(snapshot).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/account\/jobs\?tab=applied$/);
  await expect(snapshot).toHaveCount(0);
  await first.getByRole("heading").getByRole("link").click();
  await expect(historyLink).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ứng tuyển ngay", exact: true }),
  ).toHaveCount(0);
  await logoutMock(page);
  await loginMock(page, "candidate", "/jobs/9");
  await expect(
    page.getByRole("button", { name: "Ứng tuyển ngay", exact: true }),
  ).toBeVisible();
});

test("profile CV survives public navigation; job-specific CV does not replace it", async ({
  page,
}) => {
  await loginMock(page, "candidate", "/account/profile");
  await page
    .getByLabel("Chọn CV PDF", { exact: true })
    .setInputFiles({ ...pdf, name: "cv-mac-dinh.pdf" });
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toHaveAttribute("href", /^blob:/);
  await jobNine(page);
  await page
    .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Nộp hồ sơ ứng tuyển",
    exact: true,
  });
  await expect(
    modal.getByRole("radio", { name: /CV trong hồ sơ/ }),
  ).toBeChecked();
  await expect(modal).toContainText("cv-mac-dinh.pdf");
  await modal.getByRole("radio", { name: /Chọn CV khác/ }).check();
  await modal.getByLabel("Chọn CV PDF", { exact: true }).setInputFiles(pdf);
  await expect(modal.getByText(/Đã chọn: cv-ung-tuyen/)).toBeVisible();
  await modal.getByRole("button", { name: "Xác nhận ứng tuyển" }).click();
  await expect(modal).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tài khoản cá nhân", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Hồ Sơ Của Tôi", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toHaveAttribute("download", "cv-mac-dinh.pdf");
});

test("save state stays consistent between home, detail, listing and account", async ({
  page,
}) => {
  await loginMock(page, "candidate");
  await page.locator(".site-header .brand:visible").click();
  const card = page.getByTestId("home-job-card").first();
  const detailActions = page.locator(".guest-actions:visible");
  const title = await card.getByRole("heading").innerText();
  await card.getByRole("button", { name: "Lưu việc làm", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Bỏ lưu việc làm", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("heading").getByRole("link").click();
  await expect(
    detailActions.getByRole("button", { name: "Bỏ lưu việc làm", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Tài khoản cá nhân", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Việc Làm Của Tôi", exact: true })
    .click();
  await page.getByRole("link", { name: /Việc đã lưu/ }).click();
  await expect(page.locator(".cu-job").first()).toContainText(title);
  await page
    .locator(".cu-job")
    .first()
    .getByRole("heading")
    .getByRole("link")
    .click();
  await detailActions
    .getByRole("button", { name: "Bỏ lưu việc làm", exact: true })
    .click();
  await expect(
    detailActions.getByRole("button", { name: "Lưu việc làm", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.locator(".site-header .brand:visible").click();
  await expect(
    card.getByRole("button", { name: "Lưu việc làm", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await jobNine(page);
  await detailActions
    .getByRole("button", { name: "Lưu việc làm", exact: true })
    .click();
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Tất cả việc làm", exact: true })
    .click();
  await page.getByRole("link", { name: "Trang 2", exact: true }).click();
  const listingCard = page
    .getByTestId("job-card")
    .filter({ has: page.locator('a[href="/jobs/9"]') });
  await expect(
    listingCard.getByRole("button", { name: "Bỏ lưu việc làm", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("applying with the default CV keeps a separate snapshot when the profile CV is replaced", async ({
  page,
}) => {
  await loginMock(page, "candidate", "/account/profile");
  await page
    .getByLabel("Chọn CV PDF", { exact: true })
    .setInputFiles({ ...pdf, name: "cv-ban-dau.pdf" });
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toHaveAttribute("href", /^blob:/);
  await jobNine(page);
  await page
    .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Nộp hồ sơ ứng tuyển",
    exact: true,
  });
  await expect(
    modal.getByRole("radio", { name: /CV trong hồ sơ/ }),
  ).toBeChecked();
  await modal.getByRole("button", { name: "Xác nhận ứng tuyển" }).click();
  await expect(modal).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tài khoản cá nhân", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Hồ Sơ Của Tôi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Chọn CV PDF", { exact: true }).setInputFiles({
    ...pdf,
    name: "cv-thay-the.pdf",
    buffer: Buffer.from("%PDF-1.7\nnew CV\n%%EOF"),
  });
  await expect(
    page.getByRole("link", { name: "Tải CV xuống", exact: true }),
  ).toHaveAttribute("download", "cv-thay-the.pdf");
  await page
    .locator(".cu-sidebar")
    .getByRole("link", { name: "Việc làm của tôi", exact: true })
    .click();
  await page
    .locator(".cu-job")
    .first()
    .getByRole("button", { name: "Hồ sơ đã nộp", exact: true })
    .click();
  const summary = page.getByRole("dialog", {
    name: "Hồ sơ đã nộp",
    exact: true,
  });
  await expect(
    summary.getByRole("link", { name: "Tải CV đã nộp" }),
  ).toHaveAttribute("href", /^blob:/);
  const url = await summary
    .getByRole("link", { name: "Tải CV đã nộp" })
    .getAttribute("href");
  await expect(summary).toContainText("cv-ban-dau.pdf");
  expect(
    await page.evaluate(async (address) => (await fetch(address!)).text(), url),
  ).toBe(pdf.buffer.toString());
});

for (const width of [360, 768, 1440]) {
  test(`apply modal remains usable at ${width}px without page movement`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginMock(page, "candidate", "/jobs/9");
    const before = await page.locator(".site-header").boundingBox();
    const trigger = page.getByRole("button", {
      name: "Ứng tuyển ngay",
      exact: true,
    });
    await trigger.click();
    const modal = page.getByRole("dialog", {
      name: "Nộp hồ sơ ứng tuyển",
      exact: true,
    });
    await expect(modal).toBeVisible();
    const after = await page.locator(".site-header").boundingBox();
    expect(after?.x).toBe(before?.x);
    expect(after?.width).toBe(before?.width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `test-results/application-${width}.png` });
    const confirm = modal.getByRole("button", {
      name: "Xác nhận ứng tuyển",
      exact: true,
    });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
