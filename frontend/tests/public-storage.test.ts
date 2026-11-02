import test from "node:test";
import assert from "node:assert/strict";
import { publicImagePath } from "../src/features/api/public-storage";

test("public image proxy accepts avatars and logos, including nested logo folders", () => {
  assert.equal(
    publicImagePath(["avatars", "candidate.png"]),
    "avatars/candidate.png",
  );
  assert.equal(
    publicImagePath(["company_logos", "real", "logo.webp"]),
    "company_logos/real/logo.webp",
  );
});
test("public image proxy rejects private files, traversal, URLs and non-image extensions", () => {
  for (const path of [
    ["application_cvs", "cv.pdf"],
    ["cvs", "avatar.png"],
    ["avatars", "..", "secret.png"],
    ["avatars", "%2e%2e", "secret.png"],
    ["avatars", "foo/bar.png"],
    ["avatars", "file.svg"],
    ["avatars", "script.html"],
    ["avatars", "https:evil.png"],
    ["avatars", ""],
  ])
    assert.equal(publicImagePath(path), null, path.join("/"));
});
