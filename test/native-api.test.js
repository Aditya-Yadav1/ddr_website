"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID, createHash } = require("node:crypto");
const { once } = require("node:events");
const { existsSync, mkdtempSync, rmSync, rmdirSync } = require("node:fs");
const { request } = require("node:http");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { createInterface } = require("node:readline");
const { DatabaseSync } = require("node:sqlite");
const { test } = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");

const password = "native-api-test-password";

async function setup(t, overrides = {}) {
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
      env: { ...process.env, HANDYHIVE_PORT: "0", HANDYHIVE_DB: database, HANDYHIVE_PHONE_MODE: "preview", HANDYHIVE_DEMO_WORKERS: "0", ...overrides },
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
      years: 2, price: 500, areas: ["Saket"], pinCodes: ["110017"],
    } });
    assert.equal(result.status, 200, result.body.error);
    return worker;
  }
  function inDatabase(action) {
    const db = new DatabaseSync(database);
    try { return action(db); } finally { db.close(); }
  }
  return { api, register, registerWorker, inDatabase, stop, start,
    website: (route) => fetch(origin + route),
    emulatorHost: "10.0.2.2:" + new URL(origin).port };
}

test("the default website serves shared app screens, deep links and bundles alongside the API", {
  skip: !existsSync(path.join(__dirname, "../mobile/dist/index.html")) && "Build the website first: npm run build:web",
}, async (t) => {
  const { website } = await setup(t, { HANDYHIVE_APP_PREVIEW: "" });
  const home = await website("/");
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /_expo\/static\/js\/web\//);
  assert.doesNotMatch(html, /src="script\.js"/);
  for (const route of ["/tasks/leaking-tap", "/services/plumbing", "/providers/test-id", "/bookings", "/bookings/test-id/payment",
    "/bookings/test-id/review", "/support", "/account", "/worker", "/sign-in"]) {
    const response = await website(route);
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), html, route);
  }
  const script = html.match(/<script[^>]+src="([^"]+)"/)[1];
  const bundle = await website(script);
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get("content-type"), /javascript/);
  assert.equal((await website("/not-an-app-route")).status, 404);
  assert.equal((await website("/api/v1/health")).status, 200);
});

function booking(proId, appointment = "") {
  return {
    operationId: randomUUID(), intent: randomUUID(), proId, appointment, scope: "Fix a leaking tap",
    area: "Saket", pinCode: "110017", contact: "In-app message",
  };
}

test("arrival confirmation is customer-only, reports stay private, and suspended workers cannot take new bookings", async (t) => {
  const { api, register, registerWorker, inDatabase, stop, start } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("safety-customer");
  const outsider = await register("safety-outsider");
  assert.equal((await api("health")).body.service, "handyhive");
  await api("verification-request", { token: worker.token, body: { consent: "worker-checks-v1" } });
  const date = new Date(Date.now() + 2 * 86400000 + 19800000).toISOString().slice(0, 10) + "T10:00";
  const request = { ...booking(worker.id, date), safetyVersion: 1 };
  const created = await api("request", { token: customer.token, body: request });
  assert.equal(created.status, 200, created.body.error);
  const job = created.body.jobId;
  const command = (role, body) => ({ job, role, operationId: randomUUID(), ...body });
  const pro = (change) => api("transition", { token: worker.token, body: command("pro", { change }) });
  assert.equal((await pro("accept")).status, 200);
  assert.equal((await pro("arrive")).status, 200);
  assert.equal((await pro("start")).body.code, "ARRIVAL_CONFIRMATION_REQUIRED");
  assert.equal((await api("arrival-confirm", { token: outsider.token, body: command("customer", { confirmed: true }) })).status, 404);
  assert.equal((await api("arrival-confirm", { token: worker.token, body: command("pro", { confirmed: true }) })).status, 409);
  const confirm = command("customer", { confirmed: true });
  assert.equal((await api("arrival-confirm", { token: customer.token, body: confirm })).status, 200);
  await api("profile", { token: worker.token, body: {
    name: "Changed identity", bio: "Local test profile", service: "plumbing", unit: "visit", years: 2, price: 500, areas: ["Saket"], pinCodes: ["110017"],
  } });
  assert.equal((await pro("start")).body.code, "ARRIVAL_CONFIRMATION_REQUIRED");
  const pendingRecheck = (await api("state", { token: customer.token })).body.state.requests.find((entry) => entry.id === job);
  assert.equal(pendingRecheck.arrivalConfirmedAt, undefined);
  assert.equal(pendingRecheck.arrivalIdentity, undefined);
  assert.equal((await api("arrival-confirm", { token: customer.token, body: command("customer", { confirmed: true }) })).status, 200);
  assert.equal((await pro("start")).status, 200);
  const report = command("customer", { message: "Private concern about conduct at the visit" });
  const beforeReport = (await api("state", { token: customer.token })).body.revision;
  const recorded = await api("safety-report", { token: customer.token, body: report });
  assert.equal(recorded.status, 200);
  assert.ok(recorded.body.revision > beforeReport);
  assert.equal((await api("state", { token: worker.token })).body.state.safetyReports.length, 0);
  assert.equal(JSON.stringify((await api("discover")).body).includes(report.message), false);
  await stop(); await start();
  assert.equal((await api("safety-report", { token: customer.token, body: report })).status, 200);
  assert.equal((await api("state", { token: customer.token })).body.state.safetyReports.length, 1);
  inDatabase((db) => require("../worker-trust")(db).suspend(worker.id, true, "operator-test", "Evidence review"));
  assert.equal((await api("discover")).body.state.profiles.some((profile) => profile.id === worker.id), false);
  const blocked = await api("request", { token: customer.token, body: booking(worker.id, date) });
  assert.equal(blocked.body.code, "WORKER_UNAVAILABLE");
});

