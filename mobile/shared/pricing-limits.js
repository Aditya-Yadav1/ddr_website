"use strict";

const { upperEstimate } = require("./price-range");

// Initial ceilings for routine jobs. They are launch settings, not market averages.
const defaults = {
  plumbing: { visit: [500, 3500], hourly: [1000, 6000], fixed: [3000, 6000] },
  electrical: { visit: [500, 3500], hourly: [1000, 6000], fixed: [3000, 6000] },
  cleaning: { visit: [600, 3500], hourly: [750, 5000], fixed: [5500, 8000] },
  painting: { visit: [750, 4000], hourly: [1000, 6500], fixed: [6000, 10000] },
};

const initialLimits = Object.entries(defaults).flatMap(([service, units]) =>
  Object.entries(units).map(([unit, [maximum, quoteMaximum]]) => ({ service, unit, minimum: 1, maximum, quoteMaximum })));

function ratesWithinLimit(profile, limit) {
  return !limit || [profile, profile.plus].every((offer) =>
    !offer || (offer.price >= limit.minimum && upperEstimate(offer) <= limit.maximum));
}

module.exports = { initialLimits, ratesWithinLimit };
