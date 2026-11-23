"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const createMarketplace = require("./marketplace.js");
const createTwilio = require("./twilio.js");
const createBookingUpdates = require("./booking-updates.js");
const createPlaceSearch = require("./place-search.js");
const agreements = require("./booking-agreements.js");
const { readTicket, matchesTicket } = require("./mobile/shared/support-tickets.js");
const validateProfile = require("./mobile/shared/worker-profile.js");
const demoWorkers = require("./mobile/shared/demo-workers.js");
const { isPinCode, demoPinCode, demoPinCodes } = require("./mobile/shared/pin-codes.js");
const { readReview } = require("./mobile/shared/worker-reviews.js");
const migrate = require("./db-migrations.js");
const config = require("./server-config.js")(process.env);
const { createOnlinePayments, reserve: reserveCheckout, record: recordCheckout } = require("./online-payments");
const onlinePayments = createOnlinePayments(process.env, config);
const requestAddress = (req) => require("./server-config.js").clientAddress(req, config.trustProxy);
const createTrust = require("./worker-trust.js");
const searchPlaces = createPlaceSearch({ endpoint: process.env.HANDYHIVE_GEOCODER_URL });

const port = Number(process.env.HANDYHIVE_PORT || 4174);
// The website and installed app use the same Expo screens by default.
// Keep the original prototype available only through an explicit opt-out.
const appPreview = process.env.HANDYHIVE_APP_PREVIEW !== "0" ? path.join(__dirname, "mobile", "dist") : null;
let origin = config.publicOrigin || "http://127.0.0.1:" + port;
const phoneMode = process.env.HANDYHIVE_PHONE_MODE || "preview";
if (!["preview", "twilio"].includes(phoneMode)) throw new Error("HANDYHIVE_PHONE_MODE must be preview or twilio.");
const twilio = createTwilio(process.env);
const dbPath = process.env.HANDYHIVE_DB || path.join(process.env.LOCALAPPDATA || require("node:os").homedir(),
  "HandyHive", twilio ? "verified.sqlite" : "preview.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("CREATE TABLE IF NOT EXISTS saved_addresses (owner TEXT NOT NULL, label TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(owner,label)); CREATE TABLE IF NOT EXISTS service_reviews (job TEXT PRIMARY KEY, pro TEXT NOT NULL, rating INTEGER NOT NULL, created INTEGER NOT NULL);");
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
db.exec(
  "CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, handle TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);" +
  "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);" +
  "CREATE TABLE IF NOT EXISTS native_sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);" +
  "CREATE TABLE IF NOT EXISTS native_operations (owner TEXT NOT NULL REFERENCES accounts(id), id TEXT NOT NULL, fingerprint TEXT NOT NULL, job TEXT NOT NULL, PRIMARY KEY (owner, id));" +
  "CREATE TABLE IF NOT EXISTS marketplace_revision (id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL);" +
  "INSERT OR IGNORE INTO marketplace_revision VALUES (1, 0);" +
  "CREATE TABLE IF NOT EXISTS marketplace (id INTEGER PRIMARY KEY CHECK (id = 1), body TEXT NOT NULL);" +
  "INSERT OR IGNORE INTO marketplace VALUES (1, '{\"profiles\":[],\"requests\":[]}');"
);

const getStore = db.prepare("SELECT body FROM marketplace WHERE id=1");
const putStore = db.prepare("UPDATE marketplace SET body=? WHERE id=1");
const getRevision = db.prepare("SELECT value FROM marketplace_revision WHERE id=1");
const advanceRevision = db.prepare("UPDATE marketplace_revision SET value=value+1 WHERE id=1");
const getOperation = db.prepare("SELECT fingerprint, job FROM native_operations WHERE owner=? AND id=?");
const putOperation = db.prepare("INSERT INTO native_operations VALUES (?,?,?,?)");
const accountByHandle = db.prepare("SELECT * FROM accounts WHERE handle=?");
const sessionAge = 7 * 24 * 60 * 60;
const cookieName = "handyhive_preview";
const browserSessions = sessionStore("sessions");
const nativeSessions = sessionStore("native_sessions");
const authAttempts = new Map();
db.exec("CREATE TABLE IF NOT EXISTS phone_challenges (id TEXT PRIMARY KEY, phone TEXT NOT NULL, hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS phone_accounts (phone TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES accounts(id)); CREATE TABLE IF NOT EXISTS phone_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets INTEGER NOT NULL);");
db.exec("CREATE TABLE IF NOT EXISTS auth_mode (id INTEGER PRIMARY KEY CHECK(id=1), mode TEXT NOT NULL);");
// Claim the database before permitting any auth. Old databases with accounts were preview-only.
db.prepare(`INSERT OR IGNORE INTO auth_mode SELECT 1,
  CASE WHEN EXISTS (SELECT 1 FROM accounts) OR EXISTS (SELECT 1 FROM phone_challenges)
       OR EXISTS (SELECT 1 FROM phone_limits) THEN 'preview' ELSE ? END`).run(phoneMode);
if (db.prepare("SELECT mode FROM auth_mode WHERE id=1").get().mode !== phoneMode) {
  throw new Error("Use a separate database for preview accounts and verified phone accounts.");
}
const updates = createBookingUpdates(db, twilio?.sendBooking, () => JSON.parse(getStore.get().body).requests);
migrate(db);
const trust = createTrust(db, phoneMode === "twilio");
const listSupport = db.prepare("SELECT id, job, category, message, created, status, response FROM support_tickets WHERE owner=? ORDER BY created DESC, rowid DESC");
const findSupport = db.prepare("SELECT job, category, message FROM support_tickets WHERE owner=? AND id=?");
const insertSupport = db.prepare("INSERT INTO support_tickets (id, owner, job, category, message, created) VALUES (?, ?, ?, ?, ?, ?)");
const listEvents = db.prepare("SELECT id,job,role,label,created FROM booking_events WHERE owner=? ORDER BY created DESC,rowid DESC LIMIT 12");
const insertEvent = db.prepare("INSERT INTO booking_events VALUES(?,?,?,?,?,?)");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64);
const owns = (account, job, role) => Boolean(account && job && (role === "pro" ? job.proId === account.id : role === "customer" && job.customerId === account.id));
const demoArea = "Dwarka";
const additionalDemoAreas = ["IIT Delhi"];

