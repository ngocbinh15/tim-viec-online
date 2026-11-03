export type MessageDelivery = { delivery?: "sending" | "failed" };
export type ChatMessageEvent = {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  image_url?: string | null;
  is_read?: boolean;
  read_at?: string | null;
};
export type ReadReceiptEvent = {
  conversation_id: number;
  reader_id: number;
  read_at: string;
};
export type NotificationEvent = {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
  read_at: string | null;
  data?: { conversation_id?: number; application_id?: number; job_id?: number };
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const validId = (value: unknown) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0;
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

export function parseChatMessage(value: unknown): ChatMessageEvent | null {
  const item = object(value);
  if (
    !validId(item.id) ||
    !validId(item.conversation_id) ||
    !validId(item.sender_id) ||
    !date(item.created_at)
  )
    return null;
  return {
    id: Number(item.id),
    conversation_id: Number(item.conversation_id),
    sender_id: Number(item.sender_id),
    message: typeof item.message === "string" ? item.message : "",
    created_at: String(item.created_at),
    image_url: typeof item.image_url === "string" ? item.image_url : null,
    is_read: item.is_read === true,
    read_at: typeof item.read_at === "string" ? item.read_at : null,
  };
}
export function parseReadReceipt(value: unknown): ReadReceiptEvent | null {
  const item = object(value);
  if (
    !validId(item.conversation_id) ||
    !validId(item.reader_id) ||
    !date(item.read_at)
  )
    return null;
  return {
    conversation_id: Number(item.conversation_id),
    reader_id: Number(item.reader_id),
    read_at: String(item.read_at),
  };
}
export function parseNotification(value: unknown): NotificationEvent | null {
  const item = object(value);
  if (
    !validId(item.id) ||
    !date(item.created_at) ||
    typeof item.type !== "string"
  )
    return null;
  return {
    id: Number(item.id),
    title: String(item.title ?? ""),
    content: String(item.content ?? ""),
    type: item.type,
    created_at: String(item.created_at),
    read_at: typeof item.read_at === "string" ? item.read_at : null,
    data: object(item.data),
  };
}
export function mergeChatMessages<
  T extends { id: string; created_at: string; delivery?: string },
>(current: T[], incoming: T[], replaceId?: string): T[] {
  const messages = new Map(
    current
      .filter((item) => item.id !== replaceId)
      .map((item) => [item.id, item]),
  );
  for (const item of incoming) messages.set(item.id, item);
  return [...messages.values()].sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      (Number(a.id) || Number.MAX_SAFE_INTEGER) -
        (Number(b.id) || Number.MAX_SAFE_INTEGER),
  );
}
export function messageHistoryPath(
  id: number,
  mode: "latest" | "older" | "newer" = "latest",
  cursor?: number,
) {
  const parameter =
    mode === "older" && cursor
      ? `before_id=${cursor}`
      : mode === "newer" && cursor
        ? `after_id=${cursor}`
        : "latest=1";
  return `/conversations/${id}/messages?per_page=50&${parameter}`;
}
export function receiptIncludesMessage(
  receipt: ReadReceiptEvent,
  message: { conversation_id: number; created_at: string },
  senderId: number,
) {
  return (
    receipt.conversation_id === message.conversation_id &&
    receipt.reader_id !== senderId &&
    Date.parse(message.created_at) <= Date.parse(receipt.read_at)
  );
}
