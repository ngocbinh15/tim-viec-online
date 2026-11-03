import { test } from "node:test";
import assert from "node:assert/strict";
import { mapCompany, mapCompanyProfile } from "../src/features/jobs/api";
import { companyWebsite } from "../src/features/companies/query";

test("company avatar and reference metadata survive API mapping with legacy logo fallback", () => {
  const company = mapCompanyProfile({
    id: 1,
    name: "FPT Software",
    avatar: "http://localhost:8000/storage/company_logos/real/fpt-software.png",
    logo: "old.png",
    is_demo: true,
    reference_sources: {
      profile_url: "https://fptsoftware.com/about-us",
      collected_at: "2026-10-26",
    },
  });
  assert.equal(company.logo, company.avatar);
  assert.equal(company.is_demo, true);
  assert.equal(
    company.reference_sources?.profile_url,
    "https://fptsoftware.com/about-us",
  );
  assert.equal(
    mapCompany({ id: 2, name: "Legacy", logo: "legacy.png" }).logo,
    "legacy.png",
  );
  assert.equal(mapCompany({ id: 3, name: "No reference" }).is_demo, false);
  assert.equal(companyWebsite("javascript:alert(1)"), null);
});