function seedPreviewWorkers() {
  const password = "HandyHive-local-demo";
  const insert = db.prepare("INSERT INTO accounts VALUES (?,?,?,?)");
  return transact(null, (market, read) => {
    const state = read();
    for (const [handle, preset] of demoWorkers) {
      // Reuse accounts created by the earlier seed command without changing their credentials.
      let account = accountByHandle.get(handle);
      if (account && hashPassword(password, account.salt).toString("hex") !== account.password) {
        account = accountByHandle.get("handyhive-" + handle);
        if (account && hashPassword(password, account.salt).toString("hex") !== account.password) continue;
      }
      if (!account) {
        const id = crypto.randomUUID();
        const salt = crypto.randomBytes(16).toString("hex");
        const name = accountByHandle.get(handle) ? "handyhive-" + handle : handle;
        insert.run(id, name, salt, hashPassword(password, salt).toString("hex"));
        account = { id, handle: name };
      }
      const index = state.profiles.findIndex((profile) => profile.id === account.id);
      const existing = state.profiles[index];
      const fields = { ...preset, languages: ["Hindi", "English"], pinCodes: demoPinCodes };
      const profile = existing || validateProfile(market, fields, null, account, true, failure);
      const areas = [...new Set([...profile.areas, ...market.areas, demoArea, ...additionalDemoAreas])];
      if (profile.sample && profile.pinCodes?.length && areas.length === profile.areas.length) continue;
      const sample = { ...profile, areas, pinCodes: profile.pinCodes?.length ? profile.pinCodes : demoPinCodes,
        ...(profile.sample ? {} : { sample: true, immediate: true, specializations: [] }) };
      if (index === -1) state.profiles.push(sample);
      else state.profiles[index] = sample;
    }
    return {};
  });
}

function bookingForAccount({ details, requestFingerprint, arrivalIdentity, checkout, ...job }, account) {
  const profile = JSON.parse(getStore.get().body).profiles.find((person) => person.id === job.proId);
  return {
    ...job, workerTrust: trust.summary(profile), tier: job.tier || "everyday", minimumQuantity: job.minimumQuantity ?? (job.unit === "hourly" ? 2 : 1),
    ...(config.previewWorkers && profile?.sample && owns(account, job, "customer") && { demoWorker: true }),
    ...(checkout && { checkout: { mode: checkout.mode, amountPaise: checkout.amountPaise,
      ...(owns(account, job, "customer") && { reference: checkout.reference, url: checkout.url }) } }),
    ...(job.status === "arrived" && arrivalIdentity !== trust.identityKey(profile) && { arrivalConfirmedAt: undefined }),
    ...((owns(account, job, "customer") || (owns(account, job, "pro") && job.acceptedAt)) && details && { details }),
  };
}

