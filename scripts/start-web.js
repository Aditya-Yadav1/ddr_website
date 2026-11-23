"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repo = path.resolve(__dirname, "..");
const mobile = path.join(repo, "mobile");
const cli = path.join(mobile, "node_modules", "expo", "bin", "cli");
const watch = process.argv.includes("--watch");
const pages = process.argv.includes("--pages");
const buildOnly = pages || process.argv.includes("--build");
const phone = process.argv.includes("--phone");
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

function phonePreviewEnv(env) {
  const interfaces = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) =>
    addresses.filter(({ family, address }) => family === "IPv4" && /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(address))
      .map(({ address }) => ({ name, address })));
  const wifi = interfaces.filter(({ name }) => /wi-?fi|wireless|wlan/i.test(name));
  const candidates = wifi.length ? wifi : interfaces;
  const address = env.HANDYHIVE_HOST || (candidates.length === 1 ? candidates[0].address : "");
  if (!interfaces.some((network) => network.address === address)) {
    const available = interfaces.map((network) => network.name + " (" + network.address + ")").join(", ");
    throw new Error(available
      ? "Set HANDYHIVE_HOST to the address of the network your phone uses: " + available
      : "Connect this computer to a private Wi-Fi or Ethernet network, then try again.");
  }
  const port = Number(env.HANDYHIVE_PORT || 4174);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("HANDYHIVE_PORT must be between 1 and 65535.");
  for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]) delete env[key];
  return Object.assign(env, {
    NODE_ENV: "development",
    HANDYHIVE_HOST: address,
    HANDYHIVE_PORT: String(port),
    HANDYHIVE_PUBLIC_ORIGIN: `http://${address}:${port}`,
    HANDYHIVE_DB: path.join(repo, "handyhive-phone-web.sqlite"),
    HANDYHIVE_PHONE_MODE: "preview",
    HANDYHIVE_REQUIRE_VERIFICATION: "0",
    HANDYHIVE_DEMO_WORKERS: "1",
    HANDYHIVE_TRUST_PROXY: "0",
  });
}

function build() {
  return new Promise((resolve, reject) => {
    const args = [cli, "export", "--platform", "web"];
    if (pages) args.push("--output-dir", "dist-pages");
    builder = spawn(process.execPath, args, {
      cwd: mobile, env: { ...webEnv, ...(pages && { EXPO_NO_DOTENV: "1", EXPO_PUBLIC_HANDYHIVE_OFFLINE_DEMO: "1" }) },
      stdio: "inherit", windowsHide: true,
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
  const serverEnv = { ...process.env, HANDYHIVE_APP_PREVIEW: "1" };
  if (phone && !buildOnly) {
    phonePreviewEnv(serverEnv);
    console.log("Phone web preview (same network, fictional data only): " + serverEnv.HANDYHIVE_PUBLIC_ORIGIN);
    console.log("Wait for HandyHive to start, then open that address on your phone. Keep this server running.");
  }
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
  if (pages) {
    // Pages serves 404.html for a direct visit to an Expo Router route.
    const output = path.join(mobile, "dist-pages");
    fs.copyFileSync(path.join(output, "index.html"), path.join(output, "404.html"));
  }
  if (stopping || buildOnly) { stop(); return; }
  server = spawn(process.execPath, [path.join(repo, "server.js")], {
    cwd: repo, env: serverEnv, stdio: "inherit", windowsHide: true,
  });
  server.once("error", (error) => { console.error(error.message); stop(1); });
  server.once("exit", (code) => { server = undefined; stop(code || 0); });
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
