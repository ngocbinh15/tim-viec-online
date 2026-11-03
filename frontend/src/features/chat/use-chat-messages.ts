"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { apiRequest } from "@/features/api/client";
import {
  mergeChatMessages,
  messageHistoryPath,
  type MessageDelivery,
} from "./updates";

type Message = MessageDelivery & {
  id: string;
  conversation_id: number;
  created_at: string;
  message: string;
  image_url?: string;
};
type Outgoing = {
  conversation: number;
  text: string;
  image?: File | null;
  preview?: string;
};
type History = { loaded: boolean; loading: boolean; hasOlder: boolean };

/** Keep history bounded on first paint; older pages remain explicitly accessible. */
export function useChatMessages<T extends Message>(
  initial: T[],
  api: boolean,
  decode: (raw: unknown, conversation: number) => T,
  senderId: number,
) {
  const [messages, setMessages] = useState(initial);
  const [history, setHistory] = useState<Record<number, History>>({});
  const [sending, setSending] = useState<Record<number, boolean>>({});
  const latestMessages = useRef(messages);
  const latestHistory = useRef(history);
  const mapper = useRef(decode);
  useLayoutEffect(() => {
    latestMessages.current = messages;
    latestHistory.current = history;
    mapper.current = decode;
  });
  const loading = useRef(new Map<number, Promise<void>>());
  // Preview and WebSocket messages may jump ahead of fully reconciled history.
  const reconciled = useRef(new Map<number, number>());
  const locks = useRef(new Set<number>());
  const outbox = useRef(new Map<string, Outgoing>());
  useEffect(
    () => () => {
      for (const item of outbox.current.values())
        if (item.preview) URL.revokeObjectURL(item.preview);
    },
    [],
  );

  const loadMessages = useCallback(
    (id: number, older = false): Promise<void> => {
      if (!api) return Promise.resolve();
      const existing = loading.current.get(id);
      if (existing) return existing;
      const request = (async () => {
        const previous = latestHistory.current[id];
        const ids = latestMessages.current
          .filter(
            (item) => item.conversation_id === id && /^\d+$/.test(item.id),
          )
          .map((item) => Number(item.id));
        if (older && (!previous?.loaded || !previous.hasOlder || !ids.length))
          return;
        setHistory((current) => ({
          ...current,
          [id]: {
            loaded: previous?.loaded ?? false,
            hasOlder: previous?.hasOlder ?? false,
            // Background reconciliation must not insert a row into visible history.
            loading: older || !previous?.loaded,
          },
        }));
        try {
          const response = await apiRequest<unknown[]>(
            messageHistoryPath(
              id,
              older ? "older" : "latest",
              older ? Math.min(...ids) : undefined,
            ),
          );
          if (!Array.isArray(response.data))
            throw new Error("Không tải được lịch sử tin nhắn.");
          const next = response.data.map((item) => mapper.current(item, id));
          // Catch up a burst beyond the newest window without re-reading old history.
          const newestKnown = reconciled.current.get(id) ?? 0;
          if (
            !older &&
            previous?.loaded &&
            newestKnown &&
            next.length === 50 &&
            next.every((item) => Number(item.id) > newestKnown)
          ) {
            let cursor = newestKnown;
            let more = true;
            while (more) {
              const gap = await apiRequest<unknown[]>(
                messageHistoryPath(id, "newer", cursor),
              );
              if (!Array.isArray(gap.data))
                throw new Error("Không tải được lịch sử tin nhắn.");
              const batch = gap.data.map((item) => mapper.current(item, id));
              if (!batch.length) break;
              next.push(...batch);
              const newest = Math.max(...batch.map((item) => Number(item.id)));
              if (newest <= cursor) break;
              cursor = newest;
              more = Boolean(gap.meta?.has_more);
            }
          }
          if (!older)
            reconciled.current.set(
              id,
              Math.max(newestKnown, ...next.map((item) => Number(item.id))),
            );
          setMessages((current) => {
            const oldest = next.length
              ? Math.min(...next.map((item) => Number(item.id)))
              : 0;
            const retained =
              previous?.loaded || older || !oldest
                ? current
                : current.filter(
                    (item) =>
                      item.conversation_id !== id ||
                      item.delivery ||
                      Number(item.id) >= oldest,
                  );
            return mergeChatMessages(retained, next);
          });
          setHistory((current) => ({
            ...current,
            [id]: {
              loaded: true,
              loading: false,
              hasOlder:
                older || !previous?.loaded || !newestKnown
                  ? Boolean(response.meta?.has_more)
                  : (current[id]?.hasOlder ?? false),
            },
          }));
        } catch (error) {
          setHistory((current) => ({
            ...current,
            [id]: {
              loaded: previous?.loaded ?? false,
              hasOlder: previous?.hasOlder ?? false,
              loading: false,
            },
          }));
          throw error;
        }
      })();
      loading.current.set(id, request);
      void request.finally(() => loading.current.delete(id)).catch(() => {});
      return request;
    },
    [api],
  );

  const transmit = useCallback(
    async (localId: string, item: Outgoing): Promise<string | null> => {
      if (locks.current.has(item.conversation))
        return "Tin nhắn đang được gửi, vui lòng chờ.";
      locks.current.add(item.conversation);
      setSending((current) => ({ ...current, [item.conversation]: true }));
      setMessages((current) =>
        current.map((message) =>
          message.id === localId
            ? { ...message, delivery: "sending" }
            : message,
        ),
      );
      try {
        const body = new FormData();
        body.set("message", item.text.trim());
        if (item.image) body.set("image", item.image);
        const response = await apiRequest<unknown>(
          `/conversations/${item.conversation}/messages`,
          {
            method: "POST",
            body: item.image
              ? body
              : JSON.stringify({ message: item.text.trim() }),
          },
        );
        const message = mapper.current(response.data, item.conversation);
        setMessages((current) =>
          mergeChatMessages(current, [message], localId),
        );
        outbox.current.delete(localId);
        if (item.preview) URL.revokeObjectURL(item.preview);
        return null;
      } catch (error) {
        setMessages((current) =>
          current.map((message) =>
            message.id === localId
              ? { ...message, delivery: "failed" }
              : message,
          ),
        );
        return error instanceof Error
          ? error.message
          : "Không thể gửi tin nhắn. Bạn có thể thử lại.";
      } finally {
        locks.current.delete(item.conversation);
        setSending((current) => ({ ...current, [item.conversation]: false }));
      }
    },
    [],
  );
  const sendMessage = useCallback(
    (id: number, text: string, image?: File | null) => {
      if (locks.current.has(id))
        return Promise.resolve("Tin nhắn đang được gửi, vui lòng chờ.");
      const localId = `pending:${crypto.randomUUID()}`;
      const preview = image ? URL.createObjectURL(image) : undefined;
      const item = { conversation: id, text, image, preview };
      outbox.current.set(localId, item);
      const pending = {
        ...mapper.current(
          {
            id: localId,
            conversation_id: id,
            sender_id: senderId,
            message: text.trim(),
            created_at: new Date().toISOString(),
            is_read: false,
          },
          id,
        ),
        ...(preview ? { image_url: preview } : {}),
        delivery: "sending" as const,
      };
      setMessages((current) => mergeChatMessages(current, [pending]));
      return transmit(localId, item);
    },
    [senderId, transmit],
  );
  const retryMessage = useCallback(
    (id: string) => {
      const item = outbox.current.get(id);
      return item ? transmit(id, item) : Promise.resolve(null);
    },
    [transmit],
  );
  return {
    messages,
    setMessages,
    history,
    sending,
    loadMessages,
    sendMessage,
    retryMessage,
  };
}
