"use client";
import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCheck, FileCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { pageSlice } from "@/features/candidate-workspace/rules";
import { candidateNotificationHref } from "@/features/candidate-workspace/notification-link";
import { RelativeTime } from "@/components/feedback/relative-time";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { useWorkspace } from "./workspace-provider";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceEmpty, WorkspaceTitle } from "./workspace-ui";
import {
  NotificationPeriodSelect,
  useNotificationClock,
} from "@/components/feedback/notification-period";
import {
  filterNotificationPeriod,
  notificationPeriod,
  notificationUrl,
} from "@/features/notifications/period";

export function CandidateNotifications() {
  const state = useWorkspace();
  const router = useRouter();
  const now = useNotificationClock();
  const list = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const readFocus = useRef<{ source: HTMLButtonElement; index: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const pending = readFocus.current;
    readFocus.current = null;
    if (
      !pending ||
      (document.activeElement !== pending.source &&
        document.activeElement !== document.body)
    )
      return;
    const remaining = list.current?.querySelectorAll<HTMLButtonElement>(
      "[data-notification-read]",
    );
    const next =
      pending.index >= 0 && remaining?.length
        ? remaining[Math.min(pending.index, remaining.length - 1)]
        : heading.current;
    next?.focus({ preventScroll: true });
  }, [state.notifications]);
  function markRead(source: HTMLButtonElement, id?: number) {
    if (document.activeElement === source) {
      const actions = Array.from(
        list.current?.querySelectorAll<HTMLButtonElement>(
          "[data-notification-read]",
        ) ?? [],
      );
      readFocus.current = {
        source,
        index: id === undefined ? -1 : actions.indexOf(source),
      };
    }
    void state
      .markRead(id)
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể cập nhật thông báo.",
        ),
      );
  }
  const params = useSearchParams();
  const filter = ["read", "unread"].includes(params.get("read") ?? "")
    ? params.get("read")!
    : "all";
  const unread = state.notifications.filter((item) => !item.read_at).length;
  const period = notificationPeriod(params.get("period"));
  const inPeriod = filterNotificationPeriod(state.notifications, period, now);
  const periodUnread = inPeriod.filter((item) => !item.read_at).length;
  const items = inPeriod.filter(
    (item) =>
      filter === "all" || (filter === "read" ? !!item.read_at : !item.read_at),
  );
  const rawPage = Number(params.get("page"));
  const result = pageSlice(
    items,
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  );
  return (
    <WorkspaceFrame section="notifications">
      <WorkspaceTitle title="Thông báo của bạn">
        <Button
          variant="ghost"
          type="button"
          onClick={(event) => markRead(event.currentTarget)}
          disabled={!unread || state.pending["notification:all"]}
        >
          <CheckCheck aria-hidden="true" />
          Đánh dấu tất cả đã đọc
        </Button>
      </WorkspaceTitle>
      <section
        ref={list}
        className="cu-card"
        aria-label="Thông báo ứng tuyển và tin nhắn"
      >
        <h2 ref={heading} tabIndex={-1} className="cu-notification-heading">
          Ứng tuyển & tin nhắn
        </h2>
        <NotificationPeriodSelect
          value={period}
          onChange={(next) =>
            router.push(
              notificationUrl("/account/notifications", filter, next),
              { scroll: false },
            )
          }
        />
        <div
          className="cu-notification-filters"
          aria-label="Lọc trạng thái đọc"
        >
          {[
            ["all", "Tất cả"],
            ["unread", `Chưa đọc (${periodUnread})`],
            ["read", "Đã đọc"],
          ].map(([value, label]) => (
            <Link
              href={notificationUrl("/account/notifications", value, period)}
              key={value}
              aria-current={filter === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        {!items.length && (
          <WorkspaceEmpty
            title="Không có thông báo trong mục này"
            href="/account/notifications"
            link="Xem tất cả thông báo"
          />
        )}
        {result.items.map((item) => (
          <article
            className="cu-notification"
            data-unread={!item.read_at}
            key={item.id}
          >
            {item.type === "new_message" ? (
              <MessageSquare aria-hidden="true" />
            ) : (
              <FileCheck aria-hidden="true" />
            )}
            <div>
              <h2>{item.title}</h2>
              <p>{item.content}</p>
              <Link
                href={candidateNotificationHref(
                  item,
                  state.applications,
                  state.conversations,
                )}
                className="cu-link"
                onClick={() => {
                  void state
                    .markRead(item.id)
                    .catch((error) =>
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Không thể cập nhật thông báo.",
                      ),
                    );
                }}
              >
                {item.type === "new_message"
                  ? "Xem tin nhắn"
                  : "Theo dõi ứng tuyển"}
              </Link>
              <p className="cu-muted">
                <RelativeTime value={item.created_at} /> ·{" "}
                {item.read_at ? "Đã đọc" : "Chưa đọc"}
              </p>
              {!item.read_at && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-notification-read=""
                  onClick={(event) => markRead(event.currentTarget, item.id)}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </div>
          </article>
        ))}
        <Pagination
          page={result.page}
          lastPage={result.lastPage}
          pageUrl={(page) =>
            notificationUrl("/account/notifications", filter, period, page)
          }
          label="Phân trang thông báo"
        />
      </section>
    </WorkspaceFrame>
  );
}
