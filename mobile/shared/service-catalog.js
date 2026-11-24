"use strict";
// Task IDs 0–3 in each service are historical and must not change.
const definitions = [
  { id: "plumbing", name: "Plumbing", hi: "प्लंबिंग", icon: "wrench", note: "Leaks, taps & fittings", noteHi: "लीकेज, नल और फिटिंग", terms: ["plumb", "tap", "leak", "pipe", "drain", "toilet", "nal", "नल"], groups: [
    ["Taps & fittings", "नल और फिटिंग", "Fix a leaking tap", "टपकता नल ठीक करें", "nal tap leak leaking नल"],
    ["Drains & sinks", "नाली और सिंक", "Unblock a drain", "बंद नाली खोलें", "drain sink blockage नाली"],
    ["Installation", "लगवाने का काम", "Install a fitting", "फिटिंग लगाएँ", "fitting install shower"],
    ["Other plumbing", "प्लंबिंग का अन्य काम", "Other plumbing work", "प्लंबिंग का अन्य काम", "plumber pipe toilet"],
    ["Taps & fittings", "नल और फिटिंग", "Replace a tap", "नल बदलें", "tap replacement nal नल"],
    ["Toilets", "टॉयलेट", "Repair a toilet flush", "टॉयलेट फ्लश ठीक करें", "flush cistern toilet कमोड फ्लश"],
    ["Bathroom fittings", "बाथरूम फिटिंग", "Install a shower", "शॉवर लगाएँ", "shower bathroom fitting शॉवर"],
    ["Leak inspection", "लीकेज की जाँच", "Inspect a water leak", "पानी का लीकेज जाँचें", "water leakage seepage pipe leak रिसाव"],
  ] },
  { id: "electrical", name: "Electrical", hi: "बिजली का काम", icon: "bolt", note: "Fans, lights & wiring", noteHi: "पंखे, लाइट और वायरिंग", terms: ["electr", "fan", "light", "switch", "wiring", "socket", "bijli", "बिजली"], groups: [
    ["Switches & sockets", "स्विच और सॉकेट", "Repair a switch or socket", "स्विच या सॉकेट ठीक करें", "switch socket स्विच"],
    ["Fans & lights", "पंखे और लाइट", "Install a light or fan", "लाइट या पंखा लगाएँ", "fan light pankha पंखा"],
    ["Wiring & faults", "वायरिंग और खराबी", "Check wiring", "वायरिंग की जाँच", "wiring wire fault"],
    ["Other electrical", "बिजली का अन्य काम", "Other electrical work", "बिजली का अन्य काम", "electrician bijli बिजली"],
    ["Fans & lights", "पंखे और लाइट", "Repair a ceiling fan", "सीलिंग फ़ैन ठीक करें", "fan repair pankha पंखा"],
    ["Switches & sockets", "स्विच और सॉकेट", "Replace a socket", "सॉकेट बदलें", "socket plug point replacement"],
    ["Circuit safety", "सर्किट सुरक्षा", "Inspect an MCB", "एमसीबी की जाँच", "mcb breaker trip fuse"],
    ["Doorbells", "डोरबेल", "Install a doorbell", "डोरबेल लगाएँ", "bell doorbell घंटी"],
  ] },
  { id: "cleaning", name: "Home cleaning", hi: "घर की सफ़ाई", icon: "brush", note: "Rooms, kitchens & more", noteHi: "कमरे, रसोई और बाथरूम", terms: ["clean", "bathroom", "kitchen", "dust", "safai", "सफ़ाई"], groups: [
    ["Kitchen", "रसोई", "Clean a kitchen", "रसोई साफ़ करें", "kitchen rasoi safai रसोई"],
    ["Bathroom", "बाथरूम", "Clean a bathroom", "बाथरूम साफ़ करें", "bathroom washroom safai बाथरूम"],
    ["Rooms", "कमरे", "Clean a room", "कमरा साफ़ करें", "room bedroom कमरा"],
    ["Other cleaning", "सफ़ाई का अन्य काम", "Other cleaning work", "सफ़ाई का अन्य काम", "clean safai सफ़ाई"],
    ["Upholstery", "सोफ़ा और कपड़ा", "Clean a sofa", "सोफ़ा साफ़ करें", "sofa upholstery couch shampoo सोफ़ा"],
    ["Outdoor spaces", "बाहरी जगह", "Clean a balcony", "बालकनी साफ़ करें", "balcony terrace safai बालकनी"],
    ["Full home", "पूरा घर", "Clean a full home", "पूरे घर की सफ़ाई करें", "full house deep cleaning घर सफ़ाई"],
    ["Move-in", "नए घर में", "Move-in cleaning", "नए घर की सफ़ाई", "move in empty home cleaning"],
  ] },
  { id: "painting", name: "Painting", hi: "पेंटिंग", icon: "roller", note: "Walls, touch-ups & finishes", noteHi: "दीवारें, टच-अप और फ़िनिश", terms: ["paint", "wall", "touch-up", "roller", "rang", "रंग"], groups: [
    ["Touch-ups", "टच-अप", "Touch up a wall", "दीवार पर टच-अप करें", "touch wall दीवार"],
    ["Room painting", "कमरे की पेंटिंग", "Paint one room", "एक कमरे में पेंट करें", "paint room पेंट"],
    ["Wall assessment", "दीवार की जाँच", "Check a damp patch", "सीलन वाले हिस्से की जाँच", "damp moisture seelan सीलन"],
    ["Other painting", "पेंटिंग का अन्य काम", "Other painting work", "पेंटिंग का अन्य काम", "painter rang रंग"],
    ["Wall preparation", "दीवार की तैयारी", "Prepare a wall for painting", "पेंट के लिए दीवार तैयार करें", "putty sanding primer पुट्टी"],
    ["Ceilings", "छत", "Paint a ceiling", "छत पर पेंट करें", "ceiling paint छत"],
    ["Doors", "दरवाज़े", "Paint a door", "दरवाज़े पर पेंट करें", "door enamel paint दरवाज़ा"],
    ["Exterior", "बाहरी दीवार", "Touch up an exterior wall", "बाहरी दीवार पर टच-अप करें", "outside exterior wall paint"],
  ] },
];
const tasks = definitions.flatMap(({ id: service, groups }) => groups.map(([name, hi, task, taskHi, terms], index) => ({
  id: service + "-" + index, service, name, hi, task, taskHi, aliases: terms.split(" "), legacy: index < 4,
})));
const services = definitions.map(({ groups, hi, noteHi, ...service }) => ({ ...service, hi, noteHi, tasks: groups.map((group) => group[2]) }));
module.exports = { services, tasks };
