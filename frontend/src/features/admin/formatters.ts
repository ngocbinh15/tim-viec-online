import type { AdminApplication, AdminJob, TrendPoint } from "./types";

export function formatDateVN(dateString: string): string {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat("vi-VN").format(val);
}

export function formatSalary(job: AdminJob): string {
  if (job.is_negotiable) return "Thỏa thuận";
  if (job.salary_min && job.salary_max) {
    return `${formatNumber(job.salary_min)} – ${formatNumber(job.salary_max)} VNĐ`;
  }
  if (job.salary_min) return `Từ ${formatNumber(job.salary_min)} VNĐ`;
  return "Chưa có thông tin";
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
  remote: "Từ xa",
  internship: "Thực tập",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  active: "Đang tuyển",
  closed: "Đã đóng",
  expired: "Hết hạn",
};

export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function calculateTrendPoints(
  jobs: AdminJob[],
  applications: AdminApplication[],
  days: number,
  endDate: string = "2026-10-16T12:00:00Z",
): TrendPoint[] {
  const end = new Date(endDate);
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - days + index + 1);
    const iso = day.toISOString().slice(0, 10);
    const dayJobs = jobs.filter((job) => job.created_at === iso);
    const dayApps = applications.filter((app) => app.created_at === iso);
    return {
      date: iso,
      jobs: dayJobs.length,
      applications: dayApps.length,
    };
  });
}
