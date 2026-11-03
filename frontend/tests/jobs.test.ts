import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDate,
  formatSalary,
  isJobOpen,
  vietnamToday,
} from "../src/features/jobs/formatters";
import {
  filterJobs,
  jobQueryString,
  matchesSalary,
  normalizeSearch,
  paginateJobs,
  parseJobQuery,
} from "../src/features/jobs/query";
import type { Job, JobQuery } from "../src/features/jobs/types";
import { createJobFixtures, JOB_CATEGORIES } from "../src/mocks/jobs";
import { paginationPages } from "../src/features/pagination";

const now = new Date("2026-10-17T08:30:00.000Z");
const today = "2026-10-17";
const jobs = createJobFixtures(now);
const emptyQuery = () => parseJobQuery({});
const salaryJob = (
  min: number | null,
  max: number | null,
  negotiable = false,
): Job => ({
  ...jobs[0],
  salary_min: min,
  salary_max: max,
  is_negotiable: negotiable,
});

test("query parsing rejects malformed filters and normalizes repeated categories", () => {
  const query = parseJobQuery({
    keyword: "  kế toán  ",
    category_ids: ["2", "1,2", "-1", "1.5", "99999999999999999", "__proto__"],
    job_type: "__proto__",
    salary: "all",
    level: "CEO",
    page: "2.5",
    city: " Hà Nội ",
  });
  assert.deepEqual(query, {
    keyword: "kế toán",
    category_ids: [1, 2],
    city: "Hà Nội",
    job_type: "",
    salary: "",
    level: "",
    sort: "default",
    page: 1,
  });
  for (const page of [
    "0",
    "-2",
    "1e2",
    "Infinity",
    "999999999999999999",
    "",
    " 0 ",
  ]) {
    assert.equal(parseJobQuery({ page }).page, 1);
  }
  assert.equal(parseJobQuery({ page: "3" }).page, 3);
  assert.equal(parseJobQuery({ keyword: "a".repeat(300) }).keyword.length, 200);
});

test("query strings round-trip all supported filters and preserve explicit overrides", () => {
  const query = parseJobQuery({
    keyword: "Đào tạo & nhân sự",
    category_ids: ["5", "2"],
    city: "Hà Nội",
    job_type: "remote",
    salary: "over20",
    level: "Senior",
    sort: "salary_desc",
    page: "3",
  });
  const encoded = jobQueryString(query);
  const params = new URLSearchParams(encoded);
  const record: Record<string, string | string[]> = Object.fromEntries(params);
  record.category_ids = params.getAll("category_ids");
  assert.deepEqual(parseJobQuery(record), query);
  const overridden = new URLSearchParams(
    jobQueryString(query, { keyword: "", category_ids: [], page: 1 }),
  );
  assert.equal(overridden.has("keyword"), false);
  assert.equal(overridden.has("category_ids"), false);
  assert.equal(overridden.has("page"), false);
  assert.equal(overridden.get("city"), "Hà Nội");
  assert.equal(jobQueryString(emptyQuery()), "");
  assert.equal(parseJobQuery({ sort: "__proto__" }).sort, "default");
  assert.equal(
    parseJobQuery({ sort: ["newest", "salary_desc"] }).sort,
    "newest",
  );
  assert.equal(overridden.get("sort"), "salary_desc");
  assert.equal(
    new URLSearchParams(jobQueryString(query, { sort: "default" })).has("sort"),
    false,
  );
});

test("sort distinguishes bumped updates, creation date and salary before pagination", () => {
  const items: Job[] = [
    {
      ...jobs[0],
      id: 1,
      title: "React engineer",
      skills: [],
      company: { ...jobs[0].company, name: "Company" },
      salary_min: 20,
      salary_max: 30,
      created_at: "2026-10-01",
      updated_at: "2026-10-16",
    },
    {
      ...jobs[0],
      id: 2,
      title: "Engineer",
      skills: [{ id: 1, name: "React" }],
      company: { ...jobs[0].company, name: "Company" },
      salary_min: 40,
      salary_max: null,
      created_at: "2026-10-15",
      updated_at: "2026-10-15",
    },
    {
      ...jobs[0],
      id: 3,
      title: "Engineer",
      skills: [],
      company: { ...jobs[0].company, name: "React Company" },
      salary_min: 999,
      salary_max: 1000,
      is_negotiable: true,
      created_at: "2026-10-14",
      updated_at: "2026-10-14",
    },
    {
      ...jobs[0],
      id: 4,
      title: "React developer",
      skills: [],
      company: { ...jobs[0].company, name: "Company" },
      salary_min: 20,
      salary_max: 30,
      created_at: "2026-10-13",
      updated_at: "2026-10-13",
    },
    {
      ...jobs[0],
      id: 5,
      title: "React developer",
      skills: [],
      company: { ...jobs[0].company, name: "Company" },
      salary_min: null,
      salary_max: null,
      created_at: "2026-10-12",
      updated_at: "2026-10-12",
    },
  ];
  const ids = (sort: JobQuery["sort"], keyword = "") =>
    filterJobs(items, { ...emptyQuery(), sort, keyword }, today).map(
      (job) => job.id,
    );
  assert.deepEqual(ids("default"), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids("newest"), [2, 3, 4, 5, 1]);
  assert.deepEqual(ids("salary_desc"), [2, 1, 4, 3, 5]);
  assert.deepEqual(ids("relevance", "rÉact"), [1, 4, 5, 2, 3]);
  assert.deepEqual(ids("relevance"), ids("default"));
  assert.equal(
    paginateJobs(
      filterJobs(items, { ...emptyQuery(), sort: "salary_desc" }, today),
      1,
      1,
    ).data[0].id,
    2,
  );
  assert.deepEqual(
    items.map((job) => job.id),
    [1, 2, 3, 4, 5],
  );
});

