"use strict";

module.exports = function migrate(db) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)");
  db.exec("BEGIN IMMEDIATE");
  try {
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=1").get()) {
      db.exec(
        "CREATE TABLE IF NOT EXISTS saved_workers (owner TEXT NOT NULL REFERENCES accounts(id), worker TEXT NOT NULL REFERENCES accounts(id), PRIMARY KEY(owner,worker));" +
        "CREATE TABLE IF NOT EXISTS booking_events (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES accounts(id), job TEXT NOT NULL, role TEXT NOT NULL, label TEXT NOT NULL, created INTEGER NOT NULL);" +
        "CREATE INDEX IF NOT EXISTS booking_events_owner ON booking_events(owner,created DESC);" +
        "INSERT INTO schema_migrations VALUES (1);"
      );
    }
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=2").get()) {
      db.exec(
        "CREATE TABLE IF NOT EXISTS support_tickets (" +
        "id TEXT NOT NULL, owner TEXT NOT NULL REFERENCES accounts(id), job TEXT NOT NULL," +
        "category TEXT NOT NULL, message TEXT NOT NULL, created INTEGER NOT NULL," +
        "status TEXT NOT NULL DEFAULT 'open', response TEXT NOT NULL DEFAULT '', responder TEXT," +
        "PRIMARY KEY (owner, id));" +
        "CREATE INDEX IF NOT EXISTS support_tickets_owner ON support_tickets(owner, created DESC);" +
        "INSERT INTO schema_migrations VALUES (2);"
      );
    }
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=3").get()) {
      db.exec(
        "ALTER TABLE service_reviews ADD COLUMN comment TEXT NOT NULL DEFAULT '';" +
        "CREATE INDEX IF NOT EXISTS service_reviews_worker ON service_reviews(pro,created DESC);" +
        "INSERT INTO schema_migrations VALUES (3);"
      );
    }
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=4").get()) {
      db.exec(
        "CREATE TABLE IF NOT EXISTS firebase_identities (uid TEXT PRIMARY KEY, owner TEXT NOT NULL UNIQUE REFERENCES accounts(id), created INTEGER NOT NULL);" +
        "CREATE TABLE IF NOT EXISTS account_profiles (owner TEXT PRIMARY KEY REFERENCES accounts(id), full_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '', updated INTEGER NOT NULL);" +
        "INSERT INTO schema_migrations VALUES (4);"
      );
    }
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=5").get()) {
      db.exec(
        "CREATE TABLE IF NOT EXISTS notification_reads (owner TEXT NOT NULL REFERENCES accounts(id), id TEXT NOT NULL, read_at INTEGER NOT NULL, PRIMARY KEY(owner,id));" +
        "INSERT INTO schema_migrations VALUES (5);"
      );
    }
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=6").get()) {
      db.exec(
        "CREATE TABLE IF NOT EXISTS account_deletion_requests (owner TEXT PRIMARY KEY REFERENCES accounts(id), requested INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open');" +
        "INSERT INTO schema_migrations VALUES (6);"
      );
    }
    if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=7").get()) {
      db.exec(
        "CREATE TABLE IF NOT EXISTS admin_accounts (owner TEXT PRIMARY KEY REFERENCES accounts(id), granted_by TEXT NOT NULL, granted_at INTEGER NOT NULL);" +
        "CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL REFERENCES accounts(id), action TEXT NOT NULL, subject TEXT NOT NULL, reason TEXT NOT NULL, created INTEGER NOT NULL);" +
        "CREATE TABLE IF NOT EXISTS admin_access_audit (id TEXT PRIMARY KEY, operator TEXT NOT NULL, owner TEXT NOT NULL, action TEXT NOT NULL, created INTEGER NOT NULL);" +
        "INSERT INTO schema_migrations VALUES (7);"
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};
