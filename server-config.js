"use strict";
module.exports = function serverConfig(env) {
  const production = env.NODE_ENV === "production";
  const invitedTest = env.HANDYHIVE_PHONE_MODE === "invite";
  const publicOrigin = env.HANDYHIVE_PUBLIC_ORIGIN || "";
  if (publicOrigin) {
    const url = new URL(publicOrigin);
    if (url.origin !== publicOrigin || url.username || url.password || !["http:", "https:"].includes(url.protocol)) throw new Error("HANDYHIVE_PUBLIC_ORIGIN must be an origin without a trailing slash.");
    if (production && url.protocol !== "https:") throw new Error("Production requires HTTPS.");
  }
  if (production && (!publicOrigin || !["twilio", "invite"].includes(env.HANDYHIVE_PHONE_MODE) || !env.HANDYHIVE_DB)) {
    throw new Error("Production requires a public HTTPS origin, verified SMS or invited accounts, and a persistent database.");
  }
  const host = env.HANDYHIVE_HOST || "127.0.0.1";
  if (invitedTest && (!production || host !== "127.0.0.1" || !/^[A-Za-z0-9_-]{24,128}$/.test(env.HANDYHIVE_SIGNUP_INVITE || ""))) {
    throw new Error("Invited testing requires production protections, a loopback listener and a random signup invite.");
  }
  const requireVerification = production || env.HANDYHIVE_REQUIRE_VERIFICATION === "1";
  const previewWorkers = !requireVerification && (env.HANDYHIVE_PHONE_MODE || "preview") === "preview"
    && (env.HANDYHIVE_DEMO_WORKERS === "1" || (env.HANDYHIVE_DEMO_WORKERS !== "0" && host === "127.0.0.1" && !publicOrigin));
  return { production, invitedTest, publicOrigin, host, trustProxy: env.HANDYHIVE_TRUST_PROXY === "1", requireVerification, previewWorkers };
};
module.exports.clientAddress = function clientAddress(req, trustProxy) {
  const forwarded = req.headers["x-forwarded-for"];
  // Only enable behind the supplied single trusted proxy, which replaces this header.
  return trustProxy && typeof forwarded === "string" && require("node:net").isIP(forwarded)
    ? forwarded : req.socket.remoteAddress;
};
