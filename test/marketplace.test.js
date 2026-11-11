"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const createMarketplace = require("../marketplace.js");

const worker = {
  id: "test-worker", name: "Test worker", service: "plumbing", unit: "visit",
  price: 500, areas: ["Saket"], published: true, immediate: true,
  hours: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "18:00", buffer: 30 },
};

function setup(t, blocks = []) {
  let time = Date.parse("2026-11-12T08:00:00+05:30");
  t.mock.method(Date, "now", () => time);
  let data = JSON.stringify({
    connected: true, account: { id: "test-customer" }, profile: { ...worker, blocks }, profiles: [], requests: [],
  });
  const market = createMarketplace({
    getItem: () => data,
    setItem: (_key, value) => { data = value; },
  });
  const move = (job, action) => market.transition(job.id, action, "pro", worker.id);
  function book(appointment) {
    const { job, error } = market.request({
      intent: market.id(), proId: worker.id, area: "Saket", scope: "Fix a leaking tap",
      appointment, contact: "In-app message",
    });
    assert.ok(job, error);
    assert.equal(move(job, "accept").job.status, "accepted");
    return job;
  }
  function at(value) {
    time = market.appointmentTime(value);
  }
  return { market, book, move, at };
}

test("a worker cannot depart for a later booking during another job or its travel buffer", (t) => {
  const { market, book, move, at } = setup(t);
  const first = book("2026-11-12T09:00");
  const second = book("2026-11-12T11:00");
  at("2026-11-12T09:00");
  assert.equal(move(first, "arrive").job.status, "arrived");
  assert.equal(move(first, "start").job.status, "in_progress");
  at("2026-11-12T09:45");
  assert.match(move(second, "depart").error, /overlaps a booked job or its travel buffer/);
  assert.equal(market.read().requests.find((job) => job.id === second.id).status, "accepted");
  assert.equal(move(first, "complete").job.status, "completed");
  at("2026-11-12T10:14");
  assert.match(move(second, "depart").error, /travel buffer/);
  at("2026-11-12T10:15");
  assert.equal(move(second, "depart").job.status, "en_route");
});

test("marking direct arrival also checks blocked time before the appointment", (t) => {
  const { book, move, at } = setup(t, [{ start: "2026-11-12T09:00", end: "2026-11-12T10:00" }]);
  const job = book("2026-11-12T11:00");
  at("2026-11-12T09:30");
  assert.match(move(job, "arrive").error, /overlaps a block/);
  at("2026-11-12T10:00");
  assert.equal(move(job, "arrive").job.status, "arrived");
});

test("a late departure reserves the full estimated duration from the time it begins", (t) => {
  const { market, book, move, at } = setup(t);
  const job = book("2026-11-12T09:00");
  at("2026-11-12T10:15");
  assert.equal(move(job, "depart").job.status, "en_route");
  assert.equal(market.available(worker, "Saket", "2026-11-12T11:30"), false);
  assert.equal(market.available(worker, "Saket", "2026-11-12T11:45"), true);
});

test("an accepted flexible booking still reserves time on departure after availability is turned off", (t) => {
  const { market, book, move, at } = setup(t);
  const flexible = book("");
  const scheduled = book("2026-11-12T10:00");
  const state = market.read();
  market.save({ ...state, profile: { ...state.profile, immediate: false, hours: { ...state.profile.hours, days: [] } } });
  at("2026-11-12T08:30");
  const { job } = move(flexible, "depart");
  assert.equal(job.status, "en_route");
  assert.equal(job.reservedAt, Date.now());
  at("2026-11-12T10:00");
  assert.match(move(scheduled, "arrive").error, /travel buffer/);
});
