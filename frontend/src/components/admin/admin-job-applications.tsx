"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/features/api/client";
import { mapApplication, type RawApplication } from "@/features/employer/api";
import type { EmployerApplication } from "@/features/employer/types";
import { APPLICATION_LABELS } from "@/features/employer/types";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

export function AdminJobApplications({ jobId }: { jobId: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    rows: EmployerApplication[];
    lastPage: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<RawApplication[]>(
      `/admin/jobs/${jobId}/applications?per_page=10&page=${page}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        const lastPage = Number(response.meta?.last_page ?? 1);
        if (
          !Array.isArray(response.data) ||
          !Number.isSafeInteger(lastPage) ||
          lastPage < page
        )
          throw new Error();
        setData({ rows: response.data.map(mapApplication), lastPage });
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Không tải được hồ sơ ứng tuyển. Vui lòng tải lại trang.");
      });
    return () => controller.abort();
  }, [jobId, page]);
  return (
    <section className="ap-panel" aria-label="Hồ sơ ứng tuyển theo tin">
      <h2>Hồ sơ ứng tuyển</h2>
      {error ? (
        <p role="alert">{error}</p>
      ) : data ? (
        <>
          {data.rows.length ? (
            <ul className="ap-ai-applications">
              {data.rows.map((app) => (
                <li key={app.id}>
                  <Link href={`/admin/applications/${app.id}`}>
                    {app.name} · Hồ sơ #{app.id}
                  </Link>
                  <span>
                    {APPLICATION_LABELS[app.status]}
                    {app.analysis
                      ? ` · ${app.analysis.match_score}% phù hợp`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ap-cell-sub" role="status">
              Chưa có hồ sơ ứng tuyển.
            </p>
          )}
          {data.lastPage > 1 && (
            <nav aria-label="Phân trang hồ sơ ứng tuyển">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => {
                  setData(null);
                  setPage((p) => p - 1);
                }}
              >
                Trang trước
              </Button>
              <span>
                {" "}
                {page}/{data.lastPage}{" "}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={page >= data.lastPage}
                onClick={() => {
                  setData(null);
                  setPage((p) => p + 1);
                }}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </>
      ) : (
        <div aria-label="Đang tải hồ sơ">
          <Skeleton className="h-10 w-full" />
        </div>
      )}
    </section>
  );
}
