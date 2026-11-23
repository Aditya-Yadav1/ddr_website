"use strict";

const createMarketplace = require("../shared/marketplace");
const agreements = require("../shared/booking-agreements");
const { readTicket, matchesTicket } = require("../shared/support-tickets");
const validateProfile = require("../shared/worker-profile");
const workers = require("../shared/demo-workers");
const { isPinCode, demoPinCode, demoPinCodes } = require("../shared/pin-codes");
const { readReview } = require("../shared/worker-reviews");

const customer = "customer-demo";
const accounts = [customer, ...workers.map(([id]) => id)];
const demoAddress = { label: "Home", area: "Saket", pinCode: "110017", customerName: "Demo Customer", address: "12 Sample Lane, Saket", landmark: "Demo gate" };
const failure = (status, message, code = "DEMO_ERROR") => Object.assign(new Error(message), { status, code });
const text = (value, length) => typeof value === "string" ? value.trim().slice(0, length) : "";

function newDemo() {
  const data = {
    revision: 1, operations: {}, requests: [], savedWorkers: {}, reports: {}, verification: {}, reviews: {},
    addresses: { [customer]: [demoAddress] },
    profiles: workers.map(([id, profile]) => ({ ...profile, id, published: true, sample: true, pinCodes: demoPinCodes, languages: ["Hindi", "English"] })),
  };
  const market = marketplace(data, account(customer));
  const day = market.localAppointment(Date.now() + 86_400_000).slice(0, 10);
  const result = market.request({
    intent: "starter-demo-visit", proId: "worker-demo", scope: "Fix a leaking tap",
    area: "Saket", pinCode: demoAddress.pinCode, appointment: day + "T11:00", contact: "In-app message", hours: 2,
    details: { ...demoAddress, notes: "Fictional visit for the offline demo." },
    brief: { problem: "The kitchen tap drips when closed.", materials: "inspect", readiness: "unknown" },
  });
  if (result.job) result.job.safetyVersion = 1;
  if (result.job) data.requests[0].safetyVersion = 1;
  return data;
}

function account(id) {
  return accounts.includes(id) ? { id, handle: id } : null;
}

function marketplace(data, owner) {
  return createMarketplace({
    getItem: () => JSON.stringify({
      connected: true, account: owner, requests: data.requests,
      profiles: data.profiles.filter((profile) => profile.id !== owner?.id),
      profile: data.profiles.find((profile) => profile.id === owner?.id) || null,
    }),
    setItem: (_key, value) => {
      const state = JSON.parse(value);
      data.requests = state.requests;
      data.profiles = state.profile ? [...state.profiles, state.profile] : state.profiles;
    },
  });
}

function visitDetails(input) {
  const details = { customerName: text(input.customerName, 60), address: text(input.address, 220),
    landmark: text(input.landmark, 100), notes: text(input.notes, 280) };
  if (!details.customerName || details.address.length < 8) throw failure(400, "Enter a fictional name and visit address.");
  return details;
}

