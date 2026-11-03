import type { Job } from "./types";

const amountFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function formatSalary(
  job: Pick<Job, "salary_min" | "salary_max" | "is_negotiable">,
): string {
  if (job.is_negotiable) return "Thỏa thuận";
  const minimum = job.salary_min;
  const maximum = job.salary_max;
  // Preserve exact VND at salary boundaries instead of rounding across a filter threshold.
  const useMillions = [minimum, maximum].every(
    (value) => value === null || value % 10_000 === 0,
  );
  const amount = (value: number) =>
    amountFormatter.format(useMillions ? value / 1_000_000 : value);
  const unit = useMillions ? "triệu VNĐ" : "VNĐ";
  if (minimum !== null && maximum !== null) {
    if (minimum === maximum) return `${amount(minimum)} ${unit}`;
    return `${amount(minimum)} - ${amount(maximum)} ${unit}`;
  }
  if (minimum !== null) return `Từ ${amount(minimum)} ${unit}`;
  if (maximum !== null) return `Đến ${amount(maximum)} ${unit}`;
  return "Chưa công bố";
}

export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}
// NgocBinh đã ở đây: 18h55-23/10/2026
export function vietnamToday(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isJobOpen(
  job: Pick<Job, "status" | "deadline">,
  today: string,
): boolean {
  return (
    job.status === "active" &&
    formatDate(job.deadline) !== "—" &&
    job.deadline >= today
  );
}
