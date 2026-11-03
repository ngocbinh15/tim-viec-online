"use client";
import { useEffect } from "react";
import { apiRequest } from "@/features/api/client";
import { liveConversations } from "@/features/api/live";
import type { PublicRealtimeConfig } from "@/features/api/realtime-config";
import {
  parseChatMessage,
  parseNotification,
  parseReadReceipt,
} from "@/features/chat/updates";

export function BackendRealtime({
  userId,
  config,
}: {
  userId: number;
  config: PublicRealtimeConfig;
}) {
  useEffect(() => {
    const key = config.key;
    if (!key) return;
    let disposed = false;
    let disconnect = () => {};
    let reconcile = () => {};
    void import("pusher-js")
      .then(({ default: Pusher }) => {
        if (disposed) return;
        const client = new Pusher(key, {
          cluster: "mt1",
          wsHost: config.host || window.location.hostname,
          wsPort: config.port,
          wssPort: config.port,
          forceTLS: config.tls,
          enabledTransports: ["ws", "wss"],
          channelAuthorization: {
            customHandler: (params, callback) => {
              apiRequest<{ auth: string }>("/broadcasting/auth", {
                method: "POST",
                body: JSON.stringify({
                  socket_id: params.socketId,
                  channel_name: params.channelName,
                }),
              })
                .then((result) => callback(null, result.data))
                .catch(() =>
                  callback(new Error("Không thể xác thực kết nối."), null),
                );
            },
          },
        });
        const refresh = () =>
          window.dispatchEvent(new Event("backend:refresh"));
        const user = client.subscribe(`private-App.Models.User.${userId}`);
        user.bind("notification.sent", (value: unknown) => {
          const notification = parseNotification(value);
          if (!notification) return;
          window.dispatchEvent(
            new CustomEvent("backend:notification", { detail: notification }),
          );
          // Chat updates merge their payloads locally; application changes still reconcile workspace data.
          if (
            notification.type !== "new_message" &&
            notification.type !== "chat"
          )
            refresh();
        });
        const watched = new Set<number>();
        reconcile = () => {
          const wanted = new Set(liveConversations());
          for (const id of watched)
            if (!wanted.has(id)) {
              client.unsubscribe(`private-chat.${id}`);
              watched.delete(id);
            }
          for (const id of wanted)
            if (!watched.has(id)) {
              const channel = client.subscribe(`private-chat.${id}`);
              channel.bind("message.sent", (value: unknown) => {
                const message = parseChatMessage(value);
                if (message)
                  window.dispatchEvent(
                    new CustomEvent("backend:message", { detail: message }),
                  );
              });
              channel.bind("messages.read", (value: unknown) => {
                const receipt = parseReadReceipt(value);
                if (receipt)
                  window.dispatchEvent(
                    new CustomEvent("backend:messages-read", {
                      detail: receipt,
                    }),
                  );
              });
              watched.add(id);
            }
        };
        reconcile();
        client.connection.bind("connected", refresh);
        disconnect = () => client.disconnect();
      })
      .catch(() => {
        /* Periodic reconciliation continues when WebSocket is unavailable. */
      });
    const update = () => reconcile();
    window.addEventListener("backend:conversations", update);
    return () => {
      disposed = true;
      disconnect();
      window.removeEventListener("backend:conversations", update);
    };
  }, [userId, config.key, config.host, config.port, config.tls]);
  return null;
}
