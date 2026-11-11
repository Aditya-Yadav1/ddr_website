"use strict";

const updates = {
  pending: { role: "pro", label: "New booking request" },
  accepted: { role: "customer", label: "Booking accepted" },
  declined: { role: "customer", label: "Booking declined" },
  expired: { role: "customer", label: "Booking request expired" },
  cancelled: { role: "pro", label: "Booking cancelled" },
  completed: { role: "customer", label: "Job completed" },
};

module.exports = function bookingUpdates(db, sms, readJobs) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS booking_sms_preferences (
      owner TEXT PRIMARY KEY REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS booking_updates (
      owner TEXT NOT NULL REFERENCES accounts(id),
      job TEXT NOT NULL,
      status TEXT NOT NULL,
      created INTEGER NOT NULL,
      sms TEXT NOT NULL,
      next_attempt INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      provider_sid TEXT,
      PRIMARY KEY (owner, job, status)
    );
    CREATE INDEX IF NOT EXISTS booking_updates_owner ON booking_updates(owner, created DESC);
    CREATE INDEX IF NOT EXISTS booking_updates_due ON booking_updates(next_attempt) WHERE sms='queued';
  `);
  const canOptIn = db.prepare("SELECT 1 FROM phone_accounts WHERE owner=?");
  const optedIn = db.prepare("SELECT 1 FROM booking_sms_preferences WHERE owner=?");
  const insert = db.prepare(`
    INSERT OR IGNORE INTO booking_updates (owner, job, status, created, sms, next_attempt) VALUES (?,?,?,?,?,?)
  `);
  const list = db.prepare("SELECT job,status,created FROM booking_updates WHERE owner=? ORDER BY created DESC, rowid DESC LIMIT 12");
  const finish = db.prepare(`
    UPDATE booking_updates SET sms=?, next_attempt=?, provider_sid=? WHERE owner=? AND job=? AND status=? AND sms='sending'
  `);

  return {
    record(before, after) {
      const previous = new Map(before.map((job) => [job.id, job.status]));
      const now = Date.now();
      for (const job of after) {
        const update = updates[job.status];
        if (!update || previous.get(job.id) === job.status) continue;
        const owner = update.role === "pro" ? job.proId : job.customerId;
        if (!owner) continue;
        insert.run(owner, job.id, job.status, now, sms && optedIn.get(owner) ? "queued" : "off", now);
      }
    },
    forAccount(account) {
      if (!account) return { bookingUpdates: [], bookingSms: null };
      return {
        bookingUpdates: list.all(account.id).map(({ job, status, created }) => ({ job, created, ...updates[status] })),
        bookingSms: sms && canOptIn.get(account.id) ? Boolean(optedIn.get(account.id)) : null,
      };
    },
    setSms(owner, enabled) {
      if (!sms || !canOptIn.get(owner)) return false;
      if (enabled) db.prepare("INSERT OR IGNORE INTO booking_sms_preferences VALUES (?)").run(owner);
      else {
        db.prepare("DELETE FROM booking_sms_preferences WHERE owner=?").run(owner);
        db.prepare("UPDATE booking_updates SET sms='skipped' WHERE owner=? AND sms IN ('queued','sending')").run(owner);
      }
      return true;
    },
    async deliver() {
      const now = Date.now();
      // Claim before contacting Twilio. An interrupted or ambiguous send is not replayed.
      const update = db.prepare(`
        UPDATE booking_updates SET sms='sending', attempts=attempts+1 WHERE rowid=(
          SELECT rowid FROM booking_updates WHERE sms='queued' AND next_attempt<=? ORDER BY next_attempt LIMIT 1
        ) RETURNING *
      `).get(now);
      if (!update) return;
      const recipient = db.prepare(`
        SELECT phone FROM phone_accounts JOIN booking_sms_preferences USING (owner) WHERE owner=?
      `).get(update.owner);
      const job = readJobs().find((item) => item.id === update.job);
      const expires = Math.min(update.created + 900000, update.status === "pending" ? (job?.deadline ?? now) : Infinity);
      const validity = Math.floor((expires - now) / 1000);
      let state = "skipped";
      let sid = null;
      let next = now;
      if (recipient && job?.status === update.status && validity >= 1) {
        try {
          const result = await sms(recipient.phone, "HandyHive: " + updates[update.status].label + ". Open HandyHive for details.", validity);
          state = result.state;
          sid = result.sid ?? null;
          if (state === "retry") {
            next = Date.now() + 15000 * 2 ** (update.attempts - 1);
            state = update.attempts < 3 && next < expires ? "queued" : "failed";
          }
        } catch {
          state = "unknown";
        }
      }
      finish.run(state, next, sid, update.owner, update.job, update.status);
    },
  };
};
