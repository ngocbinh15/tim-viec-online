import type {
  AdminCommand,
  AdminFailure,
  AdminMutationResult,
  AdminWorkspaceAdapter,
} from "@/features/admin/adapter";
import type { AdminDatabase } from "@/features/admin/types";
import { normalizeSearch } from "@/features/jobs/query";

function failure(
  code: AdminFailure["code"],
  message: string,
  field?: AdminFailure["field"],
): AdminFailure {
  return { success: false, code, message, field };
}

/** Pure mock transaction; validates against the latest snapshot, not stale UI rows. */
export function applyAdminCommand(
  db: AdminDatabase,
  command: AdminCommand,
): AdminMutationResult {
  if (
    command.id !== undefined &&
    (!Number.isSafeInteger(command.id) || command.id <= 0)
  )
    return failure("not_found", "Không tìm thấy bản ghi.");
  switch (command.type) {
    case "save-category":
    case "save-skill": {
      const key = command.type === "save-category" ? "categories" : "skills";
      const limit = key === "categories" ? 150 : 100;
      const name = command.name.trim().replace(/\s+/g, " ");
      if (!name || name.length > limit)
        return failure(
          "validation",
          `Tên phải có từ 1 đến ${limit} ký tự.`,
          "name",
        );
      const list = db[key];
      if (
        command.id !== undefined &&
        !list.some((item) => item.id === command.id)
      )
        return failure(
          "not_found",
          "Bản ghi đã bị xóa. Vui lòng tải lại danh sách.",
          "name",
        );
      if (
        list.some(
          (item) =>
            item.id !== command.id &&
            normalizeSearch(item.name) === normalizeSearch(name),
        )
      )
        return failure(
          "conflict",
          "Tên đã tồn tại. Vui lòng chọn tên khác.",
          "name",
        );
      const id = command.id ?? Math.max(0, ...list.map((item) => item.id)) + 1;
      return {
        success: true,
        data: {
          ...db,
          [key]:
            command.id === undefined
              ? [...list, { id, name }]
              : list.map((item) => (item.id === id ? { ...item, name } : item)),
        },
      };
    }
    case "delete-category":
      if (!db.categories.some((item) => item.id === command.id))
        return failure("not_found", "Ngành nghề không còn tồn tại.");
      if (db.jobs.some((job) => job.category_id === command.id))
        return failure(
          "conflict",
          "Không thể xóa ngành nghề đang được sử dụng.",
        );
      return {
        success: true,
        data: {
          ...db,
          categories: db.categories.filter((item) => item.id !== command.id),
        },
      };
    case "delete-skill":
      if (!db.skills.some((item) => item.id === command.id))
        return failure("not_found", "Kỹ năng không còn tồn tại.");
      return {
        success: true,
        data: {
          ...db,
          skills: db.skills.filter((item) => item.id !== command.id),
          jobs: db.jobs.map((job) => ({
            ...job,
            skills: job.skills.filter((id) => id !== command.id),
          })),
        },
      };
    case "set-user-status": {
      const user = db.users.find((item) => item.id === command.id);
      if (!user) return failure("not_found", "Tài khoản không còn tồn tại.");
      if (user.role === "admin")
        return failure(
          "forbidden",
          "Không thay đổi trạng thái tài khoản quản trị trong bản mẫu.",
        );
      if (command.status !== "active" && command.status !== "locked")
        return failure("validation", "Trạng thái tài khoản không hợp lệ.");
      return {
        success: true,
        data: {
          ...db,
          users: db.users.map((item) =>
            item.id === user.id ? { ...item, status: command.status } : item,
          ),
        },
      };
    }
    case "delete-job": {
      if (!db.jobs.some((job) => job.id === command.id))
        return failure("not_found", "Tin tuyển dụng không còn tồn tại.");
      const reason = command.reason.trim();
      if (!reason || reason.length > 255)
        return failure(
          "validation",
          "Vui lòng nhập lý do vi phạm từ 1 đến 255 ký tự.",
          "reason",
        );
      if (!command.confirmed)
        return failure(
          "validation",
          "Vui lòng xác nhận ảnh hưởng của thao tác xóa tin.",
          "confirmed",
        );
      // Only relations present in the fixture are simulated. Laravel owns the
      // complete cascade, notification and audit transaction (SRS FR-09.2).
      return {
        success: true,
        data: {
          ...db,
          jobs: db.jobs.filter((job) => job.id !== command.id),
          applications: db.applications.filter(
            (app) => app.job_id !== command.id,
          ),
        },
      };
    }
  }
}

export function createAdminMockAdapter(
  initial: AdminDatabase,
): AdminWorkspaceAdapter {
  let snapshot = structuredClone(initial);
  return {
    async execute(command) {
      const result = applyAdminCommand(snapshot, command);
      if (result.success) snapshot = result.data;
      return result.success
        ? { success: true, data: structuredClone(snapshot) }
        : result;
    },
    reset() {
      snapshot = structuredClone(initial);
      return structuredClone(snapshot);
    },
  };
}