test("enforced checks hide unverified workers and profile edits cannot forge trust", async (t) => {
  const { api, register, registerWorker } = await setup(t, { HANDYHIVE_REQUIRE_VERIFICATION: "1" });
  const worker = await registerWorker();
  const customer = await register("trust-customer");
  const result = await api("profile", { token: worker.token, body: {
    name: "Test worker", bio: "Local test profile", service: "plumbing", unit: "visit", years: 2, price: 500, areas: ["Saket"], pinCodes: ["110017"],
    trust: { eligible: true, phoneVerified: true, checks: { identity: { status: "verified" } } },
  } });
  assert.equal(result.status, 200);
  assert.equal(result.body.state.profile.trust.eligible, false);
  assert.equal(result.body.state.profile.trust.checks.identity.status, "not_checked");
  assert.equal((await api("discover")).body.state.profiles.length, 0);
  assert.equal((await api("coverage?pinCode=110017")).body.ids.length, 0);
  assert.equal((await api("request", { token: customer.token, body: booking(worker.id) })).body.code, "WORKER_UNAVAILABLE");
});

test("scheduled job agreements retain approvals, payment receipts and privacy across retries", async (t) => {
  const { api, register, registerWorker, stop, start } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("agreement-customer");
  const outsider = await register("agreement-outsider");
  const appointment = new Date(Date.now() + 2 * 86_400_000 + 19_800_000).toISOString().slice(0, 10) + "T10:00";
  const scheduled = {
    ...booking(worker.id, appointment), tier: "everyday", expectedPrice: 500, expectedUnit: "visit",
    expectedIncludes: "", expectedIncludesHi: "", hours: 2, customerName: "Private resident", address: "Private address number 10",
    brief: { problem: "Tap leaks at the handle", materials: "inspect", readiness: "unknown" },
  };
  const ok = async (action, token, body) => {
    const result = await api(action, { token, body });
    assert.equal(result.status, 200, result.body.error);
    return result.body;
  };
  const available = () => api("availability?" + new URLSearchParams({ pinCode: "110017", scope: scheduled.scope, day: appointment.slice(0, 10) }));
  assert.ok((await available()).body.options[worker.id].includes(appointment));
  const job = (await ok("request", customer.token, scheduled)).jobId;
  const command = (role, body) => ({ ...body, job, role, operationId: randomUUID() });
  const pro = (action, body) => ok(action, worker.token, command("pro", body));
  const user = (action, body) => ok(action, customer.token, command("customer", body));
  const get = async (token) => (await ok("state", token)).state.requests.find((item) => item.id === job);
  assert.equal((await get(worker.token)).brief.problem, scheduled.brief.problem);
  assert.equal((await get(worker.token)).details, undefined);
  assert.equal(await get(outsider.token), undefined);
  await pro("transition", { change: "accept" });
  assert.equal((await available()).body.options[worker.id].includes(appointment), false);
  const proposed = appointment.slice(0, 10) + "T12:00";
  await user("reschedule-propose", { appointment: proposed, version: 0, minutes: 60, reason: "Meet after noon" });
  assert.equal((await get(customer.token)).appointment, appointment);
  await pro("reschedule-respond", { version: 1, decision: "accepted" });
  assert.equal((await get(worker.token)).appointment, proposed);
  await pro("transition", { change: "arrive" });
  const attempt = await api("transition", { token: worker.token, body: command("pro", { change: "start" }) });
  assert.equal(attempt.body.code, "QUOTE_REQUIRED");
  const legacyLogin = await api("login", { browser: true, body: { handle: "test-worker", password } });
  const cookie = legacyLogin.headers["set-cookie"][0].split(";")[0];
  const legacy = await api("transition", { browser: true, headers: { Cookie: cookie }, body: { job, role: "pro", change: "start" } });
  assert.equal(legacy.status, 409);

  const quote = { items: [{ label: "Repair and fitting", amountPaise: 80000 }], exclusions: "No wall work",
    creditPaise: 50000, minutes: 60, materials: "worker" };
  await pro("quote-send", { ...quote, version: 0 });
  await pro("quote-send", { ...quote, version: 1 });
  const stale = await api("quote-respond", { token: customer.token, body: command("customer", { version: 1, decision: "accepted" }) });
  assert.equal(stale.status, 409);
  const approval = command("customer", { version: 2, decision: "accepted" });
  await ok("quote-respond", customer.token, approval);
  await pro("transition", { change: "start" });
  await user("help-create", { category: "incomplete", message: "Waiting on a fitting" });
  const interrupted = await get(worker.token);
  assert.equal(interrupted.interrupted, true);
  const blocked = await api("transition", { token: worker.token, body: command("pro", { change: "complete" }) });
  assert.equal(blocked.status, 409);
  await pro("help-respond", { entry: interrupted.helpCases[0].id, decision: "resolve", message: "The fitting has arrived" });
  await pro("transition", { change: "complete" });
  assert.equal((await get(customer.token)).bill.totalPaise, 80000);
  const review = () => api("review", { token: customer.token, body: { job, rating: 4 } });
  assert.equal((await review()).body.code, "PAYMENT_REQUIRED");
  const payment = command("customer", { version: 0, amountPaise: 30050, method: "upi" });
  await ok("payment-report", customer.token, payment);
  const report = (await get(worker.token)).payments[0];
  assert.equal(report.status, "reported");
  assert.equal((await review()).body.code, "PAYMENT_REQUIRED");
  assert.equal((await api("payment-confirm", { token: outsider.token, body: command("pro", { entry: report.id, decision: "confirmed" }) })).status, 404);
  await pro("payment-confirm", { entry: report.id, decision: "confirmed" });
  await stop();
  await start();
  await ok("quote-respond", customer.token, approval);
  await ok("payment-report", customer.token, payment);
  assert.deepEqual((await get(customer.token)).payments.map((entry) => [entry.status, entry.amountPaise]), [["confirmed", 30050]]);
  assert.equal((await review()).body.code, "PAYMENT_REQUIRED");
  assert.equal((await ok("state", customer.token)).state.bookingUpdates.filter((entry) => entry.label === "Quote ready to review").length, 2);
  await user("save-worker", { worker: worker.id });
  assert.deepEqual((await ok("state", customer.token)).state.savedWorkers, [worker.id]);
  assert.deepEqual((await ok("state", outsider.token)).state.savedWorkers, []);

  const amountPaise = 49950;
  const checkout = () => api("checkout-start", { token: customer.token, body: { job, amountPaise } });
  assert.equal((await api("checkout-start", { token: outsider.token, body: { job, amountPaise } })).status, 404);
  assert.equal((await api("checkout-start", { token: customer.token, body: { job, amountPaise: 1 } })).status, 409);
  const started = await Promise.all([checkout(), checkout()]);
  assert.ok(started.every((result) => result.status === 200));
  const { reference } = started[0].body.job.checkout;
  assert.equal(started[1].body.job.checkout.reference, reference);
  assert.equal((await get(worker.token)).checkout.reference, undefined);
  assert.equal((await api("payment-report", { token: worker.token, body: command("pro", { version: 1, amountPaise: 10, method: "cash" }) })).status, 409);
  await stop();
  await start();
  const simulated = { job, reference };
  await ok("checkout-demo", customer.token, simulated);
  await ok("checkout-demo", customer.token, simulated);
  const paid = await get(customer.token);
  assert.equal(paid.checkout, undefined);
  assert.deepEqual(paid.payments.map((entry) => [entry.method, entry.amountPaise]), [["upi", 30050], ["online", amountPaise]]);
  assert.equal(paid.payments[1].source, "demo");
  assert.deepEqual((await review()).body.state.reviewed, [job]);
  assert.equal((await api("payment-reverse", { token: worker.token, body: command("pro", { entry: reference, reason: "Trying to reverse the checkout" }) })).status, 409);
});

