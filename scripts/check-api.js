#!/usr/bin/env node
"use strict";
const { resolveEndpoint } = require("../mobile/api-endpoint");
async function main() {
  const mode = process.env.EXPO_PUBLIC_HANDYHIVE_PILOT;
  const pilot = mode === "usb" ? "usb" : mode === "1";
  const endpoint = resolveEndpoint(process.env.EXPO_PUBLIC_HANDYHIVE_API_URL, "android", false, pilot);
  const response = await fetch(endpoint + "/health", { signal: AbortSignal.timeout(10000), redirect: "error" });
  if (!response.ok) throw new Error("API health check failed: HTTP " + response.status);
  const body = await response.json();
  if (body.service !== "handyhive" || body.apiVersion !== 1 || body.status !== "ok") throw new Error("This URL is not a compatible HandyHive API.");
  const configResponse = await fetch(endpoint + "/config", { signal: AbortSignal.timeout(10000), redirect: "error" });
  if (!configResponse.ok) throw new Error("API configuration check failed: HTTP " + configResponse.status);
  const config = await configResponse.json();
  if (!pilot && (config.phoneMode !== "twilio" || !config.requireVerification)) throw new Error("Production must use SMS sign-in and enforce worker verification.");
  if (pilot && (config.phoneMode !== "preview" || config.requireVerification !== false)) throw new Error("The pilot must use preview mode.");
  if (process.argv.includes("--website")) {
    const origin = new URL(endpoint).origin;
    const home = await fetch(origin, { signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!home.ok || !home.headers.get("content-type")?.includes("text/html")) throw new Error("Website check failed: HTTP " + home.status);
    const html = await home.text();
    const script = html.match(/<script src="(\/_expo\/static\/js\/web\/entry-[\w-]+\.js)"/)?.[1];
    if (!script) throw new Error("The server is missing the connected website bundle.");
    const asset = await fetch(origin + script, { signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!asset.ok || !asset.headers.get("content-type")?.match(/javascript/)) throw new Error("Website entry bundle failed: HTTP " + asset.status);
    await asset.body?.cancel();
    console.log("ASAAN website passed:", origin);
  }
  console.log("HandyHive API passed:", endpoint);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
