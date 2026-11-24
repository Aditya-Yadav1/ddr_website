"use strict";

const { randomUUID, createHash } = require("node:crypto");
const kinds = ["identity", "background", "skills"];
const consentVersion = "worker-checks-v1";
const fail = (status, message, code = "TRUST_REQUIRED") => Object.assign(new Error(message), { status, code });

module.exports = function workerTrust(db, verifiedPhone = false, invitedTest = false) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_requests (
      worker TEXT PRIMARY KEY REFERENCES accounts(id), consent TEXT NOT NULL, requested INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS worker_checks (
      worker TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL, status TEXT NOT NULL,
      checked INTEGER NOT NULL, expires INTEGER NOT NULL, reviewer TEXT NOT NULL, reference TEXT NOT NULL,
      name TEXT NOT NULL, service TEXT NOT NULL, PRIMARY KEY(worker,kind));
    CREATE TABLE IF NOT EXISTS worker_suspensions (
      worker TEXT PRIMARY KEY REFERENCES accounts(id), reason TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS trust_audit (
      id TEXT PRIMARY KEY, worker TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL,
      reference TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS safety_reports (
      id TEXT PRIMARY KEY, job TEXT NOT NULL, reporter TEXT NOT NULL REFERENCES accounts(id),
      worker TEXT NOT NULL, message TEXT NOT NULL, created INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', resolution TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS worker_blocks (
      owner TEXT NOT NULL REFERENCES accounts(id), worker TEXT NOT NULL REFERENCES accounts(id),
      created INTEGER NOT NULL, PRIMARY KEY(owner,worker));
  `);
  const findBlock = db.prepare("SELECT 1 FROM worker_blocks WHERE owner=? AND worker=?");
  const blocked = (owner, worker) => Boolean(owner && findBlock.get(owner, worker));
  function block(owner, worker, enabled) {
    const result = enabled
      ? db.prepare("INSERT OR IGNORE INTO worker_blocks VALUES (?,?,?)").run(owner, worker, Date.now())
      : db.prepare("DELETE FROM worker_blocks WHERE owner=? AND worker=?").run(owner, worker);
    return { sideTableChanged: Boolean(result.changes) };
  }
  function audit(worker, action, actor, reference) {
    db.prepare("INSERT INTO trust_audit VALUES (?,?,?,?,?,?)").run(randomUUID(), worker, action, actor, reference, Date.now());
  }
  function summary(profile) {
    if (!profile) return null;
    const rows = db.prepare("SELECT * FROM worker_checks WHERE worker=?").all(profile.id);
    const suspended = Boolean(db.prepare("SELECT 1 FROM worker_suspensions WHERE worker=?").get(profile.id));
    const checks = Object.fromEntries(kinds.map((kind) => {
      const row = rows.find((item) => item.kind === kind);
      const status = !row ? "not_checked" : row.status !== "verified" ? row.status
        : row.expires <= Date.now() ? "expired"
        : row.name !== profile.name || (kind === "skills" && row.service !== profile.service) ? "changed" : "verified";
      return [kind, { status, ...(row && { checkedAt: row.checked, expiresAt: row.expires }) }];
    }));
    const phoneVerified = verifiedPhone && Boolean(db.prepare("SELECT 1 FROM phone_accounts WHERE owner=?").get(profile.id));
    return { checks, suspended, phoneVerified,
      requested: Boolean(db.prepare("SELECT 1 FROM verification_requests WHERE worker=?").get(profile.id)),
      verifiedName: checks.identity.status === "verified" ? profile.name : null,
      eligible: !suspended && (phoneVerified || invitedTest) && kinds.every((kind) => checks[kind].status === "verified") };
  }
  function eligible(profile, required) {
    const trust = summary(profile);
    return Boolean(trust && !trust.suspended && (!required || trust.eligible));
  }
  function identityKey(profile) {
    if (!profile) return "";
    const identity = db.prepare("SELECT checked,status FROM worker_checks WHERE worker=? AND kind='identity'").get(profile.id);
    return createHash("sha256").update(JSON.stringify([profile.id, profile.name, identity?.checked, identity?.status])).digest("hex");
  }
  function submit(worker, consent) {
    if (consent !== consentVersion) throw fail(400, "Read and accept the worker verification consent.");
    const changed = db.prepare("INSERT OR IGNORE INTO verification_requests VALUES (?,?,?)").run(worker, consent, Date.now()).changes;
    if (changed) audit(worker, "consent", worker, consent);
    return { sideTableChanged: Boolean(changed) };
  }
  function review(profile, input) {
    const { kind, status, reviewer, reference, expiresAt } = input;
    if (!kinds.includes(kind) || !["verified", "rejected", "revoked"].includes(status)
      || typeof reviewer !== "string" || reviewer.trim().length < 3 || reviewer.length > 100
      || typeof reference !== "string" || reference.trim().length < 3 || reference.length > 160) {
      throw fail(400, "Provide check kind, status, reviewer and a private evidence reference.");
    }
    if (!db.prepare("SELECT 1 FROM verification_requests WHERE worker=?").get(profile.id)) throw fail(409, "Worker consent is required before review.");
    if (status === "verified" && (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 366 * 86400000)) {
      throw fail(400, "Verification expiry must be in the next 366 days.");
    }
    db.prepare(`INSERT INTO worker_checks VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(worker,kind) DO UPDATE SET
      status=excluded.status,checked=excluded.checked,expires=excluded.expires,reviewer=excluded.reviewer,
      reference=excluded.reference,name=excluded.name,service=excluded.service`)
      .run(profile.id, kind, status, Date.now(), status === "verified" ? expiresAt : 0, reviewer.trim(), reference.trim(), profile.name, profile.service);
    audit(profile.id, kind + ":" + status, reviewer, reference);
  }
  function suspend(worker, enabled, actor, reason) {
    if (!actor || !reason) throw fail(400, "An operator and reason are required.");
    if (enabled) db.prepare("INSERT INTO worker_suspensions VALUES (?,?,?) ON CONFLICT(worker) DO UPDATE SET reason=excluded.reason,created=excluded.created").run(worker, reason, Date.now());
    else db.prepare("DELETE FROM worker_suspensions WHERE worker=?").run(worker);
    audit(worker, enabled ? "suspend" : "reinstate", actor, reason);
  }
  function report(job, account, message) {
    if (typeof message !== "string" || message.trim().length < 10 || message.length > 1000) throw fail(400, "Describe the concern in 10 to 1,000 characters.");
    if (db.prepare("SELECT 1 FROM safety_reports WHERE job=? AND reporter=? AND worker=? AND status='open'").get(job.id, account.id, job.proId)) {
      throw fail(409, "Your concern is already recorded for review.");
    }
    db.prepare("INSERT INTO safety_reports (id,job,reporter,worker,message,created) VALUES (?,?,?,?,?,?)")
      .run(randomUUID(), job.id, account.id, job.proId, message.trim(), Date.now());
    audit(job.proId, "safety-report", account.id, job.id);
    return { job, sideTableChanged: true };
  }
  return { summary, eligible, identityKey, submit, review, suspend, report, audit, blocked, block,
    blocks: (owner) => db.prepare("SELECT worker FROM worker_blocks WHERE owner=? ORDER BY created DESC").all(owner),
    reports: (owner) => db.prepare("SELECT id,job,worker,message,created,status,resolution FROM safety_reports WHERE reporter=? ORDER BY created DESC").all(owner) };
};
module.exports.consentVersion = consentVersion;
