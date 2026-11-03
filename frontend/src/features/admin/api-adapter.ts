import { apiRequest } from "@/features/api/client";
import { readAdminDatabase } from "./api-data";
import type { AdminFailure, AdminWorkspaceAdapter } from "./adapter";

export function createAdminApiAdapter(): AdminWorkspaceAdapter {
  return {
    reset() {
      throw new Error("Dữ liệu máy chủ không hỗ trợ khôi phục mẫu.");
    },
    async execute(command) {
      let written = false;
      try {
        let path: string;
        let method: string;
        let payload: unknown;
        switch (command.type) {
          case "save-category":
          case "save-skill": {
            const resource =
              command.type === "save-category" ? "categories" : "skills";
            path = `/admin/${resource}${command.id ? `/${command.id}` : ""}`;
            method = command.id ? "PUT" : "POST";
            payload = { name: command.name };
            break;
          }
          case "delete-category":
          case "delete-skill":
            path = `/admin/${command.type === "delete-category" ? "categories" : "skills"}/${command.id}`;
            method = "DELETE";
            break;
          case "set-user-status":
            path = `/admin/users/${command.id}/status`;
            method = "PATCH";
            payload = { status: command.status };
            break;
          case "delete-job":
            if (!command.confirmed)
              return {
                success: false,
                code: "validation",
                field: "confirmed",
                message: "Vui lòng xác nhận xóa tin.",
              };
            path = `/admin/jobs/${command.id}`;
            method = "DELETE";
            payload = { reason: command.reason };
            break;
        }
        await apiRequest(path, {
          method,
          ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        });
        written = true;
        return { success: true, data: await readAdminDatabase(apiRequest) };
      } catch (error) {
        const failure = error as {
          status?: number;
          message?: string;
          errors?: Record<string, string[]>;
        };
        const field = Object.keys(failure.errors ?? {}).find(
          (key) => key === "name" || key === "reason" || key === "confirmed",
        ) as AdminFailure["field"];
        return {
          success: false,
          code:
            failure.status === 422
              ? "validation"
              : failure.status === 404
                ? "not_found"
                : failure.status === 403 || failure.status === 401
                  ? "forbidden"
                  : failure.status === 400 || failure.status === 409
                    ? "conflict"
                    : "unavailable",
          message:
            (written
              ? "Thao tác đã được lưu nhưng chưa tải lại được dữ liệu. Vui lòng tải lại trang trước khi thao tác tiếp."
              : undefined) ||
            (field && failure.errors?.[field]?.[0]) ||
            failure.message ||
            "Không thể hoàn tất thao tác. Vui lòng thử lại.",
          field,
        };
      }
    },
  };
}
