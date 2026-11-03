import { vietnamToday } from "../features/jobs/formatters";
import type { Category, Company, Job, JobType } from "../features/jobs/types";

// Demo catalog mirrors the five IDs in db/tim_viec_online.sql. All other
// fixture records are illustrative, not records fetched from the database.
export const JOB_CATEGORIES: Category[] = [
  { id: 1, name: "Công nghệ thông tin / Phần mềm" },
  { id: 2, name: "Marketing & Truyền thông số" },
  { id: 3, name: "Kế toán & Tài chính doanh nghiệp" },
  { id: 4, name: "Thiết kế đồ họa & UI/UX" },
  { id: 5, name: "Quản trị nhân sự & Hành chính" },
];

type FixtureSpec = {
  title: string;
  company: string;
  category: number;
  city: string;
  min: number | null;
  max: number | null;
  level: string;
  type: JobType;
  skills: string[];
  negotiable?: boolean;
};

const fixtureSpecs: FixtureSpec[] = [
  {
    title: "Senior Fullstack Developer (Laravel & Next.js)",
    company: "FPT Software",
    category: 1,
    city: "TP. Hồ Chí Minh",
    min: 25_000_000,
    max: 40_000_000,
    level: "Senior",
    type: "full_time",
    skills: ["PHP", "Laravel", "ReactJS", "NextJS"],
  },
  {
    title: "Chuyên viên Marketing nội dung",
    company: "Đồng Hành Media",
    category: 2,
    city: "Hà Nội",
    min: 10_000_000,
    max: 20_000_000,
    level: "Middle",
    type: "full_time",
    skills: ["Content Marketing", "SEO", "Tiếng Anh"],
  },
  {
    title: "UI/UX Designer — Sản phẩm số",
    company: "Mầm Studio",
    category: 4,
    city: "Đà Nẵng",
    min: 20_000_000,
    max: 25_000_000,
    level: "Middle",
    type: "remote",
    skills: ["Figma", "UI/UX", "Design System"],
  },
  {
    title: "Thực tập sinh Nhân sự",
    company: "An Việt Group",
    category: 5,
    city: "Hà Nội",
    min: 3_000_000,
    max: 5_000_000,
    level: "Intern",
    type: "internship",
    skills: ["Excel", "Giao tiếp", "Tuyển dụng"],
  },
  {
    title: "Kế toán tổng hợp",
    company: "Bình Minh Finance",
    category: 3,
    city: "TP. Hồ Chí Minh",
    min: 12_000_000,
    max: 18_000_000,
    level: "Middle",
    type: "full_time",
    skills: ["Kế toán", "Excel", "MISA"],
  },
  {
    title: "Frontend Developer ReactJS",
    company: "VNG Corporation",
    category: 1,
    city: "TP. Hồ Chí Minh",
    min: 22_000_000,
    max: 35_000_000,
    level: "Senior",
    type: "full_time",
    skills: ["ReactJS", "TypeScript", "CSS"],
  },
  {
    title: "Thiết kế đồ họa bán thời gian",
    company: "Mầm Studio",
    category: 4,
    city: "Đà Nẵng",
    min: 6_000_000,
    max: 9_999_999,
    level: "Junior",
    type: "part_time",
    skills: ["Photoshop", "Illustrator", "Thiết kế"],
  },
  {
    title: "Nhân viên Tuyển dụng",
    company: "An Việt Group",
    category: 5,
    city: "Hà Nội",
    min: 8_000_000,
    max: 10_000_000,
    level: "Junior",
    type: "full_time",
    skills: ["Tuyển dụng", "Giao tiếp", "Excel"],
  },
  {
    title: "Chuyên viên Digital Marketing",
    company: "Đồng Hành Media",
    category: 2,
    city: "Hà Nội",
    min: null,
    max: null,
    negotiable: true,
    level: "Senior",
    type: "remote",
    skills: ["Google Ads", "SEO", "Analytics"],
  },
  {
    title: "Backend Developer PHP Laravel",
    company: "FPT Software",
    category: 1,
    city: "Hà Nội",
    min: 20_000_001,
    max: null,
    level: "Senior",
    type: "remote",
    skills: ["PHP", "Laravel", "MySQL"],
  },
  {
    title: "Trợ lý kế toán bán thời gian",
    company: "Bình Minh Finance",
    category: 3,
    city: "TP. Hồ Chí Minh",
    min: 5_000_000,
    max: 8_000_000,
    level: "Junior",
    type: "part_time",
    skills: ["Kế toán", "Excel"],
  },
  {
    title: "Thực tập sinh Frontend",
    company: "VNG Corporation",
    category: 1,
    city: "TP. Hồ Chí Minh",
    min: 4_000_000,
    max: 6_000_000,
    level: "Intern",
    type: "internship",
    skills: ["ReactJS", "JavaScript", "HTML"],
  },
  {
    title: "Trưởng nhóm Nhân sự",
    company: "An Việt Group",
    category: 5,
    city: "Đà Nẵng",
    min: 25_000_000,
    max: 35_000_000,
    level: "Manager",
    type: "full_time",
    skills: ["Quản trị nhân sự", "Tuyển dụng", "Lãnh đạo"],
  },
  {
    title: "Chuyên viên Đào tạo nội bộ",
    company: "An Việt Group",
    category: 5,
    city: "Hà Nội",
    min: 10_000_000,
    max: 10_000_000,
    level: "Junior",
    type: "full_time",
    skills: ["Đào tạo", "Thuyết trình", "Giao tiếp"],
  },
  {
    title: "Product Designer",
    company: "Mầm Studio",
    category: 4,
    city: "Đà Nẵng",
    min: null,
    max: null,
    negotiable: true,
    level: "Senior",
    type: "full_time",
    skills: ["UI/UX", "Figma", "User Research"],
  },
  {
    title: "Thực tập sinh SEO",
    company: "Đồng Hành Media",
    category: 2,
    city: "Hà Nội",
    min: 3_000_000,
    max: 4_000_000,
    level: "Intern",
    type: "internship",
    skills: ["SEO", "Content Marketing"],
  },
  {
    title: "Kế toán trưởng",
    company: "Bình Minh Finance",
    category: 3,
    city: "TP. Hồ Chí Minh",
    min: 30_000_000,
    max: 45_000_000,
    level: "Manager",
    type: "full_time",
    skills: ["Kế toán", "Tài chính", "Quản lý"],
  },
  {
    title: "Lập trình viên Fresher .NET",
    company: "FPT Software",
    category: 1,
    city: "Hà Nội",
    min: 10_000_000,
    max: null,
    level: "Fresher",
    type: "full_time",
    skills: ["C#", ".NET", "SQL"],
  },
];

