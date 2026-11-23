"use strict";

const { createHmac, timingSafeEqual, randomUUID } = require("node:crypto");
const { balance } = require("./booking-agreements");

const failure = (status, message) => Object.assign(new Error(message), { status });

function createOnlinePayments(env, config, fetchPayment = globalThis.fetch) {
  const key = env.RAZORPAY_KEY_ID;
  const secret = env.RAZORPAY_KEY_SECRET;
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  const configured = Boolean(key || secret || webhookSecret);
  if (configured && (config.production || !/^rzp_test_\w+$/.test(key || "") || !secret || !webhookSecret ||
    !config.publicOrigin.startsWith("https://"))) {
    throw new Error("Razorpay checkout requires test credentials, a webhook secret and an HTTPS staging origin.");
  }
  const localPreview = !config.production && config.host === "127.0.0.1" && !config.publicOrigin &&
    (env.HANDYHIVE_PHONE_MODE || "preview") === "preview";
  const mode = configured ? "razorpay-test" : (config.previewWorkers || localPreview) ? "demo" : null;

  async function request(route, body) {
    try {
      const response = await fetchPayment("https://api.razorpay.com/v1/payment_links" + route, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Basic " + Buffer.from(key + ":" + secret).toString("base64"),
          ...(body && { "Content-Type": "application/json" }),
        },
        ...(body && { body: JSON.stringify(body) }),
        redirect: "error", signal: AbortSignal.timeout(6000),
      });
      return { ok: response.ok, data: await response.json() };
    } catch {
      throw failure(502, "Checkout could not be reached. Try checking its status again.");
    }
  }

  async function fetchLink(reference) {
    const result = await request("?reference_id=" + encodeURIComponent(reference));
    if (!result.ok || !Array.isArray(result.data.payment_links)) throw failure(502, "Could not check checkout status.");
    return result.data.payment_links.find((link) => link.reference_id === reference);
  }

  async function linkFor(jobId, checkout, create) {
    if (checkout.linkId) {
      const result = await request("/" + encodeURIComponent(checkout.linkId));
      if (!result.ok) throw failure(502, "Could not check checkout status.");
      return result.data;
    }
    const existing = await fetchLink(checkout.reference);
    if (existing || !create || checkout.expiresAt <= Date.now()) return existing;
    const result = await request("", {
      amount: checkout.amountPaise, currency: "INR", accept_partial: false, reference_id: checkout.reference,
      description: "HandyHive service booking (test)", expire_by: Math.floor(checkout.expiresAt / 1000),
      notify: { sms: false, email: false }, reminder_enable: false,
      callback_url: config.publicOrigin + "/bookings/" + encodeURIComponent(jobId), callback_method: "get",
    });
    if (result.ok) return result.data;
    const recovered = await fetchLink(checkout.reference);
    if (recovered) return recovered;
    throw failure(502, "Razorpay could not create this test checkout. Check the staging configuration and try again.");
  }

  function signedEvent(raw, signature) {
    if (mode !== "razorpay-test") throw failure(404, "Webhook unavailable.");
    const expected = createHmac("sha256", webhookSecret).update(raw).digest();
    if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature) ||
      !timingSafeEqual(expected, Buffer.from(signature, "hex"))) throw failure(403, "Invalid webhook signature.");
    let event;
    try { event = JSON.parse(raw.toString("utf8")); } catch { throw failure(400, "Invalid webhook."); }
    const link = event?.payload?.payment_link?.entity;
    if (!link || event.event !== "payment_link." + link.status || !["paid", "expired", "cancelled"].includes(link.status)) return null;
    if (link.status === "paid") {
      const payment = event.payload.payment?.entity;
      if (!payment?.captured || payment.status !== "captured" || payment.currency !== "INR" ||
        payment.amount !== link.amount || payment.order_id !== link.order_id || payment.amount_refunded !== 0) {
        throw failure(400, "Payment capture could not be verified.");
      }
    }
    return link;
  }

  return { mode, linkFor, signedEvent };
}

function reserve(job, mode, amountPaise) {
  if (!job.bill || job.status !== "completed") throw failure(409, "Checkout is available after the final bill is issued.");
  if (job.checkout) {
    if (job.checkout.mode !== mode || job.checkout.amountPaise !== amountPaise) throw failure(409, "Check the current checkout and balance.");
    return job.checkout;
  }
  const outstanding = balance(job).outstandingPaise;
  if (outstanding < 100 || amountPaise !== outstanding || job.payments?.some(({ status }) => status === "reported")) {
    throw failure(409, "Check the balance and resolve any reported payment before opening checkout.");
  }
  job.checkout = { reference: randomUUID(), mode, amountPaise, expiresAt: Date.now() + 45 * 60_000 };
  return job.checkout;
}

function record(job, checkout, link) {
  if (job.checkout?.reference !== checkout.reference) return;
  if (checkout.mode === "razorpay-test") {
    if (!link || link.reference_id !== checkout.reference || link.currency !== "INR" || link.amount !== checkout.amountPaise ||
      (checkout.linkId && checkout.linkId !== link.id) || !/^plink_[a-zA-Z0-9]+$/.test(link.id || "")) {
      throw failure(409, "Checkout details could not be verified.");
    }
    if (["cancelled", "expired"].includes(link.status) && link.amount_paid === 0) {
      delete job.checkout;
      return;
    }
    if (link.status !== "paid" || link.amount_paid !== checkout.amountPaise) {
      if (link.status !== "created" || link.amount_paid !== 0 || !/^https:\/\/(?:rzp\.io|rzp\.in)\/[a-zA-Z0-9/_-]+$/.test(link.short_url || "")) {
        throw failure(409, "Checkout needs review. Check its status before paying again.");
      }
      Object.assign(job.checkout, { linkId: link.id, url: link.short_url });
      return;
    }
  }
  if (balance(job).outstandingPaise !== checkout.amountPaise) throw failure(409, "The bill balance changed. Contact support about this payment.");
  const at = Date.now();
  job.payments = [...(job.payments || []), {
    id: checkout.reference, amountPaise: checkout.amountPaise, method: "online", status: "confirmed",
    reportedBy: "customer", at, confirmedAt: at, source: checkout.mode,
  }];
  delete job.checkout;
}

module.exports = { createOnlinePayments, reserve, record };
