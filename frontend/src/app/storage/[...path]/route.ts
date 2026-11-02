import { backendBase } from "@/services/backend-api";
import { publicImagePath } from "@/features/api/public-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = publicImagePath((await context.params).path);
  const failure = (status: number) =>
    new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  if (!path) return failure(404);
  try {
    const base = backendBase();
    // Resolve at request time, so a deployed container uses its runtime API address.
    const url = new URL(`../storage/${path}`, base);
    const response = await fetch(url, {
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return failure(response.status === 404 ? 404 : 502);
    const mime = response.headers.get("content-type")?.split(";")[0].trim();
    if (
      !mime ||
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)
    )
      return failure(502);
    return new Response(response.body, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return failure(503);
  }
}
