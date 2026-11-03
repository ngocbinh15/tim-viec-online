import { ApiError } from "./types";

/** Reject streamed and chunked uploads before allocating an unbounded request body. */
export async function readRequestBody(request: Request, limit = 8 * 1024 * 1024): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > limit) throw new ApiError(413, "Tệp tải lên quá lớn.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new ApiError(413, "Tệp tải lên quá lớn.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
