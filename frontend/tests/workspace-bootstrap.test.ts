import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEmployerApi, type Requester } from "../src/features/employer/api";

const employer = {
  id: 7,
  name: "Employer",
  email: "employer@example.test",
  role: "employer" as const,
  status: "active" as const,
};

test("employer workspace loads its complete snapshot with one authenticated request", async () => {
  const visited: string[] = [];
  const notifications = Array.from({ length: 125 }, (_, index) => ({
    id: index + 1,
    type: "new_application",
    title: "New application",
    content: "Application received",
    is_read: false,
    created_at: "2026-10-27T00:00:00Z",
  }));
  const request: Requester = async <T>(path: string) => {
    visited.push(path);
    return {
      success: true,
      data: {
        role: "employer",
        company: { id: 3, name: "Company", user_id: 7 },
        jobs: [],
        applications: [],
        conversations: [],
        notifications,
        categories: [],
        skills: [],
      } as T,
    };
  };
  const data = await loadEmployerApi(
    request,
    employer,
    ["Hà Nội"],
    "2026-10-27",
  );
  assert.equal(data.company.id, 3);
  assert.equal(data.notifications.length, 125);
  assert.deepEqual(visited, ["/workspace/bootstrap"]);
});

test("employer snapshot refuses another role or malformed partial data", async () => {
  const wrongRole: Requester = async <T>() => ({
    success: true,
    data: { role: "admin", users: [] } as T,
  });
  const malformed: Requester = async <T>() => ({
    success: true,
    data: { role: "employer", company: { id: 3, name: "Company" } } as T,
  });
  await assert.rejects(loadEmployerApi(wrongRole, employer, [], "2026-10-27"));
  await assert.rejects(loadEmployerApi(malformed, employer, [], "2026-10-27"));
});
