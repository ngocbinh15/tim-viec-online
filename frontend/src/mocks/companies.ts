import type { Job, Company } from "../features/jobs/types";
import type {
  CompanyProfile,
  CompanySector,
} from "../features/companies/types";
import { companyOpenJobs } from "../features/companies/query";

// Presentation fixtures follow the supplied company designs. These are not
// verified corporate records or live recruitment statistics.
const featured = [
  {
    id: 1,
    short_name: "FPT Software",
    name: "FPT Software",
    mark: "FPT",
    brand: "fpt",
    sectors: ["technology"],
    industry_label: "Công nghệ thông tin",
    company_size: "10.000+ nhân viên",
    city: "Hà Nội, TP. Hồ Chí Minh, Đà Nẵng",
    summary:
      "Công ty phần mềm hàng đầu Đông Nam Á, cung cấp dịch vụ chuyển đổi số và phát triển phần mềm toàn cầu.",
    subtitle:
      "Công ty thành viên thuộc Tập đoàn FPT · Công nghệ thông tin & Chuyển đổi số",
    locations: [
      { city: "Hà Nội", address: "FPT Tower, Số 10 Phạm Văn Bạch, Cầu Giấy" },
      {
        city: "TP. Hồ Chí Minh",
        address: "FPT Software Building, Khu Công nghệ cao, TP. Thủ Đức",
      },
      { city: "Đà Nẵng", address: "FPT Complex, Ngũ Hành Sơn" },
    ],
  },
  {
    id: 201,
    short_name: "Tập đoàn Viettel",
    name: "Tập đoàn Công nghiệp - Viễn thông Quân đội",
    mark: "VIETTEL",
    brand: "viettel",
    sectors: ["technology"],
    industry_label: "Viễn thông & CNTT",
    company_size: "50.000+ nhân sự",
    city: "Hà Nội & Toàn quốc",
    summary:
      "Tập đoàn công nghệ viễn thông tại Việt Nam, phát triển các dịch vụ mạng di động, nền tảng số và an ninh mạng.",
  },
  {
    id: 202,
    short_name: "Vinamilk",
    name: "Công ty Cổ phần Sữa Việt Nam",
    mark: "VINAMILK",
    brand: "vinamilk",
    sectors: ["retail"],
    industry_label: "FMCG / Thực phẩm",
    company_size: "10.000+ nhân viên",
    city: "TP. Hồ Chí Minh",
    summary:
      "Doanh nghiệp trong ngành sữa và thực phẩm, với các vị trí làm việc trong sản xuất, kinh doanh và phát triển sản phẩm.",
  },
  {
    id: 203,
    short_name: "Techcombank",
    name: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    mark: "TECHCOM",
    brand: "techcom",
    sectors: ["finance"],
    industry_label: "Ngân hàng & Tài chính",
    company_size: "12.000+ nhân viên",
    city: "Hà Nội, TP. Hồ Chí Minh",
    summary:
      "Ngân hàng phát triển các dịch vụ tài chính và ngân hàng số, tuyển dụng nhân sự ở nhiều khối chuyên môn.",
  },
  {
    id: 204,
    short_name: "Shopee Vietnam",
    name: "Shopee & Sea Group Vietnam",
    mark: "SHOPEE",
    brand: "shopee",
    sectors: ["retail"],
    industry_label: "Thương mại điện tử",
    company_size: "5.000+ nhân viên",
    city: "TP. Hồ Chí Minh",
    summary:
      "Nền tảng thương mại điện tử kết nối người mua và nhà bán hàng, với đội ngũ công nghệ, vận hành và dịch vụ khách hàng.",
  },
  {
    id: 205,
    short_name: "Vingroup",
    name: "Tập đoàn Vingroup",
    mark: "VINGROUP",
    brand: "vingroup",
    sectors: ["technology", "industry"],
    industry_label: "Đa ngành / Công nghệ",
    company_size: "60.000+ nhân viên",
    city: "Hà Nội & Hải Phòng",
    summary:
      "Tập đoàn kinh tế đa ngành với các lĩnh vực công nghệ, công nghiệp và dịch vụ, phát triển đội ngũ nhân sự đa chuyên môn.",
  },
] satisfies Array<{
  id: number;
  short_name: string;
  name: string;
  mark: string;
  brand: string;
  sectors: CompanySector[];
  industry_label: string;
  company_size: string;
  city: string;
  summary: string;
  subtitle?: string;
  locations?: { city: string; address: string }[];
}>;

const sectorByCategory: Record<number, CompanySector[]> = {
  1: ["technology"],
  3: ["finance"],
};
const labelByCategory: Record<number, string> = {
  1: "Công nghệ thông tin",
  2: "Marketing & Truyền thông",
  3: "Tài chính & Kế toán",
  4: "Thiết kế & Sáng tạo",
  5: "Nhân sự & Quản trị",
};

export function createCompanyProfiles(
  jobs: Job[],
  today: string,
): CompanyProfile[] {
  const existing = new Map<number, Company>(
    jobs.map((job) => [job.company_id, job.company]),
  );
  const profiles = featured.map((spec): CompanyProfile => {
    const base = existing.get(spec.id);
    const locations =
      "locations" in spec && spec.locations
        ? spec.locations
        : [{ city: spec.city, address: base?.address ?? spec.city }];
    return {
      id: spec.id,
      name: spec.name,
      short_name: spec.short_name,
      company_size: base?.company_size ?? spec.company_size,
      website: base?.website ?? null,
      address: locations[0].address,
      city: spec.city,
      description: spec.summary,
      summary: spec.summary,
      subtitle:
        ("subtitle" in spec ? spec.subtitle : undefined) ?? spec.industry_label,
      introduction:
        spec.id === 1
          ? [
              "FPT Software là công ty thành viên thuộc Tập đoàn FPT, cung cấp dịch vụ công nghệ thông tin và chuyển đổi số cho khách hàng trong nước và quốc tế.",
              "Các nhóm kỹ thuật cùng làm việc trên những dự án phát triển phần mềm, dữ liệu và giải pháp doanh nghiệp. Ứng viên có thể xem yêu cầu chuyên môn và quyền lợi tại từng tin tuyển dụng bên dưới.",
            ]
          : [spec.summary],
      mark: spec.mark,
      brand: spec.brand,
      sectors: spec.sectors,
      industry_label: spec.industry_label,
      locations,
      active_jobs_count: companyOpenJobs(jobs, spec.id, today).length,
    };
  });
  for (const company of existing.values()) {
    if (profiles.some((profile) => profile.id === company.id)) continue;
    const first = jobs.find((job) => job.company_id === company.id)!;
    profiles.push({
      ...company,
      short_name: company.name,
      mark: company.name
        .split(/\s+/)
        .map((word) => word[0])
        .slice(0, 3)
        .join(""),
      brand: "generic",
      sectors: sectorByCategory[first.category_id] ?? [],
      industry_label: labelByCategory[first.category_id] ?? "Doanh nghiệp",
      subtitle: labelByCategory[first.category_id] ?? "Thông tin doanh nghiệp",
      summary: company.description,
      introduction: [company.description],
      locations: [{ city: company.city, address: company.address }],
      active_jobs_count: companyOpenJobs(jobs, company.id, today).length,
    });
  }
  return profiles;
}
