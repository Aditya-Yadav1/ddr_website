import { useRouter } from "expo-router";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, Button, Heading, Page, Panel, Section } from "../src/ui";

export default function Help() {
  const router = useRouter();
  const { token } = useSession();
  const { t } = useCopy();
  const questions: [[string, string], [string, string]][] = [
    [["Can I see services before signing in?", "क्या मैं साइन इन से पहले सेवाएँ देख सकता हूँ?"],
      ["Yes. Browse the catalog, enter your service PIN code and compare public professional information. Sign in when you send a booking request.", "हाँ। सेवाएँ देखें, पिन कोड डालें और काम करने वालों की सार्वजनिक जानकारी की तुलना करें। बुकिंग अनुरोध भेजते समय साइन इन करें।"]],
    [["How do I know the final price?", "अंतिम कीमत कैसे पता चलेगी?"],
      ["The professional's offer shows the starting charge and billing unit. Diagnostic visits cover assessment. Materials and extra work require a separate quote that you can review before work begins.", "काम करने वाले के विकल्प में शुरुआती शुल्क और शुल्क की इकाई दिखती है। जाँच की विज़िट में आकलन होता है। सामान और अतिरिक्त काम की अलग कीमत आप काम शुरू होने से पहले देख सकते हैं।"]],
    [["Why are there no professionals in my area?", "मेरे इलाके में काम करने वाले क्यों नहीं दिख रहे?"],
      ["Coverage depends on the exact six-digit PIN code that professionals serve. You can browse the catalog, but you cannot book where no professional is available.", "उपलब्धता काम करने वालों के चुने छह अंकों के पिन कोड पर निर्भर है। आप सेवाएँ देख सकते हैं, पर बिना उपलब्ध काम करने वाले के बुकिंग नहीं होगी।"]],
    [["When is a booking confirmed?", "बुकिंग की पुष्टि कब होती है?"],
      ["Your request is sent to the selected professional. The booking page shows whether they accepted, declined or did not respond in time.", "आपका अनुरोध चुने हुए काम करने वाले को जाता है। बुकिंग पेज पर स्वीकार, अस्वीकार या समय पर जवाब न मिलने की स्थिति दिखती है।"]],
    [["How do I change or cancel a booking?", "बुकिंग कैसे बदलें या रद्द करें?"],
      ["Open the booking from My bookings. Available actions depend on its current status. Keep messages and payment records in that booking so both sides can review them.", "मेरी बुकिंग में बुकिंग खोलें। उपलब्ध विकल्प उसकी मौजूदा स्थिति पर निर्भर हैं। संदेश और भुगतान का रिकॉर्ड उसी बुकिंग में रखें।"]],
    [["Are all professionals verified?", "क्या सभी काम करने वालों की जाँच हुई है?"],
      ["Check each profile for its current verification status. A professional's experience and skills can be self-reported; a badge is shown only for checks recorded by the marketplace.", "हर प्रोफ़ाइल में मौजूदा जाँच की स्थिति देखें। अनुभव और कौशल स्वयं बताए गए हो सकते हैं; बैज केवल दर्ज जाँच के लिए दिखता है।"]],
  ];
  return <Page><Section><Heading>{t("Help and common questions", "सहायता और आम सवाल")}</Heading>
    <Body>{t("Find answers before booking. For a problem with a booking, sign in and contact support from that booking.", "बुकिंग से पहले जवाब पाएँ। बुकिंग में समस्या हो तो साइन इन करके उसी बुकिंग से सहायता लें।")}</Body></Section>
    {questions.map(([question, answer]) => <Panel key={question[0]}><Heading size="small">{t(...question)}</Heading><Body>{t(...answer)}</Body></Panel>)}
    <Button label={token ? t("Open customer support", "ग्राहक सहायता खोलें") : t("Sign in to contact support", "सहायता के लिए साइन इन करें")}
      onPress={() => router.push(token ? "/support" : { pathname: "/sign-in", params: { support: "1" } })} />
  </Page>;
}
