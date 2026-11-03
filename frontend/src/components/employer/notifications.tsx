"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BellRing,
  BriefcaseBusiness,
  CheckCheck,
  FilePlus2,
  MessageSquare,
  UserMinus,
} from "lucide-react";
import { Pagination } from "@/components/layout/pagination";
import { pageSlice } from "@/features/candidate-workspace/rules";
import { isJobOpen, vietnamToday } from "@/features/jobs/formatters";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { RelativeTime } from "@/components/feedback/relative-time";
import { useEmployer } from "./employer-provider";
import {
  NotificationPeriodSelect,
  useNotificationClock,
} from "@/components/feedback/notification-period";
import {
  filterNotificationPeriod,
  notificationPeriod,
  notificationUrl,
} from "@/features/notifications/period";
import "./employer-notifications.css";

const date = (value: string, includeTime = false) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));

export function EmployerNotifications() {
  const state = useEmployer();
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
  async function markRead(source: HTMLButtonElement, id?: number) {
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
    const error = await state.markRead(id);
    if (error) {
      readFocus.current = null;
      toast.error(error);
    }
    return !error;
  }
  const params = useSearchParams();
  const filter =
    params.get("read") === "unread"
      ? "unread"
      : params.get("read") === "read"
        ? "read"
        : "all";
  const unread = state.notifications.filter((item) => !item.read_at).length;
  const period = notificationPeriod(params.get("period"));
  const inPeriod = filterNotificationPeriod(state.notifications, period, now);
  const periodUnread = inPeriod.filter((item) => !item.read_at).length;
  const newApplications = state.applications.filter(
    (item) => item.status === "applied",
  ).length;
  const unreadConversations = state.conversations.filter((conversation) =>
    state.messages.some(
      (message) =>
        message.conversation_id === conversation.id &&
        message.sender_id !== state.user.id &&
        !message.is_read,
    ),
  ).length;
  const openJobs = state.jobs.filter((job) =>
    isJobOpen(job, state.today),
  ).length;
  const sorted = [...inPeriod].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const items = sorted.filter(
    (item) =>
      filter === "all" || (filter === "read" ? !!item.read_at : !item.read_at),
  );
  const rawPage = Number(params.get("page"));
  const result = pageSlice(
    items,
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  );
  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>Thông báo</h1>
          <p>Theo dõi hồ sơ mới và tin nhắn theo từng vị trí tuyển dụng.</p>
        </div>
      </div>
      <div className="em-not-layout">
        <section
          ref={list}
          className="ep-panel em-not-panel"
          aria-labelledby="em-not-title"
        >
          <div className="em-not-heading">
            <div>
              <h2 ref={heading} tabIndex={-1} id="em-not-title">
                Thông báo của bạn
              </h2>
              <p role="status">
                {unread
                  ? `${unread} thông báo chưa đọc`
                  : "Bạn đã đọc tất cả thông báo"}
              </p>
            </div>
            <div className="em-not-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Đánh dấu tất cả đã đọc"
                disabled={!unread || state.pending}
                onClick={async (event) => {
                  if (await markRead(event.currentTarget))
                    toast.success(`Đã đánh dấu ${unread} thông báo là đã đọc.`);
                }}
              >
                <CheckCheck aria-hidden="true" />
                {unread ? "Đọc tất cả" : "Đã đọc tất cả"}
              </Button>
            </div>
          </div>
          <div className="em-not-toolbar">
            <nav className="em-not-tabs" aria-label="Lọc trạng thái đọc">
              {[
                ["all", "Tất cả", inPeriod.length],
                ["unread", "Chưa đọc", periodUnread],
                ["read", "Đã đọc", inPeriod.length - periodUnread],
              ].map(([value, label, count]) => (
                <Link
                  key={value}
                  href={notificationUrl(
                    "/employer/notifications",
                    String(value),
                    period,
                  )}
                  aria-current={filter === value ? "page" : undefined}
                >
                  {label}
                  <small>{count}</small>
                </Link>
              ))}
            </nav>
            <NotificationPeriodSelect
              value={period}
              onChange={(next) =>
                router.push(
                  notificationUrl("/employer/notifications", filter, next),
                  { scroll: false },
                )
              }
            />
          </div>
          {!items.length && (
            <div className="em-not-empty" role="status">
              <Bell size={36} aria-hidden="true" />
              <h3>
                {state.notifications.length
                  ? "Không có thông báo trong mục này"
                  : "Chưa có thông báo mới"}
              </h3>
              <p>
                Các cập nhật về hồ sơ và tin nhắn của ứng viên sẽ xuất hiện tại
                đây.
              </p>
              {(filter !== "all" || period !== "all") && (
                <Link className="ep-text-link" href="/employer/notifications">
                  Xem tất cả thông báo
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
          {result.items.map((item, index) => {
            const notificationDay = vietnamToday(new Date(item.created_at));
            const Icon =
              item.type === "new_message"
                ? MessageSquare
                : item.type === "withdrawn"
                  ? UserMinus
                  : FilePlus2;
            const safeHref =
              /^\/employer\/(?:candidates(?:\/[1-9]\d*)?|messages)(?:\?[^#]*)?$/.test(
                item.href,
              )
                ? item.href
                : "/employer/candidates";
            const target = new URL(safeHref, "https://workspace.invalid");
            const isMessage = target.pathname === "/employer/messages";
            const applicationId =
              target.pathname.match(
                /^\/employer\/candidates\/([1-9]\d*)$/,
              )?.[1] ?? target.searchParams.get("application");
            const conversation = state.conversations.find(
              (entry) =>
                isMessage &&
                entry.employer_id === state.user.id &&
                String(entry.id) === target.searchParams.get("conversation"),
            );
            const application = state.applications.find(
              (entry) =>
                (!isMessage && String(entry.id) === applicationId) ||
                (isMessage &&
                  entry.id === conversation?.application_id &&
                  entry.job_id === conversation.job_id &&
                  entry.candidate_user_id === conversation.candidate_id),
            );
            const job = state.jobs.find(
              (entry) =>
                entry.id === application?.job_id &&
                entry.company_id === state.company.id,
            );
            const href = job ? safeHref : "/employer/candidates";
            return (
              <Fragment key={item.id}>
                {(index === 0 ||
                  vietnamToday(new Date(result.items[index - 1].created_at)) !==
                    notificationDay) && (
                  <div className="em-not-day">
                    {notificationDay === state.today ? "Hôm nay" : "Trước đó"} ·{" "}
                    {date(item.created_at)}
                  </div>
                )}
                <article className="em-not-item" data-unread={!item.read_at}>
                  <span className="em-not-glyph">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div className="em-not-copy">
                    <div className="em-not-title">
                      <h3>{item.title}</h3>
                      {item.read_at ? (
                        <span className="em-not-read">Đã đọc</span>
                      ) : (
                        <span
                          className="em-not-dot"
                          role="img"
                          aria-label="Chưa đọc"
                        />
                      )}
                    </div>
                    <p>{item.content}</p>
                    {job && application && (
                      <div className="em-not-job-context">
                        <BriefcaseBusiness size={16} aria-hidden="true" />
                        <div>
                          <strong>{job.title}</strong>
                          <span>
                            Tin #{job.id} · Hồ sơ #{application.id}
                            {!isJobOpen(job, state.today)
                              ? " · Tin đã đóng / hết hạn"
                              : ""}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="em-not-footer">
                      {!item.read_at && (
                        <button
                          type="button"
                          data-notification-read=""
                          disabled={state.pending}
                          onClick={(event) =>
                            markRead(event.currentTarget, item.id)
                          }
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                      <RelativeTime value={item.created_at} />
                      <Link
                        className="ep-text-link"
                        href={href}
                        onClick={async () => {
                          const error = await state.markRead(item.id);
                          if (error) toast.error(error);
                        }}
                      >
                        {item.type === "new_message"
                          ? "Xem tin nhắn"
                          : "Xem hồ sơ"}
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              </Fragment>
            );
          })}
          <div className="em-not-pagination">
            <Pagination
              page={result.page}
              lastPage={result.lastPage}
              pageUrl={(page) =>
                notificationUrl("/employer/notifications", filter, period, page)
              }
              label="Phân trang thông báo"
            />
          </div>
        </section>
        <aside className="em-not-aside">
          <section className="ep-panel em-not-summary">
            <span className="em-not-aside-icon">
              <BellRing aria-hidden="true" />
            </span>
            <h2>Tóm tắt thông báo</h2>
            <p>Số thông báo chưa đọc theo từng loại cập nhật.</p>
            <dl>
              {[
                ["new_applicant", "Hồ sơ mới"],
                ["new_message", "Tin nhắn"],
                ["withdrawn", "Hồ sơ đã rút"],
              ].map(([type, label]) => (
                <div key={type}>
                  <dt>{label}</dt>
                  <dd>
                    {
                      inPeriod.filter(
                        (item) => item.type === type && !item.read_at,
                      ).length
                    }
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="ep-panel em-not-summary em-not-work-summary">
            <h2>Cần theo dõi</h2>
            <Link href="/employer/candidates?status=applied">
              <span>Hồ sơ mới chưa xem CV</span>
              <strong>{newApplications}</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/employer/messages">
              <span>Hội thoại chưa đọc</span>
              <strong>{unreadConversations}</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/employer/jobs?status=active">
              <span>Tin đang tuyển</span>
              <strong>{openJobs}</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