test("a new customer can discover and book demo workers, pay, and review without switching accounts", async (t) => {
  const { api, register, registerWorker, inDatabase, start, stop } = await setup(t, { HANDYHIVE_DEMO_WORKERS: "1" });
  const customer = await register("new-preview-customer");
  const outsideCustomer = await register("other-preview-customer");
  const { demoPinCode, profiles, catalog } = customer.result.body.state;
  assert.equal(demoPinCode, "110075");
  assert.deepEqual(profiles.map(({ service }) => service).sort(), ["cleaning", "electrical", "painting", "plumbing"]);
  assert.ok(profiles.every((profile) => profile.sample));
  const coverage = await api("coverage?" + new URLSearchParams({ pinCode: demoPinCode }), { token: customer.token });
  assert.deepEqual(coverage.body.ids.sort(), profiles.map(({ id }) => id).sort());
  await stop();
  inDatabase((db) => {
    const store = JSON.parse(db.prepare("SELECT body FROM marketplace WHERE id=1").get().body);
    for (const profile of store.profiles) delete profile.pinCodes;
    db.prepare("UPDATE marketplace SET body=? WHERE id=1").run(JSON.stringify(store));
  });
  await start();
  const location = "IIT Delhi, Delhi";
  const campusPin = "110016";
  const campusCoverage = await api("coverage?" + new URLSearchParams({ pinCode: campusPin }), { token: customer.token });
  assert.deepEqual(campusCoverage.body.ids.sort(), profiles.map(({ id }) => id).sort());
  const day = new Date(Date.now() + 2 * 86_400_000 + 19_800_000).toISOString().slice(0, 10);
  for (const worker of profiles) {
    const scope = catalog.services.find(({ id }) => id === worker.service).tasks.at(-1);
    const slots = await api("availability?" + new URLSearchParams({ day, pinCode: campusPin, scope }), { token: customer.token });
    assert.ok(slots.body.options[worker.id]?.length, worker.service);
  }
  const worker = profiles.find(({ service }) => service === "electrical");
  const appointment = day + "T10:00";
  const scope = "Check wiring";
  const checked = await api("slots?" + new URLSearchParams({ pinCode: campusPin, scope, proId: worker.id, slot: appointment }), { token: customer.token });
  assert.deepEqual(checked.body.slots, [appointment]);
  const createVisit = (provider, area, task = "Fix a leaking tap", pinCode = "110017") => api("request", { token: customer.token, body: {
    ...booking(provider.id, appointment), scope: task, safetyVersion: 1, area, pinCode, tier: "everyday", expectedPrice: provider.price, expectedUnit: "visit",
    expectedIncludes: "", expectedIncludesHi: "", hours: 2, customerName: "Test Customer", address: "12 Fictional Lane",
    brief: { problem: task, materials: "none", readiness: "unknown" },
  } });
  const booked = await createVisit(worker, location, scope, campusPin);
  assert.equal(booked.status, 200, booked.body.error);
  const job = booked.body.jobId;
  assert.equal(booked.body.state.requests.find((visit) => visit.id === job).demoWorker, true);
  const post = (action, body, token = customer.token) => api(action, { token, body: { job, ...body } });
  const command = (change) => ({ role: "customer", operationId: randomUUID(), change });
  const advance = (change) => post("demo-worker-step", command(change));
  const accept = command("accept");
  assert.equal((await post("demo-worker-step", accept, outsideCustomer.token)).status, 404);
  assert.equal((await post("demo-worker-step", accept)).body.state.requests[0].status, "accepted");
  assert.equal((await post("demo-worker-step", accept)).body.jobId, job);
  assert.equal((await advance("arrive")).body.state.requests[0].status, "arrived");
  assert.equal((await advance("diagnostic-only")).body.code, "ARRIVAL_CONFIRMATION_REQUIRED");
  assert.equal((await post("arrival-confirm", { role: "customer", operationId: randomUUID(), confirmed: true })).status, 200);
  const completion = await advance("diagnostic-only");
  assert.equal(completion.status, 200, completion.body.error);
  assert.equal(completion.body.state.requests[0].status, "completed");
  const amountPaise = completion.body.state.requests[0].bill.totalPaise;
  assert.equal((await post("review", { rating: 5 })).body.code, "PAYMENT_REQUIRED");
  const checkout = await post("checkout-start", { amountPaise });
  assert.equal(checkout.body.job.checkout.mode, "demo");
  assert.equal((await post("checkout-demo", { reference: checkout.body.job.checkout.reference })).status, 200);
  const reviewed = await post("review", { rating: 5 });
  assert.deepEqual(reviewed.body.state.reviewed, [job]);
  assert.deepEqual(reviewed.body.state.ratings, [{ pro: worker.id, rating: 5, count: 1 }]);

  const ordinaryWorker = await registerWorker();
  const ordinaryCoverage = await api("coverage?" + new URLSearchParams({ pinCode: campusPin }), { token: customer.token });
  assert.ok(!ordinaryCoverage.body.ids.includes(ordinaryWorker.id));
  const ordinaryVisit = await createVisit({ ...ordinaryWorker, price: 500 }, "Saket");
  assert.equal(ordinaryVisit.status, 200, ordinaryVisit.body.error);
  assert.equal((await post("demo-worker-step", { ...command("accept"), job: ordinaryVisit.body.jobId })).status, 404);
});

