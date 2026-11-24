"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const createMarketplace = require("../marketplace");
const pilot = require("../mobile/shared/pilot-pricing");
const agreements = require("../mobile/shared/booking-agreements");

function setup(t, scope, tier = "everyday") {
  const rate = pilot.rateFor("plumbing", scope, pilot.pin);
  const offer = pilot.offerFor(rate, tier);
  const worker = { id: "test-worker", name: "Test worker", service: "plumbing", price: 449, unit: "visit",
    pinCodes: [pilot.pin], pilotOffers: [rate.id], published: true,
    hours: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "18:00", buffer: 0 } };
  t.mock.method(Date, "now", () => Date.parse("2026-11-24T09:00:00+05:30"));
  let data = JSON.stringify({ connected: true, account: { id: "test-customer" }, profiles: [worker], requests: [] });
  const market = createMarketplace({ getItem: () => data, setItem: (_, value) => { data = value; } });
  const input = {
    intent: "pilot-request", proId: worker.id, scope, area: "Dwarka", pinCode: pilot.pin,
    appointment: "2026-11-24T10:00", contact: "In-app message", tier, expectedOffer: offer.id,
    expectedPrice: offer.price, expectedMaxPrice: offer.price, expectedUnit: offer.unit,
    expectedIncludes: offer.includes, expectedIncludesHi: offer.includesHi,
    brief: { problem: scope, materials: offer.repairPrice ? "inspect" : "customer", readiness: "ready" },
    details: { address: "A fictional address" }, hours: 2,
  };
  function move(id, action) { return market.transition(id, action, "pro", worker.id); }
  function change(action, id, input) {
    const state = market.current();
    const job = state.requests.find((entry) => entry.id === id);
    return agreements.change(action, market, state, job, input, (status, message) => Object.assign(new Error(message), { status }));
  }
  return { market, input, move, change };
}

test("fixed pricing requires the reviewed task offer and supports a consented Plus downgrade", (t) => {
  const { market, input, move, change } = setup(t, "Replace a tap", "plus");
  assert.equal(market.request({ ...input, expectedOffer: "older-version" }).code, "OFFER_CHANGED");
  assert.equal(market.request({ ...input, expectedPrice: 1 }).code, "OFFER_CHANGED");
  const { job } = market.request(input);
  assert.equal(job.basePaise, 29_900);
  assert.equal(job.pilot.quantity, 2);
  move(job.id, "accept");
  move(job.id, "arrive");
  const quote = change("quote-send", job.id, { role: "pro", version: 0, items: [], exclusions: "",
    materials: "customer", minutes: 60, pilotAction: "reduce" }).job.quotes[0];
  assert.equal(quote.totalPaise, 19_900);
  assert.equal(move(job.id, "start").code, "QUOTE_REQUIRED");
  change("quote-respond", job.id, { role: "customer", version: 1, decision: "accepted" });
  assert.equal(move(job.id, "start").job.status, "in_progress");
  const { job: complete } = move(job.id, "complete");
  assert.equal(complete.bill.quantity, 1);
  assert.equal(pilot.earnings(complete, 19_900).fee, 2388);
  assert.equal(pilot.earnings(complete, 0).fee, 0);
});

test("the inspection credit and repair labour are calculated server-side", (t) => {
  const { market, input, move, change } = setup(t, "Inspect a water leak");
  const { job } = market.request(input);
  move(job.id, "accept");
  move(job.id, "arrive");
  assert.equal(move(job.id, "start").code, "QUOTE_REQUIRED");
  const quote = change("quote-send", job.id, { role: "pro", version: 0, items: [{ label: "Washer", amountPaise: 1000 }],
    exclusions: "", materials: "worker", minutes: 60, creditPaise: 0 }).job.quotes[0];
  assert.equal(quote.creditPaise, 14_900);
  assert.equal(quote.labourPaise, 39_900);
  assert.equal(quote.totalPaise, 40_900);
  change("quote-respond", job.id, { role: "customer", version: 1, decision: "accepted" });
  move(job.id, "start");
  const { job: complete } = move(job.id, "complete");
  assert.equal(pilot.earnings(complete, 40_900).fee, 4788);
});
