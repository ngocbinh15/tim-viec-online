import assert from "node:assert/strict";
import { test } from "node:test";
import * as paths from "../src/features/api/paths";

test("shared directory caching excludes authenticated workspaces, file reads and mutations", () => {
  assert.equal(typeof paths.cacheablePublicRead, "function");
  for (const path of [
    "/jobs?per_page=12",
    "/categories",
    "/skills",
    "/companies/2",
  ]) {
    assert.equal(paths.cacheablePublicRead(path, "GET"), true, path);
  }
  for (const path of [
    "/conversations",
    "/notifications",
    "/candidate/profile",
    "/admin/users",
    "/workspace/bootstrap",
    "/applications/1/cv",
    "/jobs/3",
    "https://evil.test/jobs",
    "/jobs/../user",
  ]) {
    assert.equal(paths.cacheablePublicRead(path, "GET"), false, path);
  }
  assert.equal(paths.cacheablePublicRead("/jobs", "POST"), false);
});

test("only successful directory-affecting mutations invalidate public reads", () => {
  assert.equal(typeof paths.invalidatesPublicDirectory, "function");
  for (const path of [
    "/employer/company",
    "/employer/jobs",
    "/employer/jobs/2/status",
    "/jobs/2/apply",
    "/admin/categories/2",
    "/admin/jobs/3",
    "/admin/users/3/status",
  ]) {
    assert.equal(paths.invalidatesPublicDirectory(path, "POST"), true, path);
    assert.equal(paths.invalidatesPublicDirectory(path, "GET"), false, path);
  }
  for (const path of [
    "/conversations/2/messages",
    "/notifications/read-all",
    "/candidate/profile",
    "/jobs/2/save",
  ]) {
    assert.equal(paths.invalidatesPublicDirectory(path, "POST"), false, path);
  }
});