test("a private provider report and block preserve existing bookings and leave other customers unaffected", async (t) => {
  const { api, register, registerWorker, inDatabase } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("block-customer");
  const other = await register("block-outsider");
  const post = (action, account, body) => api(action, { token: account.token, body });
  const state = async (account) => (await api("state", { token: account.token })).body.state;
  const initial = await post("request", customer, { ...booking(worker.id), operationId: randomUUID() });
  assert.equal(initial.status, 200, initial.body.error);
  const report = { worker: worker.id, category: "fraud", message: "The profile asked for an advance outside HandyHive." };
  assert.equal((await post("report-worker", customer, report)).status, 200);
  assert.equal((await post("report-worker", customer, report)).status, 409);
  assert.equal((await post("block-worker", customer, { worker: worker.id })).status, 200);
  assert.deepEqual((await state(customer)).blockedWorkers, [{ id: worker.id, name: "Test worker" }]);
  assert.equal((await state(customer)).profiles.some(({ id }) => id === worker.id), false);
  assert.ok((await state(customer)).requests.some(({ id }) => id === initial.body.jobId));
  assert.equal((await post("request", customer, { ...booking(worker.id), operationId: randomUUID() })).body.code, "WORKER_UNAVAILABLE");
  assert.equal((await state(worker)).safetyReports.length, 0);
  assert.equal((await state(other)).blockedWorkers.length, 0);
  assert.ok((await state(other)).profiles.some(({ id }) => id === worker.id));
  assert.ok(!(await api("coverage?pinCode=110017", { token: customer.token })).body.ids.includes(worker.id));
  assert.equal(inDatabase((db) => db.prepare("SELECT worker FROM safety_reports WHERE reporter=?").get(customer.id).worker), worker.id);
  assert.equal((await post("unblock-worker", customer, { worker: worker.id })).status, 200);
  assert.ok((await state(customer)).profiles.some(({ id }) => id === worker.id));
});

