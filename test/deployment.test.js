const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveEndpoint } = require("../mobile/api-endpoint");
const serverConfig = require("../server-config");
test("release builds reject phone loopback, emulator URLs, insecure public APIs and missing endpoints", () => {
  for (const url of [undefined, "http://127.0.0.1:4174/api/v1", "https://localhost/api/v1", "http://10.0.2.2:4174/api/v1", "http://api.example.com/api/v1", "https://user:pass@api.example.com/api/v1", "https://api.example.com/not-api"]) {
    assert.throws(() => resolveEndpoint(url, "android", false));
  }
  assert.equal(resolveEndpoint(undefined, "web", false), "/api/v1");
  assert.equal(resolveEndpoint("https://api.example.com/api/v1/", "android", false), "https://api.example.com/api/v1");
  assert.throws(() => resolveEndpoint("http://192.168.1.10:4174/api/v1", "android", false));
  assert.equal(resolveEndpoint("http://192.168.1.10:4174/api/v1", "android", false, true), "http://192.168.1.10:4174/api/v1");
  assert.throws(() => resolveEndpoint("http://127.0.0.1:4174/api/v1", "android", false, true));
});
test("only the Android USB pilot accepts the fixed USB forwarding address", () => {
  const endpoint = "http://127.0.0.1:4175/api/v1";
  assert.equal(resolveEndpoint(endpoint, "android", false, "usb"), endpoint);
  assert.throws(() => resolveEndpoint(endpoint, "android", false, true));
  assert.throws(() => resolveEndpoint(endpoint, "android", false));
  assert.throws(() => resolveEndpoint(endpoint, "ios", false, "usb"));
  assert.throws(() => resolveEndpoint("http://192.168.1.10:4175/api/v1", "android", false, "usb"));
});
test("production refuses preview OTP, missing persistent storage and HTTP public origins", () => {
  const base = { NODE_ENV: "production", HANDYHIVE_PUBLIC_ORIGIN: "https://api.example.com", HANDYHIVE_PHONE_MODE: "twilio", HANDYHIVE_DB: "/data/handyhive.sqlite" };
  assert.equal(serverConfig(base).requireVerification, true);
  assert.throws(() => serverConfig({ ...base, HANDYHIVE_PHONE_MODE: "preview" }));
  assert.throws(() => serverConfig({ ...base, HANDYHIVE_DB: "" }));
  assert.throws(() => serverConfig({ ...base, HANDYHIVE_PUBLIC_ORIGIN: "http://api.example.com" }));
});

test("fictional workers are enabled by default on local previews and gated for other servers", () => {
  assert.equal(serverConfig({}).previewWorkers, true);
  assert.equal(serverConfig({ HANDYHIVE_DEMO_WORKERS: "0" }).previewWorkers, false);
  assert.equal(serverConfig({ HANDYHIVE_HOST: "0.0.0.0" }).previewWorkers, false);
  assert.equal(serverConfig({ HANDYHIVE_HOST: "192.168.1.5", HANDYHIVE_DEMO_WORKERS: "1" }).previewWorkers, true);
  assert.equal(serverConfig({ HANDYHIVE_REQUIRE_VERIFICATION: "1", HANDYHIVE_DEMO_WORKERS: "1" }).previewWorkers, false);
  assert.equal(serverConfig({ HANDYHIVE_PHONE_MODE: "twilio", HANDYHIVE_DEMO_WORKERS: "1" }).previewWorkers, false);
});
test("untrusted forwarded IPs cannot bypass limits; the configured single proxy supplies client addresses", () => {
  const request = { headers: { "x-forwarded-for": "203.0.113.7" }, socket: { remoteAddress: "172.20.0.2" } };
  assert.equal(serverConfig.clientAddress(request, false), "172.20.0.2");
  assert.equal(serverConfig.clientAddress(request, true), "203.0.113.7");
  request.headers["x-forwarded-for"] = "spoof, 203.0.113.7";
  assert.equal(serverConfig.clientAddress(request, true), "172.20.0.2");
});
