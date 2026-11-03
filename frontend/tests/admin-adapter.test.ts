import { test } from "node:test";
import assert from "node:assert/strict";
import { getInitialDatabase } from "../src/mocks/admin";
import {
  applyAdminCommand,
  createAdminMockAdapter,
} from "../src/mocks/admin-adapter";

test("catalog mutations reject duplicate/invalid/stale edits without modifying state", () => {
  const db = getInitialDatabase();
  const original = structuredClone(db);
  for (const command of [
    { type: "save-category", name: "   " },
    { type: "save-skill", name: "X".repeat(101) },
    { type: "save-skill", name: " reactjs " },
    { type: "save-category", id: 999, name: "Valid" },
    { type: "delete-category", id: 1 },
    { type: "delete-category", id: -1 },
  ] as const)
    assert.equal(applyAdminCommand(db, command).success, false);
  assert.deepEqual(db, original);
});

test("locking a user preserves jobs/applications and protects admin records", () => {
  const db = getInitialDatabase();
  const admin = db.users.find((user) => user.role === "admin")!;
  const user = db.users.find((user) => user.role === "employer")!;
  assert.equal(
    applyAdminCommand(db, {
      type: "set-user-status",
      id: admin.id,
      status: "locked",
    }).success,
    false,
  );
  const result = applyAdminCommand(db, {
    type: "set-user-status",
    id: user.id,
    status: "locked",
  });
  assert.ok(result.success);
  assert.equal(
    result.data.users.find((item) => item.id === user.id)?.status,
    "locked",
  );
  assert.deepEqual(result.data.jobs, db.jobs);
  assert.deepEqual(result.data.applications, db.applications);
  assert.equal(user.status, "active");
});

test("job deletion requires reason and confirmation, cascades applications but never locks owner", () => {
  const db = getInitialDatabase();
  for (const values of [
    { reason: " ", confirmed: true },
    { reason: "x".repeat(256), confirmed: true },
    { reason: "Violation", confirmed: false },
  ])
    assert.equal(
      applyAdminCommand(db, { type: "delete-job", id: 2, ...values }).success,
      false,
    );
  const result = applyAdminCommand(db, {
    type: "delete-job",
    id: 2,
    reason: "Violation",
    confirmed: true,
  });
  assert.ok(result.success);
  assert.equal(
    result.data.jobs.some((job) => job.id === 2),
    false,
  );
  assert.equal(
    result.data.applications.some((app) => app.job_id === 2),
    false,
  );
  assert.deepEqual(result.data.users, db.users);
  assert.equal(
    applyAdminCommand(result.data, {
      type: "delete-job",
      id: 2,
      reason: "Violation",
      confirmed: true,
    }).success,
    false,
  );
});

test("async mock adapter uses latest state, isolates snapshots and resets without mutating fixtures", async () => {
  const initial = getInitialDatabase();
  const adapter = createAdminMockAdapter(initial);
  const created = await adapter.execute({
    type: "save-skill",
    name: "New skill",
  });
  assert.ok(created.success);
  const id = created.data.skills.find(
    (skill) => skill.name === "New skill",
  )!.id;
  // A caller cannot mutate the repository's next transaction via a read snapshot.
  created.data.skills.length = 0;
  const renamed = await adapter.execute({
    type: "save-skill",
    id,
    name: "Updated skill",
  });
  assert.ok(renamed.success);
  assert.equal(renamed.data.skills.length, initial.skills.length + 1);
  const deleted = await adapter.execute({ type: "delete-skill", id: 3 });
  assert.ok(deleted.success);
  assert.equal(
    deleted.data.jobs.some((job) => job.skills.includes(3)),
    false,
  );
  assert.deepEqual(adapter.reset(), initial);
  assert.equal(
    initial.skills.some((skill) => skill.name === "Updated skill"),
    false,
  );
});
