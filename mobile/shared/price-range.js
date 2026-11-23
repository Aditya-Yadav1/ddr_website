"use strict";

// Older profiles have only a starting rate. Supply an indicative upper estimate.
function upperEstimate(offer) {
  return offer.maxPrice ?? Math.ceil(offer.price * 1.5);
}

module.exports = { upperEstimate };
