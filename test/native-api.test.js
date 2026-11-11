"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID, createHash } = require("node:crypto");
const { once } = require("node:events");
const { mkdtempSync, rmSync, rmdirSync } = require("node:fs");
const { request } = require("node:http");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { createInterface } = require("node:readline");
const { DatabaseSync } = require("node:sqlite");
const { test } = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");

const password = "native-api-test-password";

async function setup(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "handyhive-api-"));
  const database = path.join(directory, "test.sqlite");
  let child;
  let origin;
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "exit");
      child.kill();
      await closed;
    }
  }
  t.after(async () => {
    await stop();
    for (const suffix of ["", "-wal", "-shm"]) rmSync(database + suffix, { force: true });
    rmdirSync(directory);
  });

  async function start() {
    child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
      env: { ...process.env, HANDYHIVE_PORT: "0", HANDYHIVE_DB: database, HANDYHIVE_PHONE_MODE: "preview" },
      stdio: ["ignore", "pipe", "inherit"],
    });
    const stdout = createInterface({ input: child.stdout });
    try {
      const [line] = await once(stdout, "line", { signal: AbortSignal.timeout(5000) });
      origin = line.match(/http:\/\/127\.0\.0\.1:\d+$/)?.[0];
      assert.ok(origin, line);
    } finally {
      stdout.close();
    }
  }
  await start();

  async function api(action, { body, token, browser = false, headers = {} } = {}) {
    const url = origin + (browser ? "/api/" : "/api/v1/") + action;
    // node:http lets the emulator Host header be exercised over loopback.
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = request(url, {
        method: payload === undefined ? "GET" : "POST",
        headers: {
          ...(payload === undefined ? {} : { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }),
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...headers,
        },
      }, (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { data += chunk; });
        response.on("error", reject);
        response.on("end", () => {
          try { resolve({ status: response.statusCode, headers: response.headers, body: JSON.parse(data) }); }
          catch (error) { reject(error); }
        });
      });
      req.on("error", reject);
      req.setTimeout(5000, () => req.destroy(new Error("API request timed out")));
      req.end(payload);
    });
  }

  async function register(handle) {
    const result = await api("register", { body: { handle, password } });
    assert.equal(result.status, 200, result.body.error);
    return { token: result.body.session.token, id: result.body.state.account.id, result };
  }
  async function registerWorker() {
    const worker = await register("test-worker");
    const result = await api("profile", { token: worker.token, body: {
      name: "Test worker", bio: "Local test profile", service: "plumbing", unit: "visit",
      years: 2, price: 500, areas: ["Saket"],
    } });
    assert.equal(result.status, 200, result.body.error);
    return worker;
  }
  function inDatabase(action) {
    const db = new DatabaseSync(database);
    try { return action(db); } finally { db.close(); }
  }
  return { api, register, registerWorker, inDatabase, stop, start, emulatorHost: "10.0.2.2:" + new URL(origin).port };
}

function booking(proId, appointment = "") {
  return {
    operationId: randomUUID(), intent: randomUUID(), proId, appointment, scope: "Fix a leaking tap",
    area: "Saket", contact: "In-app message",
  };
}

