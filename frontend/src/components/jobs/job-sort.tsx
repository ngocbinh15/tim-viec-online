"use client";

import { useId, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  JOB_SORT_LABELS,
  type JobQuery,
  type JobSort,
} from "@/features/jobs/types";
import { jobQueryString } from "@/features/jobs/query";
import { isolateSelectionMenu } from "@/components/forms/selection-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/cores/shadcn/components/ui/select";

export function JobSort({ query }: { query: JobQuery }) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useOptimistic(query.sort);
  return (
    <div className="job-sort" aria-busy={pending}>
      <span id={id}>Sắp xếp theo:</span>
      <Select
        value={sort}
        onValueChange={(value) => {
          startTransition(() => {
            setSort(value as JobSort);
            const params = jobQueryString(query, {
              sort: value as JobSort,
              page: 1,
            });
            router.push(params ? `/jobs?${params}` : "/jobs", {
              scroll: false,
            });
          });
        }}
      >
        <SelectTrigger className="job-sort-trigger" aria-labelledby={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          ref={isolateSelectionMenu}
          className="selection-menu job-sort-menu"
          position="popper"
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          {Object.entries(JOB_SORT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value} className="selection-option">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="sr-only" role="status">
        {pending ? "Đang sắp xếp việc làm…" : ""}
      </span>
    </div>
  );
}
