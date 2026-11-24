"use strict";

const commands = new Map([
  ["quote-send", ["version", "items", "exclusions", "materials", "minutes", "creditPaise"]],
  ["quote-respond", ["version", "decision"]],
  ["payment-report", ["amountPaise", "method", "version"]],
  ["payment-confirm", ["entry", "decision"]],
  ["payment-reverse", ["entry", "reason"]],
  ["reschedule-propose", ["appointment", "minutes", "reason", "version"]],
  ["reschedule-respond", ["version", "decision"]],
  ["report-delay", ["minutes"]],
  ["help-create", ["category", "message"]],
  ["help-respond", ["entry", "decision", "message"]],
]);

const materials = ["customer", "worker", "none"];
const whole = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
const clean = (value, limit) => typeof value === "string" && value.length <= limit ? value.trim() : "";
const conflict = (error) => ({ error, code: "BOOKING_CHANGED" });
const pending = (quote) => quote.status === "sent";
const beforeWork = ["accepted", "en_route", "arrived"];
const openForQuote = ["arrived", "in_progress"];
const day = 86_400_000;

function readBrief(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const problem = clean(input.problem, 280);
  if (!problem || ![...materials, "inspect"].includes(input.materials)
    || !["ready", "not_ready", "unknown"].includes(input.readiness)) return null;
  return { problem, materials: input.materials, readiness: input.readiness };
}

function balance(job) {
  const receivedPaise = (job.payments ?? []).filter((entry) => entry.status === "confirmed")
    .reduce((sum, entry) => sum + entry.amountPaise, 0);
  return { receivedPaise, outstandingPaise: (job.bill?.totalPaise ?? 0) - receivedPaise };
}

function canReview(job) {
  return job.status === "completed" && Boolean(job.bill) && balance(job).outstandingPaise <= 0;
}