function failure(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

function writeTransaction(action) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = action();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function transact(account, action, query, native = false) {
  // Bookings, slot reservations and notifications commit together.
  return writeTransaction(() => {
    const original = getStore.get().body;
    const store = JSON.parse(original);
    let state = {
      ...store, connected: true, account,
      profile: store.profiles.find((profile) => profile.id === account?.id) || null,
      profiles: store.profiles.filter((profile) => profile.id !== account?.id),
    };
    const market = createMarketplace({
      getItem: () => JSON.stringify(state),
      setItem: (_key, json) => { state = JSON.parse(json); },
    });
    market.current();
    const result = action(market, () => state);
    const profiles = state.profile ? [...state.profiles, state.profile] : state.profiles;
    // Keep ordering stable across reads by different users.
    profiles.sort((a, b) => a.id.localeCompare(b.id));
    const body = JSON.stringify({ profiles, requests: state.requests });
    if (body !== original) {
      putStore.run(body);
      advanceRevision.run();
      updates.record(store.requests, state.requests);
    }
    if (body === original && result.sideTableChanged) advanceRevision.run();
    if (!query) return result;
    const response = { ...result, state: snapshot(market, state, query, native) };
    if (result.job) response.job = bookingForAccount(result.job, account);
    if (native) {
      response.revision = getRevision.get().value;
      response.serverTime = Date.now();
    }
    return response;
  });
}

function snapshot(market, state, query, native) {
  const account = state.account;
  const directory = state.profiles.filter((profile) => profile.published && bookable(account, profile)).map((profile) => {
    const { id, name, service, bio, bioHi, areas, pinCodes, price, unit, years, languages, hours, immediate, published, plus, specializations, sample } = profile;
    return { id, name, service, bio, bioHi, areas, pinCodes, price, unit, years, languages, hours, immediate, published, plus, specializations, sample, trust: trust.summary(profile),
      ...(!native && { credential: profile.credential }) };
  });
  const params = { appointment: query.get("appointment") || "", timing: query.get("timing") || "" };
  const pinCode = query.get("pinCode");
  const matches = isPinCode(pinCode) ? {
    ...params,
    pinCode,
    ids: market.pros(state).filter((profile) => profile.id !== account?.id && bookable(account, profile)
      && market.available(profile, "", params.appointment, state, params.timing, "", pinCode)).map((profile) => profile.id),
  } : null;
  const { bookingUpdates, bookingSms } = updates.forAccount(account);
  const recentUpdates = native && account
    ? [...bookingUpdates, ...listEvents.all(account.id)].sort((a, b) => b.created - a.created).slice(0, 12) : bookingUpdates;
  const counts = new Map();
  const demos = new Set(db.prepare("SELECT id FROM accounts WHERE handle LIKE '%-demo'").all().map((item) => item.id));
  const seen = new Set();
  for (const job of state.requests) {
    if (job.status !== "completed" || job.updatedAt < Date.now() - 90 * 86400000 || demos.has(job.customerId) || demos.has(job.proId)
      || !directory.some((person) => person.id === job.proId && !person.sample) || seen.has(job.intent || job.id)) continue;
    seen.add(job.intent || job.id);
    if (!isPinCode(job.pinCode)) continue;
    const key = JSON.stringify([job.service, job.scope, job.pinCode]);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const popular = [...counts].filter(([, count]) => count >= 10).map(([key, count]) => {
    const [service, scope, pinCode] = JSON.parse(key); return { service, scope, pinCode, count };
  }).sort((a, b) => b.count - a.count).slice(0, 40);
  return {
    account, profile: state.profile ? { ...state.profile, trust: trust.summary(state.profile) } : null, profiles: directory, matches, ...(native && { popular,
      safetyReports: account ? trust.reports(account.id) : [],
      supportTickets: account ? listSupport.all(account.id) : [],
      blockedWorkers: account ? trust.blocks(account.id).map(({ worker }) => ({
        id: worker, name: state.profiles.find((person) => person.id === worker)?.name || "Worker",
      })) : [],
      addresses: account ? db.prepare("SELECT label, body FROM saved_addresses WHERE owner=? ORDER BY label").all(account.id).map(({ label, body }) => ({ label, ...JSON.parse(body) })) : [],
      reviewed: account ? db.prepare("SELECT job FROM service_reviews").all().filter((row) => state.requests.some((job) => job.id === row.job && job.customerId === account.id)).map((row) => row.job) : [],
      ratings: db.prepare("SELECT pro, ROUND(AVG(rating),1) AS rating, COUNT(*) AS count FROM service_reviews GROUP BY pro").all(),
      savedWorkers: account ? db.prepare("SELECT worker FROM saved_workers WHERE owner=?").all(account.id).map((row) => row.worker) : [],
    }),
    bookingUpdates: recentUpdates, ...(!native && { bookingSms }),
    ...(native && { phoneMode, requireVerification: config.requireVerification, onlinePaymentMode: onlinePayments.mode,
      ...(directory.some((person) => person.sample && market.coversPin(person, demoPinCode)) && { demoPinCode }), catalog: {
      areas: [...new Set([...market.areas, ...directory.flatMap((profile) => profile.areas)])],
      services: market.services.map(({ id, name, tasks, note }) => ({ id, name, tasks, note })),
      defaultHours: market.defaultHours,
    } }),
    requests: state.requests.filter((job) => owns(account, job, "customer") || owns(account, job, "pro"))
      .map((job) => bookingForAccount(job, account)),
  };
}

function bookable(account, profile) {
  return Array.isArray(profile?.pinCodes) && profile.pinCodes.some(isPinCode) && (!profile.sample || config.previewWorkers)
    && trust.eligible(profile, config.requireVerification) && !trust.blocked(account?.id, profile.id);
}

function sessionStore(table) {
  return {
    account: db.prepare(`SELECT accounts.id, accounts.handle FROM ${table} JOIN accounts ON accounts.id=owner WHERE token=? AND expires>?`),
    insert: db.prepare(`INSERT INTO ${table} VALUES (?,?,?)`),
    purge: db.prepare(`DELETE FROM ${table} WHERE expires<=?`),
    revoke: db.prepare(`DELETE FROM ${table} WHERE token=?`),
  };
}

function sessionToken(req, native) {
  if (native) return /^Bearer ([a-f0-9]{64})$/i.exec(req.headers.authorization || "")?.[1];
  const entry = (req.headers.cookie || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(cookieName + "="));
  return entry?.slice(cookieName.length + 1);
}

async function startPhone(input, req) {
  const phone = typeof input.phone === "string" ? input.phone.replace(/[ ()-]/g, "") : "";
  if (!/^\+91[6-9]\d{9}$/.test(phone)) throw failure(400, "Enter an Indian mobile number with +91.");
  const now = Date.now();
  const id = crypto.randomUUID();
  const expires = now + 300000;
  const code = twilio ? null : String(crypto.randomInt(100000, 1000000));
  writeTransaction(() => {
    db.prepare("DELETE FROM phone_limits WHERE resets<=?").run(now);
    const keys = ["address:" + requestAddress(req), "phone:" + phone];
    for (const key of keys) {
      const limit = db.prepare("SELECT * FROM phone_limits WHERE key=?").get(key);
      if (limit && limit.count >= (key.startsWith("phone:") ? 3 : 12)) throw failure(429, "Too many codes requested. Try again in 15 minutes.");
    }
    const recent = db.prepare("SELECT expires FROM phone_challenges WHERE phone=? ORDER BY expires DESC LIMIT 1").get(phone);
    if (recent && recent.expires - 240000 > now) throw failure(429, "Wait 60 seconds before requesting another code.");
    for (const key of keys) db.prepare("INSERT INTO phone_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1").run(key, now + 900000);
    db.prepare("DELETE FROM phone_challenges WHERE phone=? OR expires<=?").run(phone, now);
    db.prepare("INSERT INTO phone_challenges VALUES (?,?,?,?,0)").run(id, phone, code ? sha256(id + code) : "", expires);
  });
  if (twilio) {
    let sid;
    try { sid = await twilio.start(phone); }
    catch { throw failure(503, "The SMS service could not send a code. Wait a minute and try again."); }
    db.prepare("UPDATE phone_challenges SET hash=? WHERE id=?").run(sid, id);
  }
  return { challenge: id, expiresAt: expires, ...(code ? { previewCode: code } : {}) };
}

async function verifyPhone(input) {
  if (typeof input.challenge !== "string" || typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    throw failure(400, "Enter the six-digit code.");
  }
  const unavailable = () => failure(400, "This code expired or reached its attempt limit. Request another code.");
  const challenge = db.prepare(`
    UPDATE phone_challenges SET attempts=attempts+1
    WHERE id=? AND expires>? AND attempts<5 AND hash<>'' RETURNING *
  `).get(input.challenge, Date.now());
  if (!challenge) throw unavailable();
  let approved;
  if (twilio) {
    try { approved = await twilio.check(challenge.hash, challenge.phone, input.code); }
    catch { throw failure(503, "The SMS service could not check your code. Try again."); }
  } else {
    approved = crypto.timingSafeEqual(Buffer.from(challenge.hash, "hex"), Buffer.from(sha256(challenge.id + input.code), "hex"));
  }
  if (!approved) throw failure(400, "The code is incorrect or has expired.");
  return writeTransaction(() => {
    if (!db.prepare("DELETE FROM phone_challenges WHERE id=? AND expires>?").run(challenge.id, Date.now()).changes) {
      throw unavailable();
    }
    const existing = db.prepare("SELECT accounts.id, accounts.handle FROM phone_accounts JOIN accounts ON accounts.id=phone_accounts.owner WHERE phone=?").get(challenge.phone);
    if (existing) return existing;
    const account = { id: crypto.randomUUID(), handle: "phone_" + crypto.randomBytes(10).toString("hex") };
    const salt = crypto.randomBytes(16).toString("hex");
    db.prepare("INSERT INTO accounts VALUES (?,?,?,?)").run(account.id, account.handle, salt, hashPassword(crypto.randomBytes(32).toString("hex"), salt).toString("hex"));
    db.prepare("INSERT INTO phone_accounts VALUES (?,?)").run(challenge.phone, account.id);
    return account;
  });
}

function signIn(action, input, req) {
  const handle = typeof input.handle === "string" ? input.handle.trim().toLowerCase() : "";
  const password = input.password;
  if (!/^[a-z0-9_-]{3,32}$/.test(handle) || typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw failure(400, "Use a username of 3 to 32 letters, numbers, underscores or hyphens and a password of 12 to 128 characters.");
  }
  const address = requestAddress(req);
  const now = Date.now();
  const attempt = authAttempts.get(address);
  const recent = attempt && attempt.until > now ? attempt : { count: 0, until: now + 60_000 };
  if (++recent.count > 12) throw failure(429, "Too many attempts. Try again in a minute.");
  authAttempts.set(address, recent);
  let account = accountByHandle.get(handle);
  if (action === "register") {
    if (account) throw failure(409, "This username is taken.");
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt).toString("hex");
    account = { id: crypto.randomUUID(), handle };
    const result = db.prepare("INSERT OR IGNORE INTO accounts VALUES (?,?,?,?)").run(account.id, handle, salt, passwordHash);
    if (!result.changes) throw failure(409, "This username is taken.");
  } else {
    const computed = hashPassword(password, account?.salt || "handyhive-invalid-account");
    if (!account || !crypto.timingSafeEqual(computed, Buffer.from(account.password, "hex"))) {
      throw failure(401, "The username or password is incorrect.");
    }
  }
  return { id: account.id, handle: account.handle };
}

function createSession(account, sessions) {
  const now = Date.now();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = now + sessionAge * 1000;
  sessions.purge.run(now);
  sessions.insert.run(sha256(token), account.id, expiresAt);
  return { token, expiresAt };
}

function mutate(action, market, state, input, native = false, requestFingerprint) {
  const { account, profile } = state;
  if (!account) throw failure(401, "Sign in to continue.");
  if (action === "verification-request") {
    if (!profile) throw failure(400, "Create a worker profile first.");
    return trust.submit(account.id, input.consent);
  }
  if (native && ["block-worker", "unblock-worker", "report-worker"].includes(action)) {
    const worker = state.profiles.find((person) => person.id === input.worker);
    const hasBooking = state.requests.some((job) => job.customerId === account.id && job.proId === input.worker);
    if (typeof input.worker !== "string" || input.worker === account.id) throw failure(400, "Choose a service provider.");
    if (action === "unblock-worker") return trust.block(account.id, input.worker, false);
    if (!worker || !(worker.published || hasBooking)) throw failure(404, "Worker unavailable.");
    if (action === "block-worker") return trust.block(account.id, worker.id, true);
    const categories = { identity: "Identity mismatch", fraud: "Suspected fraud", conduct: "Unsafe conduct", other: "Other concern" };
    if (!Object.hasOwn(categories, input.category) || typeof input.message !== "string"
      || input.message.trim().length < 10 || input.message.length > 950) throw failure(400, "Choose a reason and add 10 to 950 characters.");
    const report = trust.report({ id: "", proId: worker.id }, account, categories[input.category] + ": " + input.message.trim());
    return { sideTableChanged: report.sideTableChanged };
  }
  if (native && ["save-worker", "remove-worker"].includes(action)) {
    if (typeof input.worker !== "string") throw failure(400, "Choose a worker.");
    if (action === "remove-worker") {
      const result = db.prepare("DELETE FROM saved_workers WHERE owner=? AND worker=?").run(account.id, input.worker);
      return { sideTableChanged: Boolean(result.changes) };
    }
    if (!state.profiles.some((person) => person.id === input.worker && person.published && bookable(account, person))) throw failure(404, "Worker unavailable.");
    const count = db.prepare("SELECT COUNT(*) AS count FROM saved_workers WHERE owner=?").get(account.id).count;
    if (count >= 100) throw failure(400, "Remove a saved worker before adding another.");
    const result = db.prepare("INSERT OR IGNORE INTO saved_workers VALUES (?,?)").run(account.id, input.worker);
    return { sideTableChanged: Boolean(result.changes) };
  }
  if (native && action === "save-address") {
    const { label, area = "", pinCode, address, customerName, landmark = "" } = input;
    if (!isPinCode(pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    if (!["Home", "Work"].includes(label) || ![area, address, customerName, landmark].every((value) => typeof value === "string")
      || area.length > 120 || address.trim().length < 8 || address.length > 220
      || !customerName.trim() || customerName.length > 60 || landmark.length > 100) throw failure(400, "Check your name, address and area.");
    db.prepare("INSERT INTO saved_addresses VALUES (?,?,?) ON CONFLICT(owner,label) DO UPDATE SET body=excluded.body")
      .run(account.id, label, JSON.stringify({ area: area.trim(), pinCode, address: address.trim(), customerName: customerName.trim(), landmark: landmark.trim() }));
    return { sideTableChanged: true };
  }
  if (native && action === "remove-address") {
    const removed = db.prepare("DELETE FROM saved_addresses WHERE owner=? AND label=?").run(account.id, String(input.label));
    return { sideTableChanged: Boolean(removed.changes) };
  }
  if (native && action === "review") {
    const job = state.requests.find((item) => item.id === input.job && item.customerId === account.id && item.status === "completed");
    if (!job) throw failure(404, "Only your completed bookings can be rated.");
    const { rating, comment } = readReview(input, failure);
    if (db.prepare("SELECT 1 FROM service_reviews WHERE job=?").get(job.id)) return {};
    if (!agreements.canReview(job)) throw failure(409, "Your payment must be confirmed before you can leave a review.", "PAYMENT_REQUIRED");
    const rated = db.prepare("INSERT OR IGNORE INTO service_reviews (job, pro, rating, created, comment) VALUES (?,?,?,?,?)")
      .run(job.id, job.proId, rating, Date.now(), comment);
    return { sideTableChanged: Boolean(rated.changes) };
  }
  if (native && action === "support-create") {
    const ticket = readTicket(input, failure);
    const existing = findSupport.get(account.id, ticket.id);
    if (existing) {
      if (!matchesTicket(existing, ticket)) throw failure(409, "This support request has already been submitted.");
      return {};
    }
    if (ticket.job && !state.requests.some((job) => job.id === ticket.job && (owns(account, job, "customer") || owns(account, job, "pro")))) {
      throw failure(404, "Booking unavailable.");
    }
    insertSupport.run(ticket.id, account.id, ticket.job, ticket.category, ticket.message, ticket.created);
    return { sideTableChanged: true };
  }
  if (action === "booking-sms") {
    if (typeof input.enabled !== "boolean" || !updates.setSms(account.id, input.enabled)) {
      throw failure(400, "Booking SMS is unavailable for this account.");
    }
    return {};
  }
  const saveProfile = (patch) => {
    market.save({ ...state, profile: { ...profile, ...patch } });
    return {};
  };
  if (action === "profile") return saveProfile(validateProfile(market, input, profile, account, native, failure));
  if (["hours", "immediate", "published", "block", "remove-block"].includes(action)) {
    if (!profile) throw failure(400, "Create a worker profile first.");
    if (action === "hours") {
      const { days, start, end, buffer } = input;
      const isTime = (value) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
      if (!Array.isArray(days) || days.length > 7 || !days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        || !isTime(start) || !isTime(end) || start >= end || !Number.isInteger(buffer) || buffer < 0 || buffer > 180) {
        throw failure(400, "Check the appointment days, working hours and travel buffer.");
      }
      return saveProfile({ hours: { days: [...new Set(days)], start, end, buffer } });
    }
    if (action === "immediate" || action === "published") {
      if (typeof input.enabled !== "boolean") throw failure(400, "Choose on or off.");
      return saveProfile({ [action]: input.enabled });
    }
    if (action === "block") {
      if (typeof input.start !== "string" || typeof input.end !== "string") throw failure(400, "Choose a start and end time.");
      return market.blockSchedule(input.start, input.end);
    }
    return saveProfile({ blocks: (profile.blocks || []).filter((block) => block.id !== input.id) });
  }
  if (action === "request") {
    const { intent, proId, scope, area = "", pinCode, appointment = "", timing = "", contact, tier,
      expectedPrice, expectedUnit, expectedIncludes, expectedIncludesHi } = input;
    if (typeof area !== "string" || area.length > 120
      || ![intent, proId].every((value) => typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value))
      || proId === account.id || typeof appointment !== "string" || !["", "now"].includes(timing)
      || !["In-app message", "Request a call"].includes(contact)) {
      throw failure(400, "Choose another professional and check the request details.");
    }
    const worker = state.profiles.find((person) => person.id === proId);
    const previousIntent = state.requests.find((job) => job.customerId === account.id && job.intent === intent);
    if (previousIntent && requestFingerprint && previousIntent.requestFingerprint !== requestFingerprint) {
      throw failure(409, "This request was already sent with different details.", "INTENT_REUSED");
    }
    if (previousIntent && requestFingerprint) return { job: previousIntent };
    if (!isPinCode(pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    if (!bookable(account, worker)) throw failure(409, "This worker is unavailable for new bookings.", "WORKER_UNAVAILABLE");
    const usesOffer = native && (tier !== undefined || expectedPrice !== undefined || input.address !== undefined);
    let brief;
    let hours;
    if (native && input.brief !== undefined) {
      brief = agreements.readBrief(input.brief);
      hours = input.hours;
      if (!usesOffer || !brief || (expectedUnit !== "visit" && brief.materials === "inspect")
        || !appointment || timing || !Number.isInteger(hours) || hours < 2 || hours > 8) {
        throw failure(400, "Check the task details and scheduled visit.");
      }
    }
    let details;
    if (usesOffer) {
      const { customerName, address, landmark = "", notes = "" } = input;
      if (!["everyday", "plus"].includes(tier) || !Number.isInteger(expectedPrice)
        || !Object.hasOwn(market.units, expectedUnit) || typeof expectedIncludes !== "string" || typeof expectedIncludesHi !== "string"
        || ![customerName, address, landmark, notes].every((value) => typeof value === "string")
        || !customerName.trim() || customerName.length > 60 || address.trim().length < 8 || address.length > 220
        || landmark.length > 100 || notes.length > 280 || (!appointment && timing !== "now")) {
        throw failure(400, "Check your name, address, appointment and selected rate.", "INVALID_BOOKING_DETAILS");
      }
      details = { customerName: customerName.trim(), address: address.trim(), landmark: landmark.trim(), notes: notes.trim() };
    }
    const result = market.request({ intent, proId, scope, area: area.trim() || pinCode, pinCode, appointment, timing, contact, requestFingerprint,
      ...(usesOffer && { tier, expectedPrice, expectedUnit, expectedIncludes, expectedIncludesHi, details, brief, hours }),
    });
    if (result.job && (config.production || input.safetyVersion === 1) && !result.job.safetyVersion) {
      const current = market.current();
      const job = current.requests.find((entry) => entry.id === result.job.id);
      job.safetyVersion = 1;
      market.save(current);
      return { ...result, job };
    }
    return result;
  }
  const job = state.requests.find((item) => item.id === input.job);
  if (!owns(account, job, input.role)) throw failure(404, "Request unavailable.");
  if (native && action === "demo-worker-step") {
    const worker = state.profiles.find((person) => person.id === job.proId);
    if (!config.previewWorkers || input.role !== "customer" || !worker?.sample) throw failure(404, "Demo visit unavailable.");
    if (!["accept", "arrive", "diagnostic-only", "start", "complete"].includes(input.change)) {
      throw failure(400, "Choose an available demo visit step.");
    }
    return mutate("transition", market, { ...state, account: { id: worker.id }, profile: worker }, { ...input, role: "pro" }, true);
  }
  if (action === "safety-report") return trust.report(job, account, input.message);
  if (action === "arrival-confirm") {
    if (input.role !== "customer" || job.status !== "arrived" || input.confirmed !== true) throw failure(409, "Confirm the worker in person after arrival.");
    const worker = state.profiles.find((person) => person.id === job.proId);
    if (!trust.eligible(worker, config.requireVerification)) throw failure(409, "Worker checks need review. Do not start the visit.");
    job.arrivalConfirmedAt = Date.now();
    job.arrivalIdentity = trust.identityKey(worker);
    market.save(state);
    return { job };
  }
  if (native && agreements.commands.has(action)) {
    if (job.checkout && action.startsWith("payment-")) throw failure(409, "An online checkout is pending. Check its status first.");
    return agreements.change(action, market, state, job, input, failure);
  }
  if (action === "transition") {
    if (input.role === "pro" && ["accept", "depart", "arrive", "start", "diagnostic-only"].includes(input.change)
      && !trust.eligible(profile, config.requireVerification)) throw failure(409, "Worker verification is required before continuing.", "TRUST_REQUIRED");
    if (["start", "diagnostic-only"].includes(input.change) && job.safetyVersion
      && (!job.arrivalConfirmedAt || job.arrivalIdentity !== trust.identityKey(profile))) {
      throw failure(409, "The customer must confirm your identity in person before work starts.", "ARRIVAL_CONFIRMATION_REQUIRED");
    }
    const allowed = input.role === "pro" ? ["accept", "decline", "depart", "arrive", "start", "complete", "cancel", "diagnostic-only"] : ["cancel"];
    if (!allowed.includes(input.change)) throw failure(400, "This booking action is unavailable.");
    const reason = typeof input.reason === "string" && input.reason.length <= 180 ? input.reason.trim() : "";
    if (input.role === "pro" && input.change === "cancel" && (!native || !reason)) {
      throw failure(400, "Provide a reason for cancelling this visit.");
    }
    return market.transition(job.id, input.change, input.role, account.id, reason);
  }
  if (action === "estimate" && input.role === "pro") return market.updateDuration(job.id, account.id, input.minutes);
  if (action === "tracking" && input.role === "pro" && ["play", "pause", "replay"].includes(input.change)) {
    return market.track(job.id, account.id, input.change);
  }
  if (action === "message") {
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!message || message.length > 280) throw failure(400, "Enter a message of up to 280 characters.");
    return market.contact(job.id, input.role, account.id, message);
  }
  if (action === "read-chat") {
    market.readChat(job.id, input.role);
    return {};
  }
  throw failure(404, "This action is unavailable.");
}

async function readBody(req) {
  if (req.headers.origin && req.headers.origin !== origin) throw failure(403, "This request came from another site.");
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers["content-type"] || "")) throw failure(415, "Expected JSON.");
  req.setEncoding("utf8");
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 12_000) throw failure(413, "Request too large.");
  }
  try {
    const input = JSON.parse(data);
    if (input && typeof input === "object" && !Array.isArray(input)) return input;
  } catch {}
  throw failure(400, "Invalid request.");
}

