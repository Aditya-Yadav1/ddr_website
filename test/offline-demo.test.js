"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { createDemoApi } = require("../mobile/demo/engine");

test("the offline demo persists a two-account visit and never needs a network request", async (t) => {
  t.mock.method(globalThis, "fetch", () => assert.fail("Offline demo tried to make a network request"));
  let stored = null;
  const disk = { load: async () => stored, save: async (value) => { stored = value; } };
  let api = createDemoApi(disk);
  const directory = await api("discover");
  assert.equal(directory.state.profiles.length, 4);
  assert.deepEqual(directory.state.requests, []);
  assert.equal((await api("coverage?pinCode=110017")).ids.includes("worker-demo"), true);
  assert.equal((await api("locations?q=sa")).suggestions[0].name, "Saket");

  const customer = await api("demo-sign-in", undefined, { account: "customer-demo" });
  const worker = await api("demo-sign-in", undefined, { account: "worker-demo" });
  const id = customer.state.requests[0].id;
  assert.equal(worker.state.requests[0].id, id);
  assert.equal(worker.state.requests[0].details, undefined);

  let operation = 0;
  const doAction = (session, role, action, fields = {}) => api(action, session.session.token,
    { job: id, role, ...fields, operationId: "offline-action-" + operation++ });
  const work = (action, fields) => doAction(worker, "pro", action, fields);
  const book = (action, fields) => doAction(customer, "customer", action, fields);

  await assert.rejects(() => doAction(worker, "customer", "transition", { change: "cancel" }), { status: 404 });
  await work("transition", { change: "accept" });
  assert.equal((await api("state", worker.session.token)).state.requests[0].details.customerName, "Demo Customer");
  await work("message", { message: "I can inspect the demo tap." });
  await work("transition", { change: "arrive" });
  await assert.rejects(() => work("transition", { change: "start" }), { code: "ARRIVAL_CONFIRMATION_REQUIRED" });
  await book("arrival-confirm", { confirmed: true });
  await work("quote-send", {
    version: 0, items: [{ label: "Demo washer replacement", amountPaise: 30000 }], exclusions: "",
    minutes: 60, materials: "worker", creditPaise: 0,
  });
  await book("quote-respond", { version: 1, decision: "accepted" });
  await work("transition", { change: "start" });
  const completed = await work("transition", { change: "complete" });
  const total = completed.state.requests[0].bill.totalPaise;
  const review = () => api("review", customer.session.token, { job: id, rating: 4, comment: "Fixed the demo tap." });
  await assert.rejects(review, { code: "PAYMENT_REQUIRED" });
  const report = await book("payment-report", { amountPaise: total, method: "cash", version: 0 });
  await assert.rejects(review, { code: "PAYMENT_REQUIRED" });
  await work("payment-confirm", { entry: report.state.requests[0].payments[0].id, decision: "confirmed" });
  await review();
  const ticket = { id: randomUUID(), job: id, category: "payment", message: "A support request in the offline demo." };
  await api("support-create", customer.session.token, ticket);
  await api("support-create", customer.session.token, ticket);
  await book("safety-report", { message: "A fictional concern for testing." });

  api = createDemoApi(disk);
  const restored = await api("state", customer.session.token);
  const visit = restored.state.requests[0];
  assert.equal(visit.status, "completed");
  assert.equal(visit.payments[0].status, "confirmed");
  assert.equal(visit.messages[0].message, "I can inspect the demo tap.");
  assert.equal(restored.state.safetyReports.length, 1);
  assert.deepEqual(restored.state.reviewed, [id]);
  const details = await api("worker-details?id=worker-demo&pinCode=110017");
  assert.equal(details.reviews[0].comment, "Fixed the demo tap.");
  assert.deepEqual(restored.state.supportTickets.map(({ id }) => id), [ticket.id]);
  const workerState = (await api("state", worker.session.token)).state;
  assert.deepEqual(workerState.safetyReports, []);
  assert.deepEqual(workerState.supportTickets, []);
  assert.ok(restored.revision > customer.revision);
});

test("offline appointment search and duplicate booking retries work for a new visit", async () => {
  let raw = null;
  const api = createDemoApi({ load: async () => raw, save: async (next) => { raw = next; } });
  const { session, state } = await api("demo-sign-in", undefined, { account: "customer-demo" });
  const day = state.requests[0].appointment.slice(0, 10);
  const params = new URLSearchParams({ pinCode: "110017", day, scope: "Clean a kitchen" });
  const available = await api("availability?" + params, session.token);
  const appointment = available.options["cleaning-demo"][0];
  const payload = {
    intent: "second-demo-visit", operationId: "second-operation", safetyVersion: 1,
    proId: "cleaning-demo", appointment, area: "Saket", pinCode: "110017", scope: "Clean a kitchen", tier: "everyday",
    expectedUnit: "hourly", expectedPrice: 349, expectedIncludes: "", expectedIncludesHi: "",
    contact: "In-app message", customerName: "Demo Customer", address: "12 Sample Lane", hours: 2,
    brief: { problem: "Clean the fictional kitchen", materials: "none", readiness: "unknown" },
  };
  const added = await api("request", session.token, payload);
  const repeated = await api("request", session.token, payload);
  assert.equal(repeated.jobId, added.jobId);
  assert.equal(repeated.state.requests.length, 2);
  assert.equal(repeated.state.requests[0].safetyVersion, 1);
  assert.equal((await api("state", "cleaning-demo")).state.requests[0].id, added.jobId);
});
