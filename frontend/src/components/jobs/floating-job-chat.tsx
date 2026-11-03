"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDown,
  ArrowUpRight,
  MessageCircle,
  Minus,
  Send,
  X,
} from "lucide-react";
import type { Job } from "@/features/jobs/types";
import { isJobOpen } from "@/features/jobs/formatters";
import { useLiveRefresh } from "@/features/api/live";
import { ChatAttachment } from "@/features/chat/chat-attachment";
import {
  ChatDelivery,
  ChatHistoryControl,
} from "@/features/chat/chat-controls";
import { handleMessageComposerKeyDown } from "@/lib/message-composer";
import {
  useOptionalWorkspace,
  useWorkspace,
} from "@/components/candidate/workspace-provider";
import { useChatScroll } from "@/components/candidate/use-chat-scroll";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Textarea } from "@/modules/cores/shadcn/components/ui/textarea";
import { CompanyMark } from "./job-card";
import "./floating-job-chat.css";

function subscribeVisibility(update: () => void) {
  document.addEventListener("visibilitychange", update);
  return () => document.removeEventListener("visibilitychange", update);
}
const isVisible = () => document.visibilityState === "visible";
const serverVisible = () => false;
const messageTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function FloatingJobChat({ job }: { job: Job }) {
  const state = useOptionalWorkspace();
  if (!state) return null;
  const existing = state.conversations.some((item) => item.job_id === job.id);
  const applied = state.applications.some(
    (item) => item.job_id === job.id && item.status !== "withdrawn",
  );
  if (!existing && !(state.isApi && applied)) return null;
  return <JobChatWindow key={job.id} job={job} />;
}

