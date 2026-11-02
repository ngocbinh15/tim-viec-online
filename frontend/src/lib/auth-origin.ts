type OriginEnvironment = {
  NODE_ENV?: string;
  AUTH_APP_URL?: string;
  AUTH_TRUSTED_ORIGINS?: string;
};

function parseOrigin(value: string | null | undefined): URL | null {
  // Accept an origin, never URL credentials, paths, lists or wildcard patterns.
  if (!value || !/^https?:\/\/[^\s/?#\\*]+\/?$/.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      !url.hostname ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function developmentOrigins(env: OriginEnvironment): URL[] {
  if (env.NODE_ENV !== "development") return [];
  return (env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => parseOrigin(value.trim()))
    .filter((url): url is URL => url !== null);
}

export function isTrustedAuthOrigin(
  origin: string | null,
  env: OriginEnvironment,
): boolean {
  const requestOrigin = parseOrigin(origin);
  const canonical = parseOrigin(env.AUTH_APP_URL);
  if (!requestOrigin || !canonical) return false;
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    canonical.hostname,
  );
  if (
    env.NODE_ENV === "production" &&
    canonical.protocol !== "https:" &&
    !loopback
  )
    return false;
  return (
    requestOrigin.origin === canonical.origin ||
    developmentOrigins(env).some((url) => url.origin === requestOrigin.origin)
  );
}

export function configuredDevHostnames(env: OriginEnvironment): string[] {
  if (env.NODE_ENV !== "development") return [];
  const canonical = parseOrigin(env.AUTH_APP_URL);
  const origins = [
    ...(canonical ? [canonical] : []),
    ...developmentOrigins(env),
  ];
  // Next.js allowedDevOrigins matches hostnames only; auth still matches full origins.
  return [...new Set(origins.map((url) => url.hostname))];
}
