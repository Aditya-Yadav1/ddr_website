"use strict";

function readTicket(input, failure) {
  const { id, category, job = "", message } = input;
  if (typeof id !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(id)
    || !["booking", "payment", "account", "other"].includes(category) || typeof job !== "string"
    || typeof message !== "string" || message.trim().length < 10 || message.length > 1000) {
    throw failure(400, "Choose a support topic and describe the issue in 10 to 1,000 characters.");
  }
  return { id, job, category, message: message.trim(), created: Date.now(), status: "open", response: "" };
}

function matchesTicket(existing, ticket) {
  return existing.job === ticket.job && existing.category === ticket.category && existing.message === ticket.message;
}

module.exports = { readTicket, matchesTicket };
