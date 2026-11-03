import { ApiError, apiFailure } from "../api/types";

export type ApplicantExportMode = "workbook" | "separate";

export function exportFilename(
  disposition: string | null,
  extension: "xlsx" | "zip",
): string {
  const fallback = `danh-sach-ung-vien.${extension}`;
  const encoded = disposition?.match(/filename\*=utf-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename=(?:"([^"]+)"|([^;]+))/i);
  let name: string;
  try {
    name = encoded
      ? decodeURIComponent(encoded)
      : (plain?.[1] ?? plain?.[2] ?? fallback).trim();
  } catch {
    return fallback;
  }
  name = name.replace(/[\\/\x00-\x1f\x7f:*?"<>|]/g, "_").slice(0, 200);
  return name.toLowerCase().endsWith(`.${extension}`) ? name : fallback;
}

export async function requestApplicantExport(
  jobIds: number[],
  mode: ApplicantExportMode,
  signal?: AbortSignal,
) {
  if (
    !jobIds.length ||
    jobIds.length > 50 ||
    new Set(jobIds).size !== jobIds.length ||
    jobIds.some((id) => !Number.isSafeInteger(id) || id < 1)
  )
    throw new ApiError(422, "Chọn từ 1 đến 50 tin tuyển dụng để xuất.");
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(90_000)])
    : AbortSignal.timeout(90_000);
  try {
    const response = await fetch("/api/backend/employer/applications/export", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_ids: jobIds, mode }),
      signal: requestSignal,
    });
    if (!response.ok) {
      const error: unknown = await response.json().catch(() => undefined);
      throw apiFailure(response.status, error);
    }
    const mime = response.headers.get("content-type")?.split(";")[0].trim();
    const extension =
      mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ? "xlsx"
        : mime === "application/zip"
          ? "zip"
          : null;
    if (!extension)
      throw new ApiError(502, "File xuất không hợp lệ. Vui lòng thử lại.");
    const blob = await response.blob();
    requestSignal.throwIfAborted();
    const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    if (
      signature[0] !== 0x50 ||
      signature[1] !== 0x4b ||
      signature[2] !== 3 ||
      signature[3] !== 4
    )
      throw new ApiError(502, "File xuất không hợp lệ. Vui lòng thử lại.");
    return {
      blob,
      filename: exportFilename(
        response.headers.get("content-disposition"),
        extension,
      ),
    };
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    if (requestSignal.aborted)
      throw new ApiError(
        503,
        "Xuất danh sách quá thời gian chờ. Hãy chọn ít tin hơn rồi thử lại.",
      );
    throw new ApiError(503, "Không thể tải danh sách. Vui lòng thử lại.");
  }
}

export async function downloadApplicantExport(
  jobIds: number[],
  mode: ApplicantExportMode,
  signal?: AbortSignal,
): Promise<void> {
  const { blob, filename } = await requestApplicantExport(jobIds, mode, signal);
  signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
