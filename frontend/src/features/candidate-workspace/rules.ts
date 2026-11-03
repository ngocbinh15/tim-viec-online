import { API_APPLICATION_LABELS } from "./types";

export const WORKSPACE_PAGE_SIZE = 6;

export function parseWorkspaceQuery(params: {
  get(name: string): string | null;
}) {
  const rawPage = params.get("page") ?? "1";
  const rawStatus = params.get("status") ?? "";
  const page =
    /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage))
      ? Number(rawPage)
      : 1;
  return {
    tab:
      params.get("tab") === "saved" ? ("saved" as const) : ("applied" as const),
    status: Object.hasOwn(API_APPLICATION_LABELS, rawStatus)
      ? (rawStatus as keyof typeof API_APPLICATION_LABELS)
      : ("" as const),
    page,
  };
}
export function pageSlice<T>(
  items: T[],
  requested: number,
  perPage = WORKSPACE_PAGE_SIZE,
) {
  const lastPage = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(1, requested), lastPage);
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    page,
    lastPage,
  };
}
export function validateMessage(message: string): string | null {
  if (!message.trim()) return "Nhập nội dung tin nhắn trước khi gửi.";
  if (message.trim().length > 1000) return "Tin nhắn không quá 1.000 ký tự.";
  return null;
}