function change(action, market, state, job, input, failure) {
  const now = Date.now();
  const worker = input.role === "pro";
  const validate = (condition, message) => {
    if (!condition) throw failure(400, message);
  };
  const save = () => {
    // Do not use updatedAt here: the scheduler uses that timestamp for journey buffers.
    market.save(state);
    return { job };
  };
  if (action.startsWith("quote-") && (!job.agreementVersion || !openForQuote.includes(job.status))) {
    return conflict("Quotes are available after arrival and before the job is closed.");
  }
  if (action === "quote-send") {
    validate(worker, "Only the worker can send a quote.");
    const quotes = job.quotes ?? [];
    if (input.version !== (quotes.at(-1)?.version ?? 0)) return conflict("The quote has changed. Review the latest version.");
    validate(quotes.length < 30, "This job has reached its quote limit.");
    const offer = job.pilot;
    const choice = input.pilotAction || (offer?.repairPrice ? "repair" : "materials");
    const labourChange = !offer ? null : {
      repair: offer.repairPrice ? offer.repairPrice * 100 : null,
      add: offer.addOn && offer.quantity === 1 ? offer.addOn * 100 : null,
      reduce: offer.quantity === 2 ? (offer.everydayPrice - offer.price) * 100 : null,
      materials: offer.repairPrice ? null : 0,
    };
    validate(!offer || (Object.hasOwn(labourChange, choice) && labourChange[choice] !== null), "Choose a rate-card change for this booking.");
    validate(Array.isArray(input.items) && input.items.length <= 8 && (input.items.length >= 1 || (offer && choice !== "materials")), "Enter up to eight quote items.");
    const items = input.items.map((item) => {
      const label = clean(item?.label, 120);
      validate(label && whole(item?.amountPaise, 1, 10_000_000), "Check the quote descriptions and prices.");
      return { label, amountPaise: item.amountPaise };
    });
    const creditPaise = offer ? (choice === "repair" ? job.basePaise : 0) : input.creditPaise;
    const { minutes } = input;
    const labourLines = { repair: "Approved leak or fault repair labour", add: "Second tap fitting", reduce: "Remove second tap fitting" };
    const adjustmentPaise = offer && choice === "reduce" ? labourChange.reduce : 0;
    if (offer && labourChange[choice] > 0) items.unshift({ label: labourLines[choice], amountPaise: labourChange[choice] });
    validate(materials.includes(input.materials) && whole(minutes, 15, 720)
      && whole(creditPaise, 0, job.unit === "visit" ? job.basePaise : 0)
      && typeof input.exclusions === "string" && input.exclusions.length <= 220, "Check materials, duration, exclusions and visit credit.");
    if (offer) validate(minutes >= (choice === "add" ? 60 : offer.minutes), "Allow enough time for the rate-card work.");
    const subtotal = items.reduce((sum, item) => sum + item.amountPaise, 0);
    validate(creditPaise <= subtotal, "The visit credit cannot exceed the repair charge.");
    const totalPaise = job.basePaise + subtotal - creditPaise + adjustmentPaise;
    if (job.quoteMaximumPaise && totalPaise > job.quoteMaximumPaise) {
      throw failure(400, "The full quote must be within the booking limit of ₹" + job.quoteMaximumPaise / 100 + ".", "PRICE_LIMIT");
    }
    const previous = quotes.find(pending);
    if (previous) previous.status = "superseded";
    job.quotes = [...quotes, { version: input.version + 1, items, creditPaise, minutes, materials: input.materials,
      ...(offer && { adjustmentPaise, labourPaise: job.basePaise + labourChange[choice] - creditPaise,
        quantity: choice === "reduce" ? 1 : choice === "add" ? 2 : offer.quantity }),
      exclusions: input.exclusions.trim(), totalPaise, status: "sent", at: now }];
    return save();
  }
  if (action === "quote-respond") {
    validate(!worker && ["accepted", "rejected"].includes(input.decision), "The customer must choose whether to approve the quote.");
    const quote = job.quotes?.find(pending);
    if (!quote || quote.version !== input.version) return conflict("The quote has changed. Review the latest version.");
    if (input.decision === "accepted") {
      const person = market.pro(job.proId, state);
      const start = Math.min(job.journeyStartedAt ?? now, now);
      const end = Math.max(market.reservationStart(job) || now, now) + quote.minutes * 60_000;
      const error = !person ? "This worker is unavailable." : market.reservationError(person, job, state, start, end, now);
      if (error) return conflict(error);
      job.activeQuote = quote.version;
      job.duration = quote.minutes;
      job.journeyStartedAt = now;
    }
    quote.status = input.decision;
    quote.respondedAt = now;
    return save();
  }
  if (action.startsWith("payment-") && !job.bill) return conflict("There is no bill for this booking.");
  if (action === "payment-report") {
    const payments = job.payments ?? [];
    if (payments.length !== input.version) return conflict("The payment record changed. Check the balance and try again.");
    const pendingTotal = payments.filter((item) => item.status === "reported").reduce((sum, item) => sum + item.amountPaise, 0);
    validate(payments.length < 40 && ["cash", "upi", "other"].includes(input.method)
      && whole(input.amountPaise, 1, balance(job).outstandingPaise - pendingTotal), "Enter a payment within the remaining balance.");
    job.payments = [...payments, { id: market.id(), amountPaise: input.amountPaise, method: input.method,
      reportedBy: input.role, status: worker ? "confirmed" : "reported", at: now, ...(worker && { confirmedAt: now }) }];
    return save();
  }
  if (action === "payment-confirm") {
    validate(worker && ["confirmed", "disputed"].includes(input.decision), "Only the worker can acknowledge a payment.");
    const entry = job.payments?.find((item) => item.id === input.entry && item.status === "reported");
    if (!entry) return conflict("This payment report has already been reviewed.");
    entry.status = input.decision;
    entry.reviewedAt = now;
    return save();
  }
  if (action === "payment-reverse") {
    const reason = clean(input.reason, 180);
    validate(worker && reason, "The worker must provide a reason for reversing the receipt.");
    const entry = job.payments?.find((item) => item.id === input.entry && item.status === "confirmed" && !item.source);
    if (!entry) return conflict("This receipt is no longer confirmed.");
    entry.status = "reversed";
    entry.reversedAt = now;
    entry.reversalReason = reason;
    return save();
  }
  if (action.startsWith("reschedule-") && (!beforeWork.includes(job.status) || !job.appointment)) {
    return conflict("Only confirmed scheduled visits can be rescheduled before work starts.");
  }
  if (action === "reschedule-propose") {
    const history = job.reschedules ?? [];
    if (input.version !== (job.reschedule?.version ?? 0)) return conflict("The scheduling proposal changed.");
    const reason = clean(input.reason, 180);
    const start = typeof input.appointment === "string" ? market.appointmentTime(input.appointment) : NaN;
    const approved = job.quotes?.find((quote) => quote.version === job.activeQuote);
    const minimum = Math.max((job.agreedHours ?? 0) * 60, approved?.minutes ?? job.pilot?.minutes ?? 15);
    validate(history.length < 20 && reason && start > now && whole(input.minutes, minimum, 720), "Choose a future time and allow enough time for the agreed work.");
    const error = market.slotError(market.pro(job.proId, state), { ...job, appointment: input.appointment, duration: input.minutes }, state, now);
    if (error) return conflict(error);
    if (job.reschedule) {
      if (job.reschedule.status === "pending") job.reschedule.status = "superseded";
      job.reschedules = [...history, job.reschedule];
    }
    job.reschedule = { version: input.version + 1, appointment: input.appointment, minutes: input.minutes, reason,
      role: input.role, status: "pending", at: now, expires: Math.min(start, now + day) };
    return save();
  }
  if (action === "reschedule-respond") {
    const proposal = job.reschedule;
    validate(["accepted", "rejected"].includes(input.decision), "Choose whether to accept the proposed time.");
    if (!proposal || proposal.role === input.role || proposal.version !== input.version
      || proposal.status !== "pending" || proposal.expires <= now) return conflict("This scheduling proposal is unavailable.");
    if (input.decision === "accepted") {
      const error = market.slotError(market.pro(job.proId, state), { ...job, appointment: proposal.appointment, duration: proposal.minutes }, state, now);
      if (error) return conflict(error);
      job.appointment = proposal.appointment;
      job.duration = proposal.minutes;
      job.status = "accepted";
      delete job.journeyStartedAt;
      delete job.tracking;
      delete job.delay;
    }
    proposal.status = input.decision;
    proposal.respondedAt = now;
    return save();
  }
  if (action === "report-delay") {
    validate(worker && ["accepted", "en_route"].includes(job.status) && whole(input.minutes, 1, 240), "Enter an arrival estimate from 1 to 240 minutes.");
    job.delay = { minutes: input.minutes, at: now };
    return save();
  }
  if (action === "help-create") {
    const message = clean(input.message, 280);
    const cases = job.helpCases ?? [];
    const category = input.category;
    validate(["late", "scope", "payment", "incomplete"].includes(category) && message && cases.length < 12,
      "Choose an issue and describe it in up to 280 characters.");
    if (cases.some((item) => item.role === input.role && item.category === category && item.status === "open")) {
      return conflict("You already have an open report for this issue.");
    }
    job.helpCases = [...cases, { id: market.id(), role: input.role, category, message, status: "open", at: now }];
    if (category === "incomplete" && job.agreementVersion && job.status === "in_progress") job.interrupted = true;
    return save();
  }
  if (action === "help-respond") {
    const item = job.helpCases?.find((entry) => entry.id === input.entry && entry.status === "open");
    const message = clean(input.message, 280);
    validate(message && ["note", "resolve", "end"].includes(input.decision), "Enter a note or describe the agreed resolution.");
    if (!item) return conflict("This issue is already closed.");
    const notes = item.notes ?? [];
    validate(notes.length < 20, "This issue has reached its update limit.");
    if (input.decision === "resolve" && (item.endProposedBy ?? item.role) === input.role) {
      return conflict("The other participant must record the resolution.");
    }
    if (input.decision === "end") {
      if (!job.interrupted || item.category !== "incomplete") return conflict("Only interrupted work can be ended here.");
      if (item.endProposedBy) return conflict("A proposal to end this work already exists.");
      item.endProposedBy = input.role;
    }
    if (input.decision === "resolve") {
      item.status = "resolved";
      item.resolvedAt = now;
      if (item.endProposedBy && job.interrupted) {
        job.status = "cancelled";
        job.cancellation = { role: input.role, reason: message, at: now };
        job.updatedAt = now;
        const sent = job.quotes?.find(pending);
        if (sent) sent.status = "superseded";
      }
      if (!job.helpCases.some((entry) => entry.category === "incomplete" && entry.status === "open") || job.status === "cancelled") {
        delete job.interrupted;
      }
    }
    item.notes = [...notes, { role: input.role, message, at: now }];
    return save();
  }
  throw failure(404, "This action is unavailable.");
}

module.exports = { commands, readBrief, balance, canReview, change };
