const { test } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const createTrust = require("../worker-trust");

test("worker checks require consent, expire, bind to identity and service, and disclose only public status", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE accounts(id TEXT PRIMARY KEY); INSERT INTO accounts VALUES ('worker'); CREATE TABLE phone_accounts(owner TEXT); INSERT INTO phone_accounts VALUES ('worker');");
    const trust = createTrust(db, true);
    const profile = { id: "worker", name: "Checked person", service: "plumbing" };
    const input = { status: "verified", reviewer: "operator-one", reference: "private-evidence-identifier", expiresAt: Date.now() + 86400000 };
    assert.throws(() => trust.review(profile, { ...input, kind: "identity" }), /consent/);
    trust.submit(profile.id, "worker-checks-v1");
    for (const kind of ["identity", "background", "skills"]) trust.review(profile, { ...input, kind });
    assert.equal(trust.eligible(profile, true), true);
    assert.equal(JSON.stringify(trust.summary(profile)).includes("private-evidence"), false);
    assert.equal(JSON.stringify(trust.summary(profile)).includes("operator-one"), false);
    assert.equal(trust.eligible({ ...profile, name: "Another person" }, true), false);
    assert.equal(trust.summary({ ...profile, service: "electrical" }).checks.skills.status, "changed");
    trust.suspend(profile.id, true, "operator-two", "Review incident");
    assert.equal(trust.eligible(profile, false), false);
    trust.suspend(profile.id, false, "operator-two", "Review complete");
    assert.equal(trust.eligible(profile, true), true);
    db.prepare("UPDATE worker_checks SET expires=? WHERE kind='identity'").run(Date.now() - 1);
    assert.equal(trust.summary(profile).checks.identity.status, "expired");
    assert.equal(trust.eligible(profile, true), false);
    assert.equal(createTrust(db, false).summary(profile).phoneVerified, false);
    assert.ok(db.prepare("SELECT COUNT(*) AS n FROM trust_audit").get().n >= 6);
  } finally { db.close(); }
});
