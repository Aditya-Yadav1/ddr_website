"use strict";

const { tasks } = require("./service-catalog");

const version = "dwarka-2026-11-v1";
const pin = "110075";
const basisPoints = 1200;
// Trial amounts. Publish a new version whenever price, scope or payout changes.
const card = {
  "plumbing-4": { price: 199, minutes: 45, description: "Fit one accessible standard tap and check for leaks. Have a compatible tap ready.", hi: "एक मानक नल लगाएँ और लीकेज जाँचें। सही नया नल तैयार रखें।", addOn: 149, plusPrice: 299 },
  "plumbing-7": { price: 149, minutes: 30, description: "Inspect one suspected leak. The visit fee is credited against an approved repair.", hi: "एक संदिग्ध लीकेज की जाँच। मंज़ूर मरम्मत में जाँच शुल्क घटेगा।", repairPrice: 399 },
  "electrical-4": { price: 199, minutes: 30, description: "Diagnose one ceiling fan fault. Repair is quoted after inspection.", hi: "एक सीलिंग फ़ैन की खराबी की जाँच। मरम्मत का कोटेशन जाँच के बाद।", repairPrice: 449 },
  "electrical-5": { price: 199, minutes: 45, description: "Replace one accessible socket and test it. Have a compatible socket ready.", hi: "एक सुलभ सॉकेट बदलें और जाँचें। सही नया सॉकेट तैयार रखें।" },
  "electrical-7": { price: 249, minutes: 45, description: "Fit and test one doorbell at an existing working connection. Have a compatible bell ready.", hi: "मौजूदा कनेक्शन पर एक डोरबेल लगाएँ और जाँचें। सही डोरबेल तैयार रखें।" },
};

function rateFor(service, scope, pinCode) {
  if (pinCode !== pin) return null;
  const task = tasks.find((item) => item.service === service && item.task === scope);
  const rate = card[task?.id];
  return rate ? { ...rate, id: version + ":" + task.id } : null;
}

function eligible(person, rate) {
  return Boolean(person?.sample || person?.pilotOffers?.includes(rate.id));
}

function offerFor(rate, tier) {
  if (!rate || (tier === "plus" && !rate.plusPrice)) return null;
  const plus = tier === "plus";
  return {
    ...rate,
    price: plus ? rate.plusPrice : rate.price,
    everydayPrice: rate.price,
    quantity: plus ? 2 : 1,
    minutes: plus ? 60 : rate.minutes,
    unit: rate.repairPrice ? "visit" : "fixed",
    includes: plus ? "Fit two accessible standard taps at one address and check both for leaks. Have both compatible taps ready." : "",
    includesHi: plus ? "एक पते पर दो मानक नल लगाएँ और दोनों में लीकेज जाँचें। दोनों सही नल तैयार रखें।" : "",
    basisPoints,
  };
}

function commission(paise, rate = basisPoints) {
  return Math.round(paise * rate / 10000);
}

function earnings(job, confirmedPaise) {
  const approved = job.quotes?.find((quote) => quote.version === job.bill?.quoteVersion || (!job.bill && quote.version === job.activeQuote));
  const labour = approved?.labourPaise ?? job.basePaise;
  // On mixed bills, recognise labour proportionally as confirmed receipts arrive.
  const collectedLabour = job.bill?.totalPaise
    ? Math.round(labour * Math.min(confirmedPaise, job.bill.totalPaise) / job.bill.totalPaise) : 0;
  return { labour, payout: labour - commission(labour, job.pilot.basisPoints),
    collectedLabour, fee: commission(collectedLabour, job.pilot.basisPoints) };
}

module.exports = { version, pin, card, rateFor, eligible, offerFor, commission, earnings };