function JobChatWindow({ job }: { job: Job }) {
  const state = useWorkspace();
  const [view, setView] = useState<"open" | "minimized" | "closed">("open");
  const launcher = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const startingRef = useRef<Promise<number> | null>(null);
  const moveFocus = useRef(false);
  const conversation = state.conversations.find(
    (item) => item.job_id === job.id,
  );
  useLayoutEffect(() => {
    if (!moveFocus.current) return;
    if (view === "open" && composer.current?.disabled) return;
    (view === "open" ? composer.current : launcher.current)?.focus({
      preventScroll: true,
    });
    moveFocus.current = false;
  }, [view, conversation?.id]);
  const changeView = (next: typeof view) => {
    moveFocus.current = true;
    setView(next);
  };

  if (view !== "open")
    return (
      <Button
        ref={launcher}
        type="button"
        className={`jf-launcher${view === "minimized" ? " jf-minimized" : ""}`}
        aria-label={`Mở trò chuyện với ${job.company.name}`}
        aria-expanded={false}
        onClick={() => changeView("open")}
      >
        <MessageCircle aria-hidden="true" />
        <span>{view === "minimized" ? job.company.name : "Nhắn tin"}</span>
      </Button>
    );

  return (
    <section
      className="jf-window"
      aria-label={`Trò chuyện với ${job.company.name}`}
    >
      <header className="jf-heading">
        <CompanyMark name={job.company.name} logo={job.company.logo} />
        <div className="jf-heading-copy">
          <h2>{job.company.name}</h2>
          <p>Nhà tuyển dụng</p>
        </div>
        <div className="jf-tools">
          {conversation && (
            <Button
              asChild
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Mở trang tin nhắn"
            >
              <Link href={`/account/messages?conversation=${conversation.id}`}>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Thu gọn trò chuyện"
            onClick={() => changeView("minimized")}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Đóng trò chuyện"
            onClick={() => changeView("closed")}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div className="jf-context">
        <span>{job.title}</span>
        <small>
          {isJobOpen(job, state.today)
            ? "Hồ sơ đã ứng tuyển"
            : "Tin đã đóng · Bạn vẫn có thể nhắn tin"}
        </small>
      </div>
      <JobChatThread job={job} composer={composer} startingRef={startingRef} />
    </section>
  );
}

function JobChatThread({
  job,
  composer,
  startingRef,
}: {
  job: Job;
  composer: React.RefObject<HTMLTextAreaElement | null>;
  startingRef: React.RefObject<Promise<number> | null>;
}) {
  const state = useWorkspace();
  const current = useRef(state);
  useLayoutEffect(() => {
    current.current = state;
  });
  const visible = useSyncExternalStore(
    subscribeVisibility,
    isVisible,
    serverVisible,
  );
  const conversation = state.conversations.find(
    (item) => item.job_id === job.id,
  );
  const id = conversation?.id;
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (id !== undefined || !visible || !state.isApi) return;
    let active = true;
    // Share the in-flight request across Strict Mode's effect restart.
    const request = (startingRef.current ??= current.current.startConversation(
      job.id,
    ));
    request.catch((issue) => {
      if (active)
        setLoadError(
          issue instanceof Error
            ? issue.message
            : "Không mở được hội thoại. Vui lòng thử lại.",
        );
    });
    return () => {
      active = false;
    };
  }, [id, job.id, visible, state.isApi, attempt, startingRef]);

  useLiveRefresh(
    async () => {
      if (id !== undefined) await current.current.loadMessages(id);
    },
    state.isApi && visible && id !== undefined,
    id === undefined ? [] : [id],
  );
  useEffect(() => {
    if (id === undefined || !visible || !state.isApi) return;
    let active = true;
    current.current.loadMessages(id).catch((issue) => {
      if (active)
        setLoadError(
          issue instanceof Error
            ? issue.message
            : "Không tải được tin nhắn. Vui lòng thử lại.",
        );
    });
    return () => {
      active = false;
    };
  }, [id, visible, state.isApi, attempt]);

  const messages = state.messages.filter((item) => item.conversation_id === id);
  const lastIncoming = messages.filter((item) => !item.outgoing).at(-1)?.id;
  useEffect(() => {
    if (id !== undefined && lastIncoming && visible && state.isApi)
      void current.current.markConversationRead(id).catch(() => {});
  }, [id, lastIncoming, visible, state.isApi]);
  const { scrollRef, onScroll, scrollBottom, atBottom, preserveScroll } =
    useChatScroll(
      id,
      messages.at(-1)?.id,
      id === undefined ? null : String(id),
      messages[0]?.id,
    );
  const draft = id === undefined ? "" : (state.drafts[id] ?? "");
  const history = id === undefined ? undefined : state.messageHistory[id];
  const updateDraft = (value: string) => {
    if (id === undefined) return;
    state.setDraft(id, value);
    setError("");
    setAnnouncement("");
  };
  const send = async () => {
    if (id === undefined || state.messageSending[id] || !draft.trim()) return;
    const result = state.sendPreview(id);
    scrollBottom();
    const issue = await result;
    setError(issue ?? "");
    if (!issue)
      setAnnouncement(
        state.isApi
          ? "Tin nhắn đã gửi."
          : "Tin nhắn đã thêm vào bản xem trước, chưa gửi tới nhà tuyển dụng.",
      );
  };
  const retryLoad = () => {
    startingRef.current = null;
    setLoadError("");
    setAttempt((value) => value + 1);
  };

  return (
    <>
      <div className="jf-history">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="jf-messages"
          role="log"
          aria-label="Nội dung trò chuyện"
          aria-live={history?.loaded ? "polite" : "off"}
          tabIndex={0}
        >
          <ChatHistoryControl
            {...history}
            onLoad={() => {
              if (id === undefined) return;
              preserveScroll();
              void state
                .loadMessages(id, true)
                .catch((issue) =>
                  setError(
                    issue instanceof Error
                      ? issue.message
                      : "Không tải được tin nhắn cũ.",
                  ),
                );
            }}
          />
          {(!conversation || (state.isApi && !history?.loaded)) &&
            !loadError &&
            !history?.loading && (
              <p className="jf-status" role="status">
                Đang mở hội thoại…
              </p>
            )}
          {conversation &&
            !messages.length &&
            (!state.isApi || history?.loaded) && (
              <div className="jf-empty">
                <MessageCircle size={28} aria-hidden="true" />
                <strong>Trao đổi về vị trí ứng tuyển</strong>
                <p>Gửi câu hỏi của bạn đến {job.company.name}.</p>
              </div>
            )}
          {messages.map((message) => (
            <article
              className="jf-message"
              data-outgoing={message.outgoing}
              key={message.id}
            >
              <span className="sr-only">
                {message.outgoing ? "Bạn" : job.company.name}
              </span>
              {message.image_url && <ChatAttachment src={message.image_url} />}
              {message.message && <p>{message.message}</p>}
              <small>
                <time
                  dateTime={message.created_at}
                  title={new Date(message.created_at).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                >
                  {messageTime(message.created_at)}
                </time>
                {message.outgoing &&
                  !message.delivery &&
                  message.read_at &&
                  " · Đã xem"}
                {message.preview && " · Chưa gửi"}
                <ChatDelivery
                  delivery={message.delivery}
                  retry={() => {
                    void state
                      .retryMessage(message.id)
                      .then((issue) => setError(issue ?? ""));
                  }}
                />
              </small>
            </article>
          ))}
        </div>
        {!atBottom && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="jf-bottom"
            onClick={scrollBottom}
          >
            <ArrowDown aria-hidden="true" />
            Tin mới nhất
          </Button>
        )}
      </div>
      {(loadError || error) && (
        <div className="jf-error" role="alert">
          <span id="job-chat-error">{loadError || error}</span>
          {loadError && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={retryLoad}
            >
              Thử lại
            </Button>
          )}
        </div>
      )}
      <form
        className="jf-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="job-chat-message">
          Tin nhắn cho nhà tuyển dụng
        </label>
        <div className="jf-composer-box">
          <Textarea
            ref={composer}
            id="job-chat-message"
            rows={1}
            maxLength={1000}
            placeholder="Viết tin nhắn…"
            value={draft}
            disabled={!conversation}
            aria-describedby={`job-chat-hint${loadError || error ? " job-chat-error" : ""}`}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) =>
              handleMessageComposerKeyDown(event, updateDraft)
            }
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Gửi tin nhắn"
            disabled={
              !conversation ||
              !draft.trim() ||
              (id !== undefined && state.messageSending[id])
            }
          >
            <Send size={18} aria-hidden="true" />
          </Button>
        </div>
        <p id="job-chat-hint">Enter để gửi · Shift + Enter để xuống dòng</p>
        {!state.isApi && (
          <p>Bản xem trước · Tin nhắn chưa gửi tới nhà tuyển dụng.</p>
        )}
        <span className="sr-only" role="status">
          {announcement}
        </span>
      </form>
    </>
  );
}
