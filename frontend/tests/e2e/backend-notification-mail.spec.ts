import { expect, test, type APIRequestContext } from "@playwright/test";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const fixtureRoot = path.resolve(
  "../backend/storage/framework/testing/frontend-e2e",
);
const recipient = "outsider@frontend-e2e.test";
const apiOrigin = "http://127.0.0.1:8127/api";
type Letter = { recipients: string[]; raw: string };

function letters(): Letter[] {
  const mailbox = path.join(fixtureRoot, "mailbox.jsonl");
  return existsSync(mailbox)
    ? readFileSync(mailbox, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Letter)
        .filter((letter) => letter.recipients.includes(recipient))
    : [];
}

function decoded(letter: Letter): string {
  return Buffer.from(
    letter.raw
      .replace(/=\r\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      ),
    "binary",
  ).toString("utf8");
}

async function authorization(request: APIRequestContext, role: string) {
  const response = await request.post(`${apiOrigin}/login`, {
    data: {
      email: `${role}@frontend-e2e.test`,
      password: "BrowserTest1!",
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data.user.email_verified_at).toBeTruthy();
  return { Authorization: `Bearer ${body.data.token}` };
}

async function drainEmailQueue() {
  await execute(
    "php",
    [path.resolve("../backend/scripts/frontend-e2e-queue.php")],
    { timeout: 60_000, windowsHide: true },
  );
}

test("database queue coalesces notification SMTP mail and suppresses messages read before delivery", async ({
  request,
}) => {
  const ids = JSON.parse(
    readFileSync(path.join(fixtureRoot, "fixture.json"), "utf8"),
  ) as { job_id: number };
  const candidate = await authorization(request, "outsider");
  const employer = await authorization(request, "employer");
  const baseline = letters().length;
  const prefsUrl = `${apiOrigin}/user/email-preferences`;
  const enable = await request.put(prefsUrl, {
    headers: candidate,
    data: { applications: true, messages: true },
  });
  expect(enable.ok()).toBeTruthy();
  try {
    const apply = await request.post(`${apiOrigin}/jobs/${ids.job_id}/apply`, {
      headers: candidate,
      multipart: {
        cv_source: "new",
        cv_file: {
          name: "notification-private-cv.pdf",
          mimeType: "application/pdf",
          buffer: readFileSync(
            path.join(
              fixtureRoot,
              "app/private/application_cvs/e2e-submitted.pdf",
            ),
          ),
        },
        cover_letter: "PRIVATE_NOTIFICATION_COVER_LETTER",
      },
    });
    expect(apply.status()).toBe(201);
    const applicationId = (await apply.json()).data.id as number;
    const start = await request.post(`${apiOrigin}/conversations`, {
      headers: candidate,
      data: { job_id: ids.job_id },
    });
    expect(start.ok()).toBeTruthy();
    const conversationId = (await start.json()).data.id as number;
    for (const message of [
      "PRIVATE_NOTIFICATION_FIRST",
      "PRIVATE_NOTIFICATION_LATEST",
    ]) {
      const response = await request.post(
        `${apiOrigin}/conversations/${conversationId}/messages`,
        { headers: employer, data: { message } },
      );
      expect(response.status()).toBe(201);
    }
    const status = await request.patch(
      `${apiOrigin}/employer/applications/${applicationId}/status`,
      { headers: employer, data: { status: "accepted" } },
    );
    expect(status.ok()).toBeTruthy();
    // The request path persisted activity without invoking SMTP synchronously.
    expect(letters()).toHaveLength(baseline);
    await drainEmailQueue();
    const delivered = letters().slice(baseline);
    expect(delivered).toHaveLength(2);
    const sources = delivered.map(decoded);
    expect(
      sources.filter((source) =>
        source.includes(`/account/messages?conversation=${conversationId}`),
      ),
    ).toHaveLength(1);
    expect(
      sources.filter((source) => source.includes("Trúng tuyển")),
    ).toHaveLength(1);
    for (const [index, letter] of delivered.entries()) {
      expect(letter.raw).toContain("multipart/alternative");
      expect(letter.raw).toContain("Content-Type: text/plain");
      expect(letter.raw).toContain("Content-Type: text/html");
      expect(sources[index]).toContain(
        "http://localhost:3127/account/settings",
      );
      expect(sources[index]).not.toContain("PRIVATE_NOTIFICATION_");
      expect(sources[index]).not.toContain("notification-private-cv.pdf");
      expect(sources[index]).not.toContain(
        "Backend developer PHP SQL three years experience",
      );
      expect(sources[index]).not.toContain("application_cvs/");
    }
    expect(
      sources.some((source) =>
        source.includes("http://localhost:3127/account/jobs"),
      ),
    ).toBe(true);

    const next = await request.post(
      `${apiOrigin}/conversations/${conversationId}/messages`,
      { headers: employer, data: { message: "PRIVATE_NOTIFICATION_READ" } },
    );
    expect(next.status()).toBe(201);
    const read = await request.patch(
      `${apiOrigin}/conversations/${conversationId}/read`,
      { headers: candidate },
    );
    expect(read.ok()).toBeTruthy();
    await drainEmailQueue();
    expect(letters()).toHaveLength(baseline + 2);
  } finally {
    const disable = await request.put(prefsUrl, {
      headers: candidate,
      data: { applications: false, messages: false },
    });
    expect(disable.ok()).toBeTruthy();
  }
});
