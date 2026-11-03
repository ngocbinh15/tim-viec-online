"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Megaphone,
  Monitor,
  Palette,
  Users,
} from "lucide-react";
import { GuestActions } from "@/components/jobs/guest-actions";
import type {
  HomeCategory,
  HomeCompany,
  HomeJobCard,
} from "@/features/home/types";
import type { AuthRole } from "@/features/auth/types";

export function FeaturedJobs({
  jobs,
  viewerRole,
}: {
  jobs: HomeJobCard[];
  viewerRole?: AuthRole;
}) {
  const id = useId();
  const [page, setPage] = useState(0);
  const pages = Math.ceil(jobs.length / 4);
  const visible = Array.from(
    { length: Math.min(6, jobs.length) },
    (_, index) => jobs[(page * 4 + index) % jobs.length],
  );
  return (
    <div
      role="region"
      aria-label="Việc làm nổi bật"
      aria-roledescription="carousel"
    >
      <div className="home-jobs-grid" id={id} aria-live="polite">
        {!jobs.length && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Chưa có việc làm đang tuyển. Hãy quay lại để xem các cơ hội mới.
          </p>
        )}
        {visible.map((job) => (
          <article
            className="home-job-card"
            data-testid="home-job-card"
            key={job.id}
          >
            <div className="home-job-main">
              <span
                className="home-company-mark"
                data-brand={job.brand}
                aria-hidden="true"
              >
                {job.logo ? (
                  <Image
                    src={job.logo}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    className="size-full object-contain"
                  />
                ) : (
                  <span>{job.mark}</span>
                )}
              </span>
              <div className="home-job-body">
                <div className="home-job-title">
                  <h3>
                    <Link
                      href={`/jobs/${job.id}`}
                      title={job.title}
                      prefetch={false}
                    >
                      {job.title}
                    </Link>
                  </h3>
                  {job.featured && (
                    <span className="home-hot">
                      <span aria-hidden="true">🔥</span> Hot
                    </span>
                  )}
                </div>
                <p className="home-job-company" title={job.company}>
                  {job.company}
                </p>
                <p className="home-job-salary">{job.salary}</p>
                <p className="home-job-city">{job.city}</p>
              </div>
            </div>
            <GuestActions
              jobId={job.id}
              compact
              appearance="home"
              viewerRole={viewerRole}
            />
          </article>
        ))}
      </div>
      {pages > 1 && (
        <nav className="home-pagination" aria-label="Nhóm việc làm nổi bật">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Nhóm việc làm ${index + 1}`}
              aria-controls={id}
              aria-current={page === index ? "true" : undefined}
              onClick={() => setPage(index)}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

export function TopCompanies({ companies }: { companies: HomeCompany[] }) {
  const id = useId();
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const pages = Math.ceil(companies.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pages - 1));
  const visible = companies.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  return (
    <div>
      <div
        className={`home-companies-grid${pages > 1 ? " home-companies-grid--paged" : ""}`}
        id={id}
      >
        {!companies.length && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Chưa có doanh nghiệp tuyển dụng để hiển thị.
          </p>
        )}
        {visible.map((company) => (
          <Link
            key={company.id}
            href={`/companies/${company.id}`}
            prefetch={false}
            className="home-company-card"
            title={company.name}
          >
            <span
              className="home-company-mark"
              data-brand={company.brand}
              aria-hidden="true"
            >
              {company.logo ? (
                <Image
                  src={company.logo}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="size-full object-contain"
                />
              ) : (
                <span>{company.mark}</span>
              )}
            </span>
            <h3>{company.name}</h3>
            <p>{company.count} việc làm</p>
            <span>{company.location || "Địa điểm chưa cập nhật"}</span>
          </Link>
        ))}
      </div>
      {pages > 1 && (
        <>
          <p className="sr-only" role="status">
            Trang doanh nghiệp {currentPage + 1} trên {pages}
          </p>
          <nav
            className="home-pagination home-company-pagination"
            aria-label="Nhóm doanh nghiệp nổi bật"
          >
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Nhóm doanh nghiệp ${index + 1}`}
                aria-controls={id}
                aria-current={currentPage === index ? "true" : undefined}
                onClick={() => setPage(index)}
              />
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

const categoryIcons = {
  briefcase: Briefcase,
  accounting: ClipboardCheck,
  building: Building2,
  factory: Factory,
  monitor: Monitor,
  marketing: Megaphone,
  design: Palette,
  people: Users,
};

export function KeyCategories({ categories }: { categories: HomeCategory[] }) {
  const id = useId();
  const [start, setStart] = useState(0);
  const visible = Array.from(
    { length: Math.min(5, categories.length) },
    (_, index) => categories[(start + index) % categories.length],
  );
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="home-section-heading">
        <h2 className="home-section-title" id={`${id}-title`}>
          Ngành Nghề Trọng Điểm
        </h2>
        <div className="home-category-actions">
          <button
            type="button"
            aria-label="Nhóm ngành trước"
            disabled={categories.length <= 5}
            aria-controls={id}
            onClick={() =>
              setStart(
                (value) => (value - 5 + categories.length) % categories.length,
              )
            }
          >
            <ChevronLeft aria-hidden="true" size={15} />
          </button>
          <button
            type="button"
            aria-label="Nhóm ngành tiếp theo"
            disabled={categories.length <= 5}
            aria-controls={id}
            onClick={() => setStart((value) => (value + 5) % categories.length)}
          >
            <ChevronRight aria-hidden="true" size={15} />
          </button>
        </div>
      </div>
      <div className="home-category-grid" id={id} aria-live="polite">
        {visible.map((category) => {
          const Icon = categoryIcons[category.icon];
          return (
            <Link
              key={category.name}
              href={category.href}
              prefetch={false}
              className="home-category-card"
            >
              <span className="home-category-icon">
                <Icon aria-hidden="true" size={25} />
              </span>
              <h3>{category.name}</h3>
              <p>{category.count} Việc Làm</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
