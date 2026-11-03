import test from "node:test";
import assert from "node:assert/strict";
import { ResumeAutosave } from "../src/features/resumes/autosave";

test("temporary connection failures retry in order without parallel saves", async () => {
  let count = 0;
  const autosave = new ResumeAutosave(
    1,
    async () => {
      if (++count === 1)
        throw Object.assign(new Error("network"), { status: 503 });
      return 2;
    },
    () => {},
  );
  autosave.change("A");
  assert.equal(await autosave.flush(), 2);
  assert.equal(count, 2);
  autosave.dispose();
});

test("edits during an in-flight save are saved afterward with the new revision", async () => {
  const calls: [string, number][] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const autosave = new ResumeAutosave(
    1,
    async (value: string, revision: number) => {
      calls.push([value, revision]);
      if (calls.length === 1) await gate;
      return revision + 1;
    },
    () => {},
  );
  autosave.change("A");
  const saving = autosave.flush();
  autosave.change("B");
  release();
  assert.equal(await saving, 3);
  assert.deepEqual(calls, [
    ["A", 1],
    ["B", 2],
  ]);
  assert.equal(autosave.status, "saved");
  autosave.dispose();
});
test("conflicts retain changes and cannot be retried into an overwrite", async () => {
  const autosave = new ResumeAutosave(
    2,
    async () => {
      throw Object.assign(new Error("conflict"), { status: 409 });
    },
    () => {},
  );
  autosave.change("unsaved");
  await assert.rejects(autosave.flush());
  assert.equal(autosave.status, "conflict");
  await assert.rejects(autosave.flush());
  assert.equal(autosave.dirty, true);
  autosave.dispose();
});
test("a disposed editor does not apply a late response to its revision or status", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const autosave = new ResumeAutosave(
    1,
    async () => {
      await gate;
      return 2;
    },
    () => {},
  );
  autosave.change("A");
  const saving = autosave.flush();
  autosave.dispose();
  release();
  await assert.rejects(saving);
  assert.equal(autosave.revision, 1);
});
