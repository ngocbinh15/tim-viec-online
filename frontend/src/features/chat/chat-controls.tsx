"use client";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import type { MessageDelivery } from "./updates";

export function ChatHistoryControl({
  loading,
  hasOlder,
  onLoad,
}: {
  loading?: boolean;
  hasOlder?: boolean;
  onLoad: () => void;
}) {
  if (!loading && !hasOlder) return null;
  return (
    <div className="flex justify-center py-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={loading}
        onClick={onLoad}
      >
        {loading ? "Đang tải tin nhắn…" : "Xem tin nhắn cũ hơn"}
      </Button>
    </div>
  );
}
export function ChatDelivery({
  delivery,
  retry,
}: MessageDelivery & { retry: () => void }) {
  if (!delivery) return null;
  return (
    <span aria-live="polite">
      {delivery === "sending" ? (
        " · Đang gửi…"
      ) : (
        <>
          {" "}
          · Chưa gửi{" "}
          <button
            type="button"
            className="ml-1 min-h-8 cursor-pointer underline underline-offset-2"
            onClick={retry}
          >
            Thử lại
          </button>
        </>
      )}
    </span>
  );
}
