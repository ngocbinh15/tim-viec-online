import { expect, test } from "@playwright/test";
import { loginMock } from "./helpers/mock-auth";

for (const role of ["candidate", "employer"] as const) {
  test(`${role} chat uses Enter to send and modified Enter to edit without exceeding the message limit`, async ({
    page,
  }) => {
    const path =
      role === "candidate" ? "/account/messages" : "/employer/messages";
    await loginMock(page, role, `${path}?conversation=1`);
    const composer = page.getByRole("textbox", {
      name: "Tin nhắn của bạn",
      exact: true,
    });
    const messages = page.locator(
      role === "candidate" ? ".cc-message:visible" : ".em-chat-message:visible",
    );
    await expect(composer).toBeVisible();
    const count = await messages.count();

    await composer.fill("abcdef");
    await composer.evaluate((el: HTMLTextAreaElement) =>
      el.setSelectionRange(2, 4),
    );
    await composer.press("Control+Enter");
    await expect(composer).toHaveValue("ab\nef");
    await page.keyboard.insertText("X");
    await expect(composer).toHaveValue("ab\nXef");
    await composer.press("Meta+Enter");
    await expect(composer).toHaveValue("ab\nX\nef");
    await expect(messages).toHaveCount(count);

    await composer.fill("a".repeat(1000));
    await composer.press("Control+Enter");
    await expect(composer).toHaveValue("a".repeat(1000));
    await expect(messages).toHaveCount(count);

    await composer.fill("Chưa gửi khi đang gõ");
    await composer.dispatchEvent("keydown", { key: "Enter", keyCode: 229 });
    await expect(messages).toHaveCount(count);

    await composer.fill(" \n ");
    await composer.press("Enter");
    await expect(messages).toHaveCount(count);

    await composer.fill("Dòng đầu");
    await composer.press("Control+Enter");
    await page.keyboard.insertText("Dòng tiếp theo");
    await composer.press("Enter");
    await expect(messages).toHaveCount(count + 1);
    await expect(messages.last()).toContainText("Dòng đầu\nDòng tiếp theo");
    await expect(composer).toHaveValue("");
  });
}
