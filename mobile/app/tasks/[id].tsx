import { useLocalSearchParams, useRouter } from "expo-router";
import { tasks } from "../../src/catalog";
import { Promises } from "../../src/discovery-ui";
import { useDiscovery } from "../../src/discovery";
import { LocationField, PinGate, useLocation } from "../../src/location";
import { useCopy } from "../../src/language";
import { Body, Button, Heading, Page, Panel, Section, ServiceImage } from "../../src/ui";
export default function TaskDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { checked, ids } = useLocation();
  const { snapshot } = useDiscovery();
  const task = tasks.find((item) => item.id === id);
  const copy = useCopy(); const { t } = copy; const router = useRouter();
  if (!task) return <Page><Heading>{t("Service unavailable", "सेवा उपलब्ध नहीं")}</Heading><Button label={t("Explore services", "सेवाएँ खोजें")} onPress={() => router.navigate("/customer")} /></Page>;
  if (!checked || !ids.length) return <Page><PinGate demoPin={snapshot?.state.demoPinCode} /></Page>;
  return <Page><LocationField compact /><ServiceImage service={task.service} /><Section><Body small>{t(task.name, task.hi)}</Body><Heading>{copy.task(task.service, task.task)}</Heading><Body>{t("A clear starting point, with local help you choose.", "साफ़ शुरुआत, अपनी पसंद की स्थानीय मदद के साथ।")}</Body></Section>
    <Panel><Heading size="small">{t("What your visit covers", "विज़िट में क्या शामिल है")}</Heading><Body strong>{copy.task(task.service, task.task)}</Body><Body>{t("Review the worker’s billing unit and included work before requesting. Diagnostic visits cover assessment. Hourly work follows agreed priorities; package work follows the worker’s agreed scope.", "अनुरोध से पहले शुल्क की इकाई और शामिल काम देखें। जाँच की विज़िट में समस्या की जाँच है। घंटे वाले काम में तय प्राथमिकताएँ और पैकेज में तय काम शामिल है।")}</Body>
      {task.task === "Check a damp patch" && <Body small>{t("An assessment does not include fixing the underlying cause of dampness.", "जाँच में सीलन की असली वजह ठीक करना शामिल नहीं है।")}</Body>}
    </Panel><Panel><Heading size="small">{t("Good to know", "ज़रूरी जानकारी")}</Heading><Body>{t("Materials, replacement parts and additional repairs are not automatically included. Agree on extra charges before work starts.", "सामान, नए पुर्ज़े और अतिरिक्त मरम्मत अपने-आप शामिल नहीं हैं। काम शुरू होने से पहले अतिरिक्त कीमत तय करें।")}</Body><Body small>{t("Clear access to the work area. Share useful details through booking messages. You’ll see the starting charge and any hourly minimum on the worker’s offer.", "काम की जगह तक पहुँच साफ़ रखें। बुकिंग संदेशों में ज़रूरी जानकारी दें। काम करने वाले के विकल्प में शुरुआती शुल्क और घंटे की न्यूनतम कीमत दिखेगी।")}</Body></Panel>
    <Button label={t("See local workers →", "स्थानीय काम करने वाले देखें →")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: task.service, scope: task.task, workers: "1" } })} /><Promises />
  </Page>;
}