test("shared pagination shows at most four numbers and clamps both edges", () => {
  assert.deepEqual(paginationPages(7, 20), [5, 6, 7, 8]);
  assert.deepEqual(paginationPages(1, 20), [1, 2, 3, 4]);
  assert.deepEqual(paginationPages(100, 20), [17, 18, 19, 20]);
  assert.deepEqual(paginationPages(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(paginationPages(NaN, 0), [1]);
  assert.deepEqual(paginationPages(2, 3), [1, 2, 3]);
});

test("salary filters implement SRS exact boundaries and exclude negotiable jobs", () => {
  assert.equal(matchesSalary(salaryJob(8_000_000, 9_999_999), "under10"), true);
  assert.equal(
    matchesSalary(salaryJob(8_000_000, 10_000_000), "under10"),
    false,
  );
  assert.equal(matchesSalary(salaryJob(8_000_000, 10_000_000), "10to20"), true);
  assert.equal(
    matchesSalary(salaryJob(20_000_000, 25_000_000), "10to20"),
    true,
  );
  assert.equal(
    matchesSalary(salaryJob(20_000_000, 25_000_000), "over20"),
    false,
  );
  assert.equal(
    matchesSalary(salaryJob(20_000_001, 25_000_000), "over20"),
    true,
  );
  for (const salary of ["under10", "10to20", "over20"] as const) {
    assert.equal(
      matchesSalary(salaryJob(5_000_000, 30_000_000, true), salary),
      false,
    );
  }
  assert.equal(matchesSalary(salaryJob(null, null, true), "negotiable"), true);
  assert.equal(matchesSalary(salaryJob(null, null), "negotiable"), false);
});

test("starting salary without max is excluded from ranges requiring max", () => {
  for (const salary of ["under10", "10to20"] as const) {
    assert.equal(matchesSalary(salaryJob(10_000_000, null), salary), false);
  }
  assert.equal(matchesSalary(salaryJob(20_000_001, null), "over20"), true);
  assert.equal(matchesSalary(salaryJob(null, null), "over20"), false);
});

test("accent-insensitive search covers title, company and skills including Đ", () => {
  assert.equal(normalizeSearch("ĐÀO TẠO"), "dao tao");
  for (const keyword of ["dao tao", "ĐÀO TẠO", "đào tạo"]) {
    assert.deepEqual(
      filterJobs(jobs, { ...emptyQuery(), keyword }, today).map(
        (job) => job.id,
      ),
      [14],
    );
  }
  assert.equal(
    filterJobs(jobs, { ...emptyQuery(), keyword: "dong hanh" }, today).length,
    3,
  );
  assert.ok(
    filterJobs(jobs, { ...emptyQuery(), keyword: "mysql" }, today).some(
      (job) => job.id === 10,
    ),
  );
  assert.equal(
    filterJobs(
      jobs,
      { ...emptyQuery(), keyword: "<script>alert(1)</script>" },
      today,
    ).length,
    0,
  );
});

test("combined filters use OR for categories and AND across independent fields", () => {
  const query = parseJobQuery({
    category_ids: ["1", "4"],
    city: "Đà Nẵng",
    job_type: "remote",
    salary: "10to20",
    level: "Middle",
    keyword: "figma",
  });
  assert.deepEqual(
    filterJobs(jobs, query, today).map((job) => job.id),
    [3],
  );
  assert.equal(filterJobs(jobs, { ...query, city: "Hà Nội" }, today).length, 0);
  assert.equal(
    filterJobs(jobs, { ...emptyQuery(), category_ids: [999] }, today).length,
    0,
  );
});

test("API province names match legacy city prefixes without widening to other cities", () => {
  const expected = filterJobs(
    jobs,
    { ...emptyQuery(), city: "TP. Hồ Chí Minh" },
    today,
  ).map((job) => job.id);
  assert.ok(expected.length > 0);
  for (const city of [
    "Hồ Chí Minh",
    "Thành phố Hồ Chí Minh",
    "TP. Hồ Chí Minh",
  ]) {
    assert.deepEqual(
      filterJobs(jobs, { ...emptyQuery(), city }, today).map((job) => job.id),
      expected,
    );
  }
  assert.equal(
    filterJobs(jobs, { ...emptyQuery(), city: "Vĩnh Long" }, today).length,
    0,
  );
});

test("public results exclude closed and expired records and sort update time then ID descending", () => {
  const result = filterJobs(jobs, emptyQuery(), today);
  assert.equal(result.length, 18);
  assert.deepEqual(
    result.slice(0, 3).map((job) => job.id),
    [3, 2, 1],
  );
  assert.equal(
    result.some((job) => job.status !== "active"),
    false,
  );
  const staleActive = { ...jobs[0], deadline: "2026-10-16" };
  assert.equal(filterJobs([staleActive], emptyQuery(), today).length, 0);
  assert.deepEqual(
    jobs.slice(0, 3).map((job) => job.id),
    [1, 2, 3],
    "filtering must not mutate fixture order",
  );
});

test("pagination reports accurate totals and clamps pages, including empty results", () => {
  const result = filterJobs(jobs, emptyQuery(), today);
  const first = paginateJobs(result, 1);
  const second = paginateJobs(result, 2);
  assert.deepEqual(first.meta, {
    total: 18,
    page: 1,
    per_page: 6,
    last_page: 3,
  });
  assert.equal(first.data.length, 6);
  assert.equal(second.data.length, 6);
  assert.equal(
    second.data.some((job) => first.data.includes(job)),
    false,
  );
  assert.equal(paginateJobs(result, 999).meta.page, 3);
  assert.equal(paginateJobs(result, -1).meta.page, 1);
  assert.deepEqual(paginateJobs([], 999), {
    data: [],
    meta: { total: 0, page: 1, per_page: 6, last_page: 1 },
  });
});

test("deadline checks use Vietnam calendar date and accept deadline day", () => {
  assert.equal(vietnamToday(new Date("2026-10-17T16:59:59Z")), "2026-10-17");
  assert.equal(vietnamToday(new Date("2026-10-17T17:00:00Z")), "2026-10-18");
  assert.equal(
    isJobOpen({ status: "active", deadline: "2026-10-17" }, today),
    true,
  );
  assert.equal(
    isJobOpen({ status: "active", deadline: "2026-10-16" }, today),
    false,
  );
  assert.equal(
    isJobOpen({ status: "closed", deadline: "2026-11-01" }, today),
    false,
  );
  assert.equal(
    isJobOpen({ status: "expired", deadline: "2026-11-01" }, today),
    false,
  );
  assert.equal(
    isJobOpen({ status: "active", deadline: "2026-02-30" }, today),
    false,
  );
});

test("Vietnamese formatting handles all salary forms and invalid dates", () => {
  assert.equal(
    formatSalary(salaryJob(25_000_000, 40_000_000)),
    "25 - 40 triệu VNĐ",
  );
  assert.equal(formatSalary(salaryJob(10_000_000, 10_000_000)), "10 triệu VNĐ");
  assert.equal(formatSalary(salaryJob(12_500_000, null)), "Từ 12,5 triệu VNĐ");
  assert.equal(formatSalary(salaryJob(null, null, true)), "Thỏa thuận");
  assert.equal(formatSalary(salaryJob(null, null)), "Chưa công bố");
  assert.equal(formatSalary(salaryJob(20_000_001, null)), "Từ 20.000.001 VNĐ");
  assert.equal(formatSalary(salaryJob(9_999_999, 9_999_999)), "9.999.999 VNĐ");
  assert.equal(formatDate("2026-11-01"), "01/11/2026");
  assert.equal(formatDate("2026-02-30"), "—");
  assert.equal(formatDate("invalid"), "—");
});

test("fixture factory is deterministic at a given clock and follows the SQL catalog", () => {
  assert.deepEqual(createJobFixtures(now), jobs);
  assert.equal(new Set(jobs.map((job) => job.id)).size, jobs.length);
  for (const job of jobs) {
    assert.ok(
      JOB_CATEGORIES.some((category) => category.id === job.category_id),
    );
    assert.equal(job.company_id, job.company.id);
    assert.ok(
      job.salary_max === null ||
        job.salary_min === null ||
        job.salary_min <= job.salary_max,
    );
  }
  const future = createJobFixtures(new Date("2030-01-01T00:00:00Z"));
  assert.equal(filterJobs(future, emptyQuery(), "2030-01-01").length, 18);
});
