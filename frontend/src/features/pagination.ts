/** A sliding window of at most four page numbers, clamped at either edge. */
export function paginationPages(page: number, lastPage: number): number[] {
  const last = Number.isSafeInteger(lastPage) && lastPage > 0 ? lastPage : 1;
  const current = Number.isSafeInteger(page)
    ? Math.max(1, Math.min(page, last))
    : 1;
  const count = Math.min(4, last);
  const start = Math.max(
    1,
    Math.min(current - Math.floor(count / 2), last - count + 1),
  );
  return Array.from({ length: count }, (_, index) => start + index);
}
