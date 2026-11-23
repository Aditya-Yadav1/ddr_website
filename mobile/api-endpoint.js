"use strict";
const USB_PILOT_ENDPOINT = "http://127.0.0.1:4175/api/v1";

function resolveEndpoint(value, platform, development, pilot = false) {
  const endpoint = (value || "").trim().replace(/\/+$/, "");
  if (pilot === "usb") {
    if (platform === "android" && endpoint === USB_PILOT_ENDPOINT) return endpoint;
    throw new Error("The USB pilot must use the Android USB forwarding address at " + USB_PILOT_ENDPOINT + ".");
  }
  if (!endpoint) {
    if (platform === "web") return "/api/v1";
    if (development) return "http://10.0.2.2:4174/api/v1";
    throw new Error("This app was built without a HandyHive server address. Install a configured build.");
  }
  const url = new URL(endpoint);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/api/v1" || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("The HandyHive server address must end with /api/v1 and contain no credentials or query.");
  }
  const host = url.hostname.toLowerCase();
  const loopback = host === "localhost" || host.endsWith(".localhost") || host === "[::1]" || /^127\./.test(host) || host === "0.0.0.0" || host === "10.0.2.2";
  const privateHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  if (!development && (loopback || (url.protocol !== "https:" && !(pilot && privateHost)) || (!pilot && privateHost))) {
    throw new Error("This build needs a public HTTPS server. Loopback and emulator addresses cannot work on your phone.");
  }
  return endpoint;
}
module.exports = { resolveEndpoint, USB_PILOT_ENDPOINT };
