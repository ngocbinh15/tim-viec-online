import type { AuthUser } from "@/features/auth/types";
import type {
  EmployerData,
  EmployerJob,
  EmployerApplication,
} from "@/features/employer/types";
import { JOB_CATEGORIES, createJobFixtures } from "./jobs";
import { PROFILE_SKILLS } from "@/features/candidate-profile/types";
import { vietnamToday } from "@/features/jobs/formatters";

export function createEmployerData(
  user: AuthUser,
  cities: string[],
  now = new Date(),
): EmployerData {
  const today = vietnamToday(now);
  const day = (offset: number) =>
    new Date(`${today}T12:00:00+07:00`).valueOf() + offset * 86400000;
  const iso = (offset: number) => new Date(day(offset)).toISOString();
  const company = {
    id: 1,
    user_id: user.id,
    name: "FPT Software",
    logo: null,
    company_size: "1000+ nhân viên",
    website: "https://fptsoftware.com",
    city: "Hà Nội",
    address: "Khu Công nghệ cao Hòa Lạc, Hà Nội",
    description:
      "FPT Software là công ty công nghệ cung cấp giải pháp phần mềm và chuyển đổi số. Chúng tôi xây dựng môi trường làm việc cởi mở, đề cao học hỏi và cùng nhau phát triển những sản phẩm có giá trị.",
  };
  const base = createJobFixtures(now)[0];
  const titles = [
    "Lập trình viên Backend Laravel (Middle)",
    "Frontend Developer (React / Next.js)",
    "Chuyên viên kiểm thử phần mềm",
    "Thực tập sinh kiểm thử phần mềm",
    "Kỹ sư DevOps và hạ tầng",
    "Chuyên viên phân tích nghiệp vụ",
  ];
  const jobs: EmployerJob[] = titles.map((title, index) => ({
    ...base,
    id: index + 1,
    company_id: company.id,
    company,
    title,
    category_id: 1,
    job_level: index === 3 ? "Intern" : "Middle",
    quantity: 2,
    description:
      "Phát triển và bảo trì sản phẩm phần mềm. Phối hợp cùng nhóm để phân tích yêu cầu, triển khai tính năng và nâng cao chất lượng sản phẩm.",
    requirements:
      "Có kinh nghiệm với các công nghệ liên quan. Chủ động học hỏi, làm việc nhóm và giải quyết vấn đề. Có khả năng đọc tài liệu tiếng Anh.",
    benefits:
      "Lương tháng 13, bảo hiểm theo quy định, đào tạo chuyên môn và lộ trình phát triển rõ ràng.",
    salary_min: index === 3 ? 5000000 : 18000000,
    salary_max: index === 3 ? 8000000 : 28000000,
    is_negotiable: false,
    city: "Hà Nội",
    address: company.address,
    job_type: "full_time",
    status: index === 2 ? "closed" : index === 3 ? "expired" : "active",
    deadline: iso(index === 3 ? -4 : 30 + index).slice(0, 10),
    created_at: iso(-15 - index),
    updated_at: iso(-index),
    views_count: 320 - index * 30,
  }));
  const names = [
    "Nguyễn Văn An",
    "Trần Thị Linh",
    "Lê Minh Hoàng",
    "Nguyễn Minh Anh",
    "Phạm Quang Huy",
    "Đỗ Thùy Dương",
    "Vũ Đức Nam",
    "Bùi Ngọc Mai",
  ];
  const statuses = [
    "applied",
    "waiting",
    "accepted",
    "waiting",
    "withdrawn",
    "rejected",
    "applied",
    "applied",
  ] as const;
  const scores = [88, 92, 85, 94, 60, 67, 78, null];
  const applications: EmployerApplication[] = names.map((name, index) => ({
    id: index + 1,
    job_id: index === 4 ? 4 : index === 5 ? 3 : (index % 2) + 1,
    candidate_id: index + 1,
    candidate_user_id: 9000 + index,
    name,
    title: index % 2 ? "Frontend Developer" : "Backend Developer",
    email: `ungvien${index + 1}@example.test`,
    phone: "0901234567",
    city: index % 2 ? "Hồ Chí Minh" : "Hà Nội",
    experience_years: 2 + (index % 4),
    skills:
      index % 2
        ? ["ReactJS", "NextJS", "TypeScript"]
        : ["PHP", "Laravel", "MySQL"],
    cover_letter:
      "Tôi mong muốn ứng tuyển vị trí tại công ty và đóng góp kinh nghiệm phát triển phần mềm của mình. Rất mong có cơ hội trao đổi thêm với đội ngũ tuyển dụng.",
    status: statuses[index],
    reviewed_at: statuses[index] === "applied" ? null : iso(-2),
    created_at: iso(-index - 1),
    cv_path: index === 7 ? null : "/demo/employer-cv.pdf",
    analysis:
      scores[index] === null
        ? null
        : {
            match_score: scores[index]!,
            summary:
              "Hồ sơ có kinh nghiệm phát triển web phù hợp với yêu cầu vị trí. Nên trao đổi thêm về kinh nghiệm vận hành hệ thống và khả năng phối hợp trong dự án.",
            matched_skills: ["Laravel", "MySQL"],
            missing_skills: ["Docker", "Kiểm thử tự động"],
            strengths: [
              "Có kinh nghiệm xây dựng sản phẩm thực tế",
              "Nắm vững kiến thức lập trình và dữ liệu",
            ],
            recommendations: [
              "Trao đổi thêm về dự án gần đây và phạm vi trách nhiệm.",
            ],
          },
  }));
  const conversations = [
    applications[0],
    applications[1],
    applications[5],
    applications[2],
  ].map((app, index) => ({
    id: index + 1,
    application_id: app.id,
    candidate_id: app.candidate_user_id,
    employer_id: user.id,
    job_id: app.job_id,
  }));
  const messages = conversations.flatMap((conv) => [
    {
      id: `${conv.id}-1`,
      conversation_id: conv.id,
      sender_id: conv.candidate_id,
      message:
        conv.application_id === 3
          ? "Em đã bổ sung thông tin về kinh nghiệm dự án. Anh/chị có thể trao đổi thêm với em tại đây ạ."
          : "Chào anh/chị, em đã gửi hồ sơ ứng tuyển và rất mong có cơ hội trao đổi thêm về công việc ạ.",
      created_at: iso(-1),
      is_read: conv.id !== 1,
    },
    {
      id: `${conv.id}-2`,
      conversation_id: conv.id,
      sender_id: user.id,
      message:
        "Chào bạn, cảm ơn bạn đã quan tâm. Mình đã nhận được hồ sơ và sẽ phản hồi sớm nhé.",
      created_at: iso(0),
      is_read: true,
    },
  ]);
  return {
    user,
    today,
    company,
    jobs,
    applications,
    conversations,
    messages,
    cities,
    categories: JOB_CATEGORIES,
    skills: [...PROFILE_SKILLS],
    notifications: [
      {
        id: 1,
        type: "new_applicant",
        title: "Nguyễn Văn An vừa ứng tuyển",
        content: `Bạn có hồ sơ mới cho vị trí ${jobs[0].title}.`,
        href: "/employer/candidates/1",
        read_at: null,
        created_at: iso(0),
      },
      {
        id: 2,
        type: "new_message",
        title: "Tin nhắn mới từ Nguyễn Văn An",
        content: "Ứng viên muốn trao đổi thêm về cơ hội làm việc tại công ty.",
        href: "/employer/messages?conversation=1",
        read_at: null,
        created_at: iso(0),
      },
      {
        id: 3,
        type: "new_applicant",
        title: "Trần Thị Linh vừa ứng tuyển",
        content: `Hồ sơ mới cho vị trí ${jobs[1].title} đang chờ xem xét.`,
        href: "/employer/candidates/2",
        read_at: null,
        created_at: iso(-1),
      },
      {
        id: 4,
        type: "new_message",
        title: "Lê Minh Hoàng đã gửi tin nhắn",
        content: "Ứng viên đã bổ sung thông tin về kinh nghiệm dự án.",
        href: "/employer/messages?conversation=4",
        read_at: iso(-1),
        created_at: iso(-1),
      },
      {
        id: 5,
        type: "withdrawn",
        title: "Phạm Quang Huy đã rút hồ sơ",
        content: "Ứng viên đã chủ động rút hồ sơ ứng tuyển.",
        href: "/employer/candidates/5",
        read_at: iso(-2),
        created_at: iso(-2),
      },
    ],
  };
}
