import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeChatMessages,
  messageHistoryPath,
  parseChatMessage,
  parseReadReceipt,
  receiptIncludesMessage,
} from "../src/features/chat/updates";

const message = (id: string, created_at = "2026-10-27T01:00:00Z") => ({
  id,
  conversation_id: 7,
  sender_id: 4,
  message: id,
  created_at,
  delivery: undefined as string | undefined,
});

test("HTTP acknowledgement replaces optimistic bubble and deduplicates an earlier WebSocket event", () => {
  const pending = { ...message("pending:1"), delivery: "sending" };
  const result = mergeChatMessages(
    [message("30"), pending, message("31")],
    [message("31")],
    "pending:1",
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ["30", "31"],
  );
});

test("older messages merge chronologically without losing pending or failed sends", () => {
  const failed = {
    ...message("pending:1", "2026-10-27T01:01:00Z"),
    delivery: "failed",
  };
  const result = mergeChatMessages(
    [message("31"), failed],
    [message("29", "2026-10-26T01:00:00Z"), message("30"), message("31")],
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ["29", "30", "31", "pending:1"],
  );
  assert.equal(result.at(-1)?.delivery, "failed");
});

test("history requests use bounded latest and cursors rather than walking every page", () => {
  assert.equal(
    messageHistoryPath(7),
    "/conversations/7/messages?per_page=50&latest=1",
  );
  assert.equal(
    messageHistoryPath(7, "older", 20),
    "/conversations/7/messages?per_page=50&before_id=20",
  );
  assert.equal(
    messageHistoryPath(7, "newer", 31),
    "/conversations/7/messages?per_page=50&after_id=31",
  );
});

test("WebSocket payloads reject invalid IDs and read receipts do not mark newer sends read", () => {
  assert.equal(
    parseChatMessage({ ...message("31"), conversation_id: -1 }),
    null,
  );
  assert.equal(parseChatMessage({ ...message("31"), created_at: "bad" }), null);
  assert.ok(parseChatMessage(message("31")));
  assert.equal(
    parseReadReceipt({ conversation_id: 7, reader_id: "bad" }),
    null,
  );
  const receipt = parseReadReceipt({
    conversation_id: 7,
    reader_id: 9,
    read_at: "2026-10-27T01:00:30Z",
  })!;
  assert.ok(receiptIncludesMessage(receipt, message("31"), 4));
  assert.equal(
    receiptIncludesMessage(receipt, message("32", "2026-10-27T01:01:00Z"), 4),
    false,
  );
  assert.equal(
    receiptIncludesMessage(
      receipt,
      { ...message("31"), conversation_id: 8 },
      4,
    ),
    false,
  );
  assert.equal(receiptIncludesMessage(receipt, message("31"), 9), false);
});
