import assert from "node:assert/strict";
import { test } from "node:test";
import { publicRealtimeConfig } from "../src/features/api/realtime-config";

test("realtime settings follow the current runtime and expose no server credentials", () => {
  const environment = {
    NEXT_PUBLIC_REVERB_APP_KEY: "public-key",
    NEXT_PUBLIC_REVERB_HOST: "localhost",
    REVERB_APP_SECRET: "private-secret",
  };
  assert.deepEqual(publicRealtimeConfig(environment), {
    key: "public-key",
    host: "localhost",
    port: 8080,
    tls: false,
  });
  environment.NEXT_PUBLIC_REVERB_APP_KEY = "test-key";
  assert.equal(publicRealtimeConfig(environment)?.key, "test-key");
  assert.equal(publicRealtimeConfig({}), null);
  assert.equal(
    publicRealtimeConfig({ ...environment, NEXT_PUBLIC_REVERB_PORT: "0" }),
    null,
  );
});
