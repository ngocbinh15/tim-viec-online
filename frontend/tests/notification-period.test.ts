import test from "node:test";
import assert from "node:assert/strict";
import {
  filterNotificationPeriod,
  notificationPeriod,
  notificationUrl,
} from "../src/features/notifications/period";

test("notification periods include their boundary and compare ISO offsets by timestamp", () => {
  const now = Date.parse("2026-10-29T10:00:00Z");
  const rows = [
    { id: 1, created_at: "2026-10-28T17:00:00+07:00" },
    { id: 2, created_at: "2026-10-28T09:59:59Z" },
    { id: 3, created_at: "2026-10-26T10:00:00Z" },
    { id: 4, created_at: "2026-09-29T10:00:00Z" },
    { id: 5, created_at: "2026-09-29T09:59:59Z" },
    { id: 6, created_at: "invalid" },
    { id: 7, created_at: "2026-10-29T10:00:01Z" },
  ];
  assert.deepEqual(
    filterNotificationPeriod(rows, "1d", now).map((x) => x.id),
    [1, 7],
  );
  assert.deepEqual(
    filterNotificationPeriod(rows, "3d", now).map((x) => x.id),
    [1, 2, 3, 7],
  );
  assert.deepEqual(
    filterNotificationPeriod(rows, "1m", now).map((x) => x.id),
    [1, 2, 3, 4, 7],
  );
  assert.deepEqual(filterNotificationPeriod(rows, "all", now), rows);
  assert.equal(rows.length, 7);
});

test("notification filter URLs retain both filters and reset pagination when a period changes", () => {
  assert.equal(notificationPeriod("bad"), "all");
  assert.equal(notificationPeriod(null), "all");
  assert.equal(notificationPeriod("3d"), "3d");
  assert.equal(
    notificationUrl("/employer/notifications", "unread", "3d"),
    "/employer/notifications?read=unread&period=3d",
  );
  assert.equal(
    notificationUrl("/account/notifications", "read", "1m", 2),
    "/account/notifications?read=read&period=1m&page=2",
  );
  assert.equal(
    notificationUrl("/account/notifications", "all", "all"),
    "/account/notifications?read=all",
  );
});
