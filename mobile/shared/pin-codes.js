"use strict";

const isPinCode = (value) => typeof value === "string" && /^[1-9]\d{5}$/.test(value);

// Explicit service coverage for the fictional preview workers.
const demoPinCode = "110075";
const demoPinCodes = ["110016", "110017", "110024", demoPinCode, "110078", "110085"];

module.exports = { isPinCode, demoPinCode, demoPinCodes };
