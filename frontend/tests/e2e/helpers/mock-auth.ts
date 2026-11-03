import { expect, type Page } from "@playwright/test";

export const mockAccounts = {
  candidate: { email: "candidate@example.test", password: "Candidate@123" },
  employer: { email: "employer@example.test", password: "Employer@123" },
} as const;

export async function loginMock(
  page: Page,
  role: keyof typeof mockAccounts = "candidate",
  returnTo?: string,
) {
  const params = new URLSearchParams({ role });
  if (returnTo) params.set("returnTo", returnTo);
  await page.goto(`/login?${params}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(mockAccounts[role].email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(mockAccounts[role].password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

export async function logoutMock(page: Page) {
  await page
    .getByRole("button", { name: "Tài khoản cá nhân", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
}
