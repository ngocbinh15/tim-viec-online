"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import type { Category, JobQuery } from "@/features/jobs/types";
import { JOB_TYPE_LABELS } from "@/features/jobs/types";
import { jobQueryString } from "@/features/jobs/query";
import {
  MultiSelectionField,
  SearchableSelectionField,
} from "@/components/forms/selection-field";

export function JobFilters({
  query,
  categories,
  levels,
}: {
  query: JobQuery;
  categories: Category[];
  levels: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setOptimisticFilters] = useOptimistic(query);

  function apply(changes: Partial<JobQuery>) {
    const nextQuery = { ...filters, ...changes, page: 1 };
    const next = jobQueryString(nextQuery);
    startTransition(() => {
      setOptimisticFilters(nextQuery);
      router.push(next ? `/jobs?${next}` : "/jobs", { scroll: false });
    });
  }

  return (
    <section className="search-panel surface" aria-label="Bộ lọc việc làm">
      <form
        action="/jobs"
        method="get"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          apply({});
        }}
      >
        <input type="hidden" name="keyword" value={filters.keyword} />
        <input type="hidden" name="city" value={filters.city} />
        <input type="hidden" name="sort" value={filters.sort} />
        <div className="filter-row">
          <span className="filter-caption">
            <SlidersHorizontal aria-hidden="true" size={16} />
            Lọc theo
          </span>
          <MultiSelectionField
            className="category-filter"
            label="Ngành nghề"
            placeholder="Ngành nghề"
            searchLabel="Tìm ngành nghề"
            name="category_ids"
            options={categories.map((category) => ({
              value: String(category.id),
              label: category.name,
            }))}
            values={filters.category_ids.map(String)}
            onValuesChange={(values) =>
              apply({ category_ids: values.map(Number) })
            }
          />
          <SearchableSelectionField
            className="select-filter"
            label="Hình thức làm việc"
            placeholder="Hình thức làm việc"
            name="job_type"
            options={Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            value={filters.job_type}
            onValueChange={(value) =>
              apply({ job_type: value as JobQuery["job_type"] })
            }
          />
          <SearchableSelectionField
            className="select-filter"
            label="Mức lương"
            placeholder="Tất cả mức lương"
            name="salary"
            options={[
              { value: "under10", label: "Dưới 10 triệu" },
              { value: "10to20", label: "Từ 10 – 20 triệu" },
              { value: "over20", label: "Trên 20 triệu" },
              { value: "negotiable", label: "Thỏa thuận" },
            ]}
            value={filters.salary}
            onValueChange={(value) =>
              apply({ salary: value as JobQuery["salary"] })
            }
          />
          <SearchableSelectionField
            className="select-filter"
            label="Cấp bậc"
            placeholder="Tất cả cấp bậc"
            name="level"
            options={levels.map((level) => ({ value: level, label: level }))}
            value={filters.level}
            onValueChange={(value) => apply({ level: value })}
          />
          <Link className="clear-filters" href="/jobs">
            <X aria-hidden="true" size={14} />
            Xóa bộ lọc
          </Link>
        </div>
        <span className="sr-only" role="status">
          {pending ? "Đang cập nhật kết quả…" : ""}
        </span>
      </form>
    </section>
  );
}
