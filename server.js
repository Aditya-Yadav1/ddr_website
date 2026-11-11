"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const createMarketplace = require("./marketplace.js");
const createTwilio = require("./twilio.js");
const createBookingUpdates = require("./booking-updates.js");

const port = Number(process.env.HANDYHIVE_PORT || 4174);
let origin = "http://127.0.0.1:" + port;
const phoneMode = process.env.HANDYHIVE_PHONE_MODE || "preview";
if (!["preview", "twilio"].includes(phoneMode)) throw new Error("HANDYHIVE_PHONE_MODE must be preview or twilio.");
const twilio = createTwilio(process.env);
const dbPath = process.env.HANDYHIVE_DB || path.join(process.env.LOCALAPPDATA || require("node:os").homedir(),
  "HandyHive", twilio ? "verified.sqlite" : "preview.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
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
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64);
const owns = (account, job, role) => Boolean(account && job && (role === "pro" ? job.proId === account.id : role === "customer" && job.customerId === account.id));

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
    if (!query) return result;
    const response = { ...result, state: snapshot(market, state, query, native) };
    if (native) {
      response.revision = getRevision.get().value;
      response.serverTime = Date.now();
    }
    return response;
  });
}

function snapshot(market, state, query, native) {
  const account = state.account;
  const directory = state.profiles.filter((profile) => profile.published).map(({ blocks, ...profile }) => profile);
  const params = { area: query.get("area"), appointment: query.get("appointment") || "", timing: query.get("timing") || "" };
  const matches = market.areas.includes(params.area) ? {
    ...params,
    ids: market.pros(state).filter((profile) => profile.id !== account?.id
      && market.available(profile, params.area, params.appointment, state, params.timing)).map((profile) => profile.id),
  } : null;
  const { bookingUpdates, bookingSms } = updates.forAccount(account);
  return {
    account, profile: state.profile, profiles: directory, matches,
    bookingUpdates, ...(!native && { bookingSms }),
    ...(native && { catalog: {
      services: market.services.map(({ id, name, tasks }) => ({ id, name, tasks })),
      defaultHours: market.defaultHours,
    } }),
    requests: state.requests.filter((job) => owns(account, job, "customer") || owns(account, job, "pro")),
  };
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
    const keys = ["address:" + req.socket.remoteAddress, "phone:" + phone];
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
  const address = req.socket.remoteAddress;
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

function validateProfile(market, input, previous, account) {
  const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const name = text(input.name, 60);
  const bio = text(input.bio, 360);
  const { service, unit, years, price } = input;
  const areas = Array.isArray(input.areas) ? [...new Set(input.areas)] : [];
  const languages = Array.isArray(input.languages) ? input.languages.slice(0, 10).map((value) => text(value, 30)).filter(Boolean) : [];
  if (!name || !bio || !market.service(service) || !Object.hasOwn(market.units, unit)
    || !areas.length || !areas.every((area) => market.areas.includes(area))
    || !Number.isInteger(years) || years < 0 || years > 70 || !Number.isInteger(price) || price < 1 || price > 100000) {
    throw failure(400, "Check the name, service, areas, experience, description and rate.");
  }
  return {
    ...previous, id: account.id, name, bio, service, unit, years, price, areas, languages,
    credential: text(input.credential, 100), published: true, sample: false,
    hours: previous?.hours || market.defaultHours, immediate: previous?.immediate ?? false,
  };
}

function mutate(action, market, state, input) {
  const { account, profile } = state;
  if (!account) throw failure(401, "Sign in to continue.");
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
  if (action === "profile") return saveProfile(validateProfile(market, input, profile, account));
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
    const { intent, proId, scope, area, appointment = "", timing = "", contact } = input;
    if (![intent, proId].every((value) => typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value))
      || proId === account.id || typeof appointment !== "string" || !["", "now"].includes(timing)
      || !["In-app message", "Request a call"].includes(contact)) {
      throw failure(400, "Choose another professional and check the request details.");
    }
    return market.request({ intent, proId, scope, area, appointment, timing, contact });
  }
  const job = state.requests.find((item) => item.id === input.job);
  if (!owns(account, job, input.role)) throw failure(404, "Request unavailable.");
  if (action === "transition") {
    const allowed = input.role === "pro" ? ["accept", "decline", "depart", "arrive", "start", "complete"] : ["cancel"];
    if (!allowed.includes(input.change)) throw failure(400, "This booking action is unavailable.");
    return market.transition(job.id, input.change, input.role, account.id);
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
  if (req.headers["content-type"] !== "application/json") throw failure(415, "Expected JSON.");
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

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const staticFiles = new Set(["index.html", "appearance.js", "marketplace.js", "worker-language.js", "walkthrough.js",
  "tracking.js", "contact.js", "live-preview.js", "script.js", "styles.css"]);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg" };
const nativeActions = new Set(["state", "register", "login", "logout", "phone-start", "phone-verify",
  "profile", "request", "transition", "message"]);
const operationFields = new Map([
  ["request", ["intent", "proId", "scope", "area", "appointment", "timing", "contact"]],
  ["transition", ["job", "role", "change"]],
  ["message", ["job", "role", "message"]],
]);
const errorCodes = {
  401: "AUTHENTICATION_REQUIRED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE",
  429: "RATE_LIMITED", 500: "SERVER_ERROR", 503: "SERVICE_UNAVAILABLE",
};

function nativeMutation(action, market, state, input) {
  const fields = operationFields.get(action);
  if (!fields) return mutate(action, market, state, input);
  const { operationId } = input;
  if (typeof operationId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(operationId)) {
    throw failure(400, "Provide a valid operationId for this booking action.", "INVALID_OPERATION_ID");
  }
  const values = fields.map((field) => input[field]);
  if (values.some((value) => value !== undefined && typeof value !== "string")) {
    throw failure(400, "Check the booking details.");
  }
  const fingerprint = sha256(JSON.stringify([action, values]));
  const previous = getOperation.get(state.account.id, operationId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) {
      throw failure(409, "This operationId was already used for another request.", "OPERATION_ID_REUSED");
    }
    return { jobId: previous.job };
  }
  const result = mutate(action, market, state, input);
  if (result.error) return { ...result, code: result.code || "BOOKING_CONFLICT" };
  const jobId = result.job.id;
  putOperation.run(state.account.id, operationId, fingerprint, jobId);
  return { jobId };
}