function bookingAction(action, market, state, data, input, owner) {
  const operation = text(input.operationId, 72);
  if (!/^[a-z0-9-]{8,72}$/i.test(operation)) throw failure(400, "Missing booking operation ID.");
  const key = owner.id + ":" + operation;
  const fingerprint = JSON.stringify([action, input]);
  const previous = data.operations[key];
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw failure(409, "This action was already used with different details.", "OPERATION_ID_REUSED");
    return previous.job;
  }
  let result;
  if (action === "request") {
    const { proId, appointment, brief: rawBrief, hours, intent, tier, expectedUnit, timing } = input;
    const brief = agreements.readBrief(rawBrief);
    if (!isPinCode(input.pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    if (proId === owner.id || !brief || !intent || !["everyday", "plus"].includes(tier) || !Number.isFinite(market.appointmentTime(appointment))
      || timing || !Number.isInteger(hours) || hours < 2 || hours > 8 || (brief.materials === "inspect" && expectedUnit !== "visit")) {
      throw failure(400, "Choose a different worker and complete the visit details.");
    }
    result = market.request({ ...input, area: text(input.area, 120) || input.pinCode, brief, details: visitDetails(input), requestFingerprint: fingerprint });
    if (result.job && !result.job.safetyVersion) {
      const saved = market.current();
      saved.requests.find((job) => job.id === result.job.id).safetyVersion = 1;
      market.save(saved);
    }
  } else {
    const job = state.requests.find((item) => item.id === input.job);
    const worker = input.role === "pro";
    if (!job || (worker ? job.proId !== owner.id : input.role !== "customer" || job.customerId !== owner.id)) {
      throw failure(404, "Request unavailable.");
    }
    if (agreements.commands.has(action)) {
      result = agreements.change(action, market, state, job, input, failure);
    } else if (action === "transition") {
      if (!worker && input.change !== "cancel") throw failure(403, "Switch to the worker account for this action.");
      if (["start", "diagnostic-only"].includes(input.change) && job.safetyVersion && !job.arrivalConfirmedAt) {
        throw failure(409, "The demo customer must confirm arrival first.", "ARRIVAL_CONFIRMATION_REQUIRED");
      }
      result = market.transition(job.id, input.change, input.role, owner.id, text(input.reason, 180));
    } else if (action === "arrival-confirm") {
      if (worker || job.status !== "arrived" || input.confirmed !== true) throw failure(409, "Confirm arrival from the demo customer account.");
      job.arrivalConfirmedAt = Date.now();
      market.save(state);
      result = { job };
    } else if (action === "estimate" && worker) {
      result = market.updateDuration(job.id, owner.id, input.minutes);
    } else if (action === "message") {
      const message = text(input.message, 280);
      if (!message) throw failure(400, "Enter a message.");
      result = market.contact(job.id, input.role, owner.id, message);
    } else if (action === "safety-report") {
      const message = text(input.message, 1000);
      if (message.length < 10) throw failure(400, "Describe the concern in at least 10 characters.");
      const reports = data.reports[owner.id] ||= [];
      if (reports.some((item) => item.job === job.id && item.status === "open")) throw failure(409, "A demo concern is already recorded.");
      reports.unshift({ id: market.id(), job: job.id, message, created: Date.now(), status: "open", resolution: "" });
      result = { job };
    } else {
      throw failure(404, "This action is unavailable in the offline demo.");
    }
  }
  if (result.error) throw failure(409, result.error, result.code || "BOOKING_CHANGED");
  data.operations[key] = { fingerprint, job: result.job.id };
  return result.job.id;
}

const bookingCommands = new Set(["request", "transition", "arrival-confirm", "estimate", "message", "safety-report", ...agreements.commands.keys()]);

function profileAction(action, market, state, data, input, owner) {
  const { profile } = state;
  const change = (values) => {
    if (!profile) throw failure(400, "Create a demo worker profile first.");
    market.save({ ...state, profile: { ...profile, ...values } });
  };
  if (action === "profile") {
    market.save({ ...state, profile: validateProfile(market, input, profile, owner, true, failure) });
  } else if (action === "hours") {
    const { days, start, end, buffer } = input;
    if (!Array.isArray(days) || !days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      || ![start, end].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || start >= end
      || !Number.isInteger(buffer) || buffer < 0 || buffer > 180) throw failure(400, "Check the available hours.");
    change({ hours: { days, start, end, buffer } });
  } else if (["published", "immediate"].includes(action)) {
    if (typeof input.enabled !== "boolean") throw failure(400, "Choose an availability option.");
    change({ [action]: input.enabled });
  } else if (action === "block") {
    const result = market.blockSchedule(input.start, input.end);
    if (result.error) throw failure(409, result.error, "BOOKING_CHANGED");
  } else if (action === "remove-block") {
    change({ blocks: profile?.blocks?.filter((item) => item.id !== input.id) || [] });
  } else if (action === "save-address" || action === "remove-address") {
    const label = text(input.label, 40);
    if (!label) throw failure(400, "Choose a label for the address.");
    const addresses = (data.addresses[owner.id] || []).filter((item) => item.label !== label);
    if (action === "save-address") {
      if (!isPinCode(input.pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
      addresses.push({ label, area: text(input.area, 120), pinCode: input.pinCode, ...visitDetails(input) });
    }
    data.addresses[owner.id] = addresses;
  } else if (["block-worker", "unblock-worker", "report-worker"].includes(action)) {
    data.blockedWorkers ??= {};
    const blocked = data.blockedWorkers[owner.id] ?? [];
    const person = state.profiles.find((entry) => entry.id === input.worker && entry.published);
    if (action === "unblock-worker") {
      data.blockedWorkers[owner.id] = blocked.filter((id) => id !== input.worker);
    } else if (!person && !state.requests.some((job) => job.customerId === owner.id && job.proId === input.worker)) {
      throw failure(404, "Worker unavailable.");
    } else if (action === "block-worker") {
      data.blockedWorkers[owner.id] = [...new Set([...blocked, input.worker])];
    } else {
      const categories = { identity: "Identity mismatch", fraud: "Suspected fraud", conduct: "Unsafe conduct", other: "Other concern" };
      const message = text(input.message, 950);
      if (!Object.hasOwn(categories, input.category) || message.length < 10) throw failure(400, "Choose a reason and describe what happened.");
      const reports = data.reports[owner.id] ??= [];
      if (reports.some((report) => !report.job && report.worker === input.worker && report.status === "open")) {
        throw failure(409, "This concern is already recorded.");
      }
      reports.push({ id: market.id(), job: "", worker: input.worker, message: categories[input.category] + ": " + message,
        created: Date.now(), status: "open", resolution: "" });
    }
  } else if (action === "save-worker" || action === "remove-worker") {
    const ids = (data.savedWorkers[owner.id] || []).filter((id) => id !== input.worker);
    if (action === "save-worker" && state.profiles.some((person) => person.id === input.worker && person.published)) ids.push(input.worker);
    data.savedWorkers[owner.id] = ids;
  } else if (action === "verification-request") {
    if (!profile) throw failure(400, "Create a demo worker profile first.");
    data.verification[owner.id] = true;
  } else if (action === "review") {
    const job = state.requests.find((item) => item.id === input.job && item.customerId === owner.id && item.status === "completed");
    if (!job) throw failure(404, "Only your completed bookings can be rated.");
    const review = readReview(input, failure);
    if (data.reviews[job.id] === undefined && !agreements.canReview(job)) {
      throw failure(409, "Your payment must be confirmed before you can leave a review.", "PAYMENT_REQUIRED");
    }
    data.reviews[job.id] ??= { ...review, created: Date.now() };
  } else if (action === "support-create") {
    const ticket = readTicket(input, failure);
    const tickets = (data.supportTickets ??= {})[owner.id] ??= [];
    const existing = tickets.find(({ id }) => id === ticket.id);
    if (existing) {
      if (!matchesTicket(existing, ticket)) throw failure(409, "This support request has already been submitted.");
      return;
    }
    if (ticket.job && !state.requests.some((job) => job.id === ticket.job && (job.customerId === owner.id || job.proId === owner.id))) {
      throw failure(404, "Booking unavailable.");
    }
    tickets.unshift(ticket);
  } else {
    throw failure(404, "This action is unavailable in the offline demo.");
  }
}

function trust(data, id) {
  const unchecked = { status: "unverified" };
  return { phoneVerified: false, suspended: false, requested: Boolean(data.verification[id]), eligible: false,
    verifiedName: null, checks: { identity: unchecked, background: unchecked, skills: unchecked } };
}

function providerReviews(data, requests, worker) {
  return requests.filter((job) => job.proId === worker && data.reviews[job.id]).map((job) => {
    const review = data.reviews[job.id];
    return typeof review === "number" ? { rating: review, comment: "", created: job.updatedAt } : review;
  });
}

function snapshot(data, market, owner) {
  const state = market.current();
  const requests = state.requests.filter((job) => owner && (job.customerId === owner.id || job.proId === owner.id));
  const blocked = data.blockedWorkers?.[owner?.id] || [];
  const profiles = state.profiles.filter((person) => person.published && !blocked.includes(person.id))
    .map(({ workPhone, ...person }) => ({ ...person, trust: trust(data, person.id) }));
  const ratings = profiles.flatMap((person) => {
    const scores = providerReviews(data, state.requests, person.id);
    return scores.length ? [{ pro: person.id, count: scores.length,
      rating: Math.round(scores.reduce((sum, review) => sum + review.rating, 0) * 10 / scores.length) / 10 }] : [];
  });
  return { serverTime: Date.now(), state: {
    account: owner || { id: "", handle: "" }, profiles, ratings, demoPinCode,
    profile: state.profile ? { ...state.profile, trust: trust(data, state.profile.id) } : null,
    requests: requests.map(({ details, requestFingerprint, ...job }) => ({
      ...job, ...(owner.id === job.customerId || job.acceptedAt ? { details } : {}), workerTrust: trust(data, job.proId),
    })),
    addresses: data.addresses[owner?.id] || [], savedWorkers: data.savedWorkers[owner?.id] || [],
    blockedWorkers: blocked.map((id) => ({ id, name: state.profiles.find((person) => person.id === id)?.name ?? "Worker" })),
    safetyReports: data.reports[owner?.id] || [], supportTickets: data.supportTickets?.[owner?.id] || [],
    reviewed: requests.filter((job) => job.customerId === owner?.id && data.reviews[job.id]).map((job) => job.id),
    catalog: { areas: market.areas, services: market.services, defaultHours: market.defaultHours }, matches: null,
  } };
}

function dispatch(data, route, token, input = {}) {
  const [action, query] = route.split("?", 2);
  const params = new URLSearchParams(query ?? "");
  let owner = account(token);
  if (action === "config") return { phoneMode: "preview", requireVerification: false };
  if (action === "logout") return { ok: true };
  if (action === "demo-sign-in") {
    owner = account(input.account);
    if (!owner) throw failure(400, "Choose a demo account.");
    return { ...snapshot(data, marketplace(data, owner), owner), session: { token: owner.id } };
  }
  if (action === "discover") owner = null;
  const market = marketplace(data, owner);
  const state = market.current();
  if (action === "discover") return snapshot(data, market, owner);
  const blocked = data.blockedWorkers?.[owner?.id] || [];
  const people = state.profiles.filter((profile) => profile.published && !blocked.includes(profile.id));
  const pinCode = params.get("pinCode");
  if (["coverage", "availability", "slots", "worker-details"].includes(action) && !isPinCode(pinCode)) {
    throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
  }
  if (action === "coverage") return { ids: people.filter((profile) => market.coversPin(profile, pinCode)).map((profile) => profile.id) };
  if (action === "worker-details") {
    const worker = people.find((person) => person.id === params.get("id") && market.coversPin(person, pinCode));
    if (!worker) throw failure(404, "This worker is unavailable for this PIN code.");
    return { workPhone: worker.workPhone || "",
      reviews: providerReviews(data, state.requests, worker.id).sort((a, b) => b.created - a.created).slice(0, 8) };
  }
  if (action === "locations") {
    const query = (params.get("q") || "").trim().toLowerCase();
    const uniqueAreas = [...new Set([...market.areas, ...people.flatMap((person) => person.areas)])];
    return { unavailable: false, suggestions: uniqueAreas.filter((name) => name.toLowerCase().includes(query) || market.serviceArea(query, [name]))
      .slice(0, 6).map((name) => ({ id: name, name, value: name, description: "", source: "coverage" })) };
  }
  const scope = params.get("scope") || "";
  if (action === "availability") {
    const options = {};
    const date = params.get("day") + "T";
    for (const person of people) {
      if (scope && !market.service(person.service)?.tasks.includes(scope)) continue;
      const { start, end } = person.hours || market.defaultHours;
      const slots = [];
      for (let time = market.appointmentTime(date + start); time < market.appointmentTime(date + end); time += 3_600_000) {
        const slot = market.localAppointment(time);
        if (market.available(person, "", slot, state, "", scope, pinCode)) slots.push(slot);
      }
      if (slots.length) options[person.id] = slots;
    }
    return { options };
  }
  if (!owner) throw failure(401, "Choose a demo account to continue.", "SIGNED_OUT");
  if (action === "state") return snapshot(data, market, owner);
  if (action === "slots") {
    const person = people.find((profile) => profile.id === params.get("proId"));
    const duration = Math.min(8, Math.max(2, Number(params.get("hours")) || 2)) * 60;
    return { slots: params.getAll("slot").filter((slot) => market.available(person, "", slot, state, "", scope, pinCode)
      && (person.unit !== "hourly" || !market.slotError(person, { appointment: slot, duration }, state))),
    immediate: params.get("timing") === "now" && market.available(person, "", "", state, "now", "", pinCode) };
  }
  if (bookingCommands.has(action)) {
    if (action === "request" && blocked.includes(input.proId) && !data.operations[owner.id + ":" + input.operationId]) {
      throw failure(409, "This worker is unavailable for new bookings.");
    }
    const jobId = bookingAction(action, market, state, data, input, owner);
    return { ...snapshot(data, market, owner), jobId };
  }
  profileAction(action, market, state, data, input, owner);
  return snapshot(data, market, owner);
}

function createDemoApi(storage) {
  let serialized;
  let queue = Promise.resolve();
  return (route, token, input) => {
    const work = queue.then(async () => {
      serialized ??= await storage.load() || "";
      const data = serialized ? JSON.parse(serialized) : newDemo();
      for (const profile of data.profiles) profile.pinCodes ??= demoPinCodes;
      const result = dispatch(data, route, token, input);
      if (JSON.stringify(data) !== serialized) {
        data.revision++;
        const next = JSON.stringify(data);
        await storage.save(next);
        serialized = next;
      }
      return { ...result, revision: data.revision };
    });
    queue = work.catch(() => {});
    return work;
  };
}

module.exports = { createDemoApi };
