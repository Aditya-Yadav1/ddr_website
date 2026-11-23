"use strict";

const { isPinCode } = require("./pin-codes");

function normalizeWorkPhone(value) {
  if (typeof value !== "string" || value.length > 24) return null;
  if (!value.trim()) return "";
  const digits = value.replace(/[\s()-]/g, "");
  const match = /^(?:(?:\+?91)|0)?([6-9]\d{9})$/.exec(digits);
  return match ? "+91" + match[1] : null;
}

function validateProfile(market, input, previous, account, native, failure) {
  const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const name = text(input.name, 60);
  const bio = text(input.bio, 360);
  const { service, unit, years, price } = input;
  const areas = Array.isArray(input.areas) ? [...new Set(input.areas.map((area) => text(area, 80)))] : [];
  const pins = input.pinCodes ?? (!native ? previous?.pinCodes : undefined);
  if ((native || pins !== undefined) && (!Array.isArray(pins) || !pins.length || pins.length > 20 || !pins.every(isPinCode))) {
    throw failure(400, "Enter 1 to 20 valid six-digit service PIN codes.", "INVALID_PIN_CODE");
  }
  const languages = Array.isArray(input.languages) ? input.languages.slice(0, 10).map((value) => text(value, 30)).filter(Boolean) : [];
  if (!name || !bio || !market.service(service) || !Object.hasOwn(market.units, unit)
    || (!native && !areas.length) || areas.length > 20 || !areas.every((area) => area.length >= 2 && /[\p{L}]/u.test(area))
    || !Number.isInteger(years) || years < 0 || years > 70 || !Number.isInteger(price) || price < 1 || price > 100000) {
    throw failure(400, "Check the name, service, areas, experience, description and rate.");
  }
  const maxPrice = input.maxPrice ?? (previous?.price === price ? previous.maxPrice : undefined);
  const validUpper = (upper, lower) => upper === undefined || (Number.isInteger(upper) && upper > lower && upper <= 200000);
  if (!validUpper(maxPrice, price)) throw failure(400, "Enter an upper estimate above the starting rate.");
  let plus = previous?.plus ?? null;
  let workPhone = previous?.workPhone;
  if (native && Object.hasOwn(input, "workPhone")) {
    workPhone = normalizeWorkPhone(input.workPhone);
    if (workPhone === null) throw failure(400, "Enter a valid Indian work mobile number or leave the field empty.", "INVALID_WORK_PHONE");
  }
  let specializations = previous?.service === service ? previous.specializations : undefined;
  if (native && Object.hasOwn(input, "specializations")) {
    const validIds = market.service(service).tasks.map((task) => market.taskId(service, task));
    if (!Array.isArray(input.specializations) || input.specializations.length > validIds.length
      || !input.specializations.every((item) => validIds.includes(item))) {
      throw failure(400, "Choose task skills within your service.");
    }
    specializations = [...new Set(input.specializations)];
  }
  if (native && Object.hasOwn(input, "plus")) {
    const offer = input.plus;
    if (offer === null) plus = null;
    else {
      const includes = text(offer?.includes, 220);
      const includesHi = text(offer?.includesHi, 220);
      if (!Number.isInteger(offer?.price) || offer.price <= price || offer.price > 100000 || !validUpper(offer.maxPrice, offer.price) || !includes) {
        throw failure(400, "Set a higher Plus rate and describe the extra work included.", "INVALID_PLUS");
      }
      plus = { price: offer.price, maxPrice: offer.maxPrice, includes, includesHi };
    }
  } else if (plus && (plus.price <= price || previous.service !== service || previous.unit !== unit)) {
    throw failure(400, "Update your Plus option in the app before changing its service, price or billing unit.", "INVALID_PLUS");
  }
  return {
    ...previous, id: account.id, name, bio, service, unit, years, price, maxPrice, areas, languages, plus, specializations, workPhone,
    ...(pins && { pinCodes: [...new Set(pins)] }),
    ...(native && typeof input.bioHi === "string" && { bioHi: text(input.bioHi, 360) }),
    credential: text(input.credential, 100), published: native ? previous?.published ?? true : true, sample: previous?.sample === true,
    hours: previous?.hours || market.defaultHours, immediate: previous?.immediate ?? false,
  };
}

module.exports = validateProfile;
module.exports.normalizeWorkPhone = normalizeWorkPhone;
