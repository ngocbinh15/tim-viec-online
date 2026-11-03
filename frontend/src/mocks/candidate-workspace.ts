import type {
  CandidatePreviewData,
  ApplicationStatus,
} from "@/features/candidate-workspace/types";
import type { Job } from "@/features/jobs/types";

export function createCandidateWorkspace(
  jobs: Job[],
  today: string,
): CandidatePreviewData {
  const selected = [
    ...jobs.filter((job) => job.id <= 8),
    ...jobs.filter((job) => job.id === 19),
  ];
  const states: ApplicationStatus[] = [
    "waiting",
    "applied",
    "accepted",
    "rejected",
  ];
  const timestamp = (days: number, hour = "09:25") => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - days);
    return `${date.toISOString().slice(0, 10)}T${hour}:00+07:00`;
  };
  return {
    jobs,
    today,
    applications: selected.map((job, index) => ({
      id: index + 1,
      job_id: job.id,
      status: states[index % states.length],
      created_at: timestamp(index + 1),
    })),
    savedIds: selected.map((job) => job.id),
    conversations: [
      { id: 1, job_id: 19, contact: "Nguyễn Thu Trang" },
      { id: 2, job_id: 2, contact: "Trần Anh Tuấn" },
    ],
    messages: [
      {
        id: "seed-1",
        conversation_id: 1,
        outgoing: false,
        message:
          "Chào An, bên mình đã xem hồ sơ và muốn hẹn một buổi trao đổi thêm. Bạn có thể tham gia vào sáng thứ Sáu không?",
        created_at: timestamp(1),
      },
      {
        id: "seed-2",
        conversation_id: 1,
        outgoing: true,
        message:
          "Em cảm ơn chị đã phản hồi. Em có thể tham gia ạ. Chị cho em xin thời gian cụ thể và hình thức trao đổi nhé.",
        created_at: timestamp(1, "09:35"),
      },
      {
        id: "seed-3",
        conversation_id: 1,
        outgoing: false,
        message:
          "Cảm ơn bạn, mình sẽ gửi thông tin buổi trao đổi tại đây. Hẹn gặp bạn!",
        created_at: timestamp(1, "09:40"),
      },
      {
        id: "seed-4",
        conversation_id: 2,
        outgoing: false,
        message:
          "Chào bạn, mình đã nhận được hồ sơ ứng tuyển. Bạn có thể chia sẻ thêm một sản phẩm nội dung đã thực hiện không?",
        created_at: timestamp(2),
      },
    ],
    notifications: [
      {
        id: 1,
        type: "new_message",
        title: "FPT Software đã gửi tin nhắn mới",
        content:
          "Nhà tuyển dụng muốn trao đổi thêm với bạn về hồ sơ đã ứng tuyển.",
        conversation_id: 1,
        created_at: timestamp(1, "09:40"),
        read_at: null,
      },
      {
        id: 2,
        type: "app_status_changed",
        title: "Hồ sơ của bạn đã được chấp nhận",
        application_id: 3,
        content:
          "Nhà tuyển dụng đã cập nhật kết quả ứng tuyển. Xem chi tiết tại Việc làm của tôi.",
        created_at: timestamp(2),
        read_at: null,
      },
      {
        id: 3,
        type: "app_status_changed",
        title: "Cập nhật kết quả ứng tuyển",
        application_id: 4,
        content:
          "Một hồ sơ chưa phù hợp với yêu cầu của nhà tuyển dụng. Bạn có thể tiếp tục khám phá các cơ hội khác.",
        created_at: timestamp(3),
        read_at: timestamp(2),
      },
    ],
  };
}
