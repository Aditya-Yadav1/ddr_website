"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const createMarketplace = require("../marketplace");
const { services, tasks } = require("../mobile/shared/service-catalog");

test("catalog preserves historical task IDs and shares server task order", () => {
  const market = createMarketplace({ getItem: () => null, setItem: () => {} });
  assert.equal(services.length, 4);
  assert.equal(tasks.length, 32);
  for (const service of services) {
    assert.deepEqual(service.tasks, tasks.filter((task) => task.service === service.id).map((task) => task.task));
    for (const task of tasks.filter((task) => task.service === service.id)) {
      assert.equal(market.taskId(service.id, task.task), task.id);
      assert.ok(task.taskHi);
    }
  }
  assert.deepEqual(tasks.filter((task) => task.legacy).map((task) => task.id),
    services.flatMap((service) => [0, 1, 2, 3].map((index) => service.id + "-" + index)));
});

test("new tasks require an explicit professional specialization", () => {
  const market = createMarketplace({ getItem: () => null, setItem: () => {} });
  const profile = { service: "electrical", specializations: [], published: true, pinCodes: ["110017"] };
  assert.equal(market.servesTask(profile, "Check wiring"), true);
  assert.equal(market.servesTask(profile, "Repair a ceiling fan"), false);
  profile.specializations = ["electrical-4"];
  assert.equal(market.servesTask(profile, "Repair a ceiling fan"), true);
  assert.equal(market.servesTask(profile, "Check wiring"), false);
});
