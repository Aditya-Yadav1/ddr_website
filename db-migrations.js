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
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};
