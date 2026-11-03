export const NOTIFICATION_PERIODS = [
  { value: "all", label: "Tất cả" },
  { value: "1d", label: "1 ngày" },
  { value: "3d", label: "3 ngày" },
  { value: "1m", label: "1 tháng" },
] as const;
export type NotificationPeriod = (typeof NOTIFICATION_PERIODS)[number]["value"];
export function notificationPeriod(value: string | null): NotificationPeriod {
  return NOTIFICATION_PERIODS.some((option) => option.value === value)
    ? (value as NotificationPeriod)
    : "all";
}
export function filterNotificationPeriod<T extends { created_at: string }>(
  items: readonly T[],
  period: NotificationPeriod,
  now: number | null,
): T[] {
  if (period === "all") return [...items];
  if (now === null) return [];
  const cutoff = now - { "1d": 1, "3d": 3, "1m": 30 }[period] * 86_400_000;
  // Keep newly delivered events visible when a sender's clock is slightly ahead.
  return items.filter((item) => {
    const date = Date.parse(item.created_at);
    return Number.isFinite(date) && date >= cutoff;
  });
}
export function notificationUrl(
  base: "/account/notifications" | "/employer/notifications",
  read: string,
  period: NotificationPeriod,
  page = 1,
) {
  const params = new URLSearchParams({ read });
  if (period !== "all") params.set("period", period);
  if (page > 1) params.set("page", String(page));
  return `${base}?${params}`;
}
