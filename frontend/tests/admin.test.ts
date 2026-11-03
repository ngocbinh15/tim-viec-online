import { getInitialDatabase } from "../src/mocks/admin";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTrendPoints,
  formatDateVN,
  formatNumber,
  formatSalary,
  getInitials,
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
} from "../src/features/admin/formatters";

test("admin mock database initial data integrity", () => {
  const db = getInitialDatabase();
  assert.equal(db.users.length, 12);
  assert.equal(db.jobs.length, 10);
  assert.equal(db.categories.length, 8);
  assert.equal(db.skills.length, 14);

  // Check reported jobs
  const reportedJobs = db.jobs.filter((j) => j.is_reported);
  assert.equal(reportedJobs.length, 3);

  // Check applications count consistency
  for (const job of db.jobs) {
    const apps = db.applications.filter((a) => a.job_id === job.id);
    assert.equal(job.applications_count, apps.length);
  }
});

test("admin workspace fixtures do not share mutable records between sessions", () => {
  const first = getInitialDatabase();
  first.users[0].name = "Changed";
  first.jobs[0].skills.length = 0;
  const second = getInitialDatabase();
  assert.notEqual(second.users[0].name, "Changed");
  assert.ok(second.jobs[0].skills.length > 0);
});

test("admin helper functions format correctly", () => {
  assert.equal(formatDateVN("2026-10-16"), "16/10/2026");
  assert.equal(formatNumber(1250000), "1.250.000");
  assert.equal(getInitials("Quản Trị Viên"), "TV");
  assert.equal(getInitials("Admin"), "AD");
  assert.equal(getInitials("Công ty Cổ phần Bình Minh"), "BM");
});

test("calculateTrendPoints returns correct points for 7 and 14 days", () => {
  const db = getInitialDatabase();
  const points7 = calculateTrendPoints(db.jobs, db.applications, 7);
  assert.equal(points7.length, 7);
  assert.equal(points7[points7.length - 1].date, "2026-10-16");

  const points14 = calculateTrendPoints(db.jobs, db.applications, 14);
  assert.equal(points14.length, 14);
});

test("formatSalary formats negotiable, ranges, and minimums correctly", () => {
  const db = getInitialDatabase();
  const negotiableJob = db.jobs.find((j) => j.is_negotiable);
  assert.ok(negotiableJob);
  assert.equal(formatSalary(negotiableJob), "Thỏa thuận");

  const rangeJob = db.jobs.find(
    (j) => !j.is_negotiable && j.salary_min && j.salary_max,
  );
  assert.ok(rangeJob);
  assert.match(formatSalary(rangeJob), /VNĐ$/);

  assert.equal(JOB_STATUS_LABELS["active"], "Đang tuyển");
  assert.equal(JOB_TYPE_LABELS["full_time"], "Toàn thời gian");
});

test("admin jobs moderation and deletion integrity", () => {
  const db = getInitialDatabase();
  const initialJobCount = db.jobs.length;
  const targetJob = db.jobs.find((j) => j.is_reported);
  assert.ok(targetJob);

  // Simulate deletion
  const newJobs = db.jobs.filter((j) => j.id !== targetJob.id);
  const newApps = db.applications.filter((a) => a.job_id !== targetJob.id);

  assert.equal(newJobs.length, initialJobCount - 1);
  assert.equal(newApps.filter((a) => a.job_id === targetJob.id).length, 0);
});

test("admin categories usage and deletion guard", () => {
  const db = getInitialDatabase();
  assert.equal(db.categories.length, 8);

  const jobsForCategory = (catId: number) =>
    db.jobs.filter((j) => j.category_id === catId);

  // Category 1 (IT) should have linked jobs in initial data
  const cat1Jobs = jobsForCategory(1);
  assert.ok(cat1Jobs.length > 0);

  // Used categories count
  const usedCount = db.categories.filter(
    (c) => jobsForCategory(c.id).length > 0,
  ).length;
  assert.ok(usedCount > 0);
  assert.ok(usedCount <= db.categories.length);

  // Attempting to delete a used category is blocked
  const canDeleteCat1 = cat1Jobs.length === 0;
  assert.equal(canDeleteCat1, false);

  // Can delete unused category
  const unusedCat = db.categories.find(
    (c) => jobsForCategory(c.id).length === 0,
  );
  if (unusedCat) {
    const remaining = db.categories.filter((c) => c.id !== unusedCat.id);
    assert.equal(remaining.length, db.categories.length - 1);
  }
});

test("admin skills usage and cascade unlinking on deletion", () => {
  const db = getInitialDatabase();
  assert.equal(db.skills.length, 14);

  // Skill 3 is ReactJS, which is assigned to jobs
  const skillId = 3;
  const jobsWithSkill = db.jobs.filter((j) => j.skills.includes(skillId));
  assert.ok(jobsWithSkill.length > 0);

  // When deleted, skill is removed and stripped from all jobs
  const updatedSkills = db.skills.filter((s) => s.id !== skillId);
  const updatedJobs = db.jobs.map((job) => ({
    ...job,
    skills: job.skills.filter((id) => id !== skillId),
  }));

  assert.equal(updatedSkills.length, 13);
  assert.equal(updatedJobs.filter((j) => j.skills.includes(skillId)).length, 0);
});
