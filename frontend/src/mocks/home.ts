import type { Job } from "@/features/jobs/types";
import type { HomeCategory, HomeCompany } from "@/features/home/types";
import { vietnamToday } from "@/features/jobs/formatters";

// Presentation fixtures from design/page_home. These are not live recruitment statistics.
export const HOME_FEATURED = [
  {
    id: 101,
    title: "Human Resources Manager",
    company: "Trường Đại học VinUni",
    mark: "VinUni",
    brand: "vinuni",
    city: "Hà Nội",
    category: 5,
    min: null,
    max: null,
    skills: ["Quản trị nhân sự", "Tiếng Anh", "Quản lý"],
  },
  {
    id: 102,
    title: "Kỹ Sư Nghiên Cứu & Phát Triển",
    company: "SDI Electronic Components Vietnam",
    mark: "SEEV",
    brand: "seev",
    city: "Hà Nội",
    category: 1,
    min: null,
    max: null,
    skills: ["Nghiên cứu", "Phát triển sản phẩm", "Kỹ thuật"],
  },
  {
    id: 103,
    title: "Giám Đốc Vận Hành Vùng",
    company: "Công ty Cổ phần Di chuyển Xanh và Thông minh",
    mark: "GSM",
    brand: "gsm",
    city: "TP. Hồ Chí Minh",
    category: 5,
    min: null,
    max: null,
    skills: ["Vận hành", "Quản lý", "Kinh doanh"],
  },
  {
    id: 104,
    title: "Chuyên Gia Giải Pháp Tài Chính",
    company: "Công ty Cổ phần Chứng khoán VIX",
    mark: "VIX",
    brand: "vix",
    city: "Hà Nội",
    category: 3,
    min: 35_000_000,
    max: 55_000_000,
    skills: ["Tài chính", "Chứng khoán", "Tư vấn"],
  },
  {
    id: 105,
    title: "DX Officer (Hanoi Head Office)",
    company: "AEONMALL Vietnam Co., Ltd.",
    mark: "AEON",
    brand: "aeon",
    city: "Hà Nội",
    category: 1,
    min: 21_000_000,
    max: 40_000_000,
    skills: ["Chuyển đổi số", "Phân tích dữ liệu", "Tiếng Anh"],
  },
  {
    id: 106,
    title: "Lead Data Reconciliation",
    company: "NAB Innovation Centre Vietnam",
    mark: "nab",
    brand: "nab",
    city: "Hà Nội",
    category: 1,
    min: null,
    max: null,
    skills: ["SQL", "Phân tích dữ liệu", "Tiếng Anh"],
  },
];

export const HOME_CATEGORIES: HomeCategory[] = [
  {
    name: "Kinh doanh",
    count: 1422,
    icon: "briefcase",
    href: "/jobs?keyword=Kinh+doanh",
  },
  {
    name: "Kế toán / Kiểm toán",
    count: 1188,
    icon: "accounting",
    href: "/jobs?category_ids=3",
  },
  {
    name: "Kiến trúc / Xây dựng",
    count: 969,
    icon: "building",
    href: "/jobs?keyword=X%C3%A2y+d%E1%BB%B1ng",
  },
  {
    name: "Sản xuất",
    count: 880,
    icon: "factory",
    href: "/jobs?keyword=S%E1%BA%A3n+xu%E1%BA%A5t",
  },
  {
    name: "Công nghệ thông tin",
    count: 771,
    icon: "monitor",
    href: "/jobs?category_ids=1",
  },
  {
    name: "Marketing & Truyền thông",
    count: 4,
    icon: "marketing",
    href: "/jobs?category_ids=2",
  },
  {
    name: "Thiết kế & Sáng tạo",
    count: 3,
    icon: "design",
    href: "/jobs?category_ids=4",
  },
  {
    name: "Nhân sự & Hành chính",
    count: 4,
    icon: "people",
    href: "/jobs?category_ids=5",
  },
];

export const HOME_COMPANIES: Omit<HomeCompany, "count">[] = [
  {
    id: 1,
    name: "FPT Software",
    mark: "FPT",
    brand: "fpt",
    location: "Hà Nội & TP.HCM",
  },
  {
    id: 201,
    name: "Tập đoàn Viettel",
    mark: "VIETTEL",
    brand: "viettel",
    location: "Toàn quốc",
  },
  {
    id: 202,
    name: "Vinamilk",
    mark: "VINAMILK",
    brand: "vinamilk",
    location: "TP. Hồ Chí Minh",
  },
  {
    id: 203,
    name: "Techcombank",
    mark: "TECHCOM",
    brand: "techcom",
    location: "Hà Nội & TP.HCM",
  },
  {
    id: 204,
    name: "Shopee Vietnam",
    mark: "SHOPEE",
    brand: "shopee",
    location: "TP. Hồ Chí Minh",
  },
  {
    id: 205,
    name: "Vingroup",
    mark: "VINGROUP",
    brand: "vingroup",
    location: "Hà Nội & Hải Phòng",
  },
];

export function createHomeJobFixtures(now: Date): Job[] {
  const midnight = new Date(`${vietnamToday(now)}T00:00:00.000Z`);
  const offset = (days: number) =>
    new Date(midnight.valueOf() + days * 86_400_000).toISOString().slice(0, 10);
  return HOME_FEATURED.map((spec, index) => ({
    id: spec.id,
    company_id: spec.id,
    category_id: spec.category,
    title: spec.title,
    job_level: index === 0 || index === 2 ? "Manager" : "Senior",
    quantity: 2,
    description: `Đảm nhiệm vị trí ${spec.title} tại ${spec.company}.\nPhối hợp với các bộ phận để triển khai công việc, theo dõi tiến độ và đề xuất cải tiến trong phạm vi phụ trách.`,
    requirements: `Có kinh nghiệm phù hợp với vị trí ${spec.title}.\nCó kiến thức về ${spec.skills.join(", ")}.\nGiao tiếp rõ ràng, chủ động và có trách nhiệm trong công việc.`,
    benefits:
      "Thu nhập theo năng lực và kinh nghiệm.\nĐược tham gia các chương trình đào tạo chuyên môn.\nChế độ bảo hiểm và nghỉ phép theo quy định.",
    salary_min: spec.min,
    salary_max: spec.max,
    is_negotiable: spec.min === null,
    job_type: "full_time",
    city: spec.city,
    address: `Văn phòng ${spec.company}, ${spec.city}`,
    deadline: offset(30),
    status: "active",
    created_at: `${offset(-50)}T02:00:00.000Z`,
    updated_at: `${offset(-45 - index)}T02:00:00.000Z`,
    company: {
      id: spec.id,
      name: spec.company,
      company_size: "500 - 1.000 nhân viên",
      website: null,
      address: `Văn phòng ${spec.company}, ${spec.city}`,
      city: spec.city,
      description: `${spec.company} đang tìm kiếm ứng viên cho vị trí ${spec.title}. Thông tin tuyển dụng trong bản xem trước là dữ liệu minh họa.`,
    },
    skills: spec.skills.map((name, skillIndex) => ({
      id: 1000 + index * 10 + skillIndex,
      name,
    })),
  }));
}
