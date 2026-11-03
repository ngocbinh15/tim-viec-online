import assert from "node:assert/strict";
import test from "node:test";
import {
  companyReady,
  effectiveJobStatus,
  jobFromValues,
  validateCompany,
  validateJob,
} from "../src/features/employer/rules";
import { createEmployerData } from "../src/mocks/employer";
import type { JobValues } from "../src/features/employer/types";
const data = createEmployerData(
  {
    id: 202,
    name: "Employer Demo",
    email: "employer@example.test",
    role: "employer",
    status: "active",
  },
  ["Hà Nội"],
  new Date("2026-10-19T12:00:00+07:00"),
);
const valid: JobValues = {
  title: "Backend Developer Laravel",
  category_id: 1,
  job_level: "Middle",
  quantity: 2,
  city: "Hà Nội",
  address: "Khu Công nghệ cao Hòa Lạc",
  job_type: "full_time",
  deadline: "2026-10-20",
  description: "Phát triển sản phẩm.",
  requirements: "Có kinh nghiệm lập trình.",
  benefits: "Đào tạo và bảo hiểm.",
  salary_mode: "range",
  salary_min: "18000000",
  salary_max: "28000000",
  skill_ids: [1, 2],
};
test("employer company gates require all SRS fields and reject unsafe links/SQL overflow", () => {
  assert.equal(companyReady(data.company), true);
  for (const key of ["name", "description", "address", "city"] as const) {
    const company = { ...data.company, [key]: " " };
    assert.equal(companyReady(company), false);
    assert.ok(validateCompany(company)[key]);
  }
  for (const website of [
    "javascript:alert(1)",
    "data:text/html,bad",
    "https://user:pass@example.test",
    `https://example.test/${"a".repeat(260)}`,
  ])
    assert.ok(validateCompany({ ...data.company, website }).website);
  assert.ok(validateCompany({ ...data.company, name: "a".repeat(201) }).name);
});
test("posting enforces future valid date, SQL job types, title and integer quantity", () => {
  assert.deepEqual(validateJob(valid, data.today), {});
  for (const deadline of [
    data.today,
    "2026-10-18",
    "2026-02-30",
    "invalid",
    "",
  ])
    assert.ok(validateJob({ ...valid, deadline }, data.today).deadline);
  assert.ok(validateJob({ ...valid, title: "short" }, data.today).title);
  assert.ok(validateJob({ ...valid, quantity: 1.5 }, data.today).quantity);
  assert.ok(validateJob({ ...valid, quantity: 0 }, data.today).quantity);
});
test("three salary modes serialize to SQL nullability without inventing draft states", () => {
  assert.ok(
    validateJob({ ...valid, salary_max: "17000000" }, data.today).salary_max,
  );
  assert.ok(
    validateJob({ ...valid, salary_min: "1.5" }, data.today).salary_min,
  );
  for (const salary_mode of ["range", "starting", "negotiable"] as const) {
    const values = {
      ...valid,
      salary_mode,
      salary_max: salary_mode === "range" ? "28000000" : "",
    };
    assert.deepEqual(validateJob(values, data.today), {});
    const job = jobFromValues(values, data.company, 99, data.skills);
    assert.equal("salary_mode" in job, false);
    assert.equal("skill_ids" in job, false);
    assert.equal(job.status, "active");
    assert.equal(job.is_negotiable, salary_mode === "negotiable");
    assert.equal(
      job.salary_min,
      salary_mode === "negotiable" ? null : 18000000,
    );
    assert.equal(job.salary_max, salary_mode === "range" ? 28000000 : null);
  }
});
test("job expiry is derived without deleting applications or ending conversations", () => {
  assert.equal(
    effectiveJobStatus(
      { status: "active", deadline: "2026-10-18" },
      data.today,
    ),
    "expired",
  );
  assert.equal(
    effectiveJobStatus({ status: "active", deadline: data.today }, data.today),
    "active",
  );
  assert.equal(
    effectiveJobStatus(
      { status: "closed", deadline: "2026-10-18" },
      data.today,
    ),
    "closed",
  );
  for (const app of data.applications)
    assert.ok(
      data.jobs.some(
        (job) => job.id === app.job_id && job.company_id === data.company.id,
      ),
    );
  for (const conv of data.conversations) {
    assert.equal(conv.employer_id, data.user.id);
    assert.ok(
      data.applications.some(
        (app) =>
          app.id === conv.application_id &&
          app.candidate_user_id === conv.candidate_id &&
          app.job_id === conv.job_id,
      ),
    );
  }
});
