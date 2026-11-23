export const taskGroups: Record<string, { name: string; hi: string; task: string; aliases: string[] }[]> = {
  plumbing: [
    { name: "Taps & fittings", hi: "नल और फिटिंग", task: "Fix a leaking tap", aliases: ["nal", "tap", "leak", "नल"] },
    { name: "Drains & sinks", hi: "नाली और सिंक", task: "Unblock a drain", aliases: ["drain", "sink", "blocked", "नाली"] },
    { name: "Installation", hi: "लगवाने का काम", task: "Install a fitting", aliases: ["fitting", "install"] },
    { name: "Other plumbing", hi: "प्लंबिंग का अन्य काम", task: "Other plumbing work", aliases: ["plumber", "pipe", "toilet"] },
  ],
  electrical: [
    { name: "Switches & sockets", hi: "स्विच और सॉकेट", task: "Repair a switch or socket", aliases: ["switch", "socket", "स्विच"] },
    { name: "Fans & lights", hi: "पंखे और लाइट", task: "Install a light or fan", aliases: ["fan", "light", "pankha", "पंखा"] },
    { name: "Wiring & faults", hi: "वायरिंग और खराबी", task: "Check wiring", aliases: ["wiring", "wire", "fault"] },
    { name: "Other electrical", hi: "बिजली का अन्य काम", task: "Other electrical work", aliases: ["electrician", "bijli", "बिजली"] },
  ],
  cleaning: [
    { name: "Kitchen", hi: "रसोई", task: "Clean a kitchen", aliases: ["kitchen", "rasoi", "रसोई"] },
    { name: "Bathroom", hi: "बाथरूम", task: "Clean a bathroom", aliases: ["bathroom", "washroom", "बाथरूम"] },
    { name: "Rooms", hi: "कमरे", task: "Clean a room", aliases: ["room", "bedroom", "कमरा"] },
    { name: "Other cleaning", hi: "सफ़ाई का अन्य काम", task: "Other cleaning work", aliases: ["clean", "safai", "सफ़ाई"] },
  ],
  painting: [
    { name: "Touch-ups", hi: "टच-अप", task: "Touch up a wall", aliases: ["touch", "wall", "दीवार"] },
    { name: "Room painting", hi: "कमरे की पेंटिंग", task: "Paint one room", aliases: ["paint", "room", "पेंट"] },
    { name: "Wall assessment", hi: "दीवार की जाँच", task: "Check a damp patch", aliases: ["damp", "moisture", "seelan", "सीलन"] },
    { name: "Other painting", hi: "पेंटिंग का अन्य काम", task: "Other painting work", aliases: ["painter", "rang", "रंग"] },
  ],
};
export const tasks = Object.entries(taskGroups).flatMap(([service, groups]) => groups.map((group, index) => ({ ...group, service, id: service + "-" + index })));
