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
  const config = await fetch(endpoint + "/config", { signal: AbortSignal.timeout(10000), redirect: "error" }).then((result) => result.json());
  if (!pilot && (config.phoneMode !== "twilio" || !config.requireVerification)) throw new Error("Production must use SMS sign-in and enforce worker verification.");
  if (pilot && (config.phoneMode !== "preview" || config.requireVerification !== false)) throw new Error("The pilot must use preview mode.");
  console.log("HandyHive API passed:", endpoint);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
