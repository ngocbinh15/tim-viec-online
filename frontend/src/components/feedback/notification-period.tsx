"use client";

import { useEffect, useState } from "react";
import { SelectionField } from "@/components/forms/selection-field";
import {
  NOTIFICATION_PERIODS,
  type NotificationPeriod,
} from "@/features/notifications/period";
import "./notification-period.css";

export function useNotificationClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  return now;
}

export function NotificationPeriodSelect({
  value,
  onChange,
}: {
  value: NotificationPeriod;
  onChange: (value: NotificationPeriod) => void;
}) {
  return (
    <div className="notification-period-control">
      <span>Thời gian</span>
      <SelectionField
        name="period"
        label="Thời gian thông báo"
        placeholder="Tất cả"
        clearable={false}
        value={value}
        options={[...NOTIFICATION_PERIODS]}
        onValueChange={(next) => onChange(next as NotificationPeriod)}
      />
    </div>
  );
}
