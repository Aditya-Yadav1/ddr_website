import { useLocalSearchParams, useRouter } from "expo-router";
import { information } from "../../src/information";
import { useCopy } from "../../src/language";
import { Body, Button, Guide, Heading, Page, Panel, Section } from "../../src/ui";
export default function InformationPage() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const router = useRouter();
  const { t } = useCopy();
  const page = information[topic];
  if (!page) return <Page><Heading>{t("Page unavailable", "पेज उपलब्ध नहीं है")}</Heading><Button label={t("Go home", "होम पर जाएँ")} onPress={() => router.push("/")} /></Page>;
  return <Page><Section><Heading>{t(...page.title)}</Heading><Body>{t(...page.intro)}</Body></Section>
    {page.draft && <Guide tone="warning">{t("Policy draft — requires business owner approval before launch.", "नीति का मसौदा — लॉन्च से पहले व्यवसाय मालिक की मंज़ूरी ज़रूरी है।")}</Guide>}
    {page.sections.map((section) => <Panel key={section.title[0]}><Heading size="small">{t(...section.title)}</Heading><Body>{t(...section.body)}</Body></Panel>)}
    <Button secondary label={t("Browse services", "सेवाएँ देखें")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: "all" } })} />
  </Page>;
}