async function paymentWebhook(req, res) {
  if (req.method !== "POST") throw failure(405, "Method unavailable.");
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 64_000) throw failure(413, "Webhook too large.");
    chunks.push(chunk);
  }
  const link = onlinePayments.signedEvent(Buffer.concat(chunks), req.headers["x-razorpay-signature"]);
  if (link) transact(null, (market, read) => {
    const state = read();
    const job = state.requests.find((entry) => entry.checkout?.reference === link.reference_id && entry.checkout.mode === "razorpay-test");
    if (job) {
      recordCheckout(job, job.checkout, link);
      market.save(state);
    }
    return {};
  });
  send(res, 200, { received: true });
}

async function checkoutAction(account, action, input, query) {
  const mode = onlinePayments.mode;
  if (!account) throw failure(401, "Sign in to continue.");
  if (!mode) throw failure(404, "Online checkout is unavailable.");
  function update(change) {
    return transact(account, (market, read) => {
      const state = read();
      const job = state.requests.find((entry) => entry.id === input.job && entry.customerId === account.id);
      if (!job) throw failure(404, "Booking unavailable.");
      change(job);
      market.save(state);
      return { job };
    }, query, true);
  }
  if (action === "checkout-demo" || action === "checkout-cancel") {
    if (mode !== "demo") throw failure(404, "Demo checkout is unavailable.");
    return update((job) => {
      if (job.checkout?.reference !== input.reference || job.checkout?.mode !== "demo") {
        if (typeof input.reference === "string" && job.payments?.some((entry) => entry.id === input.reference && entry.source === "demo")) return;
        throw failure(409, "This checkout has changed. Refresh the booking.");
      }
      if (action === "checkout-cancel") delete job.checkout;
      else recordCheckout(job, job.checkout);
    });
  }
  let checkout;
  const started = update((job) => {
    checkout = action === "checkout-start" ? reserveCheckout(job, mode, input.amountPaise) : job.checkout;
    if (checkout && checkout.mode !== mode) throw failure(409, "Checkout needs review. Contact support.");
  });
  if (mode === "demo" || !checkout) return started;
  const link = await onlinePayments.linkFor(input.job, checkout, action === "checkout-start");
  return update((job) => {
    if (job.checkout?.reference !== checkout.reference) return;
    if (link) recordCheckout(job, job.checkout, link);
    else if (!job.checkout.linkId && checkout.expiresAt <= Date.now()) delete job.checkout;
  });
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const staticFiles = new Set(["index.html", "appearance.js", "marketplace.js", "mobile/shared/marketplace.js", "worker-language.js", "walkthrough.js",
  "tracking.js", "contact.js", "live-preview.js", "script.js", "styles.css"]);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg" };
const appMime = { ...mime, ".tsv": "text/tab-separated-values; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const nativeActions = new Set(["discover", "state", "slots", "coverage", "locations", "worker-details", "register", "login", "logout", "phone-start", "phone-verify", "config",
  "save-address", "remove-address", "review", "profile", "hours", "published", "immediate", "block", "remove-block", "request", "transition", "message", "estimate",
  "availability", "save-worker", "remove-worker", "block-worker", "unblock-worker", "report-worker", "health", "verification-request", "arrival-confirm", "safety-report",
  "checkout-start", "checkout-check", "checkout-demo", "checkout-cancel", "support-create", "demo-worker-step", ...agreements.commands.keys()]);
