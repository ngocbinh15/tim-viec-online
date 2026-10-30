import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const origin = "http://localhost:3127";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=",
  "base64",
);
async function login(page: Page, role: string, destination: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${role}@frontend-e2e.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserTest1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(`${origin}${destination}`);
}

test("chat shows current company logo and candidate avatar on both sides", async ({
  page,
  browser,
}) => {
  const ids = JSON.parse(
    readFileSync(
      "../backend/storage/framework/testing/frontend-e2e/fixture.json",
      "utf8",
    ),
  );
  const context = await browser.newContext();
  const employer = await context.newPage();
  try {
    await login(
      page,
      "candidate",
      `/account/messages?conversation=${ids.conversation_id}`,
    );
    await login(
      employer,
      "employer",
      `/employer/messages?conversation=${ids.conversation_id}`,
    );
    const candidateImage = employer.locator(
      ".em-chat-heading .em-chat-avatar img",
    );
    const companyImage = page.locator(".cc-heading .cc-avatar img");
    await expect(candidateImage).toHaveCount(0);
    await expect(companyImage).toHaveCount(0);
    const uploadAvatar = async () => {
      const response = await page.request.post(
        "/api/backend/candidate/avatar",
        {
          headers: { Origin: origin },
          multipart: {
            avatar: { name: "avatar.png", mimeType: "image/png", buffer: png },
          },
        },
      );
      expect(response.ok()).toBe(true);
      return (await response.json()).data.avatar_url as string;
    };
    const firstAvatar = await uploadAvatar();
    const company = (
      await (await employer.request.get("/api/backend/employer/company")).json()
    ).data;
    const response = await employer.request.post(
      "/api/backend/employer/company",
      {
        headers: { Origin: origin },
        multipart: {
          name: company.name,
          city: company.city,
          address: company.address,
          description: company.description,
          logo: { name: "logo.png", mimeType: "image/png", buffer: png },
        },
      },
    );
    expect(response.ok()).toBe(true);
    const logo = (await response.json()).data.logo;
    await page.reload();
    await employer.reload();
    await expect(companyImage).toHaveAttribute("src", logo);
    await expect(page.locator(".cc-company .cc-avatar img")).toHaveAttribute(
      "src",
      logo,
    );
    await expect(candidateImage).toHaveAttribute("src", firstAvatar);
    await expect(
      employer.locator(".em-chat-thread .em-chat-avatar img"),
    ).toHaveAttribute("src", firstAvatar);
    for (const image of [companyImage, candidateImage])
      await expect
        .poll(() =>
          image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    const nextAvatar = await uploadAvatar();
    expect(nextAvatar).not.toBe(firstAvatar);
    await employer.bringToFront();
    await employer.evaluate(() =>
      window.dispatchEvent(new Event("backend:refresh")),
    );
    await expect(candidateImage).toHaveAttribute("src", nextAvatar);
  } finally {
    await context.close();
  }
});
