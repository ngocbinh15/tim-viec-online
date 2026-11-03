import { expect, test, type Page } from "@playwright/test";

const origin = "http://localhost:3127";
async function login(page: Page, role: string, destination: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${role}@frontend-e2e.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserTest1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(`${origin}${destination}`);
}
const refresh = (page: Page) =>
  page.evaluate(() => window.dispatchEvent(new Event("backend:refresh")));

// Only browser responses are controlled here: Laravel still authenticates and
// authorizes the real session. No provider requests or production records.
async function secondConversation(page: Page, latest: () => number) {
  const snapshot = await (
    await page.request.get("/api/backend/workspace/bootstrap")
  ).json();
  const conversation = snapshot.data.conversations[0];
  const message = (id: number) => ({
    id: 100000 + id,
    conversation_id: 999,
    sender_id: conversation.partner.id,
    message: `Catch-up message ${id}`,
    created_at: new Date(Date.UTC(2026, 9, 27, 0, 0, id)).toISOString(),
    is_read: true,
  });
  await page.route("**/api/backend/workspace/bootstrap", (route) =>
    route.fulfill({
      json: {
        ...snapshot,
        data: {
          ...snapshot.data,
          conversations: [
            ...snapshot.data.conversations,
            { ...conversation, id: 999, last_message: message(latest()) },
          ],
        },
      },
    }),
  );
  await page.route("**/api/backend/conversations/999/read", (route) =>
    route.fulfill({ json: { success: true, data: null } }),
  );
  await page.route("**/api/backend/conversations/999/messages?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const after = query.has("after_id")
      ? Number(query.get("after_id")) - 100000
      : 0;
    const limit = Number(query.get("per_page"));
    const start = after ? after + 1 : Math.max(1, latest() - limit + 1);
    const end = Math.min(latest(), start + limit - 1);
    return route.fulfill({
      json: {
        success: true,
        data: Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
          message(start + index),
        ),
        meta: { has_more: after ? end < latest() : start > 1 },
      },
    });
  });
  await expect
    .poll(async () => {
      await refresh(page);
      return page.locator("#conversation-999").count();
    })
    .toBe(1);
  return conversation.id as number;
}

test("candidate polling updates inactive conversation previews without Reverb", async ({
  page,
}) => {
  await login(page, "candidate", "/account/messages");
  await secondConversation(page, () => 151);
  await expect(page.locator("#conversation-999 small")).toHaveText(
    "Catch-up message 151",
  );
});

test("a sidebar preview cannot skip an offline burst when reopening history", async ({
  page,
}) => {
  await login(page, "candidate", "/account/messages");
  let latest = 50;
  const original = await secondConversation(page, () => latest);
  await page.locator("#conversation-999").click();
  await expect(page.locator(".cc-message")).toHaveCount(50);
  await page.locator(`#conversation-${original}`).click();
  await expect(page.locator(`#conversation-${original}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  latest = 151;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("backend:notification", {
        detail: {
          id: 99001,
          type: "new_message",
          title: "New message",
          content: "Preview update",
          created_at: new Date().toISOString(),
          read_at: null,
          data: { conversation_id: 999 },
        },
      }),
    ),
  );
  await expect(page.locator("#conversation-999 small")).toHaveText(
    "Catch-up message 151",
  );
  await page.locator("#conversation-999").click();
  await expect(page.locator(".cc-message")).toHaveCount(151);
  await expect(
    page.locator(".cc-message").filter({ hasText: "Catch-up message 51" }),
  ).toHaveCount(1);
});

test("an older employer snapshot cannot undo a successful job status change", async ({
  page,
}) => {
  await login(page, "employer", "/employer/jobs");
  const snapshot = await (
    await page.request.get("/api/backend/workspace/bootstrap")
  ).json();
  const job = snapshot.data.jobs.find(
    (item: { status: string }) => item.status === "active",
  );
  expect(job).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  await page.route("**/api/backend/workspace/bootstrap", async (route) => {
    held = true;
    await gate;
    await route.fulfill({ json: snapshot });
  });
  await expect
    .poll(async () => {
      await refresh(page);
      return held;
    })
    .toBe(true);
  const row = page
    .locator(".ep-job-table tbody tr")
    .filter({ hasText: job.title });
  const response = page.waitForResponse("**/api/backend/workspace/bootstrap");
  try {
    await row.getByRole("button", { name: /Đóng tin/ }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(row.locator(".ep-status")).toHaveText("Đã đóng");
  } finally {
    release();
  }
  await (await response).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(row.locator(".ep-status")).toHaveText("Đã đóng");
});