const operationFields = new Map([
  ["request", ["intent", "proId", "scope", "area", "appointment", "timing", "contact", "tier",
    "expectedPrice", "expectedUnit", "expectedIncludes", "expectedIncludesHi", "customerName", "address", "landmark", "notes"]],
  ["transition", ["job", "role", "change"]],
  ["demo-worker-step", ["job", "role", "change"]],
  ["message", ["job", "role", "message"]],
  ["estimate", ["job", "role", "minutes"]],
]);
const errorCodes = {
  401: "AUTHENTICATION_REQUIRED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE",
  429: "RATE_LIMITED", 500: "SERVER_ERROR", 503: "SERVICE_UNAVAILABLE",
};

const eventLabels = {
  "quote-send": "Quote ready to review", "quote-respond": "Quote decision recorded",
  "payment-report": "Payment recorded", "payment-confirm": "Payment report reviewed", "payment-reverse": "Receipt reversed",
  "reschedule-propose": "New appointment proposed", "reschedule-respond": "Appointment decision recorded",
  "report-delay": "Arrival estimate updated", "help-create": "Booking issue reported", "help-respond": "Booking issue updated",
};

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function nativeMutation(action, market, state, input) {
  const legacyFields = operationFields.get(action);
  const fields = action === "arrival-confirm" ? ["job", "role", "confirmed"] : action === "safety-report" ? ["job", "role", "message"]
    : agreements.commands.has(action) ? ["job", "role", ...agreements.commands.get(action)] : legacyFields;
  if (!fields) return mutate(action, market, state, input, true);
  const { operationId } = input;
  if (typeof operationId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(operationId)) {
    throw failure(400, "Provide a valid operationId for this booking action.", "INVALID_OPERATION_ID");
  }
  const values = fields.map((field) => canonical(input[field]));
  if (legacyFields && values.some((value, index) => value !== undefined
    && (["expectedPrice", "minutes"].includes(fields[index]) ? !Number.isInteger(value) : typeof value !== "string"))) {
    throw failure(400, "Check the booking details.");
  }
  // Keep byte-for-byte fingerprints for requests created by older clients.
  if (action === "request" && (input.brief !== undefined || input.hours !== undefined)) values.push(canonical(input.brief), input.hours);
  if (action === "request" && input.safetyVersion !== undefined) values.push(input.safetyVersion);
  if (action === "request" && input.pinCode !== undefined) values.push({ pinCode: input.pinCode });
  if (action === "transition" && input.reason !== undefined) values.push(input.reason);
  const fingerprint = sha256(JSON.stringify([action, values]));
  const previous = getOperation.get(state.account.id, operationId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) {
      throw failure(409, "This operationId was already used for another request.", "OPERATION_ID_REUSED");
    }
    return { jobId: previous.job };
  }
  const result = mutate(action, market, state, input, true, action === "request" ? fingerprint : undefined);
  if (result.error) return { ...result, code: result.code || "BOOKING_CONFLICT" };
  const jobId = result.job.id;
  putOperation.run(state.account.id, operationId, fingerprint, jobId);
  const label = eventLabels[action] || (input.change === "cancel" && input.role === "pro" ? "Booking cancelled by worker" : "");
  if (label) {
    const toWorker = input.role === "customer";
    insertEvent.run(crypto.randomUUID(), toWorker ? result.job.proId : result.job.customerId, jobId,
      toWorker ? "pro" : "customer", label, Date.now());
  }
  return { jobId, ...(result.sideTableChanged && { sideTableChanged: true }) };
}

