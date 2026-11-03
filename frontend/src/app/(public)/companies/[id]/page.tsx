import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import { getCompany, getCompanyJobs } from "@/services/companies";
import { getCurrentUser } from "@/services/auth-session";
import { companyWebsite } from "@/features/companies/query";
import { CompanyAvatar } from "@/components/companies/company-avatar";
import { CompanyJobCard } from "@/components/companies/company-job-card";
import { CompanyShare } from "@/components/companies/company-share";
import { CompaniesSkeleton } from "@/components/companies/companies-skeleton";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { authApiEnabled } from "@/services/auth-mode";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompany(id);
  return company
    ? {
        title: `${company.short_name} — Thông tin và tuyển dụng`,
        description: company.summary.slice(0, 160),
      }
    : {
        title: "Không tìm thấy doanh nghiệp",
        robots: { index: false, follow: false },
      };
}

export default function CompanyPage(props: Props) {
  return (
    <main id="main" className="companies-page">
      <Suspense fallback={<CompaniesSkeleton />}>
        <Profile {...props} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: Props) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();
  const [jobs, user] = await Promise.all([
    getCompanyJobs(company.id),
    getCurrentUser().catch(() => null),
  ]);
  const website = companyWebsite(company.website);
  return (
    <div className="companies-container company-profile-content">
      <nav className="company-breadcrumbs" aria-label="Đường dẫn">
        <Link href="/companies">
          <ArrowLeft size={14} aria-hidden="true" />
          Doanh nghiệp tuyển dụng
        </Link>
        <span aria-hidden="true">/</span>
        <span>{company.short_name}</span>
      </nav>
      <div className="company-cover" aria-hidden="true" />
      <section
        className="company-profile-heading"
        aria-labelledby={`company-${company.id}-title`}
      >
        <div className="company-identity">
          <CompanyAvatar company={company} large />
          <div className="company-identity-copy">
            <h1 id={`company-${company.id}-title`}>{company.short_name}</h1>
            <p>{company.subtitle}</p>
            <div className="company-profile-facts">
              <span>
                <Users aria-hidden="true" />
                Quy mô:{" "}
                <strong>{company.company_size || "Chưa xác minh"}</strong>
              </span>
              <span>
                <MapPin aria-hidden="true" />
                {company.is_demo ? "Địa điểm:" : "Trụ sở:"}{" "}
                <strong>{company.city || "Chưa cập nhật"}</strong>
              </span>
              {website && (
                <a
                  href={website.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe aria-hidden="true" />
                  {website.label}
                  <span className="sr-only"> (mở tab mới)</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="company-profile-actions">
          <CompanyShare companyId={company.id} />
          <a
            className="company-jobs-jump"
            href={`#company-${company.id}-open-jobs`}
          >
            <BriefcaseBusiness size={15} aria-hidden="true" />
            Xem {jobs.length} việc làm
          </a>
        </div>
      </section>
      <div className="company-profile-caption">
        {!authApiEnabled() && (
          <span className="demo-pill">Dữ liệu minh họa</span>
        )}
      </div>
      <div className="company-profile-grid">
        <section
          id={`company-${company.id}-open-jobs`}
          className="company-vacancies"
          aria-labelledby={`company-${company.id}-jobs-title`}
        >
          <div className="company-vacancies-heading">
            <h2 id={`company-${company.id}-jobs-title`}>
              <BriefcaseBusiness aria-hidden="true" />
              Các vị trí đang mở tuyển dụng
            </h2>
            <span>{jobs.length} vị trí đang mở</span>
          </div>
          {jobs.length ? (
            <div className="company-jobs-list">
              {jobs.map((job) => (
                <CompanyJobCard
                  key={job.id}
                  job={job}
                  viewerRole={user?.role}
                />
              ))}
            </div>
          ) : (
            <div className="surface empty-state">
              <BriefcaseBusiness size={38} aria-hidden="true" />
              <h3>Chưa có vị trí đang tuyển</h3>
              <p>
                {company.short_name} hiện chưa có tin tuyển dụng đang mở trên hệ
                thống.
              </p>
              <Button asChild variant="outline" className="h-11">
                <Link href="/jobs">Khám phá việc làm khác</Link>
              </Button>
            </div>
          )}
        </section>
        <aside
          className="company-about"
          aria-labelledby={`company-${company.id}-about-title`}
        >
          <h2 id={`company-${company.id}-about-title`}>
            Giới thiệu về {company.short_name}
          </h2>
          {company.introduction.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="company-locations">
            <h3>
              {company.locations.length > 1
                ? "Các chi nhánh chính"
                : "Địa chỉ công ty"}
            </h3>
            {!company.locations.length && (
              <p>Chưa xác minh được địa chỉ từ nguồn công khai.</p>
            )}
            <ul>
              {company.locations.map((location) => (
                <li key={`${location.city}-${location.address}`}>
                  <strong>{location.city}:</strong> {location.address}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
