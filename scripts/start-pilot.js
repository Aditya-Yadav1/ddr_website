"use strict";

const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { resolveEndpoint, USB_PILOT_ENDPOINT } = require("../mobile/api-endpoint");

const args = process.argv.slice(2);
const check = args.includes("--check");
const usb = args.includes("--usb");
const [address = usb ? "127.0.0.1" : "10.184.63.213", port = "4175"] = args.filter((arg) => !arg.startsWith("--"));
const origin = "http://" + address + ":" + port;

async function reusePilot(endpoint) {
  async function readStatus(route) {
    const response = await fetch(endpoint + "/" + route, {
      redirect: "error",
      signal: AbortSignal.timeout(1500),
    });
    return response.ok && response.headers.get("content-type")?.startsWith("application/json")
      ? response.json() : null;
  }
  try {
    const health = await readStatus("health");
    if (health?.service !== "handyhive" || health.apiVersion !== 1 || health.status !== "ok") return false;
    const config = await readStatus("config");
    if (config?.phoneMode !== "preview" || config.requireVerification !== false) return false;
  } catch {
    return false;
  }
  console.log("HandyHive Pilot is already running at " + origin + ".");
  console.log("Leave the original server window open. Check connectivity on the phone at " + endpoint + "/health");
  return true;
}

function connectUsb() {
  const adb = process.env.HANDYHIVE_ADB || "C:/hhapk/platform-tools/adb.exe";
  const runAdb = (args, timeout = 8000) => {
    const result = spawnSync(adb, ["-d", ...args], { encoding: "utf8", timeout });
    if (result.error) throw new Error("Android tools could not run: " + result.error.message);
    return result;
  };
  const state = runAdb(["get-state"]);
  if (state.status !== 0 || state.stdout.trim() !== "device") {
    throw new Error((state.stderr || "No USB Android device was available.").trim()
      + "\nConnect one Android phone with a data cable, enable USB debugging, and allow this computer on your phone.");
  }
  const installed = runAdb(["shell", "pm", "path", "com.handyhive.app.pilot.usb"]);
  if (installed.status !== 0 || !installed.stdout.startsWith("package:")) {
    const apk = path.join(process.env.USERPROFILE || os.homedir(), "Downloads", "HandyHive-0.2.0-usb-pilot.apk");
    if (!fs.existsSync(apk)) throw new Error("USB pilot APK is missing from Downloads. Put the installer back and reopen this launcher.");
    console.log("Installing HandyHive USB Pilot on the connected phone...");
    const install = runAdb(["install", "-r", apk], 120000);
    if (install.status !== 0 || !install.stdout.includes("Success")) {
      throw new Error((install.stderr || install.stdout || "Android did not accept the APK over USB.").trim()
        + "\nInstall the USB pilot APK directly on the phone, then reopen this launcher.");
    }
  }
  const forward = runAdb(["reverse", "tcp:" + port, "tcp:" + port]);
  if (forward.status !== 0) throw new Error("Could not set up the USB connection: " + forward.stderr.trim());
  console.log("USB forwarding ready for " + USB_PILOT_ENDPOINT + ".");
}

async function main() {
  const endpoint = resolveEndpoint(origin + "/api/v1", "android", false, usb ? "usb" : true);
  if (!Object.values(os.networkInterfaces()).flat().some((item) => item.address === address)) {
    throw new Error("This computer no longer has " + address + ". See PILOT_QUICKSTART.md to rebuild for its current Wi-Fi address.");
  }
  if (usb && !check) connectUsb();
  if (!check && await reusePilot(endpoint)) return;

  Object.assign(process.env, {
    NODE_ENV: "development",
    HANDYHIVE_HOST: address,
    HANDYHIVE_PORT: port,
    HANDYHIVE_PUBLIC_ORIGIN: origin,
    HANDYHIVE_PHONE_MODE: "preview",
    HANDYHIVE_REQUIRE_VERIFICATION: "0",
    HANDYHIVE_DEMO_WORKERS: "1",
    HANDYHIVE_TRUST_PROXY: "0",
    HANDYHIVE_APP_PREVIEW: "1",
    HANDYHIVE_DB: path.join(process.env.LOCALAPPDATA || os.homedir(), "HandyHive", "phone-pilot.sqlite"),
  });

  const prepare = spawnSync(process.execPath, [path.join(__dirname, "prepare-pilot.js")], { stdio: "inherit" });
  if (prepare.error) throw prepare.error;
  if (prepare.status !== 0) throw new Error("Could not prepare the phone pilot database.");

  if (check) {
    console.log("Pilot configuration and test database ready. Expected phone health endpoint: " + endpoint + "/health");
    return;
  }

  const server = require("../server");
  server.once("listening", () => {
    console.log("Keep this window open. Use synthetic test data only.");
    console.log("Check connectivity on the phone at " + endpoint + "/health");
  });
  server.once("error", async (error) => {
    if (error.code === "EADDRINUSE") {
      // Another launcher may have started after the first health check.
      if (await reusePilot(endpoint)) return;
      console.error("Port " + port + " is occupied, but no compatible HandyHive Pilot answered at " + origin + ".");
      console.error("Close the program using that port, then run START_HANDYHIVE.cmd again. The APK expects this address.");
    } else {
      console.error("HandyHive could not start: " + error.message);
    }
    process.exitCode = 1;
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
