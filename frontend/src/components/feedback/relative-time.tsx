"use client";

import { useEffect, useState } from "react";

const fullDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const relative = new Intl.RelativeTimeFormat("vi-VN", { numeric: "auto" });

export function RelativeTime({ value }: { value: string }) {
  const [now, setNow] = useState<number | null>(null);
  const timestamp = Date.parse(value);
  useEffect(() => {
    // Start after hydration so server and client never disagree on the label.
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  if (!Number.isFinite(timestamp)) return <span>Không rõ thời gian</span>;
  const absolute = fullDate.format(timestamp);
  let label = absolute;
  if (now !== null) {
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds >= 0 && seconds < 60) label = "Vừa xong";
    else if (seconds >= 60 && seconds < 3600)
      label = relative.format(-Math.floor(seconds / 60), "minute");
    else if (seconds >= 3600 && seconds < 86400)
      label = relative.format(-Math.floor(seconds / 3600), "hour");
    else if (seconds >= 86400 && seconds < 7 * 86400)
      label = relative.format(-Math.floor(seconds / 86400), "day");
  }
  return (
    <time dateTime={value} title={absolute}>
      {label}
    </time>
  );
}
