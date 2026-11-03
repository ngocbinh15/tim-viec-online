import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { assertAuthOrigin, SESSION_COOKIE } from "@/services/auth-session";
import { backendFetch, decodeBackend } from "@/services/backend-api";
import { ApiError } from "@/features/api/types";
import { AuthApiError } from "@/features/auth/api-contract";
import {
  allowedBackendPath,
  invalidatesPublicDirectory,
  isPublicBackendRead,
  protectedFilePath,
} from "@/features/api/paths";
import { readRequestBody } from "@/features/api/read-body";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const path = `/${segments.join("/")}${request.nextUrl.search}`;
  const method = request.method;
  if (!allowedBackendPath(path, method))
    return NextResponse.json(
      { success: false, message: "Không tìm thấy chức năng." },
      { status: 404 },
    );
  try {
    let body: BodyInit | undefined;
    if (!["GET", "HEAD"].includes(method)) {
      await assertAuthOrigin();
      const bytes = await readRequestBody(request);
      const type = request.headers.get("content-type") ?? "";
      if (type.startsWith("multipart/form-data")) {
        body = await new Response(bytes as BodyInit, {
          headers: { "Content-Type": type },
        }).formData();
      } else if (bytes.byteLength) {
        if (!type.startsWith("application/json"))
          throw new ApiError(415, "Định dạng yêu cầu không hợp lệ.");
        body = JSON.stringify(JSON.parse(new TextDecoder().decode(bytes)));
      }
    }
    const response = await backendFetch(
      path,
      { method, body },
      !isPublicBackendRead(path),
    );
    if (response.ok && invalidatesPublicDirectory(path, method))
      revalidateTag("public-directory", { expire: 0 });
    if (response.status === 204)
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "private, no-store" },
      });
    if (path === "/broadcasting/auth" && response.ok) {
      const authorization: unknown = await response.json();
      if (
        !authorization ||
        typeof authorization !== "object" ||
        !("auth" in authorization) ||
        typeof authorization.auth !== "string"
      )
        throw new ApiError(502, "Không thể xác thực kết nối trực tiếp.");
      return NextResponse.json(
        { success: true, data: authorization },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (protectedFilePath(path) && response.ok) {
      const headers = new Headers({
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      const disposition = response.headers.get("Content-Disposition");
      if (disposition) headers.set("Content-Disposition", disposition);
      return new Response(response.body, { status: response.status, headers });
    }
    return NextResponse.json(await decodeBackend(response), {
      status: response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status =
      error instanceof ApiError || error instanceof AuthApiError
        ? error.status
        : 400;
    const message =
      error instanceof ApiError || error instanceof AuthApiError
        ? error.message
        : "Yêu cầu không hợp lệ.";
    const response = NextResponse.json(
      {
        success: false,
        message,
        errors: error instanceof ApiError ? error.errors : {},
      },
      { status },
    );
    if (status === 401) response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
