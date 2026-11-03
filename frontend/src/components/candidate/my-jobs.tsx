"use client";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import {
  APPLICATION_LABELS,
  API_APPLICATION_LABELS,
  type Application,
} from "@/features/candidate-workspace/types";
import type { Job } from "@/features/jobs/types";
import {
  pageSlice,
  parseWorkspaceQuery,
} from "@/features/candidate-workspace/rules";
import { formatSalary, isJobOpen } from "@/features/jobs/formatters";
import { SelectionField } from "@/components/forms/selection-field";
import { Pagination } from "@/components/layout/pagination";
import { useWorkspace } from "./workspace-provider";
import { ApplicationSummary } from "./application-summary";
import { WorkspaceFrame } from "./workspace-frame";
import {
  ConfirmRemoval,
  WorkspaceEmpty,
  WorkspaceTitle,
  workspaceDate,
} from "./workspace-ui";

export function MyJobs() {
  const state = useWorkspace();
  const router = useRouter();
  const query = parseWorkspaceQuery(useSearchParams());
  const saved = query.tab === "saved";
  const items: { job: Job; application: Application | null }[] = saved
    ? state.savedIds.flatMap((id) => {
        const job = state.jobs.find((item) => item.id === id);
        return job ? [{ job, application: null }] : [];
      })
    : state.applications
        .filter((item) => !query.status || item.status === query.status)
        .flatMap((application) => {
          const job = state.jobs.find((item) => item.id === application.job_id);
          return job ? [{ job, application }] : [];
        });
  const result = pageSlice(items, query.page);
  const url = (tab = query.tab, page = 1, status = query.status) => {
    const params = new URLSearchParams({ tab });
    if (tab === "applied" && status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    return `/account/jobs?${params}`;
  };
  return (
    <WorkspaceFrame section="jobs">
      <WorkspaceTitle title="Việc làm của tôi" />
      <section className="cu-card" aria-label="Việc làm của tôi">
        <nav className="cu-tabs" aria-label="Loại việc làm">
          <Link
            href={url("applied", 1, "")}
            aria-current={!saved ? "page" : undefined}
          >
            Việc đã ứng tuyển <span>{state.applications.length}</span>
          </Link>
          <Link href={url("saved")} aria-current={saved ? "page" : undefined}>
            Việc đã lưu <span>{state.savedIds.length}</span>
          </Link>
        </nav>
        <div className="cu-list-heading">
          <h2 id="my-jobs-heading" tabIndex={-1}>
            {items.length} {saved ? "việc làm đã lưu" : "hồ sơ ứng tuyển"}
          </h2>
          {!saved && (
            <SelectionField
              name="application_status"
              label="Trạng thái ứng tuyển"
              placeholder="Tất cả trạng thái"
              value={query.status}
              onValueChange={(value) =>
                router.push(url("applied", 1, value as typeof query.status), {
                  scroll: false,
                })
              }
              options={Object.entries(
                state.isApi ? API_APPLICATION_LABELS : APPLICATION_LABELS,
              ).map(([value, label]) => ({ value, label }))}
            />
          )}
        </div>
        {!items.length && (
          <WorkspaceEmpty
            title={
              saved ? "Bạn chưa lưu việc làm nào" : "Chưa có hồ sơ phù hợp"
            }
            href={!saved && query.status ? "/account/jobs" : "/jobs"}
            link={
              !saved && query.status
                ? "Xóa bộ lọc trạng thái"
                : "Khám phá việc làm"
            }
          >
            {!saved && query.status
              ? "Chưa có hồ sơ ở trạng thái này. Xem tất cả hồ sơ hoặc chọn trạng thái khác."
              : "Khám phá công việc phù hợp và theo dõi tại đây."}
          </WorkspaceEmpty>
        )}
        {result.items.map(({ job, application }) => (
          <article
            key={job.id}
            className="cu-job"
            id={application ? `application-${application.id}` : undefined}
          >
            <Link
              className="cu-job-logo"
              href={`/companies/${job.company_id}`}
              aria-label={`Công ty ${job.company.name}`}
            >
              {job.company.name
                .split(" ")
                .map((word) => word[0])
                .slice(0, 3)
                .join("")}
            </Link>
            <div className="cu-job-body">
              <h3>
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
              </h3>
              <Link className="cu-muted" href={`/companies/${job.company_id}`}>
                {job.company.name}
              </Link>
              <p className="cu-job-location">
                <MapPin aria-hidden="true" size={13} />
                {job.city}
              </p>
              <strong className="cu-salary">{formatSalary(job)}</strong>
              {application ? (
                <p className="cu-muted">
                  Ứng tuyển ngày{" "}
                  <time dateTime={application.created_at}>
                    {workspaceDate(application.created_at)}
                  </time>
                </p>
              ) : (
                <p className="cu-muted">
                  Hạn nộp:{" "}
                  <time dateTime={job.deadline}>
                    {workspaceDate(job.deadline)}
                  </time>
                </p>
              )}
              {!isJobOpen(job, state.today) && (
                <p className="cu-muted">
                  Tin đã đóng / hết hạn · Hồ sơ cũ vẫn được bảo lưu.
                </p>
              )}
              {application?.cv_name && (
                <ApplicationSummary application={application} />
              )}
              {application &&
                state.conversations.some((item) => item.job_id === job.id) && (
                  <Link
                    className="cu-link"
                    href={`/account/messages?conversation=${state.conversations.find((item) => item.job_id === job.id)!.id}`}
                  >
                    Trao đổi với nhà tuyển dụng
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )}
              {application &&
                state.isApi &&
                !state.conversations.some((item) => item.job_id === job.id) &&
                application.status !== "withdrawn" && (
                  <Button
                    variant="link"
                    disabled={state.pending[`conversation:${job.id}`]}
                    onClick={async () => {
                      try {
                        const id = await state.startConversation(job.id);
                        router.push(`/account/messages?conversation=${id}`);
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Không thể mở hội thoại.",
                        );
                      }
                    }}
                  >
                    Trao đổi với nhà tuyển dụng
                  </Button>
                )}
              {application?.can_withdraw && state.isApi && (
                <ConfirmRemoval
                  label={`Rút hồ sơ ${job.title}`}
                  title="Rút hồ sơ ứng tuyển này?"
                  onConfirm={() => state.withdraw(application.id)}
                  focusId="my-jobs-heading"
                />
              )}
            </div>
            {application ? (
              <span className="cu-status" data-status={application.status}>
                {API_APPLICATION_LABELS[application.status]}
              </span>
            ) : (
              <ConfirmRemoval
                label={`Bỏ lưu ${job.title}`}
                title="Bỏ lưu việc làm này?"
                onConfirm={() => state.removeSaved(job.id)}
                focusId="my-jobs-heading"
              />
            )}
          </article>
        ))}
        <Pagination
          page={result.page}
          lastPage={result.lastPage}
          pageUrl={(page) => url(query.tab, page)}
          label="Phân trang việc làm của tôi"
        />
      </section>
    </WorkspaceFrame>
  );
}