async function handleApi(req, res, url, native) {
  const action = url.pathname.slice(native ? "/api/v1/".length : "/api/".length);
  if (native && !nativeActions.has(action)) throw failure(404, "This action is unavailable.");
  const sessions = native ? nativeSessions : browserSessions;
  const token = sessionToken(req, native);
  const readAccount = () => token ? sessions.account.get(sha256(token), Date.now()) || null : null;
  const snapshotFor = (account, action = () => ({})) => transact(account, action, url.searchParams, native);

  if (native && action === "discover" && req.method === "GET") {
    const result = snapshotFor(null);
    result.state.account = { id: "", handle: "" };
    result.state.requests = [];
    result.state.profile = null;
    result.state.bookingUpdates = [];
    return send(res, 200, result);
  }
  if (native && action === "health" && req.method === "GET") {
    db.prepare("SELECT 1").get();
    return send(res, 200, { service: "handyhive", apiVersion: 1, status: "ok" });
  }
  if (native && action === "config" && req.method === "GET") return send(res, 200, { phoneMode, requireVerification: config.requireVerification });
  if (native && action === "worker-details" && req.method === "GET") {
    const account = readAccount();
    const id = url.searchParams.get("id");
    const pinCode = url.searchParams.get("pinCode");
    if (!isPinCode(pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    const details = transact(account, (market, read) => {
      const worker = market.pro(id, read());
      if (id === account?.id || !worker?.published || !bookable(account, worker) || !market.coversPin(worker, pinCode)) {
        throw failure(404, "This worker is unavailable for this PIN code.");
      }
      return {
        workPhone: worker.workPhone || "",
        reviews: db.prepare("SELECT rating, comment, created FROM service_reviews WHERE pro=? ORDER BY created DESC, rowid DESC LIMIT 8").all(id),
      };
    });
    return send(res, 200, details);
  }
  if (native && action === "locations" && req.method === "GET") {
    const account = readAccount();
    const query = url.searchParams.get("q")?.trim();
    if (!query || query.length < 2 || query.length > 100) throw failure(400, "Type at least two letters of your location.", "INVALID_LOCATION");
    const areas = transact(account, (market, read) => market.pros(read()).filter((person) => person.published && person.id !== account?.id && bookable(account, person))
      .flatMap((person) => person.areas));
    return send(res, 200, await searchPlaces(query, areas, url.searchParams.get("postal") === "1"));
  }
  if (native && action === "coverage" && req.method === "GET") {
    const account = readAccount();
    const pinCode = url.searchParams.get("pinCode");
    if (!isPinCode(pinCode)) {
      throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    }
    const result = transact(account, (market, read) => ({
      ids: market.pros(read()).filter((person) => person.id !== account?.id && person.published && bookable(account, person)
        && market.coversPin(person, pinCode)).map((person) => person.id),
    }));
    return send(res, 200, result);
  }
  if (native && action === "availability" && req.method === "GET") {
    const account = readAccount();
    const { searchParams } = url;
    const pinCode = searchParams.get("pinCode");
    const day = searchParams.get("day");
    const date = day + "T";
    const scope = searchParams.get("scope") || "";
    if (!isPinCode(pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    if (scope.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(day || "")) {
      throw failure(400, "Choose an appointment date.");
    }
    return send(res, 200, transact(account, (market, read) => {
      const state = read();
      const options = {};
      for (const person of market.pros(state)) {
        if (person.id === account?.id || !person.published || !bookable(account, person) || !market.coversPin(person, pinCode)
          || (scope && !market.service(person.service)?.tasks.includes(scope))) continue;
        const hours = person.hours ?? market.defaultHours;
        const start = market.appointmentTime(date + hours.start);
        const end = market.appointmentTime(date + hours.end);
        const slots = [];
        for (let time = start; time < end; time += 3_600_000) {
          const slot = market.localAppointment(time);
          if (market.available(person, "", slot, state, "", scope, pinCode)) slots.push(slot);
        }
        if (slots.length) options[person.id] = slots;
      }
      return { options };
    }));
  }
  if (native && action === "slots" && req.method === "GET") {
    const account = readAccount();
    if (!account) throw failure(401, "Sign in to continue.");
    const proId = url.searchParams.get("proId");
    const pinCode = url.searchParams.get("pinCode");
    const slots = url.searchParams.getAll("slot");
    const timing = url.searchParams.get("timing") || "";
    const scope = url.searchParams.get("scope") || "";
    const hours = Number(url.searchParams.get("hours") || "2");
    if (!isPinCode(pinCode)) throw failure(400, "Enter a valid six-digit PIN code.", "INVALID_PIN_CODE");
    if (proId === account.id || slots.length > 24 || !["", "now"].includes(timing)
      || scope.length > 120 || !Number.isInteger(hours) || hours < 2 || hours > 8
      || slots.some((slot) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(slot))) {
      throw failure(400, "Check the booking details.");
    }
    const result = transact(account, (market, read) => {
      const state = read();
      const person = market.pro(proId, state);
      if (!bookable(account, person)) return { slots: [], immediate: false };
      return { slots: slots.filter((slot) => market.available(person, "", slot, state, "", scope, pinCode)
          && (person.unit !== "hourly" || !market.slotError(person, { appointment: slot, duration: hours * 60 }, state))),
        immediate: timing === "now" && market.available(person, "", "", state, "now", "", pinCode) };
    });
    return send(res, 200, result);
  }
  if (req.method === "GET" && action === "state") {
    const account = readAccount();
    if (native && !account) throw failure(401, "Sign in to continue.");
    return send(res, 200, snapshotFor(account));
  }
  if (req.method !== "POST" || (native && action === "state")) throw failure(405, "Method unavailable.");
  const input = await readBody(req);
  if (native && action === "locations") {
    const { latitude, longitude } = input;
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      throw failure(400, "Invalid location coordinates.", "INVALID_LOCATION");
    }
    return send(res, 200, await searchPlaces.reverse(latitude, longitude));
  }
  if (native && action.startsWith("checkout-")) return send(res, 200, await checkoutAction(readAccount(), action, input, url.searchParams));
  if (action === "phone-start") return send(res, 200, await startPhone(input, req));
  if (action === "logout") {
    if (token) sessions.revoke.run(sha256(token));
    if (native) return send(res, 200, { signedOut: true });
    res.setHeader("Set-Cookie", cookieName + "=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    return send(res, 200, snapshotFor(null));
  }
  if (["register", "login", "phone-verify"].includes(action)) {
    if (twilio && action !== "phone-verify") throw failure(404, "Use phone sign-in.");
    const account = action === "phone-verify" ? await verifyPhone(input) : signIn(action, input, req);
    const session = createSession(account, sessions);
    const response = snapshotFor(account);
    if (native) return send(res, 200, { ...response, session });
    res.setHeader("Set-Cookie", cookieName + "=" + session.token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + sessionAge + (config.production ? "; Secure" : ""));
    return send(res, 200, response);
  }
  const account = readAccount();
  if (native && !account) throw failure(401, "Sign in to continue.");
  const applyMutation = native ? nativeMutation : mutate;
  const response = snapshotFor(account, (market, read) => applyMutation(action, market, read(), input));
  return send(res, response.error ? 409 : 200, response);
}

if (config.previewWorkers) seedPreviewWorkers();

const server = http.createServer(async (req, res) => {
  let native = false;
  try {
    const url = new URL(req.url, origin);
    native = url.pathname.startsWith("/api/v1/");
    const emulatorHost = "10.0.2.2:" + server.address().port;
    if (req.headers.host !== new URL(origin).host && !(!config.production && native && req.headers.host === emulatorHost)) {
      throw failure(400, "Use " + origin + ".");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    if (config.production) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    if (url.pathname === "/api/payments/razorpay-webhook") return await paymentWebhook(req, res);
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url, native);
    }
    if (appPreview && req.method === "GET") {
      const pathname = decodeURIComponent(url.pathname);
      const entry = pathname === "/" || /^\/(?:customer|sign-in|worker(?:-profile)?|account|support|(?:services|tasks|providers)\/[a-z0-9-]+|bookings(?:\/[a-z0-9-]+(?:\/(?:payment|review))?)?|request\/[a-z0-9-]+)\/?$/.test(pathname);
      const asset = path.resolve(appPreview, "." + pathname);
      const type = entry ? mime[".html"] : appMime[path.extname(asset)];
      if (!type || (!entry && !asset.startsWith(appPreview + path.sep))) throw failure(404, "Page unavailable.");
      let body;
      try { body = await fs.promises.readFile(entry ? path.join(appPreview, "index.html") : asset); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        throw failure(entry ? 503 : 404, "Website build unavailable. Run npm run build:web from the project folder.");
      }
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      return res.end(body);
    }
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (req.method !== "GET" || (!staticFiles.has(file) && !/^assets\/(?:hero|service-[1-4]|pro-[1-8])\.jpg$/.test(file))) {
      throw failure(404, "Page unavailable.");
    }
    let body = await fs.promises.readFile(path.join(__dirname, file === "marketplace.js" ? "mobile/shared/marketplace.js" : file));
    if (file === "index.html") body = body.toString().replace("<head>", '<head>\n    <meta name="handyhive-mode" content="' + phoneMode + '">');
    res.writeHead(200, { "Content-Type": mime[path.extname(file)], "Cache-Control": "no-store" });
    res.end(body);
  } catch (error) {
    if (!error.status) console.error(error);
    if (res.headersSent) return res.end();
    const status = error.status || 500;
    const body = { error: error.status ? error.message : "The preview server could not complete this request." };
    if (native) body.code = error.code || errorCodes[status] || "INVALID_REQUEST";
    send(res, status, body);
  }
}).listen(port, config.host, () => {
  origin = config.publicOrigin || "http://127.0.0.1:" + server.address().port;
  console.log("HandyHive connected preview: " + origin);
});

module.exports = server;

function expireBookings() {
  try {
    const now = Date.now();
    const { requests } = JSON.parse(getStore.get().body);
    if (requests.some((job) => job.status === "pending" && job.deadline <= now)) {
      transact(null, () => ({}));
    }
  } catch (error) {
    console.error("Booking expiry sweep failed", error);
  }
}

expireBookings();
setInterval(expireBookings, 2000).unref();

if (twilio?.sendBooking) {
  let delivering = false;
  setInterval(async () => {
    if (delivering) return;
    delivering = true;
    try {
      await updates.deliver();
    } catch (error) {
      console.error("Booking notification queue error", error);
    } finally {
      delivering = false;
    }
  }, 2000).unref();
}