test("declined repairs can close as a diagnostic visit at the original charge", async (t) => {
  const { api, register, registerWorker } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("diagnostic-customer");
  const slot = new Date(Date.now() + 86_400_000 + 19_800_000).toISOString().slice(0, 10) + "T11:00";
  const requested = await api("request", { token: customer.token, body: {
    ...booking(worker.id, slot), tier: "everyday", expectedPrice: 500, expectedUnit: "visit", expectedIncludes: "",
    expectedIncludesHi: "", customerName: "Resident", address: "Address number 25", hours: 2,
    brief: { problem: "Tap leaking", materials: "inspect", readiness: "unknown" },
  } });
  assert.equal(requested.status, 200, requested.body.error);
  let result;
  for (const change of ["accept", "arrive", "diagnostic-only"]) {
    result = await api("transition", { token: worker.token, body: {
      job: requested.body.jobId, role: "pro", operationId: randomUUID(), change,
    } });
    assert.equal(result.status, 200, result.body.error);
  }
  const [finished] = result.body.state.requests;
  assert.equal(finished.diagnosticOnly, true);
  assert.deepEqual([finished.status, finished.bill.quoteVersion, finished.bill.totalPaise], ["completed", null, 50000]);
});

test("worker details show shared work contact and verified reviews without exposing private booking data", async (t) => {
  const { api, register, registerWorker, inDatabase } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("discovery-customer");
  const stranger = await register("discovery-stranger");
  const workerDetails = (pinCode = "110017") => api("worker-details?" + new URLSearchParams({ id: worker.id, pinCode }));
  assert.deepEqual((await workerDetails()).body, { workPhone: "", reviews: [] });
  assert.equal((await workerDetails("110075")).status, 404);
  const profile = {
    name: "Test worker", bio: "Local test profile", service: "plumbing", unit: "visit",
    years: 2, price: 500, areas: ["Saket"], pinCodes: ["110017"],
  };
  const setWorkPhone = (workPhone) => api("profile", { token: worker.token, body: { ...profile, workPhone } });
  assert.equal((await setWorkPhone("911")).body.code, "INVALID_WORK_PHONE");
  assert.equal((await setWorkPhone("+91 90000 00000")).status, 200);
  assert.equal((await workerDetails()).body.workPhone, "+919000000000");
  const saved = await api("save-address", { token: customer.token, body: {
    label: "Home", area: "Saket", pinCode: "110017", address: "Private flat 42, Secret Street", customerName: "Private customer",
  } });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.state.addresses.length, 1);
  assert.equal(saved.body.state.addresses[0].pinCode, "110017");
  assert.deepEqual((await api("state", { token: stranger.token })).body.state.addresses, []);
  assert.equal((await api("save-address", { body: { label: "Home" } })).status, 401);
  const jobId = randomUUID();
  const secondJob = randomUUID();
  const putJobs = (count, paid = false) => inDatabase((db) => {
    const store = JSON.parse(db.prepare("SELECT body FROM marketplace WHERE id=1").get().body);
    store.requests = Array.from({ length: count }, (_, index) => ({
      id: [jobId, secondJob][index] ?? randomUUID(), intent: randomUUID(), customerId: customer.id, proId: worker.id,
      proName: "Test worker", scope: "Fix a leaking tap", service: "plumbing", area: "Saket", pinCode: "110017", status: "completed",
      price: 500, unit: "visit", createdAt: Date.now(), updatedAt: Date.now(), messages: [],
      ...(paid && index < 2 && { bill: { totalPaise: 50000 }, payments: [{ amountPaise: 50000, status: "confirmed" }] }),
      details: { address: "Private flat 42, Secret Street", customerName: "Private customer" },
    }));
    db.prepare("UPDATE marketplace SET body=? WHERE id=1").run(JSON.stringify(store));
  });
  putJobs(9);
  assert.deepEqual((await api("discover")).body.state.popular, []);
  putJobs(10);
  assert.equal((await api("review", { token: stranger.token, body: { job: jobId, rating: 5 } })).status, 404);
  assert.equal((await api("review", { token: customer.token, body: { job: jobId, rating: 6 } })).status, 400);
  const review = { job: jobId, rating: 4, comment: "Arrived on time and repaired the tap." };
  assert.equal((await api("review", { token: customer.token, body: review })).status, 409);
  putJobs(10, true);
  assert.equal((await api("review", { token: customer.token, body: { ...review, comment: "x".repeat(501) } })).body.code, "INVALID_REVIEW");
  assert.equal((await api("review", { token: customer.token, body: review })).status, 200);
  assert.equal((await api("review", { token: customer.token, body: { job: secondJob, rating: 5 } })).status, 200);
  await api("review", { token: customer.token, body: { job: jobId, rating: 1 } });
  const guest = (await api("discover")).body;
  assert.deepEqual(guest.state.requests, []);
  assert.deepEqual(guest.state.addresses, []);
  assert.deepEqual(guest.state.reviewed, []);
  assert.equal(guest.state.profile, null);
  assert.equal(JSON.stringify(guest).includes("Private flat"), false);
  assert.deepEqual(guest.state.ratings, [{ pro: worker.id, rating: 4.5, count: 2 }]);
  assert.equal(guest.state.profiles.find(({ id }) => id === worker.id).workPhone, undefined);
  const { reviews } = (await workerDetails()).body;
  assert.deepEqual(reviews.map(({ rating, comment }) => ({ rating, comment })), [{ rating: 5, comment: "" }, { rating: 4, comment: review.comment }]);
  assert.ok(reviews.every((item) => item.job === undefined && item.customerId === undefined));
  assert.equal(guest.state.popular[0].count, 10);
  assert.deepEqual(new Set((await api("state", { token: customer.token })).body.state.reviewed), new Set([jobId, secondJob]));
  assert.equal((await setWorkPhone("")).status, 200);
  assert.equal((await workerDetails()).body.workPhone, "");
});

