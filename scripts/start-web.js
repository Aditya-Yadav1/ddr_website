"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repo = path.resolve(__dirname, "..");
const mobile = path.join(repo, "mobile");
const cli = path.join(mobile, "node_modules", "expo", "bin", "cli");
const watch = process.argv.includes("--watch");
const buildOnly = process.argv.includes("--build");
let server;
let builder;
let rebuilding = false;
let pending = false;
let timer;
let stopping = false;
const watchers = [];

// Website builds always use the connected API on their own origin. Native
// pilot/offline flags from an Android build must not leak into the website.
const webEnv = { ...process.env, CI: "1" };
for (const key of ["EXPO_PUBLIC_HANDYHIVE_API_URL", "EXPO_PUBLIC_HANDYHIVE_PILOT", "EXPO_PUBLIC_HANDYHIVE_OFFLINE_DEMO", "HANDYHIVE_BUILD_CHANNEL", "EAS_BUILD_PROFILE"]) {
  delete webEnv[key];
}

function build() {
  return new Promise((resolve, reject) => {
    builder = spawn(process.execPath, [cli, "export", "--platform", "web"], {
      cwd: mobile, env: webEnv, stdio: "inherit", windowsHide: true,
    });
    builder.once("error", reject);
    builder.once("exit", (code) => {
      builder = undefined;
      if (code === 0) resolve();
      else reject(new Error("Website build failed. Fix the error above and save again."));
    });
  });
}

async function rebuild() {
  if (stopping) return;
  if (rebuilding) { pending = true; return; }
  rebuilding = true;
  try {
    await build();
    console.log("Website updated. Refresh the browser to see your changes.");
  } catch (error) {
    console.error(error.message);
  } finally {
    rebuilding = false;
    if (pending) { pending = false; void rebuild(); }
  }
}

function stop(code = 0) {
  stopping = true;
  clearTimeout(timer);
  for (const watcher of watchers) watcher.close();
  if (builder) builder.kill();
  if (server) server.kill();
  process.exitCode = code;
}

async function main() {
  if (!fs.existsSync(cli)) throw new Error("Install dependencies first: npm --prefix mobile ci");
  if (watch) {
    // Watch only source trees, never dependencies or generated exports.
    for (const directory of ["app", "src", "shared", "demo", "assets", "plugins"]) {
      watchers.push(fs.watch(path.join(mobile, directory), { recursive: true }, schedule));
    }
    for (const file of ["app.json", "app.config.js", "api-endpoint.js", "package.json"]) {
      watchers.push(fs.watch(path.join(mobile, file), schedule));
    }
  }
  rebuilding = true;
  await build();
  rebuilding = false;
  if (stopping || buildOnly) { stop(); return; }
  server = spawn(process.execPath, [path.join(repo, "server.js")], {
    cwd: repo, env: { ...process.env, HANDYHIVE_APP_PREVIEW: "1" }, stdio: "inherit", windowsHide: true,
  });
  server.once("error", (error) => { console.error(error.message); stop(1); });
  server.once("exit", (code) => stop(code || 0));
  if (watch) console.log("Watching shared app screens. Save a file, wait for the build, then refresh your browser.");
  if (pending) { pending = false; void rebuild(); }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => void rebuild(), 400);
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
main().catch((error) => { console.error(error.message); stop(1); });
