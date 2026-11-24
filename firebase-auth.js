"use strict";
const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function publicConfig(env = process.env) {
  const keys = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"];
  if (!keys.every((key) => env["HANDYHIVE_FIREBASE_" + key])) return null;
  return {
    apiKey: env.HANDYHIVE_FIREBASE_API_KEY,
    authDomain: env.HANDYHIVE_FIREBASE_AUTH_DOMAIN,
    projectId: env.HANDYHIVE_FIREBASE_PROJECT_ID,
    appId: env.HANDYHIVE_FIREBASE_APP_ID,
    ...(env.HANDYHIVE_FIREBASE_MESSAGING_SENDER_ID && { messagingSenderId: env.HANDYHIVE_FIREBASE_MESSAGING_SENDER_ID }),
  };
}

function verifier(env = process.env) {
  const config = publicConfig(env);
  if (!config) return null;
  const supplied = env.HANDYHIVE_FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasAdminCredential = Boolean(supplied || env.GOOGLE_APPLICATION_CREDENTIALS);
  const credential = supplied ? cert(JSON.parse(supplied)) : hasAdminCredential ? applicationDefault() : undefined;
  const app = getApps().find((entry) => entry.name === "handyhive-auth") || initializeApp({ ...(credential && { credential }), projectId: config.projectId }, "handyhive-auth");
  return async (idToken) => {
    if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 10000) throw new Error("Invalid Firebase token.");
    // Signature, issuer, audience, and expiry work with public Google keys. A server
    // credential additionally permits the Admin SDK to check revocation status.
    const decoded = await getAuth(app).verifyIdToken(idToken, hasAdminCredential);
    if (decoded.firebase?.sign_in_provider !== "google.com" || !decoded.uid) throw new Error("Google sign-in is required.");
    return { uid: decoded.uid, name: typeof decoded.name === "string" ? decoded.name.slice(0, 120) : "",
      email: decoded.email_verified && typeof decoded.email === "string" ? decoded.email.slice(0, 254) : "",
      photo: typeof decoded.picture === "string" && /^https:\/\//.test(decoded.picture) ? decoded.picture.slice(0, 1000) : "" };
  };
}
module.exports = { publicConfig, verifier };
