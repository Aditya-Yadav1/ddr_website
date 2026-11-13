"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const createPlaceSearch = require("../place-search.js");

test("place suggestions combine worker coverage with real locations and cache concurrent lookups", async () => {
  let calls = 0;
  const search = createPlaceSearch({ fetch: async (url) => {
    calls++;
    assert.equal(url.hostname, "photon.komoot.io");
    assert.equal(url.searchParams.get("countrycode"), "in");
    assert.equal(url.searchParams.get("limit"), "6");
    return { ok: true, json: async () => ({ features: [
      { properties: { name: "Dwarka", city: "Delhi", state: "Delhi", countrycode: "IN", osm_id: 1 } },
      { properties: { name: "Dwarka", city: "Devbhumi Dwarka", state: "Gujarat", countrycode: "IN", osm_id: 2 } },
      { properties: { name: "Dwarf town", countrycode: "DE" } },
    ] }) };
  } });
  const [first, second] = await Promise.all([search("dw", ["Dwarka"]), search("DW", ["Dwarka"])]);
  assert.equal(calls, 1);
  assert.equal(first.suggestions[0].source, "coverage");
  assert.equal(first.suggestions[0].value, "Dwarka");
  assert.equal(first.suggestions.length, 2);
  assert.equal(first.suggestions[1].value, "Dwarka, Devbhumi Dwarka, Gujarat");
  assert.deepEqual(second.suggestions, first.suggestions);
  assert.equal(first.unavailable, false);
  await search("dw", ["Dwarka", "Dwarka Sector 10"]);
  assert.equal(calls, 1);
});

test("unavailable geocoding keeps Hindi and worker coverage suggestions usable", async () => {
  const search = createPlaceSearch({ fetch: async () => { throw new Error("No connection"); } });
  const result = await search("साक", ["Saket", "Dwarka"]);
  assert.equal(result.unavailable, true);
  assert.deepEqual(result.suggestions.map((place) => place.value), ["Saket"]);
  assert.deepEqual((await search("karol", ["Karol Bagh, Delhi"])).suggestions.map((place) => place.value), ["Karol Bagh, Delhi"]);
});

test("malformed geocoding data does not remove local location suggestions", async () => {
  const search = createPlaceSearch({ fetch: async () => ({ ok: true, json: async () => ({ features: [
    null, { properties: { name: " " } }, { properties: { name: "x".repeat(130) } },
  ] }) }) });
  const result = await search("ro", ["Rohini"]);
  assert.deepEqual(result.suggestions.map((place) => place.value), ["Rohini"]);
});
