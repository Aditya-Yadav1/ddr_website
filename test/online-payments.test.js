"use strict";

const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { test } = require("node:test");
const { createOnlinePayments, reserve, record } = require("../online-payments");

test("Razorpay test checkout creates the billed amount and confirms a matching signed capture once", async () => {
  const env = { RAZORPAY_KEY_ID: "rzp_test_sample", RAZORPAY_KEY_SECRET: "test-key", RAZORPAY_WEBHOOK_SECRET: "sample-webhook-secret" };
  const config = { publicOrigin: "https://staging.example.com", production: false };
  const job = { status: "completed", bill: { totalPaise: 12345 } };
  const checkout = reserve(job, "razorpay-test", 12345);
  const link = { reference_id: checkout.reference, amount: 12345, currency: "INR", id: "plink_test123",
    order_id: "order_test123", amount_paid: 0, status: "created", short_url: "https://rzp.io/rzp/test123" };
  const provider = createOnlinePayments(env, config, async (url, options) => {
    if (options.method === "GET") {
      assert.equal(new URL(url).searchParams.get("reference_id"), checkout.reference);
      return Response.json({ payment_links: [] });
    }
    const data = JSON.parse(options.body);
    assert.equal(data.amount, job.bill.totalPaise);
    assert.equal(data.accept_partial, false);
    assert.equal(data.reference_id, checkout.reference);
    assert.equal(data.callback_url, "https://staging.example.com/bookings/job-123");
    return Response.json(link);
  });
  record(job, checkout, await provider.linkFor("job-123", checkout, true));
  assert.equal(job.checkout.url, link.short_url);
  assert.equal(job.payments, undefined);

  const makeEvent = (amount) => Buffer.from(JSON.stringify({ event: "payment_link.paid", payload: {
    payment_link: { entity: { ...link, amount_paid: 12345, status: "paid" } },
    payment: { entity: { currency: "INR", amount, captured: true, status: "captured", order_id: link.order_id, amount_refunded: 0 } },
  } }));
  const sign = (body) => createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  const raw = makeEvent(12345);
  assert.throws(() => provider.signedEvent(raw, "0".repeat(64)), /Invalid webhook signature/);
  const wrongAmount = makeEvent(100);
  assert.throws(() => provider.signedEvent(wrongAmount, sign(wrongAmount)), /capture could not be verified/);
  const confirmed = provider.signedEvent(raw, sign(raw));
  record(job, checkout, confirmed);
  record(job, checkout, confirmed);
  assert.equal(job.payments.length, 1);
  assert.equal(job.payments[0].amountPaise, 12345);
  assert.equal(job.payments[0].source, "razorpay-test");
  assert.equal(job.checkout, undefined);
  assert.throws(() => createOnlinePayments({ ...env, RAZORPAY_KEY_ID: "rzp_live_sample" }, config), /test credentials/);
});
