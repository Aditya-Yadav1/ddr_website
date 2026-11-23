"use strict";
// Create synthetic data using a temporary loopback-only API. Never overwrite an existing database.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createInterface } = require("node:readline");
async function main() {
  const database = path.join(process.env.LOCALAPPDATA || require("node:os").homedir(), "HandyHive", "phone-pilot.sqlite");
  if (fs.existsSync(database)) { console.log("Existing phone pilot database retained."); return; }
  const repo = path.join(__dirname, "..");
  const env = { ...process.env, NODE_ENV: "development", HANDYHIVE_DB: database, HANDYHIVE_HOST: "127.0.0.1",
    HANDYHIVE_PUBLIC_ORIGIN: "", HANDYHIVE_PORT: "0", HANDYHIVE_PHONE_MODE: "preview", HANDYHIVE_REQUIRE_VERIFICATION: "0" };
  const child = spawn(process.execPath, [path.join(repo, "server.js")], { env, stdio: ["ignore", "pipe", "inherit"] });
  const lines = createInterface({ input: child.stdout });
  try {
    const [line] = await once(lines, "line", { signal: AbortSignal.timeout(10000) });
    const origin = line.match(/http:\/\/127\.0\.0\.1:\d+$/)?.[0];
    if (!origin) throw new Error("Local seed API failed to start.");
    const seed = spawn(process.execPath, [path.join(repo, "mobile/seed-preview.mjs")], {
      env: { ...env, HANDYHIVE_PUBLIC_ORIGIN: origin }, stdio: "inherit",
    });
    const [code] = await once(seed, "exit");
    if (code !== 0) throw new Error("Pilot seeding failed. Existing data was retained for inspection.");
    console.log("Synthetic phone pilot data ready:", database);
  } finally {
    lines.close();
    if (child.exitCode === null) { const stopped = once(child, "exit"); child.kill(); await stopped; }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
