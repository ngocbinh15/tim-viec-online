import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readAdminDatabase,
  readAdminPages,
  type AdminRequest,
} from "../src/features/admin/api-data";
import type { ApiResponse } from "../src/features/api/types";

test("admin collection exhausts all backend pages including an existing query", async () => {
  const calls: string[] = [];
  const request: AdminRequest = async <T>(path: string) => {
    calls.push(path);
    const page = Number(
      new URL(path, "https://example.test").searchParams.get("page"),
    );
    return { success: true, data: [{ id: page }] as T, meta: { last_page: 3 } };
  };
  assert.deepEqual(await readAdminPages(request, "/admin/jobs?reported=1"), [
    { id: 1 },
    { id: 2 },
    { id: 3 },
  ]);
  assert.equal(calls[2], "/admin/jobs?reported=1&per_page=100&page=3");
});

test("admin collection rejects an invalid or failed backend page instead of showing partial data", async () => {
  const invalid: AdminRequest = async <T>() => ({
    success: true,
    data: [] as T,
    meta: { last_page: -1 },
  });
  await assert.rejects(readAdminPages(invalid, "/admin/users"));
  const failed: AdminRequest = async <T>(path: string) => {
    if (path.endsWith("page=2")) throw new Error("Backend unavailable");
    return { success: true, data: [{ id: 1 }] as T, meta: { last_page: 2 } };
  };
  await assert.rejects(
    readAdminPages(failed, "/admin/users"),
    /Backend unavailable/,
  );
});

test("admin projection uses actual backend totals and trend without fabricated applications", async () => {
  const records: Record<string, unknown> = {
    "/admin/users": [
      {
        id: 11,
        name: "Employer",
        role: "employer",
        phone: null,
        candidate_profile: {
          bio: "Unneeded profile payload",
          cv_file_path: "private-file.pdf",
        },
        created_at: "2026-10-26T04:00:00Z",
        company: { id: 7, name: "Company" },
      },
    ],
    "/admin/jobs": [
      {
        id: 81,
        company_id: 7,
        created_at: "2026-10-26T04:00:00Z",
        skills: [{ id: 4, name: "PHP" }],
        company: {
          id: 7,
          name: "Company",
          description: "Repeated company payload",
        },
        category: { id: 3, name: "Engineering" },
      },
    ],
    "/admin/categories": [{ id: 3, name: "Engineering" }],
    "/admin/skills": [{ id: 4, name: "PHP", candidate_profiles_count: 9 }],
    "/admin/stats": {
      users_count: 123,
      total_applications: 765,
      trends: [{ date: "2026-10-26", jobs_count: 12, applications_count: 34 }],
    },
  };
  const visited: string[] = [];
  const request: AdminRequest = async <T>(
    path: string,
  ): Promise<ApiResponse<T>> => {
    visited.push(path);
    return {
      success: true,
      data: {
        role: "admin",
        users: records["/admin/users"],
        jobs: records["/admin/jobs"],
        categories: records["/admin/categories"],
        skills: records["/admin/skills"],
        stats: records["/admin/stats"],
      } as T,
    };
  };
  const db = await readAdminDatabase(request);
  assert.equal(db.companies[0].user_id, 11);
  assert.equal(db.users[0].phone, "");
  assert.equal(db.users[0].created_at, "2026-10-26");
  assert.deepEqual(db.jobs[0].skills, [4]);
  assert.equal(db.skills[0].candidates_count, 9);
  assert.equal(db.stats?.total_applications, 765);
  assert.deepEqual(db.stats?.trends[0], {
    date: "2026-10-26",
    jobs_count: 12,
    applications_count: 34,
  });
  assert.deepEqual(db.applications, []);
  assert.deepEqual(visited, ["/workspace/bootstrap"]);
  assert.equal("company" in db.jobs[0], false);
  assert.equal("category" in db.jobs[0], false);
  assert.equal("candidate_profile" in db.users[0], false);
  assert.equal(db.jobs[0].description, "");
  assert.equal(db.jobs[0].requirements, "");
  assert.equal(db.jobs[0].benefits, "");
});
