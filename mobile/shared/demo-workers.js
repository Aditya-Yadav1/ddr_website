"use strict";

const workers = [
  ["worker-demo", {
    name: "Delhi Plumbing Demo", service: "plumbing", areas: ["Saket", "Dwarka", "Lajpat Nagar"], years: 5, price: 449, maxPrice: 700, unit: "visit",
    specializations: ["plumbing-0", "plumbing-1", "plumbing-2"],
    bio: "Demo profile for leaks, drains and fittings. The visit covers diagnosing the problem.",
    bioHi: "लीकेज, नाली और फिटिंग की डेमो प्रोफ़ाइल। विज़िट में समस्या की जाँच शामिल है।",
    plus: { price: 749, includes: "Check nearby fittings for related leaks and give a written repair and parts estimate.",
      includesHi: "आस-पास की फिटिंग में लीकेज की जाँच और मरम्मत व पुर्ज़ों का लिखित अनुमान।" },
  }],
  ["electric-demo", {
    name: "Rohini Electrical Demo", service: "electrical", areas: ["Rohini", "Dwarka"], years: 7, price: 499, unit: "visit",
    specializations: ["electrical-0", "electrical-1", "electrical-2"],
    bio: "Demo profile for lights, fans, sockets and wiring checks.",
    bioHi: "लाइट, पंखे, सॉकेट और वायरिंग की जाँच की डेमो प्रोफ़ाइल।",
    plus: { price: 799, includes: "Inspect two adjacent sockets and share a written fault summary and next steps.",
      includesHi: "पास के दो सॉकेट की जाँच, खराबी का लिखित विवरण और आगे के काम की जानकारी।" },
  }],
  ["cleaning-demo", {
    name: "Saket Cleaning Demo", service: "cleaning", areas: ["Saket", "Lajpat Nagar", "Dwarka"], years: 4, price: 349, unit: "hourly",
    specializations: ["cleaning-0", "cleaning-1", "cleaning-2"],
    bio: "Demo profile for floors, dusting and accessible surfaces.",
    bioHi: "फ़र्श, धूल और आसानी से पहुँचने वाली सतहों की सफ़ाई की डेमो प्रोफ़ाइल।",
    plus: { price: 549, includes: "Detail skirting and wipe the cabinet fronts in the room being cleaned.",
      includesHi: "साफ़ किए जा रहे कमरे में स्कर्टिंग और अलमारियों के सामने के हिस्सों की बारीक सफ़ाई।" },
  }],
  ["painting-demo", {
    name: "Dwarka Painting Demo", service: "painting", areas: ["Dwarka", "Rohini"], years: 6, price: 399, unit: "visit",
    specializations: ["painting-0", "painting-1", "painting-2"],
    bio: "Demo profile for wall assessments, touch-ups and interior painting.",
    bioHi: "दीवार की जाँच, टच-अप और अंदरूनी पेंटिंग की डेमो प्रोफ़ाइल।",
    plus: { price: 699, includes: "Include a moisture check on the affected wall and a written surface preparation plan.",
      includesHi: "प्रभावित दीवार की नमी की जाँच और सतह की तैयारी का लिखित प्लान।" },
  }],
];

module.exports = workers;
