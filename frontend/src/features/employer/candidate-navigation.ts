export interface CandidateNavigationParams {
  get(name: string): string | null;
}

const positiveId = (value: string | null): value is string =>
  value !== null &&
  /^[1-9]\d*$/.test(value) &&
  Number.isSafeInteger(Number(value));

// Carry only list filters across the detail page. Never accept a return URL.
function candidateQuery(params?: CandidateNavigationParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  const job = params.get("job_id");
  if (positiveId(job)) query.set("job_id", job);
  const status = params.get("status");
  if (
    status &&
    ["applied", "waiting", "accepted", "rejected", "withdrawn"].includes(status)
  )
    query.set("status", status);
  const score = params.get("match_score");
  if (score && ["80", "60", "0"].includes(score))
    query.set("match_score", score);
  const keyword = params
    .get("keyword")
    ?.replace(/[\x00-\x1f\x7f]/g, " ")
    .trim()
    .slice(0, 80);
  if (keyword) query.set("keyword", keyword);
  const sort = params.get("sort");
  if (sort && ["score", "newest", "oldest"].includes(sort))
    query.set("sort", sort);
  const page = params.get("page");
  if (positiveId(page)) query.set("page", page);
  return query;
}

export function employerCandidateListHref(params?: CandidateNavigationParams) {
  const query = candidateQuery(params);
  return `/employer/candidates${query.size ? `?${query}` : ""}`;
}

export function employerApplicationHref(
  id: number,
  params?: CandidateNavigationParams,
) {
  if (!Number.isSafeInteger(id) || id < 1)
    return employerCandidateListHref(params);
  const query = candidateQuery(params);
  return `/employer/candidates/${id}${query.size ? `?${query}` : ""}`;
}