/** Anchored to an explicit request clock, keeping deadlines fresh without
 * capturing time at module evaluation or depending on the host timezone. */
export function createJobFixtures(now: Date): Job[] {
  const today = vietnamToday(now);
  const midnight = new Date(`${today}T00:00:00.000Z`);
  const dateOffset = (days: number) =>
    new Date(midnight.valueOf() + days * 86_400_000).toISOString().slice(0, 10);
  const companies = new Map<string, Company>();
  const skills = new Map<string, number>();
  const jobs = fixtureSpecs.map((spec, index): Job => {
    let company = companies.get(spec.company);
    if (!company) {
      company = {
        id: companies.size + 1,
        name: spec.company,
        company_size:
          spec.company === "FPT Software"
            ? "10.000+ nhân viên"
            : "50 - 200 nhân viên",
        website:
          spec.company === "FPT Software" ? "https://fptsoftware.com" : null,
        address: `Văn phòng ${spec.company}, ${spec.city}`,
        city: spec.city,
        description: `${spec.company} xây dựng môi trường làm việc cởi mở, đề cao tinh thần học hỏi và sự phát triển của mỗi thành viên. Chúng tôi tìm kiếm những đồng nghiệp có trách nhiệm, sẵn sàng hợp tác và cùng tạo ra giá trị cho khách hàng.`,
      };
      companies.set(spec.company, company);
    }
    return {
      id: index + 1,
      company_id: company.id,
      category_id: spec.category,
      title: spec.title,
      job_level: spec.level,
      quantity: (index % 3) + 1,
      description: `Tham gia đội ngũ ${spec.company} tại vị trí ${spec.title}.\nPhối hợp cùng các bộ phận liên quan để triển khai công việc theo kế hoạch.\nTheo dõi kết quả, đề xuất cải tiến và báo cáo tiến độ định kỳ.`,
      requirements: `Có kiến thức về ${spec.skills.join(", ")}.\nChủ động học hỏi, giao tiếp rõ ràng và có tinh thần trách nhiệm.\nCó khả năng làm việc độc lập và phối hợp nhóm.`,
      benefits:
        "Được hướng dẫn và đào tạo chuyên môn trong quá trình làm việc.\nXét điều chỉnh thu nhập theo năng lực và kết quả công việc.\nMôi trường làm việc cởi mở, có cơ hội phát triển nghề nghiệp.",
      salary_min: spec.min,
      salary_max: spec.max,
      is_negotiable: spec.negotiable ?? false,
      job_type: spec.type,
      city: spec.city,
      address: `Văn phòng ${spec.company}, ${spec.city}`,
      deadline: dateOffset(15 + index),
      status: "active",
      created_at: `${dateOffset(-20 - index)}T02:00:00.000Z`,
      updated_at: `${dateOffset(-Math.floor(index / 3))}T02:00:00.000Z`,
      company,
      skills: spec.skills.map((name) => {
        if (!skills.has(name)) skills.set(name, skills.size + 1);
        return { id: skills.get(name)!, name };
      }),
    };
  });
  return [
    ...jobs,
    {
      ...jobs[0],
      id: 19,
      title: "Backend Developer — Đợt tuyển dụng đã đóng",
      status: "closed",
      deadline: dateOffset(10),
    },
    {
      ...jobs[2],
      id: 20,
      title: "UI/UX Designer — Đợt tuyển dụng đã hết hạn",
      status: "expired",
      deadline: dateOffset(-1),
    },
  ];
}