async function handleApi(req, res, url, native) {
  const action = url.pathname.slice(native ? "/api/v1/".length : "/api/".length);
  if (native && !nativeActions.has(action)) throw failure(404, "This action is unavailable.");
  const sessions = native ? nativeSessions : browserSessions;
  const token = sessionToken(req, native);
  const readAccount = () => token ? sessions.account.get(sha256(token), Date.now()) || null : null;
  const snapshotFor = (account, action = () => ({})) => transact(account, action, url.searchParams, native);

  if (req.method === "GET" && action === "state") {
    const account = readAccount();
    if (native && !account) throw failure(401, "Sign in to continue.");
    return send(res, 200, snapshotFor(account));
  }
  if (req.method !== "POST" || (native && action === "state")) throw failure(405, "Method unavailable.");
  const input = await readBody(req);
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
    res.setHeader("Set-Cookie", cookieName + "=" + session.token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + sessionAge);
    return send(res, 200, response);
  }
  const account = readAccount();
  if (native && !account) throw failure(401, "Sign in to continue.");
  const applyMutation = native ? nativeMutation : mutate;
  const response = snapshotFor(account, (market, read) => applyMutation(action, market, read(), input));
  return send(res, response.error ? 409 : 200, response);
}

const server = http.createServer(async (req, res) => {
  let native = false;
  try {
    const url = new URL(req.url, origin);
    native = url.pathname.startsWith("/api/v1/");
    const emulatorHost = "10.0.2.2:" + server.address().port;
    if (req.headers.host !== new URL(origin).host && !(native && req.headers.host === emulatorHost)) {
      throw failure(400, "Use " + origin + ".");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url, native);
    }
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (req.method !== "GET" || (!staticFiles.has(file) && !/^assets\/(?:hero|service-[1-4]|pro-[1-8])\.jpg$/.test(file))) {
      throw failure(404, "Page unavailable.");
    }
    let body = await fs.promises.readFile(path.join(__dirname, file));
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
}).listen(port, "127.0.0.1", () => {
  origin = "http://127.0.0.1:" + server.address().port;
  console.log("HandyHive connected preview: " + origin);
});

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
