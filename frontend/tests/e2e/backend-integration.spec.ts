import { test, expect, type Page, type APIResponse } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const origin = "http://localhost:3127";
const fixture = () =>
  JSON.parse(
    readFileSync(
      path.resolve(
        "../backend/storage/framework/testing/frontend-e2e/fixture.json",
      ),
      "utf8",
    ),
  ) as Record<string, number>;
const pdf = () =>
  readFileSync(
    path.resolve(
      "../backend/storage/framework/testing/frontend-e2e/app/private/cvs/e2e-profile.pdf",
    ),
  );
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
  await expect(page).toHaveURL(`${origin}${destination}`, { timeout: 20_000 });
}
async function api(
  page: Page,
  resource: string,
  method = "GET",
  data?: unknown,
): Promise<APIResponse> {
  return page.request.fetch(`/api/backend${resource}`, {
    method,
    headers: { Origin: origin },
    ...(data === undefined ? {} : { data }),
  });
}

test.describe.serial("Laravel integration without AI", () => {
  test("public data, protected BFF, candidate profile/CV/save/apply persist after reload", async ({
    page,
  }) => {
    const ids = fixture();
    await page.goto("/jobs?keyword=Backend&level=Middle&sort=salary_desc");
    await expect(
      page.getByRole("link", { name: "Backend Engineer E2E", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator(".site-footer")
        .getByRole("link", { name: "E2E Engineering", exact: true }),
    ).toBeVisible();
    expect((await api(page, "/candidate/profile")).status()).toBe(401);
    await login(page, "candidate", "/account/profile");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Candidate",
    );
    await page
      .getByLabel("Họ và tên", { exact: true })
      .fill("E2E Candidate Updated");
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Candidate Updated",
    );
    await page.reload();
    await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
      "E2E Candidate Updated",
    );
    await page.getByLabel("Ảnh đại diện", { exact: true }).setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(
      page
        .getByRole("img", { name: "Ảnh đại diện đã chọn", exact: true })
        .first(),
    ).toBeVisible();
    await page.reload();
    const savedAvatars = page.getByRole("img", {
      name: "Ảnh đại diện đã chọn",
      exact: true,
    });
    await expect(savedAvatars).toHaveCount(2);
    await expect(
      page.getByText("Ảnh đại diện đã lưu", { exact: true }),
    ).toBeVisible();
    for (const image of await savedAvatars.all()) {
      await expect(image).toHaveAttribute("src", /\/storage\/avatars\//);
      await expect
        .poll(() =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        )
        .toBeGreaterThan(0);
    }
    await page.getByLabel("Chọn CV PDF", { exact: true }).setInputFiles({
      name: "updated-cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.concat([Buffer.from("\n"), pdf()]),
    });
    await expect
      .poll(async () => (await api(page, "/candidate/cv/file")).status())
      .toBe(200);
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Tải CV xuống", exact: true }),
    ).toHaveAttribute("href", "/api/backend/candidate/cv/file");
    await page
      .getByRole("button", { name: "Xem trước CV", exact: true })
      .click();
    await expect(page.getByTitle("Nội dung CV PDF")).toHaveAttribute(
      "src",
      "/api/backend/candidate/cv/file",
    );
    await page
      .getByRole("button", { name: "Đóng xem trước CV", exact: true })
      .click();
    await page.goto(`/jobs/${ids.job_id}`);
    await page
      .locator(".guest-actions")
      .getByRole("button", { name: "Lưu việc làm", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Bỏ lưu việc làm", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Nộp hồ sơ ứng tuyển",
      exact: true,
    });
    await dialog
      .getByLabel(/Thư giới thiệu/)
      .fill("I can build reliable Laravel and Next.js applications.");
    await dialog
      .getByRole("button", { name: "Xác nhận ứng tuyển", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Đã ứng tuyển", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Đã ứng tuyển", exact: true }),
    ).toBeVisible();
    const history = await (await api(page, "/candidate/applications")).json();
    expect(history.data).toHaveLength(2);
    expect(JSON.stringify(history)).not.toContain("match_score");
    expect(
      (
        await api(page, `/employer/applications/${ids.application_id}`)
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/backend/notifications/read-all", {
          headers: { Origin: "https://evil.test" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.patch("/api/backend/notifications/read-all", {
          headers: { Origin: "https://evil.test" },
        })
      ).status(),
    ).toBe(403);
    await page.goto("/account/notifications");
    await page
      .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await (await api(page, "/notifications")).json();
        return result.data.every((item: { is_read: boolean }) => item.is_read);
      })
      .toBe(true);
    const cookie = (await page.context().cookies()).find(
      (item) => item.name === "timviec_session",
    );
    expect(cookie?.httpOnly).toBe(true);
    await page.goto("/account/jobs");
    const ownRow = page
      .locator(".cu-job")
      .filter({ hasText: "Backend Engineer E2E" });
    await ownRow
      .getByRole("button", { name: "Trao đổi với nhà tuyển dụng", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/messages\?conversation=\d+$/);
    await page.goto("/account/jobs");
    await ownRow
      .getByRole("button", {
        name: "Rút hồ sơ Backend Engineer E2E",
        exact: true,
      })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    await expect(ownRow).toContainText("Đã rút hồ sơ");
    expect(
      (
        await api(page, `/jobs/${ids.job_id}/apply`, "POST", {
          cv_source: "profile",
        })
      ).status(),
    ).toBe(409);
  });

  test("employer sees associated job, reviews real PDF, updates status/company/job", async ({
    page,
  }) => {
    const ids = fixture();
    await login(page, "employer", "/employer/candidates");
    await expect(
      page.getByRole("link", { name: /E2E Candidate Updated/ }).first(),
    ).toBeVisible();
    await page.goto(`/employer/candidates/${ids.application_id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const assessment = page.getByRole("region", {
      name: "Đánh giá độ phù hợp",
    });
    await expect(assessment).toBeVisible();
    await expect(assessment).toContainText(
      "Hồ sơ này chưa có kết quả phân tích AI.",
    );
    await expect(assessment.getByRole("meter")).toHaveCount(0);
    await expect(
      assessment.getByRole("button", { name: "Phân tích CV", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Frontend Engineer E2E", { exact: true }).first(),
    ).toBeVisible();
    const cv = await api(page, `/applications/${ids.application_id}/cv`);
    expect(cv.status()).toBe(200);
    expect(cv.headers()["content-type"]).toContain("application/pdf");
    expect((await cv.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await page
      .getByRole("combobox", { name: "Trạng thái xét duyệt", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Trúng tuyển", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cập nhật trạng thái", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await (
              await api(page, `/employer/applications/${ids.application_id}`)
            ).json()
          ).data.status,
      )
      .toBe("accepted");
    await page.goto("/employer/company");
    await page
      .getByLabel("Tên công ty", { exact: true })
      .fill("E2E Software Updated");
    await page
      .getByLabel("Logo công ty", { exact: true })
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(
      page.getByRole("img", { name: "Logo công ty", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lưu thông tin công ty", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await (await api(page, "/employer/company")).json()).data.name,
      )
      .toBe("E2E Software Updated");
    await page.reload();
    await expect(page.getByLabel("Tên công ty", { exact: true })).toHaveValue(
      "E2E Software Updated",
    );
    await page.goto(`/employer/jobs/${ids.job_id}/edit`);
    await page
      .getByLabel("Tiêu đề việc làm", { exact: true })
      .fill("Backend Engineer E2E Updated");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(page).toHaveURL(/\/employer\/jobs$/);
    await expect(
      page.getByRole("link", {
        name: "Xem/sửa tin Backend Engineer E2E Updated",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (
        await api(page, `/employer/jobs/${ids.job_id}/status`, "PATCH", {
          status: "closed",
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await api(page, `/employer/jobs/${ids.job_id}/status`, "PATCH", {
          status: "active",
        })
      ).ok(),
    ).toBe(true);
    expect((await api(page, "/admin/users")).status()).toBe(403);
  });

  test("two role chat receives WebSocket messages and private images without reload", async ({
    page,
    browser,
  }) => {
    const ids = fixture();
    const otherContext = await browser.newContext({ baseURL: origin });
    const employer = await otherContext.newPage();
    const receivedMessages: string[] = [];
    employer.on("websocket", (socket) =>
      socket.on("framereceived", (frame) => {
        try {
          const event = JSON.parse(String(frame.payload));
          if (event.event === "message.sent")
            receivedMessages.push(JSON.parse(event.data).message);
        } catch {
          /* Ignore protocol control frames. */
        }
      }),
    );
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
      await expect(
        employer
          .getByRole("region", { name: /^Nội dung hội thoại với/ })
          .getByText("Initial browser fixture message", { exact: true }),
      ).toBeVisible();
      const text = "Realtime candidate message from genuine Laravel";
      await page.bringToFront();
      await page.getByLabel("Tin nhắn của bạn", { exact: true }).fill(text);
      // Keep the receiver visible before sending through the candidate's authenticated BFF.
      await employer.bringToFront();
      expect(
        (
          await api(
            page,
            `/conversations/${ids.conversation_id}/messages`,
            "POST",
            { message: text },
          )
        ).ok(),
      ).toBe(true);
      await expect
        .poll(() => receivedMessages.includes(text), { timeout: 10_000 })
        .toBe(true);
      await expect(
        employer.getByText(text, { exact: true }).last(),
      ).toBeVisible({ timeout: 10_000 });
      await employer
        .getByLabel("Tin nhắn của bạn", { exact: true })
        .fill("Employer real reply");
      await employer
        .getByLabel("Tin nhắn của bạn", { exact: true })
        .press("Enter");
      await expect(
        employer.getByText("Employer real reply", { exact: true }).last(),
      ).toBeVisible();
      await page.bringToFront();
      await expect(
        page.getByText("Employer real reply", { exact: true }).last(),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByLabel("Ảnh đính kèm", { exact: true }).setInputFiles({
        name: "chat.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page.getByRole("button", { name: "Gửi", exact: true }).click();
      await expect(
        page
          .getByRole("link", { name: "Xem ảnh đính kèm", exact: true })
          .last(),
      ).toBeVisible();
      await expect(
        page
          .getByRole("link", { name: "Xem ảnh đính kèm", exact: true })
          .last(),
      ).toHaveAttribute(
        "href",
        /^\/api\/backend\/conversations\/\d+\/messages\/\d+\/image$/,
      );
      const image = await page
        .getByRole("link", { name: "Xem ảnh đính kèm", exact: true })
        .last()
        .getAttribute("href");
      expect(image).toMatch(
        /^\/api\/backend\/conversations\/\d+\/messages\/\d+\/image$/,
      );
      expect((await page.request.get(image!)).status()).toBe(200);
      const anon = await browser.newContext({ baseURL: origin });
      expect((await anon.request.get(image!)).status()).toBe(401);
      await anon.close();
      // Both participants must see a loaded inline preview without opening the link.
      for (const participant of [page, employer]) {
        const preview = participant
          .getByRole("img", {
            name: "Ảnh đính kèm trong hội thoại",
            exact: true,
          })
          .last();
        await expect(preview).toBeVisible();
        await expect
          .poll(() =>
            preview.evaluate(
              (node: HTMLImageElement) =>
                node.complete && node.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      await employer.bringToFront();
      await employer.getByLabel("Ảnh đính kèm", { exact: true }).setInputFiles({
        name: "reply.png",
        mimeType: "image/png",
        buffer: png,
      });
      await employer
        .getByRole("button", { name: "Gửi tin nhắn", exact: true })
        .click();
      await page.bringToFront();
      const receivedImage = page
        .locator(".cc-message:not(.cc-outgoing)")
        .getByRole("img", { name: "Ảnh đính kèm trong hội thoại", exact: true })
        .last();
      await expect(receivedImage).toBeVisible();
      await expect
        .poll(() =>
          receivedImage.evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
        )
        .toBe(true);
      await page.reload();
      await expect(receivedImage).toBeVisible();
      await expect
        .poll(() =>
          receivedImage.evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
        )
        .toBe(true);
    } finally {
      await otherContext.close();
    }
  });

  for (const role of ["candidate", "employer"] as const) {
    test(`${role} chat refresh keeps the reading position without inserting a loading row`, async ({
      page,
    }) => {
      const ids = fixture();
      let holdRefresh = false;
      let finish!: () => void;
      const gate = new Promise<void>((resolve) => {
        finish = resolve;
      });
      let refreshStarted = false;
      await page.route(
        `**/api/backend/conversations/${ids.conversation_id}/messages?*`,
        async (route) => {
          if (holdRefresh) {
            refreshStarted = true;
            await gate;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: Array.from({ length: 50 }, (_, index) => ({
                id: 20000 + index,
                conversation_id: ids.conversation_id,
                sender_id: ids.employer_id,
                message: `Stable history ${index}`,
                created_at: `2026-10-26T12:${String(index).padStart(2, "0")}:00Z`,
                is_read: true,
              })),
              meta: { has_more: false },
            }),
          });
        },
      );
      try {
        await login(
          page,
          role,
          `/${role === "candidate" ? "account" : "employer"}/messages?conversation=${ids.conversation_id}`,
        );
        const region = page.getByRole("region", {
          name: /^Nội dung hội thoại với/,
        });
        const anchor = region.getByText("Stable history 20", { exact: true });
        await expect(anchor).toBeVisible();
        await expect(
          region.getByRole("button", {
            name: "Đang tải tin nhắn…",
            exact: true,
          }),
        ).toHaveCount(0);
        await region.evaluate((node) => {
          node.scrollTop = 1100;
        });
        const before = await anchor.evaluate(
          (node) => node.getBoundingClientRect().top,
        );
        holdRefresh = true;
        await page.evaluate(() =>
          window.dispatchEvent(new Event("backend:refresh")),
        );
        await expect.poll(() => refreshStarted).toBe(true);
        await expect(
          region.getByRole("button", {
            name: "Đang tải tin nhắn…",
            exact: true,
          }),
        ).toHaveCount(0);
        expect(
          Math.abs(
            (await anchor.evaluate(
              (node) => node.getBoundingClientRect().top,
            )) - before,
          ),
        ).toBeLessThanOrEqual(1);
        const refreshed = page.waitForResponse(
          (response) =>
            response.request().method() === "GET" &&
            new URL(response.url()).pathname ===
              `/api/backend/conversations/${ids.conversation_id}/messages`,
        );
        finish();
        await refreshed;
        await expect
          .poll(async () =>
            Math.abs(
              (await anchor.evaluate(
                (node) => node.getBoundingClientRect().top,
              )) - before,
            ),
          )
          .toBeLessThanOrEqual(1);

        // A delayed acknowledgement must not pull a reader back to the bottom.
        let acknowledge!: () => void;
        const acknowledgement = new Promise<void>((resolve) => {
          acknowledge = resolve;
        });
        const endpoint = `/api/backend/conversations/${ids.conversation_id}/messages`;
        await page.route(`**${endpoint}`, async (route) => {
          await acknowledgement;
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                id: 21000,
                conversation_id: ids.conversation_id,
                sender_id:
                  role === "candidate" ? ids.candidate_id : ids.employer_id,
                message: `Delayed acknowledgement ${role}`,
                created_at: new Date().toISOString(),
                is_read: false,
              },
            }),
          });
        });
        try {
          const composer = page.getByLabel("Tin nhắn của bạn", { exact: true });
          await composer.fill(`Delayed acknowledgement ${role}`);
          await composer.press("Enter");
          const pending = region.locator('[data-delivery="sending"]');
          await expect(pending).toHaveCount(1);
          await region.evaluate((node) => {
            node.scrollTop = 1100;
          });
          await expect(
            page.getByRole("button", { name: "Xuống cuối", exact: true }),
          ).toBeVisible();
          const readingPosition = await anchor.evaluate(
            (node) => node.getBoundingClientRect().top,
          );
          acknowledge();
          await expect(pending).toHaveCount(0);
          expect(
            Math.abs(
              (await anchor.evaluate(
                (node) => node.getBoundingClientRect().top,
              )) - readingPosition,
            ),
          ).toBeLessThanOrEqual(1);
        } finally {
          acknowledge();
        }
      } finally {
        finish();
      }
    });

    test(`${role} chat shows pending immediately, preserves newer drafts and retries failed sends explicitly`, async ({
      page,
    }) => {
      const ids = fixture();
      const destination = role === "candidate" ? "account" : "employer";
      await login(
        page,
        role,
        `/${destination}/messages?conversation=${ids.conversation_id}`,
      );
      const composer = page.getByLabel("Tin nhắn của bạn", { exact: true });
      const bubbles = page.locator(
        role === "candidate" ? ".cc-message" : ".em-chat-message",
      );
      const resource = `**/api/backend/conversations/${ids.conversation_id}/messages`;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(resource, async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        await gate;
        await route.continue();
      });
      try {
        const text = `Pending ${role} message`;
        await composer.fill(text);
        await composer.press("Enter");
        const pending = bubbles.filter({ hasText: text });
        await expect(pending).toHaveAttribute("data-delivery", "sending", {
          timeout: 1000,
        });
        await expect(composer).toHaveValue("");
        await composer.fill("Newer draft must remain");
        release();
        await expect(pending).toHaveCount(1);
        await expect(pending).not.toHaveAttribute("data-delivery", "sending");
        await expect(composer).toHaveValue("Newer draft must remain");
      } finally {
        release();
        await page.unroute(resource);
      }

      let reject!: () => void;
      const failure = new Promise<void>((resolve) => {
        reject = resolve;
      });
      await page.route(resource, async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        await failure;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Unavailable" }),
        });
      });
      const failedText = `Retry ${role} message`;
      try {
        await composer.fill(failedText);
        await composer.press("Enter");
        await expect(bubbles.filter({ hasText: failedText })).toHaveAttribute(
          "data-delivery",
          "sending",
        );
        await composer.fill("A separate draft");
        reject();
        await expect(bubbles.filter({ hasText: failedText })).toHaveAttribute(
          "data-delivery",
          "failed",
        );
        await expect(composer).toHaveValue("A separate draft");
      } finally {
        reject();
        await page.unroute(resource);
      }
      // Reverb can echo the saved message before the POST response reconciles
      // its optimistic bubble. Check the final state after the send finishes.
      const retryResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/backend/conversations/${ids.conversation_id}/messages` &&
          response.request().method() === "POST",
      );
      await bubbles
        .filter({ hasText: failedText })
        .getByRole("button", { name: "Thử lại", exact: true })
        .click();
      expect((await retryResponse).ok()).toBeTruthy();
      await expect(bubbles.filter({ hasText: failedText })).toHaveCount(1);
      await expect(bubbles.filter({ hasText: failedText })).not.toHaveAttribute(
        "data-delivery",
        "failed",
      );
      await expect(bubbles.filter({ hasText: failedText })).not.toHaveAttribute(
        "data-delivery",
        "sending",
      );
      await expect(composer).toHaveValue("A separate draft");
    });

    test(`${role} chat loads only the newest window and exposes older messages without scrolling away`, async ({
      page,
    }) => {
      const ids = fixture();
      const sender = role === "candidate" ? ids.candidate_id : ids.employer_id;
      const historyCalls: string[] = [];
      await page.route(
        `**/api/backend/conversations/${ids.conversation_id}/messages?*`,
        async (route) => {
          const url = new URL(route.request().url());
          historyCalls.push(url.search);
          const older = url.searchParams.has("before_id");
          const messages = Array.from(
            { length: older ? 3 : 50 },
            (_, index) => ({
              id: (older ? 9997 : 10000) + index,
              conversation_id: ids.conversation_id,
              sender_id: sender,
              message: `History message ${(older ? 9997 : 10000) + index}`,
              created_at: `2026-10-${older ? "26" : "27"}T12:${String(index).padStart(2, "0")}:00Z`,
              is_read: false,
            }),
          );
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: messages,
              meta: {
                has_more: !older,
                oldest_id: messages[0].id,
                newest_id: messages.at(-1)?.id,
              },
            }),
          });
        },
      );
      await login(
        page,
        role,
        `/${role === "candidate" ? "account" : "employer"}/messages?conversation=${ids.conversation_id}`,
      );
      const region = page.getByRole("region", {
        name: /^Nội dung hội thoại với/,
      });
      const bubbles = region.locator(
        role === "candidate" ? ".cc-message" : ".em-chat-message",
      );
      await expect(bubbles).toHaveCount(50);
      expect(historyCalls.length).toBeGreaterThan(0);
      expect(
        historyCalls.every((query) => query === "?per_page=50&latest=1"),
      ).toBe(true);
      await region.evaluate((node) => {
        node.scrollTop = 0;
      });
      await region
        .getByRole("button", { name: "Xem tin nhắn cũ hơn", exact: true })
        .click();
      await expect(bubbles).toHaveCount(53);
      await expect(
        region.getByRole("button", {
          name: "Xem tin nhắn cũ hơn",
          exact: true,
        }),
      ).toHaveCount(0);
      // A WebSocket connection may reconcile the latest window while it
      // establishes subscriptions. It must never walk every legacy page.
      expect(
        historyCalls.filter((query) => query.includes("before_id")),
      ).toEqual(["?per_page=50&before_id=10000"]);
      expect(
        historyCalls.every(
          (query) =>
            query === "?per_page=50&latest=1" ||
            query === "?per_page=50&before_id=10000",
        ),
      ).toBe(true);
      const position = await region.evaluate((node) => ({
        top: node.scrollTop,
        bottom: node.scrollHeight - node.scrollTop - node.clientHeight,
      }));
      expect(position.top).toBeGreaterThan(0);
      expect(position.bottom).toBeGreaterThan(100);
    });
  }

  test("admin catalog CRUD persists and locking revokes candidate sessions", async ({
    page,
    browser,
  }) => {
    const ids = fixture();
    await login(page, "admin", "/admin/skills");
    await page
      .getByRole("button", { name: "Thêm kỹ năng", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Tên kỹ năng/).fill("Browser API skill");
    await dialog
      .getByRole("button", { name: "Lưu kỹ năng", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole("cell", { name: "Browser API skill", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Sửa Browser API skill", exact: true })
      .click();
    await dialog.getByLabel(/^Tên kỹ năng/).fill("Browser API skill edited");
    await dialog
      .getByRole("button", { name: "Lưu kỹ năng", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page
      .getByRole("button", {
        name: "Xóa Browser API skill edited",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Xóa khỏi danh mục", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Tổng quan hệ thống", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Khôi phục mẫu", exact: true }),
    ).toHaveCount(0);
    const candidateContext = await browser.newContext({ baseURL: origin });
    try {
      const candidate = await candidateContext.newPage();
      await login(candidate, "outsider", "/account/profile");
      expect(
        (
          await api(page, `/admin/users/${ids.outsider_id}/status`, "PATCH", {
            status: "locked",
          })
        ).ok(),
      ).toBe(true);
      expect((await api(candidate, "/candidate/profile")).status()).toBe(401);
      expect(
        (
          await api(page, `/admin/users/${ids.outsider_id}/status`, "PATCH", {
            status: "active",
          })
        ).ok(),
      ).toBe(true);
    } finally {
      await candidateContext.close();
    }
  });
});
