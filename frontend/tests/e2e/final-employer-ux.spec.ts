import { test, expect } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

test("canceling a new job discards its draft and errors while sidebar navigation preserves a draft", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/jobs/new");
  const title = () => page.locator('input[name="title"]:visible');
  const sidebar = page.locator(".ep-sidebar");
  await title().fill("Tin tuyển dụng đang soạn");
  await sidebar.locator('a[href="/employer/jobs"]').click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
  await sidebar.locator('a[href="/employer/jobs/new"]').click();
  await expect(title()).toHaveValue("Tin tuyển dụng đang soạn");
  await page.locator('.ep-job-form button[type="submit"]').click();
  await expect(
    page.locator('.ep-job-form [aria-invalid="true"]').first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
  await sidebar.locator('a[href="/employer/jobs/new"]').click();
  await expect(title()).toHaveValue("");
  await expect(page.locator('.ep-job-form [aria-invalid="true"]')).toHaveCount(
    0,
  );
});

test("canceling an edited job restores the saved job without changing its listing", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/jobs/1/edit");
  const title = () => page.locator('input[name="title"]:visible');
  const original = await title().inputValue();
  await title().fill("Bản chỉnh sửa không được lưu");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
  await expect(page.locator(".ep-job-table")).toContainText(original);
  await page.locator(`a[href="/employer/jobs/1/edit"]`).first().click();
  await expect(title()).toHaveValue(original);
});

test("an unfinished logo read cannot change the shared company after leaving the form", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/company");
  await page.evaluate(() => {
    const state = window as typeof window & {
      logoReadStarted?: boolean;
      logoReadFinished?: boolean;
      releaseLogoRead?: () => void;
    };
    const original = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = function () {
      if (state.releaseLogoRead) return original.call(this);
      state.logoReadStarted = true;
      return new Promise<void>((resolve) => {
        state.releaseLogoRead = resolve;
      })
        .then(() => original.call(this))
        .finally(() => {
          state.logoReadFinished = true;
        });
    };
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "pending-company-logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a03sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { logoReadStarted?: boolean })
            .logoReadStarted,
      ),
    )
    .toBe(true);
  await page.locator('.ep-sidebar a[href="/employer/jobs"]').click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
  await expect(page.locator(".ep-job-table:visible")).toBeVisible();
  await page.evaluate(() =>
    (
      window as typeof window & { releaseLogoRead?: () => void }
    ).releaseLogoRead?.(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { logoReadFinished?: boolean })
            .logoReadFinished,
      ),
    )
    .toBe(true);
  await page.locator('.ep-sidebar a[href="/employer/company"]').click();
  await expect(page.locator(".ep-logo-filename:visible")).toHaveText(
    "Chưa chọn ảnh",
  );
  await expect(page.locator(".ep-form-logo:visible img")).toHaveCount(0);
});
