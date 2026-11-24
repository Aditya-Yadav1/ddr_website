import { upperEstimate } from "../shared/price-range";
import { services, tasks } from "./catalog";
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
  "Quote ready to review": "कोटेशन देखने के लिए तैयार है",
  "Quote decision recorded": "कोटेशन का फ़ैसला दर्ज हुआ",
  "Payment recorded": "भुगतान दर्ज हुआ",
  "Payment report reviewed": "भुगतान रिपोर्ट देखी गई",
  "Receipt reversed": "रसीद वापस ली गई",
  "New appointment proposed": "विज़िट का नया समय प्रस्तावित है",
  "Appointment decision recorded": "विज़िट का फ़ैसला दर्ज हुआ",
  "Arrival estimate updated": "पहुँचने का अनुमान बदला",
  "Booking issue reported": "बुकिंग की समस्या दर्ज हुई",
  "Booking issue updated": "बुकिंग की समस्या पर नया अपडेट",
  "Booking cancelled by worker": "काम करने वाले ने बुकिंग रद्द की",
};
const errors: Record<string, string> = {
  "WORKER_UNAVAILABLE": "इस काम करने वाले की जाँच अभी पूरी या मान्य नहीं है। दूसरा काम करने वाला चुनें।",
  "TRUST_REQUIRED": "आगे बढ़ने से पहले काम करने वाले की जाँच पूरी होनी चाहिए।",
  "ARRIVAL_CONFIRMATION_REQUIRED": "काम शुरू होने से पहले ग्राहक सामने से आपकी पहचान जाँचकर पुष्टि करे।",
  "INVALID_SERVER_RESPONSE": "सर्वर ने ऐप की जानकारी के बजाय वेब पेज भेजा। सर्वर का पता जाँचें।",
  "Cannot reach the pilot server. Keep the computer running and connect this phone to the same Wi-Fi.": "पायलट सर्वर से संपर्क नहीं हो पाया। कंप्यूटर चालू रखें और फ़ोन को उसी Wi-Fi से जोड़ें।",
  "ASAAN took too long to respond. Please try again.": "ASAAN का जवाब आने में अधिक समय लगा। फिर कोशिश करें।",
  "LOCATION_UNAVAILABLE": "यह काम करने वाला इस पिन कोड में सेवा नहीं देता। इस पते के लिए दूसरा काम करने वाला चुनें।",
  "INVALID_LOCATION": "अपना इलाका और शहर लिखें।",
  "INVALID_PIN_CODE": "मान्य छह अंकों वाला पिन कोड डालें।",
  "INVALID_WORK_PHONE": "मान्य भारतीय काम का मोबाइल नंबर डालें या फ़ील्ड खाली छोड़ें।",
  "INVALID_REVIEW": "समीक्षा अधिकतम 500 अक्षरों में लिखें।",
  "OFFER_CHANGED": "इस विकल्प में बदलाव हुआ है। भेजने से पहले नई दर और शामिल काम देखें।",
  "INVALID_BOOKING_DETAILS": "अपना नाम, पता, समय और चुनी हुई दर जाँचें।",
  "INVALID_PLUS": "प्लस की दर अधिक रखें और उसमें शामिल अतिरिक्त काम लिखें।",
  "INTENT_REUSED": "यह अनुरोध पहले ही अलग जानकारी के साथ भेजा गया है।",
  "OPERATION_ID_REUSED": "यह अनुरोध पहले ही अलग जानकारी के साथ भेजा गया है।",
  "SLOT_UNAVAILABLE": "यह समय उपलब्ध नहीं है। कोई दूसरा समय चुनें।",
  "QUOTE_REQUIRED": "काम शुरू होने से पहले ग्राहक को कोटेशन मंज़ूर करना होगा।",
  "TASK_UNAVAILABLE": "यह काम या इलाका अब इस काम करने वाले की सूची में नहीं है।",
  "BOOKING_CHANGED": "बुकिंग की स्थिति बदल गई है। नई स्थिति देखें।",
  "REQUEST_EXPIRED": "अनुरोध की अवधि समाप्त हो गई है।",
  "Could not reach ASAAN. Check your connection and try again.": "ASAAN से संपर्क नहीं हो पाया। कनेक्शन जाँचें और फिर कोशिश करें।",
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
    return new Intl.NumberFormat(locale, { style: "currency", currency: "INR",
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 }).format(price);
  }
  function range(low: number, high: number, quantity = 1) {
    return money(low * quantity) + "–" + money(high * quantity);
  }
  function rate(offer: { price: number; maxPrice?: number; unit: Unit }) {
    return range(offer.price, upperEstimate(offer)) + " / " + t(...units[offer.unit]);
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
    t, language, toggle, intl, money, range, rate, dateTime, appointment, translateError,
    area: (place: string) => t(place, areas[place] || place),
    service: (id: string, name: string) => t(name, services.find((item) => item.id === id)?.hi || name),
    serviceNote: (id: string, note: string) => t(note, services.find((item) => item.id === id)?.noteHi || note),
    task: (id: string, task: string) => t(task, tasks.find((item) => item.service === id && item.task === task)?.taskHi || task),
    tier: (tier: Tier) => tier === "plus" ? t("Plus", "प्लस") : t("Everyday", "एवरीडे"),
    updateLabel: (label: string) => t(label, updateLabels[label] || label),
    status: (status: Booking["status"]) => t(...statuses[status]),
  };
}
