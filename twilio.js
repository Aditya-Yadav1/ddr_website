"use strict";

function createTwilio(env, fetchRequest = fetch) {
  if (env.HANDYHIVE_PHONE_MODE !== "twilio") return null;
  const { TWILIO_API_KEY: key, TWILIO_API_SECRET: secret, TWILIO_VERIFY_SERVICE_SID: verify,
    TWILIO_ACCOUNT_SID: account, TWILIO_MESSAGING_SERVICE_SID: messaging } = env;
  if (!/^SK[a-f0-9]{32}$/i.test(key || "") || !secret || !/^VA[a-f0-9]{32}$/i.test(verify || "")) {
    throw new Error("Set TWILIO_API_KEY, TWILIO_API_SECRET and TWILIO_VERIFY_SERVICE_SID for Twilio mode.");
  }
  if (messaging && (!/^MG[a-f0-9]{32}$/i.test(messaging) || !/^AC[a-f0-9]{32}$/i.test(account || ""))) {
    throw new Error("Set a valid TWILIO_ACCOUNT_SID and TWILIO_MESSAGING_SERVICE_SID for booking SMS.");
  }
  const authorization = "Basic " + Buffer.from(key + ":" + secret).toString("base64");
  const verifyUrl = "https://verify.twilio.com/v2/Services/" + verify + "/";

  async function post(url, fields) {
    const response = await fetchRequest(url, {
      method: "POST",
      headers: { Authorization: authorization },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    return { status: response.status, data: response.ok ? await response.json() : null };
  }

  return {
    async start(phone) {
      const { data } = await post(verifyUrl + "Verifications", { To: phone, Channel: "sms" });
      if (data?.status !== "pending" || !/^VE[a-f0-9]{32}$/i.test(data.sid) || data.to !== phone) {
        throw new Error("Verification could not be started.");
      }
      return data.sid;
    },
    async check(sid, phone, code) {
      const { status, data } = await post(verifyUrl + "VerificationCheck", { VerificationSid: sid, Code: code });
      if (status === 404 || data?.status === "pending") return false;
      if (!data) throw new Error("Verification service unavailable.");
      return data.status === "approved" && data.sid === sid && data.to === phone;
    },
    sendBooking: messaging ? async (phone, body, validity) => {
      const url = "https://api.twilio.com/2010-04-01/Accounts/" + account + "/Messages.json";
      const { status, data } = await post(url, {
        To: phone, MessagingServiceSid: messaging, Body: body, ValidityPeriod: String(validity),
      });
      if (status === 429) return { state: "retry" };
      if (data?.sid) return { state: "submitted", sid: data.sid };
      return { state: status >= 500 ? "unknown" : "failed" };
    } : null,
  };
}

module.exports = createTwilio;