test("support requests are private, survive a restart and can receive an operator reply", async (t) => {
  const { api, register, registerWorker, inDatabase, stop, start } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("support-customer");
  const stranger = await register("support-stranger");
  const request = await api("request", { token: customer.token, body: { ...booking(worker.id), operationId: randomUUID() } });
  assert.equal(request.status, 200, request.body.error);
  const body = { id: randomUUID(), job: request.body.jobId, category: "payment", message: "Please check the payment receipt." };
  const post = (token, fields = body) => api("support-create", { token, body: fields });
  assert.equal((await post()).status, 401);
  assert.equal((await post(stranger.token)).status, 404);
  assert.equal((await post(customer.token, { ...body, category: "invalid" })).status, 400);
  assert.equal((await post(customer.token)).status, 200);
  assert.equal((await post(customer.token)).body.state.supportTickets.length, 1);
  assert.equal((await post(customer.token, { ...body, category: "booking" })).status, 409);
  assert.deepEqual((await api("state", { token: worker.token })).body.state.supportTickets, []);
  assert.deepEqual((await api("discover")).body.state.supportTickets, []);
  inDatabase((db) => db.prepare("UPDATE support_tickets SET status='resolved', response=?, responder=? WHERE id=? AND owner=?")
    .run("The receipt is available on the payment page.", "test operator", body.id, customer.id));
  await stop();
  await start();
  const [ticket] = (await api("state", { token: customer.token })).body.state.supportTickets;
  assert.equal(ticket.status, "resolved");
  assert.equal(ticket.response, "The receipt is available on the payment page.");
  assert.equal(ticket.responder, undefined);
});

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

