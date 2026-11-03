import Link from "next/link";
import { ArrowRight, Building2, ChevronRight } from "lucide-react";
import { FeaturedJobs, KeyCategories, TopCompanies } from "./home-carousels";
import { HomeSearch } from "./home-search";
import { getHomeContent } from "@/services/jobs";
import { getCurrentUser } from "@/services/auth-session";
import { getProvinceNames } from "@/services/locations";
import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

export async function HomeHero() {
  const cities = await getProvinceNames();
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container">
        <p className="home-opportunity">
          <span>
            <span>
              Khám phá cơ hội nghề nghiệp từ các doanh nghiệp đang tuyển dụng
            </span>
            <ArrowRight size={13} aria-hidden="true" />
          </span>
        </p>
        <div className="home-heading">
          <h1 id="home-title">Tìm Việc Làm Mơ Ước Của Bạn Tại Việt Nam</h1>
          <p>
            Tìm công việc phù hợp theo kỹ năng, địa điểm và mức lương mong muốn
            của bạn.
          </p>
        </div>
        <HomeSearch cities={cities} />
        <div className="home-trends">
          <span>Xu hướng:</span>
          {["ReactJS", "Laravel", "Java", "Marketing", "Kế toán", "Tester"].map(
            (keyword) => (
              <Link
                key={keyword}
                href={`/jobs?${new URLSearchParams({ keyword })}`}
                prefetch={false}
              >
                {keyword}
              </Link>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export async function HomeContent() {
  const [content, user] = await Promise.all([
    getHomeContent(),
    getCurrentUser().catch(() => null),
  ]);
  const employerUrl =
    user?.role === "employer" ? "/employer" : "/login?role=employer";
  return (
    <div className="home-content home-container">
      <section className="home-featured" aria-labelledby="home-featured-title">
        <div className="home-section-heading">
          <div className="home-ribbon">
            <h2 id="home-featured-title" className="home-section-title">
              Việc Làm Tốt Nhất
            </h2>
          </div>
          <Link className="home-section-link" href="/jobs" prefetch={false}>
            Xem Tất Cả
            <ChevronRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <FeaturedJobs jobs={content.jobs} viewerRole={user?.role} />
      </section>
      <KeyCategories categories={content.categories} />
      <section
        className="home-featured"
        aria-labelledby="home-companies-title"
        id="top-companies"
      >
        <div className="home-section-heading">
          <div className="home-ribbon">
            <h2 id="home-companies-title" className="home-section-title">
              Top Doanh Nghiệp Hàng Đầu
            </h2>
          </div>
          <Link
            className="home-section-link"
            href="/companies"
            prefetch={false}
          >
            Xem Tất Cả
            <ChevronRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <TopCompanies companies={content.companies} />
      </section>
      <section className="home-employer" aria-labelledby="home-employer-title">
        <div className="home-employer-copy">
          <span className="home-employer-eyebrow">
            <Building2 size={16} aria-hidden="true" />
            Dành cho nhà tuyển dụng
          </span>
          <h2 id="home-employer-title">
            Tìm cộng sự mới
            <br />
            cho doanh nghiệp.
          </h2>
          <p>
            Đăng tin, theo dõi hồ sơ ứng tuyển và trao đổi với ứng viên. Quản lý
            công việc tuyển dụng tại một nơi.
          </p>
          <div className="home-employer-actions">
            <Link className="home-cta-primary" href={employerUrl}>
              Bắt đầu tuyển dụng
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {user?.role !== "employer" && (
              <Link
                className="home-cta-secondary"
                href="/register?role=employer"
              >
                Tạo tài khoản nhà tuyển dụng
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
        <div className="home-employer-workflow">
          <h3>Quy trình tuyển dụng rõ ràng</h3>
          <ol>
            <li>
              <span className="home-employer-step" aria-hidden="true">
                01
              </span>
              <div>
                <h4>Đăng tin tuyển dụng</h4>
                <p>Mô tả vị trí, yêu cầu và quyền lợi của công việc.</p>
              </div>
            </li>
            <li>
              <span className="home-employer-step" aria-hidden="true">
                02
              </span>
              <div>
                <h4>Xem và quản lý hồ sơ</h4>
                <p>Theo dõi ứng viên và cập nhật kết quả ứng tuyển.</p>
              </div>
            </li>
            <li>
              <span className="home-employer-step" aria-hidden="true">
                03
              </span>
              <div>
                <h4>Trao đổi với ứng viên</h4>
                <p>Nhắn tin trực tiếp để trao đổi về vị trí tuyển dụng.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

export function HomeContentSkeleton() {
  return (
    <div
      className="home-content home-container"
      role="status"
      aria-label="Đang tải nội dung trang chủ"
    >
      <span className="sr-only">Đang tải việc làm và doanh nghiệp…</span>
      <div className="home-featured">
        <Skeleton className="h-8 w-48 mb-10" />
        <div className="home-jobs-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-28 rounded-2xl" key={index} />
          ))}
        </div>
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
