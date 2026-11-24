#!/usr/bin/env node
"use strict";
// Run from a trusted operator shell with access to the private SQLite disk.
const { DatabaseSync } = require("node:sqlite");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const [action, owner, operator] = process.argv.slice(2);
if (!["grant", "revoke"].includes(action) || !/^[a-f0-9-]{36}$/i.test(owner || "") || !operator || operator.length > 100) {
  throw new Error("Usage: HANDYHIVE_DB=<existing.sqlite> node scripts/admin-access.js grant|revoke <account-uuid> <operator-name>");
}
if (!process.env.HANDYHIVE_DB || !fs.existsSync(process.env.HANDYHIVE_DB)) throw new Error("Set HANDYHIVE_DB to the existing database.");
const db = new DatabaseSync(process.env.HANDYHIVE_DB);
try {
  db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;");
  try {
    if (!db.prepare("SELECT 1 FROM accounts WHERE id=?").get(owner)) throw new Error("Account not found.");
    const count = db.prepare("SELECT COUNT(*) AS n FROM admin_accounts").get().n;
    if (action === "revoke" && count <= 1 && db.prepare("SELECT 1 FROM admin_accounts WHERE owner=?").get(owner)) {
      throw new Error("Grant another admin before revoking the last one.");
    }
    const result = action === "grant"
      ? db.prepare("INSERT OR IGNORE INTO admin_accounts(owner,granted_by,granted_at) VALUES (?,?,?)").run(owner, operator.trim(), Date.now())
      : db.prepare("DELETE FROM admin_accounts WHERE owner=?").run(owner);
    if (result.changes) db.prepare("INSERT INTO admin_access_audit VALUES (?,?,?,?,?)").run(randomUUID(), operator.trim(), owner, action, Date.now());
    db.exec("COMMIT");
    console.log(result.changes ? "Admin access updated." : "No change.");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
} finally { db.close(); }
