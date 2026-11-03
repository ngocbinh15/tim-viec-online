import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  MapPin,
  Search,
  SearchX,
} from "lucide-react";
import { CompanyAvatar } from "@/components/companies/company-avatar";
import { CompanyCityFilter } from "@/components/companies/company-city-filter";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import {
  getCompanyListing,
  parseCompanyListingQuery,
} from "@/services/companies";
import { getProvinceNames } from "@/services/locations";
import "./companies-list.css";

export const metadata: Metadata = {
  title: "Khám phá doanh nghiệp tuyển dụng",
  description:
    "Tìm hiểu doanh nghiệp, địa điểm làm việc và các cơ hội tuyển dụng đang mở.",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCompanyListingQuery(await searchParams);
  const [result, provinceNames] = await Promise.all([
    getCompanyListing(query),
    getProvinceNames(),
  ]);
  const cities =
    query.city && !provinceNames.includes(query.city)
      ? [query.city, ...provinceNames]
      : provinceNames;
  const pageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.city) params.set("city", query.city);
    if (page > 1) params.set("page", String(page));
    return `/companies${params.size ? `?${params}` : ""}`;
  };
  const hasFilters = Boolean(query.keyword || query.city);
  const first = (result.meta.page - 1) * result.meta.per_page + 1;
  return (
    <main id="main" className="companies-page">
      <section className="page-intro">
        <div className="site-container">
          <p className="eyebrow">TÌM HIỂU NƠI BẠN SẼ LÀM VIỆC</p>
          <h1>Khám phá doanh nghiệp tuyển dụng</h1>
          <p>
            Tìm hiểu môi trường làm việc và cơ hội nghề nghiệp tại các doanh
            nghiệp.
          </p>
        </div>
      </section>
      <div className="site-container page-content company-directory">
        <form
          key={`${query.keyword}:${query.city}`}
          action="/companies"
          method="get"
          className="surface company-directory-filters"
          role="search"
          aria-label="Tìm kiếm doanh nghiệp"
        >
          <div>
            <label htmlFor="company-keyword">Tên công ty hoặc từ khóa</label>
            <div className="company-directory-search">
              <Search size={18} aria-hidden="true" />
              <input
                id="company-keyword"
                name="keyword"
                type="search"
                maxLength={150}
                placeholder="Tên công ty, lĩnh vực, địa chỉ…"
                defaultValue={query.keyword}
              />
            </div>
          </div>
          <div>
            <label htmlFor="company-city">Tỉnh / Thành phố</label>
            <CompanyCityFilter cities={cities} initialCity={query.city} />
          </div>
          <Button type="submit" className="h-11">
            <Search size={16} aria-hidden="true" />
            Tìm doanh nghiệp
          </Button>
          {hasFilters && (
            <Link className="company-directory-reset" href="/companies">
              Xóa bộ lọc
            </Link>
          )}
        </form>
        <div className="results-toolbar">
          <h2 aria-live="polite">
            {result.meta.total.toLocaleString("vi-VN")} doanh nghiệp
            {query.keyword ? ` cho “${query.keyword}”` : ""}
          </h2>
          {result.data.length > 0 && (
            <p className="company-directory-range">
              Hiển thị {first}–{first + result.data.length - 1} /{" "}
              {result.meta.total.toLocaleString("vi-VN")}
            </p>
          )}
        </div>
        {result.data.length ? (
          <>
            <div className="company-directory-grid">
              {result.data.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  prefetch={false}
                  className="surface company-directory-card"
                >
                  <CompanyAvatar company={company} />
                  <h3>{company.name}</h3>
                  <p className="company-directory-location">
                    <MapPin size={15} aria-hidden="true" />
                    {company.city || "Chưa cập nhật địa điểm"}
                  </p>
                  <p className="company-directory-description">
                    {company.summary ||
                      "Khám phá thông tin doanh nghiệp và các cơ hội nghề nghiệp đang mở."}
                  </p>
                  <span className="company-directory-card-footer">
                    <span>
                      <BriefcaseBusiness size={16} aria-hidden="true" />
                      {company.active_jobs_count} việc làm đang tuyển
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
            <Pagination
              page={result.meta.page}
              lastPage={result.meta.last_page}
              pageUrl={pageUrl}
              label="Phân trang doanh nghiệp"
              prefetch={false}
            />
          </>
        ) : (
          <div className="surface empty-state">
            <SearchX aria-hidden="true" size={44} />
            <h2>
              {hasFilters
                ? "Không tìm thấy doanh nghiệp phù hợp"
                : "Chưa có doanh nghiệp để hiển thị"}
            </h2>
            <p>
              {hasFilters
                ? "Thử từ khóa khác hoặc chọn tất cả địa điểm để tìm thêm doanh nghiệp."
                : "Các doanh nghiệp tham gia tuyển dụng sẽ xuất hiện tại đây."}
            </p>
            <Button asChild variant="outline" className="h-11">
              <Link href={hasFilters ? "/companies" : "/jobs"}>
                {hasFilters ? "Xóa bộ lọc" : "Khám phá việc làm"}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