test("native and browser sessions are isolated, hashed, revocable and expiring", async (t) => {
  const { api, register, inDatabase, emulatorHost } = await setup(t);
  const { token, id, result } = await register("test-customer");
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(result.headers["set-cookie"], undefined);
  assert.ok(result.body.session.expiresAt > result.body.serverTime);
  const hash = createHash("sha256").update(token).digest("hex");
  assert.equal(inDatabase((db) => db.prepare("SELECT token FROM native_sessions WHERE owner=?").get(id).token), hash);

  const browserLogin = await api("login", { browser: true, body: { handle: "test-customer", password } });
  assert.equal(browserLogin.status, 200);
  assert.equal(browserLogin.body.session, undefined);
  const cookie = browserLogin.headers["set-cookie"][0].split(";")[0];
  const browserToken = cookie.split("=")[1];
  assert.equal((await api("state", { browser: true, headers: { Cookie: cookie } })).body.state.account.id, id);
  assert.equal((await api("state", { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await api("state", { token: browserToken })).status, 401);
  assert.equal((await api("state", { browser: true, headers: { Cookie: "handyhive_preview=" + token } })).body.state.account, null);
  assert.equal((await api("state", { token, headers: { Host: "unrelated.test" } })).status, 400);
  const viaEmulator = await api("state", { token, headers: { Host: emulatorHost } });
  assert.equal(viaEmulator.status, 200);
  assert.equal(viaEmulator.body.state.account.id, id);
  assert.ok(viaEmulator.body.state.catalog.services.find((item) => item.id === "plumbing").tasks.includes("Fix a leaking tap"));
  assert.equal(viaEmulator.body.session, undefined);
  assert.equal((await api("state", { browser: true, headers: { Host: emulatorHost } })).status, 400);
  const expired = await api("login", { body: { handle: "test-customer", password } });
  inDatabase((db) => db.prepare("UPDATE native_sessions SET expires=0 WHERE token=?")
    .run(createHash("sha256").update(expired.body.session.token).digest("hex")));
  assert.equal((await api("state", { token: expired.body.session.token })).status, 401);
  assert.equal((await api("logout", { token, body: {} })).status, 200);
  assert.equal((await api("state", { token })).status, 401);
  assert.equal((await api("state", { browser: true, headers: { Cookie: cookie } })).body.state.account.id, id);
  assert.equal((await api("logout", { browser: true, headers: { Cookie: cookie }, body: {} })).status, 200);
  assert.equal((await api("state", { browser: true, headers: { Cookie: cookie } })).body.state.account, null);

  const phone = await api("phone-start", { body: { phone: "+919000000001" } });
  assert.equal(phone.status, 200);
  const verify = await api("phone-verify", { body: { challenge: phone.body.challenge, code: phone.body.previewCode } });
  assert.equal(verify.status, 200);
  assert.equal(verify.headers["set-cookie"], undefined);
  assert.equal((await api("state", { token: verify.body.session.token })).body.state.account.id, verify.body.state.account.id);
});

test("native booking mutations reconcile retries and competing accepts across restart", async (t) => {
  const { api, register, registerWorker, stop, start } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("customer-one");
  const other = await register("customer-two");
  const tomorrowIst = new Date(Date.now() + 86_400_000 + 19_800_000).toISOString().slice(0, 10) + "T11:00";
  const request = booking(worker.id, tomorrowIst);
  const first = await api("request", { token: customer.token, body: request });
  assert.equal(first.status, 200, first.body.error);
  const retry = await api("request", { token: customer.token, body: { ...request } });
  assert.equal(retry.body.jobId, first.body.jobId);
  assert.equal(retry.body.revision, first.body.revision);
  const reused = await api("request", { token: customer.token, body: { ...request, scope: "Unblock a drain" } });
  assert.equal(reused.body.code, "OPERATION_ID_REUSED");

  const second = await api("request", { token: other.token, body: booking(worker.id, tomorrowIst) });
  assert.equal(second.status, 200, second.body.error);
  const transition = (job) => ({ operationId: randomUUID(), job, role: "pro", change: "accept" });
  const attempts = [first, second].map((result) => transition(result.body.jobId));
  const inaccessible = await api("transition", { token: other.token, body: attempts[0] });
  assert.equal(inaccessible.status, 404);
  const workerSession = await api("login", { body: { handle: "test-worker", password } });
  assert.equal(workerSession.status, 200);
  const accepts = await Promise.all(attempts.map((body, index) => api("transition", {
    token: index === 0 ? worker.token : workerSession.body.session.token, body,
  })));
  assert.deepEqual(accepts.map(({ status }) => status).sort(), [200, 409]);
  const winner = accepts.findIndex(({ status }) => status === 200);
  assert.equal(accepts[1 - winner].body.code, "SLOT_UNAVAILABLE");
  const owner = [customer, other][winner];
  const message = { operationId: randomUUID(), job: attempts[winner].job, role: "customer", message: "One chat message" };
  const sent = await api("message", { token: owner.token, body: message });
  assert.equal(sent.status, 200, sent.body.error);

  await stop();
  await start();
  const acceptedAgain = await api("transition", { token: worker.token, body: attempts[winner] });
  assert.equal(acceptedAgain.status, 200);
  assert.equal(acceptedAgain.body.jobId, message.job);
  const sentAgain = await api("message", { token: owner.token, body: message });
  assert.equal(sentAgain.status, 200);
  assert.equal(sentAgain.body.revision, sent.body.revision);
  assert.equal(sentAgain.body.state.requests[0].status, "accepted");
  assert.deepEqual(sentAgain.body.state.requests[0].messages.map((entry) => entry.message), ["One chat message"]);
  const nonParticipant = await api("state", { token: [other, customer][winner].token });
  assert.ok(nonParticipant.body.state.requests.every((job) => job.id !== message.job));
});

test("pending bookings expire and record an update without client activity or SMS", async (t) => {
  const { api, register, registerWorker, inDatabase } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("test-customer");
  const result = await api("request", { token: customer.token, body: booking(worker.id) });
  assert.equal(result.status, 200, result.body.error);
  const id = result.body.jobId;
  inDatabase((db) => {
    const data = JSON.parse(db.prepare("SELECT body FROM marketplace WHERE id=1").get().body);
    data.requests.find((job) => job.id === id).deadline = Date.now() - 1;
    db.prepare("UPDATE marketplace SET body=? WHERE id=1").run(JSON.stringify(data));
  });
  let update;
  const timeout = Date.now() + 6000;
  while (!update && Date.now() < timeout) {
    await delay(100);
    update = inDatabase((db) => db.prepare("SELECT status FROM booking_updates WHERE owner=? AND job=? AND status='expired'")
      .get(customer.id, id));
  }
  assert.equal(update?.status, "expired");
  const late = await api("transition", { token: worker.token, body: { operationId: randomUUID(), job: id, role: "pro", change: "accept" } });
  assert.equal(late.status, 409);
  assert.equal(late.body.code, "REQUEST_EXPIRED");
  assert.ok(late.body.revision > result.body.revision);
});
