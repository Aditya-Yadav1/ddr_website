"use strict";

// Delhi postal localities. A broad search can match several delivery areas.
const places = [
  ["IIT Delhi, Hauz Khas", "110016", "Indian Institute of Technology Delhi आईआईटी दिल्ली हौज खास"],
  ["Saket", "110017", "साकेत"],
  ["Lajpat Nagar", "110024", "लाजपत नगर"],
  ["Dwarka Sector 6", "110075", "द्वारका सेक्टर 6"],
  ["NSUT, Dwarka Sector 3", "110078", "NSIT नेताजी सुभाष द्वारका सेक्टर 3"],
  ["Rohini Sector 7", "110085", "रोहिणी सेक्टर 7"],
];
const words = (text) => text.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean);
function localPlaces(query) {
  const terms = words(query);
  if (!terms.length) return [];
  return places.filter(([name, pin, aliases]) => {
    const tokens = words([name, pin, aliases, "New Delhi दिल्ली"].join(" "));
    return terms.every((term) => tokens.some((token) => token.startsWith(term)));
  }).map(([name, pinCode]) => ({ name, value: name + ", Delhi", pinCode }));
}
module.exports = { localPlaces };
