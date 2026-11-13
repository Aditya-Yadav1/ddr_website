import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { ApiError, errorMessage, type Booking, type Tier, type Unit } from "./api";
import { readStored, writeStored } from "./storage";

type Language = "en" | "hi";
type Copy = (english: string, hindi: string) => string;
const LanguageContext = createContext<{ language: Language; toggle: () => void }>({ language: "en", toggle: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    let active = true;
    void readStored("handyhive-language", true).then((value) => {
      if (active && value === "hi") setLanguage("hi");
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") document.documentElement.lang = language;
  }, [language]);

  function toggle() {
    const next = language === "en" ? "hi" : "en";
    setLanguage(next);
    void writeStored("handyhive-language", next, true).catch(() => {});
  }

  return <LanguageContext.Provider value={{ language, toggle }}>{children}</LanguageContext.Provider>;
}

const serviceCopy: Record<string, [string, string, string[]]> = {
  plumbing: ["प्लंबिंग", "लीकेज, नल और फिटिंग", ["टपकता नल ठीक करें", "बंद नाली खोलें", "फिटिंग लगाएँ", "प्लंबिंग का अन्य काम"]],
  electrical: ["बिजली का काम", "पंखे, लाइट और वायरिंग", ["स्विच या सॉकेट ठीक करें", "लाइट या पंखा लगाएँ", "वायरिंग की जाँच", "बिजली का अन्य काम"]],
  cleaning: ["घर की सफ़ाई", "कमरे, रसोई और बाथरूम", ["रसोई साफ़ करें", "बाथरूम साफ़ करें", "कमरा साफ़ करें", "सफ़ाई का अन्य काम"]],
  painting: ["पेंटिंग", "दीवारें, टच-अप और फ़िनिश", ["दीवार पर टच-अप करें", "एक कमरे में पेंट करें", "सीलन वाले हिस्से की जाँच", "पेंटिंग का अन्य काम"]],
};
const taskKeys: Record<string, string[]> = {
  plumbing: ["Fix a leaking tap", "Unblock a drain", "Install a fitting", "Other plumbing work"],
  electrical: ["Repair a switch or socket", "Install a light or fan", "Check wiring", "Other electrical work"],
  cleaning: ["Clean a kitchen", "Clean a bathroom", "Clean a room", "Other cleaning work"],
  painting: ["Touch up a wall", "Paint one room", "Check a damp patch", "Other painting work"],
};
const areas: Record<string, string> = { "Lajpat Nagar": "लाजपत नगर", Dwarka: "द्वारका", Rohini: "रोहिणी", Saket: "साकेत" };
const statuses: Record<Booking["status"], [string, string]> = {
  pending: ["Awaiting response", "जवाब का इंतज़ार"], accepted: ["Confirmed", "पुष्टि हो गई"],
  declined: ["Declined", "अस्वीकार किया गया"], expired: ["Request expired", "अनुरोध की अवधि समाप्त"],
  cancelled: ["Cancelled", "रद्द किया गया"], en_route: ["On the way", "रास्ते में"],
  arrived: ["Arrived", "पहुँच गए"], in_progress: ["In progress", "काम चल रहा है"], completed: ["Completed", "काम पूरा"],
};
const units: Record<Unit, [string, string]> = {
  visit: ["diagnostic visit", "जाँच की विज़िट"], hourly: ["hour", "घंटा"], fixed: ["package", "पैकेज"],
};
const updateLabels: Record<string, string> = {
  "New booking request": "बुकिंग का नया अनुरोध",
  "Booking accepted": "बुकिंग स्वीकार की गई",
  "Booking declined": "बुकिंग अस्वीकार की गई",
  "Booking request expired": "बुकिंग अनुरोध की अवधि समाप्त हो गई",
  "Booking cancelled": "बुकिंग रद्द की गई",
  "Job completed": "काम पूरा हुआ",
};
const errors: Record<string, string> = {
  "LOCATION_UNAVAILABLE": "यह काम करने वाला आपके इलाके में सेवा नहीं देता। कोई दूसरा इलाका या काम करने वाला चुनें।",
  "INVALID_LOCATION": "अपना इलाका और शहर लिखें।",
  "OFFER_CHANGED": "इस विकल्प में बदलाव हुआ है। भेजने से पहले नई दर और शामिल काम देखें।",
  "INVALID_BOOKING_DETAILS": "अपना नाम, पता, समय और चुनी हुई दर जाँचें।",
  "INVALID_PLUS": "प्लस की दर अधिक रखें और उसमें शामिल अतिरिक्त काम लिखें।",
  "INTENT_REUSED": "यह अनुरोध पहले ही अलग जानकारी के साथ भेजा गया है।",
  "OPERATION_ID_REUSED": "यह अनुरोध पहले ही अलग जानकारी के साथ भेजा गया है।",
  "SLOT_UNAVAILABLE": "यह समय उपलब्ध नहीं है। कोई दूसरा समय चुनें।",
  "BOOKING_CHANGED": "बुकिंग की स्थिति बदल गई है। नई स्थिति देखें।",
  "REQUEST_EXPIRED": "अनुरोध की अवधि समाप्त हो गई है।",
  "Could not reach HandyHive. Check your connection and try again.": "HandyHive से संपर्क नहीं हो पाया। कनेक्शन जाँचें और फिर कोशिश करें।",
  "The username or password is incorrect.": "यूज़रनेम या पासवर्ड गलत है।",
  "This username is taken.": "यह यूज़रनेम पहले से लिया गया है।",
  "Use a username of 3 to 32 letters, numbers, underscores or hyphens and a password of 12 to 128 characters.": "यूज़रनेम में 3 से 32 अंग्रेज़ी अक्षर, अंक, अंडरस्कोर या हाइफ़न रखें। पासवर्ड 12 से 128 अक्षरों का रखें।",
  "Enter an Indian mobile number with +91.": "+91 के साथ भारतीय मोबाइल नंबर डालें।",
  "Enter the six-digit code.": "छह अंकों का कोड डालें।",
  "This code expired or reached its attempt limit. Request another code.": "कोड की अवधि समाप्त हो गई या कोशिशों की सीमा पूरी हो गई। नया कोड माँगें।",
  "The code is incorrect or has expired.": "कोड गलत है या उसकी अवधि समाप्त हो गई है।",
  "Wait 60 seconds before requesting another code.": "नया कोड माँगने से पहले 60 सेकंड रुकें।",
  "Too many codes requested. Try again in 15 minutes.": "बहुत बार कोड माँगा गया। 15 मिनट बाद कोशिश करें।",
  "Sign in to continue.": "आगे बढ़ने के लिए साइन इन करें।",
  "Check the name, service, areas, experience, description and rate.": "नाम, सेवा, इलाके, अनुभव, विवरण और दर जाँचें।",
  "Check the appointment days, working hours and travel buffer.": "काम के दिन, घंटे और यात्राओं के बीच का समय जाँचें।",
  "Choose a future start and an end time after it.": "भविष्य का आरंभ समय चुनें और उसके बाद का समाप्ति समय डालें।",
  "Enter a duration from 15 to 720 minutes.": "15 से 720 मिनट की अवधि डालें।",
  "Request unavailable.": "यह बुकिंग उपलब्ध नहीं है।",
  "This professional is unavailable for that service or neighbourhood.": "इस काम या इलाके के लिए यह पेशेवर उपलब्ध नहीं है।",
};

export function useCopy() {
  const { language, toggle } = useContext(LanguageContext);
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const t: Copy = (english, hindi) => language === "hi" ? hindi : english;
  const intl = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options);
  function money(price: number) {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);
  }
  function rate(offer: { price: number; unit: Unit }) {
    return money(offer.price) + " / " + t(...units[offer.unit]);
  }
  function dateTime(value: number) {
    return intl({ timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(value) + " IST";
  }
  function appointment(value: string, timing?: string) {
    if (timing === "now") return t("As soon as possible", "जितनी जल्दी हो सके");
    return value ? dateTime(Date.parse(value + "+05:30")) : t("Flexible timing", "समय आपसी सहमति से");
  }
  function translateError(error: unknown) {
    const message = errorMessage(error);
    const translation = (error instanceof ApiError && errors[error.code]) || errors[message];
    return t(message, translation || t(message, "यह काम पूरा नहीं हुआ। जानकारी जाँचें और फिर कोशिश करें।"));
  }
  return {
    t, language, toggle, intl, money, rate, dateTime, appointment, translateError,
    area: (place: string) => t(place, areas[place] || place),
    service: (id: string, name: string) => t(name, serviceCopy[id]?.[0] || name),
    serviceNote: (id: string, note: string) => t(note, serviceCopy[id]?.[1] || note),
    task: (id: string, task: string) => t(task, serviceCopy[id]?.[2][taskKeys[id]?.indexOf(task)] || task),
    tier: (tier: Tier) => tier === "plus" ? t("Plus", "प्लस") : t("Everyday", "एवरीडे"),
    updateLabel: (label: string) => t(label, updateLabels[label] || label),
    status: (status: Booking["status"]) => t(...statuses[status]),
  };
}
