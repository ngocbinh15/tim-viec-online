"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLiveRefresh } from "@/features/api/live";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Info,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { isJobOpen, vietnamToday } from "@/features/jobs/formatters";
import { normalizeSearch } from "@/features/jobs/query";
import { handleMessageComposerKeyDown } from "@/lib/message-composer";
import { ChatAttachment } from "@/features/chat/chat-attachment";
import { APPLICATION_LABELS } from "@/features/employer/types";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/modules/cores/shadcn/components/ui/field";
import { useChatScroll } from "@/components/candidate/use-chat-scroll";
import {
  ChatDelivery,
  ChatHistoryControl,
} from "@/features/chat/chat-controls";
import { useEmployer } from "./employer-provider";
import "./employer-messages.css";

const date = (value: string, includeTime = false) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));
const time = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("");

function CandidateChatAvatar({
  name,
  source,
}: {
  name: string;
  source?: string | null;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span className="em-chat-avatar" aria-hidden="true">
      {source && failedSource !== source ? (
        <Image
          key={source}
          src={source}
          alt=""
          width={40}
          height={40}
          unoptimized
          onError={() => setFailedSource(source)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
function resizeComposer(node: HTMLTextAreaElement | null) {
  if (!node?.clientWidth) return;
  node.style.height = "auto";
  node.style.height = `${Math.min(132, Math.max(44, node.scrollHeight))}px`;
  node.style.overflowY = node.scrollHeight > 132 ? "auto" : "hidden";
}

export function EmployerMessages() {
  const state = useEmployer();
  const { markConversationRead, loadConversation } = state;
  const router = useRouter();
  const requested = useSearchParams().get("conversation");
  const conversations = state.conversations.filter(
    (item) =>
      item.employer_id === state.user.id &&
      state.applications.some(
        (application) =>
          application.id === item.application_id &&
          application.job_id === item.job_id &&
          application.candidate_user_id === item.candidate_id,
      ),
  );
  const conversation =
    conversations.find((item) => String(item.id) === requested) ??
    (requested === null ? conversations[0] : undefined);
  const application = state.applications.find(
    (item) => item.id === conversation?.application_id,
  );
  const job = state.jobs.find((item) => item.id === conversation?.job_id);
  const activeId = conversation?.id;
  const messages = state.messages.filter(
    (item) => item.conversation_id === activeId,
  );
  const hasUnread = messages.some(
    (item) => item.sender_id !== state.user.id && !item.is_read,
  );
  const draft = activeId === undefined ? "" : (state.drafts[activeId] ?? "");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<{ id: number; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [attachment, setAttachment] = useState<{
    conversationId: number;
    file: File;
  } | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousRequested = useRef(requested);
  const { scrollRef, onScroll, scrollBottom, atBottom, preserveScroll } =
    useChatScroll(activeId, messages.at(-1)?.id, requested, messages[0]?.id);
  useEffect(() => {
    if (requested === null && window.matchMedia("(max-width: 760px)").matches)
      return;
    if (activeId !== undefined && hasUnread) markConversationRead(activeId);
  }, [activeId, hasUnread, markConversationRead, requested]);
  useEffect(() => {
    if (
      activeId === undefined ||
      (requested === null && window.matchMedia("(max-width: 760px)").matches)
    )
      return;
    void loadConversation(activeId);
  }, [activeId, requested, loadConversation]);
  const refreshActive = async () => {
    if (
      activeId !== undefined &&
      (requested !== null || !window.matchMedia("(max-width: 760px)").matches)
    )
      await loadConversation(activeId);
  };
  useLiveRefresh(
    refreshActive,
    state.apiMode,
    activeId === undefined ? [] : [activeId],
  );
  useLayoutEffect(
    () => resizeComposer(composer.current),
    [draft, activeId, requested],
  );
  useEffect(() => {
    const resize = () => resizeComposer(composer.current);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (previousRequested.current === requested) return;
    if (requested !== null) heading.current?.focus({ preventScroll: true });
    else
      (
        document.getElementById(
          `em-conversation-${previousRequested.current}`,
        ) ?? searchInput.current
      )?.focus({ preventScroll: true });
    previousRequested.current = requested;
  }, [requested]);
  const updateDraft = (value: string) => {
    if (!conversation) return;
    state.setDraft(conversation.id, value);
    setError(null);
    setAnnouncement("");
  };
  const send = async () => {
    if (!conversation || state.messageSending[conversation.id]) return;
    const result = state.sendMessage(
      conversation.id,
      attachment?.conversationId === conversation.id ? attachment.file : null,
    );
    if (draft.trim() || attachment?.conversationId === conversation.id)
      setAttachment(null);
    scrollBottom();
    composer.current?.focus({ preventScroll: true });
    const issue = await result;
    setError(issue ? { id: conversation.id, text: issue } : null);
    if (!issue) {
      setAnnouncement(
        state.apiMode
          ? "Đã gửi tin nhắn."
          : "Tin nhắn đã được thêm vào bản xem trước.",
      );
    }
  };
  const visible = conversations.filter((item) => {
    const person = state.applications.find(
      (application) => application.id === item.application_id,
    );
    const position = state.jobs.find((job) => job.id === item.job_id);
    return normalizeSearch(
      `${person?.name ?? ""} ${position?.title ?? ""}`,
    ).includes(normalizeSearch(search));
  });
  const activeError = error && error.id === activeId ? error.text : "";
  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>Tin nhắn</h1>
          <p>Trao đổi với ứng viên theo từng hồ sơ và vị trí tuyển dụng.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/employer/candidates">
            <Users aria-hidden="true" />
            Hồ sơ ứng viên
          </Link>
        </Button>
      </div>
      <section
        className="ep-panel em-chat"
        data-open={requested !== null}
        aria-label="Tin nhắn tuyển dụng"
      >
        <aside className="em-chat-list" aria-label="Danh sách hội thoại">
          <div className="em-chat-list-heading">
            <h2>Hội thoại</h2>
            <span className="ep-pill">{conversations.length}</span>
          </div>
          <Field className="em-chat-search">
            <FieldLabel htmlFor="em-conversation-search" className="sr-only">
              Tìm hội thoại
            </FieldLabel>
            <div>
              <Search size={17} aria-hidden="true" />
              <Input
                ref={searchInput}
                id="em-conversation-search"
                value={search}
                placeholder="Tìm ứng viên, vị trí…"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Xóa tìm hội thoại"
                  onClick={() => {
                    setSearch("");
                    searchInput.current?.focus();
                  }}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </Field>
          <div className="em-chat-threads">
            {!visible.length && (
              <div className="em-chat-empty" role="status">
                <MessageSquare aria-hidden="true" />
                <strong>
                  {search
                    ? "Không tìm thấy hội thoại"
                    : "Chưa có cuộc trò chuyện"}
                </strong>
                <p>
                  {search
                    ? "Thử tên ứng viên hoặc vị trí khác."
                    : "Mở hồ sơ ứng tuyển để bắt đầu trao đổi với ứng viên."}
                </p>
              </div>
            )}
            {visible.map((item) => {
              const person = state.applications.find(
                (application) => application.id === item.application_id,
              )!;
              const position = state.jobs.find((job) => job.id === item.job_id);
              const threadMessages = state.messages.filter(
                (message) => message.conversation_id === item.id,
              );
              const last = threadMessages.at(-1);
              const unread = threadMessages.filter(
                (message) =>
                  message.sender_id !== state.user.id && !message.is_read,
              ).length;
              return (
                <button
                  type="button"
                  id={`em-conversation-${item.id}`}
                  key={item.id}
                  className="em-chat-thread"
                  aria-pressed={activeId === item.id}
                  onClick={() => {
                    setError(null);
                    setAnnouncement("");
                    router.replace(
                      `/employer/messages?conversation=${item.id}`,
                      { scroll: false },
                    );
                  }}
                >
                  <CandidateChatAvatar
                    name={person.name}
                    source={person.avatar_url}
                  />
                  <span className="em-chat-thread-copy">
                    <span className="em-chat-thread-top">
                      <strong>{person.name}</strong>
                      {last && (
                        <time dateTime={last.created_at}>
                          {vietnamToday(new Date(last.created_at)) ===
                          state.today
                            ? time(last.created_at)
                            : date(last.created_at).slice(0, 5)}
                        </time>
                      )}
                    </span>
                    <span className="em-chat-position">{position?.title}</span>
                    <span className="em-chat-thread-context">
                      Tin #{item.job_id} · Hồ sơ #{person.id}
                    </span>
                    <span className="em-chat-preview">
                      {last
                        ? `${last.sender_id === state.user.id ? "Bạn: " : ""}${last.message}`
                        : "Bắt đầu cuộc trò chuyện"}
                    </span>
                  </span>
                  {unread > 0 && (
                    <span
                      className="em-chat-unread"
                      aria-label={`${unread} tin nhắn chưa đọc`}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="em-chat-list-note">
            <ShieldCheck size={16} aria-hidden="true" />
            Hội thoại liên kết với hồ sơ ứng tuyển vào công ty.
          </p>
        </aside>
        <section
          className="em-chat-detail"
          aria-labelledby={
            conversation && application && job ? "em-chat-title" : undefined
          }
        >
          {conversation && application && job ? (
            <>
              <header className="em-chat-heading">
                <Button
                  className="em-chat-back"
                  variant="ghost"
                  size="icon"
                  aria-label="Danh sách hội thoại"
                  onClick={() =>
                    router.replace("/employer/messages", { scroll: false })
                  }
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <CandidateChatAvatar
                  name={application.name}
                  source={application.avatar_url}
                />
                <div>
                  <h2 id="em-chat-title" ref={heading} tabIndex={-1}>
                    {application.name}
                  </h2>
                  <p>
                    Hồ sơ #{application.id} · {application.title}
                  </p>
                </div>
                <Link
                  href={`/employer/candidates/${application.id}`}
                  className="ep-text-link em-chat-profile"
                >
                  Xem hồ sơ ứng tuyển
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </header>
              <div className="em-chat-context">
                <BriefcaseBusiness size={18} aria-hidden="true" />
                <div>
                  <span className="em-chat-context-label">
                    Vị trí ứng tuyển
                  </span>
                  <strong>{job.title}</strong>
                  <p>
                    Tin #{job.id} · Hồ sơ #{application.id} ·{" "}
                    {APPLICATION_LABELS[application.status]}
                  </p>
                </div>
                <span className="ep-pill">
                  {isJobOpen(job, state.today)
                    ? "Đang tuyển"
                    : "Tin đã đóng / hết hạn"}
                </span>
              </div>
              {!isJobOpen(job, state.today) && (
                <p className="em-chat-preserved">
                  <Info size={15} aria-hidden="true" />
                  Bạn vẫn có thể trao đổi với ứng viên khi tin tuyển dụng đã
                  đóng hoặc hết hạn.
                </p>
              )}
              <div className="em-chat-history">
                <div
                  className="em-chat-messages"
                  ref={scrollRef}
                  onScroll={onScroll}
                  role="region"
                  tabIndex={0}
                  aria-label={`Nội dung hội thoại với ${application.name}`}
                >
                  <ChatHistoryControl
                    {...state.messageHistory[conversation.id]}
                    onLoad={() => {
                      preserveScroll();
                      void loadConversation(conversation.id, true);
                    }}
                  />
                  {!messages.length &&
                    !state.messageHistory[conversation.id]?.loading && (
                      <div className="em-chat-empty">
                        <MessageSquare aria-hidden="true" />
                        <strong>Bắt đầu trao đổi với {application.name}</strong>
                        <p>
                          Giới thiệu về vị trí hoặc hẹn thời gian trao đổi phù
                          hợp.
                        </p>
                      </div>
                    )}
                  {messages.map((message, index) => {
                    const outgoing = message.sender_id === state.user.id;
                    const messageDay = vietnamToday(
                      new Date(message.created_at),
                    );
                    return (
                      <Fragment key={message.id}>
                        {(index === 0 ||
                          vietnamToday(
                            new Date(messages[index - 1].created_at),
                          ) !== messageDay) && (
                          <div className="em-chat-date">
                            <time dateTime={messageDay}>
                              {messageDay === state.today
                                ? "Hôm nay"
                                : date(message.created_at)}
                            </time>
                          </div>
                        )}
                        <article
                          className="em-chat-message"
                          data-outgoing={outgoing}
                          data-delivery={message.delivery}
                        >
                          <span className="sr-only">
                            {outgoing ? "Bạn" : application.name}
                          </span>
                          {message.image_url && (
                            <ChatAttachment src={message.image_url} />
                          )}
                          {message.message && <p>{message.message}</p>}
                          <small>
                            <time
                              dateTime={message.created_at}
                              title={date(message.created_at, true)}
                            >
                              {time(message.created_at)}
                            </time>
                            {outgoing && !message.delivery && message.is_read
                              ? " · Đã xem"
                              : ""}
                            <ChatDelivery
                              delivery={message.delivery}
                              retry={() => {
                                void state
                                  .retryMessage(message.id)
                                  .then((issue) =>
                                    setError(
                                      issue
                                        ? { id: conversation.id, text: issue }
                                        : null,
                                    ),
                                  );
                              }}
                            />
                          </small>
                        </article>
                      </Fragment>
                    );
                  })}
                </div>
                {!atBottom && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="em-chat-bottom"
                    onClick={scrollBottom}
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                    Xuống cuối
                  </Button>
                )}
              </div>
              <form
                className="em-chat-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <Field data-invalid={!!activeError}>
                  <FieldLabel htmlFor="em-message" className="sr-only">
                    Tin nhắn của bạn
                  </FieldLabel>
                  <div
                    className="em-chat-composer-box"
                    data-invalid={!!activeError}
                  >
                    <Textarea
                      ref={composer}
                      id="em-message"
                      rows={1}
                      maxLength={1000}
                      placeholder="Viết tin nhắn cho ứng viên…"
                      value={draft}
                      aria-invalid={!!activeError}
                      aria-describedby="em-message-hint em-message-error"
                      onChange={(event) => updateDraft(event.target.value)}
                      onKeyDown={(event) =>
                        handleMessageComposerKeyDown(event, updateDraft)
                      }
                    />
                    <Button
                      disabled={state.messageSending[conversation.id]}
                      type="submit"
                      size="icon"
                      aria-label="Gửi tin nhắn"
                    >
                      <Send size={18} aria-hidden="true" />
                    </Button>
                  </div>
                  <FieldError id="em-message-error">{activeError}</FieldError>
                </Field>
                {state.apiMode && (
                  <div className="em-chat-composer-tools">
                    <input
                      ref={attachmentInput}
                      id="em-attachment"
                      type="file"
                      className="sr-only"
                      tabIndex={-1}
                      aria-label="Ảnh đính kèm"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={state.messageSending[conversation.id]}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (!file || !conversation) return;
                        if (
                          !file.size ||
                          !/^image\/(jpeg|png|gif|webp)$/.test(file.type) ||
                          file.size > 5 * 1024 * 1024
                        ) {
                          setError({
                            id: conversation.id,
                            text: "Chọn ảnh JPEG, PNG, GIF hoặc WebP tối đa 5 MB.",
                          });
                          return;
                        }
                        setAttachment({
                          conversationId: conversation.id,
                          file,
                        });
                        setError(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="em-chat-attach"
                      aria-describedby="em-attachment-hint"
                      disabled={state.messageSending[conversation.id]}
                      onClick={() => attachmentInput.current?.click()}
                    >
                      <Paperclip size={16} aria-hidden="true" />
                      Đính kèm ảnh
                    </Button>
                    <span
                      id="em-attachment-hint"
                      className="em-chat-attachment-hint"
                    >
                      JPEG, PNG, GIF, WebP · Tối đa 5 MB
                    </span>
                    {attachment?.conversationId === conversation.id && (
                      <div className="em-chat-attachment">
                        <span title={attachment.file.name}>
                          {attachment.file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Bỏ ảnh đính kèm"
                          onClick={() => setAttachment(null)}
                        >
                          <X size={16} aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="em-chat-composer-meta">
                  <span id="em-message-hint">
                    Enter để gửi · Ctrl/⌘ + Enter để xuống dòng
                  </span>
                  <span>{draft.length}/1.000</span>
                </div>
                <p className="sr-only" role="status">
                  {announcement}
                </p>
              </form>
            </>
          ) : (
            <div className="em-chat-empty em-chat-missing">
              <Button
                className="em-chat-back"
                variant="ghost"
                onClick={() =>
                  router.replace("/employer/messages", { scroll: false })
                }
              >
                <ArrowLeft aria-hidden="true" />
                Danh sách hội thoại
              </Button>
              <MessageSquare size={36} aria-hidden="true" />
              <h2>
                {requested !== null
                  ? "Không tìm thấy hội thoại"
                  : "Chưa có cuộc trò chuyện"}
              </h2>
              <p>
                Chỉ các hội thoại gắn với hồ sơ ứng tuyển vào công ty mới được
                hiển thị.
              </p>
              <Link href="/employer/candidates" className="ep-text-link">
                Xem hồ sơ ứng viên
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
