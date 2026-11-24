#!/usr/bin/env node
"use strict";
// Run only from a trusted operator shell. Never expose this command as a public API.
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const createTrust = require("../worker-trust");
const [command, inputPath] = process.argv.slice(2);
if (!process.env.HANDYHIVE_DB || !fs.existsSync(process.env.HANDYHIVE_DB)) throw new Error("Set HANDYHIVE_DB to the existing server database.");
const db = new DatabaseSync(process.env.HANDYHIVE_DB);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
const trust = createTrust(db, process.env.HANDYHIVE_PHONE_MODE === "twilio");
try {
  if (command === "queue") {
    console.log(JSON.stringify({ requests: db.prepare("SELECT * FROM verification_requests ORDER BY requested").all(),
      profiles: JSON.parse(db.prepare("SELECT body FROM marketplace WHERE id=1").get().body).profiles.map(({ id, name, service }) => ({ id, name, service })),
      reports: db.prepare("SELECT * FROM safety_reports WHERE status='open' ORDER BY created").all(),
      support: db.prepare("SELECT id, owner, job, category, message, created FROM support_tickets WHERE status='open' ORDER BY created").all(),
      accountDeletion: db.prepare("SELECT owner, requested FROM account_deletion_requests WHERE status='open' ORDER BY requested").all() }, null, 2));
  } else {
    if (!inputPath) throw new Error("Usage: node scripts/trust-admin.js queue | review|suspend|reinstate|resolve|withdraw|support-resolve input.json");
    const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    db.exec("BEGIN IMMEDIATE");
    try {
      if (command === "support-resolve") {
        if (typeof input.reviewer !== "string" || !input.reviewer.trim() || input.reviewer.length > 100
          || typeof input.response !== "string" || !input.response.trim() || input.response.length > 1000) {
          throw new Error("Provide an operator name and a reply of up to 1,000 characters.");
        }
        const result = db.prepare("UPDATE support_tickets SET status='resolved', response=?, responder=? WHERE id=? AND owner=? AND status='open'")
          .run(input.response.trim(), input.reviewer.trim(), input.id, input.owner);
        if (!result.changes) throw new Error("Open support request not found.");
        db.prepare("UPDATE marketplace_revision SET value=value+1 WHERE id=1").run();
        db.exec("COMMIT");
        console.log("Support reply saved.");
        return;
      }
      const profile = JSON.parse(db.prepare("SELECT body FROM marketplace WHERE id=1").get().body).profiles.find((person) => person.id === input.worker);
      if (!profile) throw new Error("Worker profile not found.");
      if (command === "review") trust.review(profile, { ...input, expiresAt: Date.parse(input.expiresAt) });
      else if (["suspend", "reinstate"].includes(command)) trust.suspend(input.worker, command === "suspend", input.reviewer, input.reason);
      else if (command === "resolve") {
        if (!input.reviewer || typeof input.resolution !== "string" || input.resolution.trim().length < 10 || input.resolution.length > 1000) throw new Error("Provide operator and a reporter-safe resolution of 10–1,000 characters.");
        const result = db.prepare("UPDATE safety_reports SET status='resolved',resolution=? WHERE id=? AND worker=? AND status='open'").run(input.resolution, input.report, input.worker);
        if (!result.changes) throw new Error("Open report not found.");
        trust.audit(input.worker, "report-resolved", input.reviewer, input.report);
      } else if (command === "withdraw") {
        trust.suspend(input.worker, true, input.reviewer, input.reason);
        db.prepare("DELETE FROM verification_requests WHERE worker=?").run(input.worker);
        db.prepare("DELETE FROM worker_checks WHERE worker=?").run(input.worker);
        trust.audit(input.worker, "consent-withdrawn", input.reviewer, input.reason);
      } else throw new Error("Unknown command.");
      db.prepare("UPDATE marketplace_revision SET value=value+1 WHERE id=1").run();
      db.exec("COMMIT");
      console.log("Saved. Public status:", JSON.stringify(trust.summary(profile)));
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
} finally { db.close(); }