test("Plus requests lock the accepted offer and keep visit details private until acceptance", async (t) => {
  const { api, register, registerWorker, stop, start } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("offer-customer");
  const outsider = await register("unrelated-customer");
  const includes = "Inspect adjacent fittings and write an itemised repair estimate.";
  const includesHi = "पास की फिटिंग की जाँच और मरम्मत का लिखित अनुमान।";
  const base = {
    name: "Test worker", bio: "Local test profile", service: "plumbing", unit: "hourly",
    years: 2, price: 500, areas: ["Saket"], pinCodes: ["110017"],
  };
  async function save(plus) {
    return api("profile", { token: worker.token, body: { ...base, plus } });
  }
  assert.equal((await save({ price: 500, includes })).body.code, "INVALID_PLUS");
  assert.equal((await save({ price: 750, includes: " " })).body.code, "INVALID_PLUS");
  assert.equal((await save({ price: 750, includes, includesHi })).status, 200);
  const browserLogin = await api("login", { browser: true, body: { handle: "test-worker", password } });
  const browserCookie = browserLogin.headers["set-cookie"][0].split(";")[0];
  const browserSave = await api("profile", { browser: true, headers: { Cookie: browserCookie }, body: { ...base, bio: "Updated from website" } });
  assert.equal(browserSave.status, 200);
  assert.equal(browserSave.body.state.profile.plus.includes, includes);

  const tomorrow = new Date(Date.now() + 86_400_000 + 19_800_000).toISOString().slice(0, 10);
  const appointment = tomorrow + "T11:00";
  const slots = (token) => api("slots?" + new URLSearchParams({ proId: worker.id, pinCode: "110017", slot: appointment }), { token });
  assert.deepEqual((await slots(customer.token)).body.slots, [appointment]);
  assert.equal((await api("slots?proId=" + worker.id)).status, 401);
  const offer = {
    ...booking(worker.id, appointment), tier: "plus", expectedPrice: 750, expectedUnit: "hourly",
    expectedIncludes: includes, expectedIncludesHi: includesHi,
    customerName: "Test customer", address: "Flat 2, Test Street", landmark: "Test school", notes: "Ring the bell",
  };
  assert.equal((await api("request", { token: customer.token, body: { ...offer, expectedPrice: 740 } })).body.code, "OFFER_CHANGED");
  assert.equal((await api("request", { token: customer.token, body: { ...offer, expectedIncludesHi: "पुराना विवरण" } })).body.code, "OFFER_CHANGED");
  const request = await api("request", { token: customer.token, body: offer });
  assert.equal(request.status, 200, request.body.error);
  const jobId = request.body.jobId;
  function job(response) { return response.body.state.requests.find((item) => item.id === jobId); }
  const workerUpdates = (await api("state", { token: worker.token })).body.state.bookingUpdates;
  assert.deepEqual(workerUpdates.map(({ job, role, label }) => ({ job, role, label })), [
    { job: jobId, role: "pro", label: "New booking request" },
  ]);
  assert.deepEqual(request.body.state.bookingUpdates, []);
  assert.deepEqual((await api("state", { token: outsider.token })).body.state.bookingUpdates, []);
  assert.equal(job(request).details.address, offer.address);
  assert.equal(job(request).tier, "plus");
  assert.equal(job(request).minimumQuantity, 2);
  assert.equal(job(request).requestFingerprint, undefined);
  const estimate = await api("estimate", { token: worker.token, body: {
    operationId: randomUUID(), job: jobId, role: "pro", minutes: 90,
  } });
  assert.equal(estimate.status, 200);
  assert.equal(job(estimate).details, undefined);
  assert.equal(job(estimate).minimumQuantity, 2);
  assert.equal(job(await api("state", { token: outsider.token })), undefined);
  assert.equal(job(await api("state", { browser: true, headers: { Cookie: browserCookie } })).details, undefined);
  const browserMessage = await api("message", { browser: true, headers: { Cookie: browserCookie },
    body: { job: jobId, role: "pro", message: "Pending booking message" } });
  assert.equal(browserMessage.status, 200);
  assert.equal(browserMessage.body.job.details, undefined);
  assert.equal(browserMessage.body.job.requestFingerprint, undefined);
  const altered = await api("request", { token: customer.token, body: { ...offer, operationId: randomUUID(), address: "Different Test Street" } });
  assert.equal(altered.body.code, "INTENT_REUSED");

  assert.equal((await save({ price: 950, includes: "Updated extra work" })).status, 200);
  const staleOffer = await api("request", { token: customer.token, body: {
    ...offer, intent: randomUUID(), operationId: randomUUID(),
  } });
  assert.equal(staleOffer.body.code, "OFFER_CHANGED");
  assert.equal(staleOffer.body.state.requests.length, 1);
  const replay = await api("request", { token: customer.token, body: { ...offer, operationId: randomUUID() } });
  assert.equal(replay.body.jobId, jobId);
  assert.equal(job(replay).price, 750);
  assert.equal(job(replay).includes, includes);

  for (const [change, expected] of [["accept", "accepted"], ["depart", "en_route"], ["arrive", "arrived"],
    ["start", "in_progress"], ["complete", "completed"]]) {
    const transition = await api("transition", { token: worker.token, body: {
      operationId: randomUUID(), job: jobId, role: "pro", change,
    } });
    assert.equal(transition.status, 200, transition.body.error);
    assert.equal(job(transition).status, expected);
    assert.equal(job(transition).details.address, offer.address);
    assert.equal(job(transition).includes, includes);
  }
  const recycled = await api("request", { token: customer.token, body: { ...offer, operationId: randomUUID(), proId: outsider.id } });
  assert.equal(recycled.body.code, "INTENT_REUSED");
  await stop();
  await start();
  const restored = await api("state", { token: customer.token });
  const stored = job(restored);
  assert.equal(stored.status, "completed");
  assert.equal(stored.price, 750);
  assert.equal(stored.includesHi, includesHi);
  assert.equal(stored.details.landmark, offer.landmark);
  assert.deepEqual(restored.body.state.bookingUpdates.map(({ job, role, label }) => ({ job, role, label })), [
    { job: jobId, role: "customer", label: "Job completed" },
    { job: jobId, role: "customer", label: "Booking accepted" },
  ]);
});

