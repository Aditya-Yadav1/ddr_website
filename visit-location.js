"use strict";

const { randomUUID } = require("node:crypto");
const freshnessMs = 45_000;

module.exports = function createVisitLocations(failure) {
  // Keep only the latest fix in memory. No coordinates enter the booking database.
  const shares = new Map();
  const expire = setInterval(() => {
    const now = Date.now();
    for (const [key, share] of shares) if (share.expires <= now) shares.delete(key);
  }, 5000);
  expire.unref();

  function current(key) {
    const share = shares.get(key);
    return share?.expires > Date.now() ? share : undefined;
  }

  return {
    access(job, owner, session, input) {
      if (!job || ![job.customerId, job.proId].includes(owner)) throw failure(404, "Booking unavailable.");
      const workerKey = job.id + ":worker";
      const customerKey = job.id + ":customer";
      if (job.status !== "en_route") {
        shares.delete(workerKey);
        shares.delete(customerKey);
        if (input && input.action !== "stop") throw failure(409, "Location sharing is available while the worker is on the way.", "TRIP_CLOSED");
        return {};
      }
      const key = owner === job.proId ? workerKey : customerKey;
      const trip = job.journeyStartedAt;
      const currentTrip = (key) => {
        const share = current(key);
        return share && share.trip === trip ? share : undefined;
      };
      if (!input) return { worker: currentTrip(workerKey)?.fix, customer: currentTrip(customerKey)?.fix };
      const now = Date.now();
      if (input.action === "start") {
        const id = randomUUID();
        shares.set(key, { id, session, trip, expires: now + freshnessMs });
        return { id };
      }
      const share = currentTrip(key);
      const matches = share && share.id === input.id && share.session === session;
      if (input.action === "stop") {
        if (matches) shares.delete(key);
        return {};
      }
      if (input.action !== "update") throw failure(400, "Choose a location-sharing action.");
      if (!matches) throw failure(409, "Location sharing ended. Start sharing again.", "SHARING_ENDED");
      const { latitude, longitude, accuracy } = input;
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
        !Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 100000) {
        throw failure(400, "The device did not provide a valid location fix.");
      }
      share.fix = { latitude, longitude, accuracy, receivedAt: now };
      share.expires = now + freshnessMs;
      return {};
    },
    revoke(session) {
      for (const [key, share] of shares) if (share.session === session) shares.delete(key);
    },
  };
};
