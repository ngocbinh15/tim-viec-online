export function publicImagePath(segments: string[]): string | null {
  if (
    segments.length < 2 ||
    segments.length > 12 ||
    !["avatars", "company_logos"].includes(segments[0])
  )
    return null;
  if (
    segments.some(
      (segment) =>
        !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(segment) ||
        segment.includes(".."),
    )
  )
    return null;
  const path = segments.join("/");
  return path.length <= 1000 && /\.(?:png|jpe?g|webp|gif)$/i.test(path)
    ? path
    : null;
}
