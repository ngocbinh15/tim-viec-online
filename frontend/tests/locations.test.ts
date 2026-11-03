import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchProvinces,
  loadProvinceCatalog,
  parseProvincePage,
  PROVINCES_URL,
} from "../src/features/locations/provinces";
import snapshot from "../src/features/locations/provinces.snapshot.json";

const page = (
  names: { code: string; name: string }[],
  total = names.length,
  current = 1,
  limit = 100,
) => ({
  success: true,
  data: names.map((province) => ({
    ...province,
    population: 100,
    unused: "excluded",
  })),
  metadata: { total, page: current, limit },
});
const entries = [
  { code: "01", name: "Hà Nội" },
  { code: "79", name: "Hồ Chí Minh" },
];

test("province parser validates the API envelope and exposes only code/name", () => {
  assert.deepEqual(parseProvincePage(page(entries)).data, entries);
  for (const body of [
    null,
    { ...page(entries), success: false },
    { ...page(entries), data: [{ code: "1", name: "City" }] },
    { ...page(entries), data: [{ code: "01", name: " " }] },
    { ...page(entries), data: [] },
    { ...page(entries), metadata: { total: Infinity, page: 1, limit: 100 } },
    { ...page(entries), metadata: { total: 2, page: 0, limit: 100 } },
    { ...page(entries), metadata: { total: 2, page: 1, limit: 1 } },
  ])
    assert.throws(() => parseProvincePage(body));
});

test("province fetch follows capped API pages and never stops at the default first page", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    assert.equal(new URL(url).searchParams.get("limit"), "100");
    assert.deepEqual(init?.headers, { Accept: "application/json" });
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    const current = Number(new URL(url).searchParams.get("page"));
    return Response.json(page([entries[current - 1]], 2, current, 1));
  };
  assert.deepEqual(await fetchProvinces(fetcher), entries);
  assert.deepEqual(calls, [
    `${PROVINCES_URL}?limit=100&page=1`,
    `${PROVINCES_URL}?limit=100&page=2`,
  ]);
  const result = await loadProvinceCatalog(async () =>
    Response.json(page(entries)),
  );
  assert.equal(result.source, "api");
  assert.deepEqual(result.provinces, entries);
});

test("province failures retain a complete verified catalog instead of partial options", async () => {
  const failingFetchers: (typeof fetch)[] = [
    async () => {
      throw new Error("offline");
    },
    async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
    async () => new Response("rate limited", { status: 429 }),
    async () => new Response("not json"),
    async () => Response.json(page([entries[0]], 2, 1, 100)),
    async (input) =>
      Response.json(
        page(
          [entries[0]],
          2,
          Number(new URL(String(input)).searchParams.get("page")),
          1,
        ),
      ),
    async (input) => {
      const current = Number(new URL(String(input)).searchParams.get("page"));
      return Response.json(
        page([entries[current - 1]], current === 1 ? 2 : 3, current, 1),
      );
    },
  ];
  for (const fetcher of failingFetchers) {
    const result = await loadProvinceCatalog(fetcher);
    assert.equal(result.source, "snapshot");
    assert.deepEqual(result.provinces, snapshot.provinces);
    assert.equal(result.provinces.length, 34);
  }
  assert.equal(
    new Set(snapshot.provinces.map((province) => province.code)).size,
    34,
  );
  assert.ok(
    snapshot.provinces.some((province) => province.name === "Vĩnh Long"),
  );
});

test("province fetching bounds unexpected pagination loops", async () => {
  let calls = 0;
  const result = await loadProvinceCatalog(async () => {
    calls++;
    return Response.json(
      page(
        [{ code: String(calls).padStart(2, "0"), name: `City ${calls}` }],
        20,
        calls,
        1,
      ),
    );
  });
  assert.equal(calls, 10);
  assert.equal(result.source, "snapshot");
});
