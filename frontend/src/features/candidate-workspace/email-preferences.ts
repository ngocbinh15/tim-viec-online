import { ApiError, apiRequest } from "@/features/api/client";

export type EmailPreferences = { applications: boolean; messages: boolean };

function parsePreferences(value: unknown): EmailPreferences {
  if (
    !value ||
    typeof value !== "object" ||
    !("applications" in value) ||
    typeof value.applications !== "boolean" ||
    !("messages" in value) ||
    typeof value.messages !== "boolean"
  )
    throw new ApiError(502, "Không thể tải cài đặt email. Vui lòng thử lại.");
  return { applications: value.applications, messages: value.messages };
}

export async function loadEmailPreferences(): Promise<EmailPreferences> {
  return parsePreferences(
    (await apiRequest<unknown>("/user/email-preferences")).data,
  );
}

export async function saveEmailPreferences(
  next: EmailPreferences,
): Promise<EmailPreferences> {
  const response = await apiRequest<unknown>("/user/email-preferences", {
    method: "PUT",
    body: JSON.stringify(next),
  });
  return parsePreferences(response.data);
}