test("workers can manage availability without affecting another account or exposing blocked time", async (t) => {
  const { api, register, registerWorker } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("availability-customer");
  const date = new Date(Date.now() + 86_400_000 + 19_800_000).toISOString().slice(0, 10);
  const start = date + "T11:00";
  const end = date + "T12:00";
  const query = "slots?" + new URLSearchParams({ proId: worker.id, pinCode: "110017", timing: "now", slot: start });
  const schedule = async () => (await api(query, { token: customer.token })).body;
  assert.deepEqual(await schedule(), { slots: [start], immediate: false });
  const hours = { days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "17:00", buffer: 15 };
  assert.equal((await api("hours", { token: customer.token, body: hours })).status, 400);
  assert.deepEqual((await api("hours", { token: worker.token, body: hours })).body.state.profile.hours, hours);
  const block = await api("block", { token: worker.token, body: { start, end } });
  assert.equal(block.status, 200, block.body.error);
  assert.equal((await api("immediate", { token: worker.token, body: { enabled: true } })).status, 200);
  assert.deepEqual(await schedule(), { slots: [], immediate: true });
  const publicProfile = (await api("state", { token: customer.token })).body.state.profiles.find((person) => person.id === worker.id);
  assert.equal(publicProfile.blocks, undefined);
  assert.equal((await api("published", { token: worker.token, body: { enabled: false } })).status, 200);
  assert.deepEqual(await schedule(), { slots: [], immediate: false });
  assert.equal((await api("published", { token: worker.token, body: { enabled: true } })).status, 200);
  assert.equal((await api("remove-block", { token: worker.token, body: { id: block.body.state.profile.blocks[0].id } })).status, 200);
  assert.deepEqual(await schedule(), { slots: [start], immediate: true });
});

test("exact service PIN codes control discovery, slots, requests and worker acceptance", async (t) => {
  const { api, register, registerWorker, inDatabase } = await setup(t);
  const worker = await registerWorker();
  const customer = await register("location-customer");
  const coverage = (pinCode, token = customer.token) => api("coverage?" + new URLSearchParams({ pinCode }), { token });
  assert.deepEqual((await coverage("110017", "")).body.ids, [worker.id]);
  assert.equal((await api("locations?q=d")).body.code, "INVALID_LOCATION");
  assert.equal((await api("coverage?location=Saket")).body.code, "INVALID_PIN_CODE");
  assert.equal((await coverage("11007")).body.code, "INVALID_PIN_CODE");
  assert.equal((await coverage("012345")).body.code, "INVALID_PIN_CODE");
  assert.deepEqual((await coverage("110017", worker.token)).body.ids, []);
  inDatabase((db) => {
    const store = JSON.parse(db.prepare("SELECT body FROM marketplace WHERE id=1").get().body);
    delete store.profiles[0].pinCodes;
    db.prepare("UPDATE marketplace SET body=? WHERE id=1").run(JSON.stringify(store));
  });
  assert.deepEqual((await coverage("110017")).body.ids, []);
  const profile = {
    name: "Test worker", bio: "Local test profile", service: "plumbing", unit: "visit",
    years: 2, price: 500, pinCodes: ["110075", "110078"],
  };
  const invalid = await api("profile", { token: worker.token, body: { ...profile, pinCodes: ["110075", 110078] } });
  assert.equal(invalid.body.code, "INVALID_PIN_CODE");
  assert.equal((await api("profile", { token: worker.token, body: profile })).status, 200);
  assert.deepEqual((await coverage("110075")).body.ids, [worker.id]);
  assert.deepEqual((await coverage("110078")).body.ids, [worker.id]);
  assert.deepEqual((await coverage("110077")).body.ids, []);
  const appointment = new Date(Date.now() + 86_400_000 + 19_800_000).toISOString().slice(0, 10) + "T11:00";
  const slots = (pinCode) => api("slots?" + new URLSearchParams({ proId: worker.id, pinCode, slot: appointment }), { token: customer.token });
  const availability = (pinCode) => api("availability?" + new URLSearchParams({ pinCode, day: appointment.slice(0, 10) }));
  assert.deepEqual((await slots("110078")).body.slots, [appointment]);
  assert.deepEqual((await slots("110077")).body.slots, []);
  assert.ok((await availability("110078")).body.options[worker.id].includes(appointment));
  assert.deepEqual((await availability("110077")).body.options, {});
  const request = (pinCode) => api("request", { token: customer.token, body: { ...booking(worker.id, appointment), area: "Dwarka", pinCode } });
  assert.equal((await request(undefined)).body.code, "INVALID_PIN_CODE");
  const outside = await request("110077");
  assert.equal(outside.body.code, "LOCATION_UNAVAILABLE");
  assert.equal(outside.body.state.requests.length, 0);
  const inside = await request("110078");
  assert.equal(inside.status, 200, inside.body.error);
  assert.equal(inside.body.state.requests[0].pinCode, "110078");
  await api("profile", { token: worker.token, body: { ...profile, pinCodes: ["110075"] } });
  const accept = (job) => api("transition", { token: worker.token, body: { job, role: "pro", change: "accept", operationId: randomUUID() } });
  assert.equal((await accept(inside.body.jobId)).status, 409);
  await api("published", { token: worker.token, body: { enabled: false } });
  assert.deepEqual((await coverage("110075")).body.ids, []);
});
