import { test } from "node:test";
import assert from "node:assert/strict";
import { createJobFixtures } from "../src/mocks/jobs";
import { createHomeJobFixtures, HOME_COMPANIES } from "../src/mocks/home";
import { createCompanyProfiles } from "../src/mocks/companies";
import {
  companyOpenJobs,
  companyWebsite,
} from "../src/features/companies/query";

const today = "2026-10-19";
const clock = new Date(`${today}T06:00:00Z`);
const jobs = [...createJobFixtures(clock), ...createHomeJobFixtures(clock)];
const companies = createCompanyProfiles(jobs, today);

test("profile and homepage identities never collide with existing job company IDs", () => {
  assert.equal(companies.length, 17);
  assert.equal(
    new Set(companies.map((company) => company.id)).size,
    companies.length,
  );
  for (const job of jobs)
    assert.equal(
      companies.find((company) => company.id === job.company_id)?.name,
      job.company.name,
    );
  for (const company of HOME_COMPANIES)
    assert.ok(
      companies.some(
        (profile) =>
          profile.id === company.id && profile.short_name === company.name,
      ),
    );
  assert.deepEqual(
    companies.slice(0, 6).map((company) => company.id),
    [1, 201, 202, 203, 204, 205],
  );
});

test("company open-job counts match their active unexpired lists and exclude other employers", () => {
  assert.equal(
    companies.find((company) => company.id === 1)?.active_jobs_count,
    3,
  );
  assert.equal(
    companies.find((company) => company.id === 201)?.active_jobs_count,
    0,
  );
  assert.equal(
    companies.reduce((sum, company) => sum + company.active_jobs_count, 0),
    24,
  );
  const fptJobs = companyOpenJobs(jobs, 1, today);
  assert.deepEqual(
    fptJobs.map((job) => job.id),
    [1, 10, 18],
  );
  assert.ok(fptJobs.every((job) => job.company_id === 1));
  assert.equal(companyOpenJobs(jobs, 1, "2030-01-01").length, 0);
});

test("company website links allow only valid public HTTP(S) URLs without credentials", () => {
  assert.deepEqual(companyWebsite("https://www.company.example/careers"), {
    href: "https://www.company.example/careers",
    label: "company.example",
  });
  for (const value of [
    null,
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:password@company.example",
    "not-a-url",
    "//company.example",
    "ftp://company.example",
  ])
    assert.equal(companyWebsite(value), null);
});
