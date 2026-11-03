export type AiStatus =
  "pending" | "processing" | "completed" | "failed" | "deferred";
export type AiAnalysis = {
  match_score: number;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string[];
  recommendations: string[];
  criteria_scores?: {
    skills: number;
    experience: number;
    education: number;
    orientation: number;
  } | null;
  provider?: string | null;
  model?: string | null;
  created_at?: string | null;
};
export type AiState = {
  status: AiStatus;
  analysis: AiAnalysis | null;
  error: string | null;
  retryable: boolean;
};
const safeErrors = new Set([
  "Không đọc được nội dung CV. Vui lòng dùng PDF có văn bản thay vì ảnh scan.",
  "Không tìm thấy file CV của hồ sơ ứng tuyển.",
  "File CV vượt quá giới hạn 5 MB.",
  "Dịch vụ AI chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.",
  "AI chưa trả về đánh giá hợp lệ. Bạn có thể thử lại.",
  "Dịch vụ AI đang bận hoặc tạm thời không khả dụng. Vui lòng thử lại sau.",
  "Phân tích chưa hoàn tất. Vui lòng kiểm tra dịch vụ AI và thử lại.",
]);
export const safeAiError = (value: unknown): string =>
  typeof value === "string" && value.length <= 300 && safeErrors.has(value)
    ? value
    : "Chưa thể phân tích CV. Vui lòng thử lại hoặc kiểm tra tệp CV.";
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const invalid = (): never => {
  throw new Error("Dữ liệu đánh giá AI không hợp lệ. Vui lòng thử tải lại.");
};
export const aiStatus = (value: unknown): value is AiStatus =>
  typeof value === "string" &&
  ["pending", "processing", "completed", "failed", "deferred"].includes(value);
function texts(value: unknown, min: number, max: number): string[] {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.length > max ||
    value.some((v) => typeof v !== "string" || !v.trim() || v.length > 1000)
  )
    return invalid();
  return value;
}
export function parseAiAnalysis(value: unknown): AiAnalysis {
  if (
    !record(value) ||
    !Number.isInteger(value.match_score) ||
    Number(value.match_score) < 0 ||
    Number(value.match_score) > 100 ||
    typeof value.summary !== "string" ||
    !value.summary.trim() ||
    value.summary.trim().split(/\s+/u).length >= 80 ||
    value.summary.length > 3000
  )
    return invalid();
  const result: AiAnalysis = {
    match_score: value.match_score as number,
    summary: value.summary,
    matched_skills: texts(value.matched_skills ?? [], 0, 40),
    missing_skills: texts(value.missing_skills, 0, 4),
    strengths: texts(value.strengths, 2, 4),
    recommendations: texts(value.recommendations ?? [], 0, 10),
  };
  if (value.criteria_scores !== undefined) {
    const scores = value.criteria_scores;
    if (
      scores !== null &&
      (!record(scores) ||
        ["skills", "experience", "education", "orientation"].some(
          (key) =>
            typeof scores[key] !== "number" ||
            !Number.isInteger(scores[key]) ||
            scores[key] < 0 ||
            scores[key] > 100,
        ))
    )
      return invalid();
    result.criteria_scores = scores as AiAnalysis["criteria_scores"];
  }
  for (const field of ["provider", "model", "created_at"] as const) {
    const v = value[field];
    if (v !== undefined) {
      if (
        v !== null &&
        (typeof v !== "string" ||
          v.length > 150 ||
          (field === "created_at" && !Number.isFinite(Date.parse(v))))
      )
        return invalid();
      result[field] = v as string | null;
    }
  }
  return result;
}
export function parseAiState(value: unknown): AiState {
  if (
    !record(value) ||
    !aiStatus(value.status) ||
    typeof value.retryable !== "boolean"
  )
    return invalid();
  const analysis = value.analysis ? parseAiAnalysis(value.analysis) : null;
  if (value.status === "completed" && !analysis) return invalid();
  return {
    status: value.status,
    analysis: value.status === "completed" ? analysis : null,
    error: value.status === "failed" ? safeAiError(value.error) : null,
    retryable: value.retryable,
  };
}
