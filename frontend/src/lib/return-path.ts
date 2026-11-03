// Allow only known internal destinations. Never trust a URL supplied by a form.
export function safeJobReturnPath(
  value: string | string[] | undefined,
  role?: "candidate" | "employer" | "admin",
): string {
  const fallback =
    role === "employer" ? "/employer" : role === "admin" ? "/admin" : "/jobs";
  if (
    typeof value !== "string" ||
    value.length > 1000 ||
    /[\x00-\x1f\x7f\\]/.test(value) ||
    !/^\/(?:jobs(?:\/\d+)?|account\/(?:profile|resumes(?:\/new|\/[1-9]\d*\/edit)?|jobs|messages|notifications|settings|security)|employer(?:\/(?:jobs(?:\/new|\/[1-9]\d*\/edit)?|candidates(?:\/[1-9]\d*)?|messages|notifications|company))?|admin(?:\/(?:jobs(?:\/[1-9]\d*)?|applications\/[1-9]\d*|users|categories|skills))?)(?:\?[^#]*)?$/.test(
      value,
    )
  )
    return fallback;
  const pathname = value.split("?", 1)[0];
  const resumeId = pathname.match(/^\/account\/resumes\/(\d+)\/edit$/)?.[1];
  if (resumeId && !Number.isSafeInteger(Number(resumeId))) return fallback;
  // Account security is shared by all roles. Other protected return paths must
  // agree with the verified session role to avoid redirect loops after login.
  if (pathname === "/account/security") return value;
  const adminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const adminJobId = pathname.match(
    /^\/admin\/(?:jobs|applications)\/(\d+)$/,
  )?.[1];
  if (adminJobId && !Number.isSafeInteger(Number(adminJobId))) return fallback;
  if (role === "admin") return adminPath ? value : fallback;
  if (adminPath && role) return fallback;
  const employerPath =
    pathname === "/employer" || pathname.startsWith("/employer/");
  if (
    (role === "candidate" && employerPath) ||
    (role === "employer" && !employerPath)
  )
    return fallback;
  return value;
}
