import { useLocalSearchParams, useRouter } from "expo-router";
import { tasks } from "../../src/catalog";
import { taskDetails } from "../../src/task-details";
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

  const details = taskDetails[task.id];
  return <Page><LocationField compact /><ServiceImage service={task.service} large /><Section><Body small>{t(task.name, task.hi)}</Body><Heading>{copy.task(task.service, task.task)}</Heading>
    <Body>{t("See local professionals and review each offer before sending a request.", "स्थानीय काम करने वालों को देखें और अनुरोध से पहले उनका विकल्प जाँचें।")}</Body></Section>
    <Panel><Heading size="small">{t("What this service covers", "इस सेवा में क्या होता है")}</Heading><Body>{t(...details.includes)}</Body></Panel>
    <Panel><Heading size="small">{t("Price and exclusions", "कीमत और अलग खर्च")}</Heading><Body>{t(...details.excludes)}</Body>
      <Body small>{t("The professional sets the starting rate. A diagnostic visit covers assessment; materials and extra work require your approval of a separate quote.", "शुरुआती शुल्क काम करने वाला तय करता है। जाँच की विज़िट में समस्या का आकलन है; सामान और अतिरिक्त काम के लिए अलग कीमत मंज़ूर करें।")}</Body></Panel>
    <Panel><Heading size="small">{t("Before the visit", "विज़िट से पहले")}</Heading><Body>{t(...details.preparation)}</Body><Body small>{t("Typical time: ", "सामान्य समय: ") + t(...details.duration)}</Body></Panel>
    <Button label={t("See local workers →", "स्थानीय काम करने वाले देखें →")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: task.service, scope: task.task, workers: "1" } })} /><Promises />
  </Page>;
}
