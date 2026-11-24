import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Profile, WorkerRating } from "./api";
import type { ReactNode } from "react";
import { useCopy } from "./language";
import { Body, Button, colors, fontFamily, Heading, Panel, Row, ServiceImage } from "./ui";
import { tasks } from "./catalog";
import { ProviderRating } from "./provider-actions";
import { WorkerCheckBadge } from "./worker-safety";
import { useLocation } from "./location";
import { eligible, rateFor } from "./pilot-pricing";

export function WorkerPreview({ person, rating, service, rate, children }: {
  person: Profile; rating?: WorkerRating; service: string; rate?: string; children: ReactNode;
}) {
  const copy = useCopy();
  return <Panel>
    <Row>
      <View style={look.workerInitial}><Text style={look.workerLetter}>{person.name.trim().slice(0, 1)}</Text></View>
      <View style={look.workerName}><Heading size="small">{person.name}</Heading><ProviderRating rating={rating} /></View>
    </Row>
    <Body small>{copy.service(person.service, service)} · {person.years} {copy.t("years’ experience", "साल का अनुभव")}</Body>
    <WorkerCheckBadge trust={person.trust} sample={person.sample} />
    <Body strong>{rate ?? copy.rate(person)}</Body>
    {children}
  </Panel>;
}

export function Promises() {
  const { t } = useCopy();
  return <Panel tone="info">
    <Text style={look.eyebrow}>{t("THE ASAAN WAY", "आसान का भरोसा")}</Text>
    <Heading size="medium">{t("A little clarity. A lot of care.", "साफ़ जानकारी। पूरे ध्यान से काम।")}</Heading>
    {[
      ["01", t("Know what your visit includes", "विज़िट में क्या शामिल है, जानें"), t("Scope, starting charges and minimums before you request.", "अनुरोध से पहले काम, शुरुआती शुल्क और न्यूनतम कीमत देखें।")],
      ["02", t("Choose your local help", "अपनी स्थानीय मदद चुनें"), t("Compare workers and choose who you invite home.", "काम करने वालों की तुलना करें और अपनी पसंद चुनें।")],
      ["03", t("Stay in the loop", "हर कदम की जानकारी"), t("Booking updates and messages, together in your app.", "बुकिंग की जानकारी और संदेश, ऐप में एक साथ।")],
    ].map(([number, title, body]) => <View key={number} style={look.promise}><Text style={look.number}>{number}</Text>
      <View style={{ flex: 1, gap: 3 }}><Body strong>{title}</Body><Body small>{body}</Body></View></View>)}
  </Panel>;
}

export function TaskCard({ task, profiles }: { task: typeof tasks[number]; profiles: Profile[] }) {
  const router = useRouter();
  const copy = useCopy();
  const { pinCode } = useLocation();
  const rate = rateFor(task.service, task.task, pinCode);
  const workers = profiles.filter((person) => person.service === task.service
    && (person.specializations?.length ? person.specializations.includes(task.id) : task.legacy))
    .sort((a, b) => a.price * (a.unit === "hourly" ? 2 : 1) - b.price * (b.unit === "hourly" ? 2 : 1));
  const first = workers[0];
  return <View style={look.task}>
    <Body small>{copy.t(task.name, task.hi)}</Body>
    <Heading size="small">{copy.task(task.service, task.task)}</Heading>
    {rate ? <><Body strong>{copy.money(rate.price)} · {rate.repairPrice ? copy.t("inspection", "जाँच") : copy.t("fixed labour", "श्रम का तय शुल्क")}</Body>
      {!profiles.some((person) => person.service === task.service && eligible(person, rate)) && <Body small>{copy.t("Check worker availability", "काम करने वाले की उपलब्धता देखें")}</Body>}</>
      : first ? <><Body strong>{copy.rate(first)}</Body>
      <Body small>{first.unit === "visit" ? copy.t("Diagnostic visit · repairs quoted separately", "जाँच की विज़िट · मरम्मत की कीमत अलग") : first.unit === "hourly" ? copy.t("2-hour minimum", "कम से कम 2 घंटे") : copy.t("Package estimate", "पैकेज का अनुमान")}</Body></>
      : <Body small>{copy.t("Check availability by PIN code", "पिन कोड से उपलब्धता जाँचें")}</Body>}
    <Button secondary label={copy.t("View service →", "सेवा देखें →")} onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } })} />
  </View>;
}

export const look = StyleSheet.create({
  eyebrow: { fontFamily, fontSize: 11, lineHeight: 18, letterSpacing: 1.7, fontWeight: "700", color: colors.accent },
  promise: { flexDirection: "row", gap: 14, paddingVertical: 7 },
  number: { fontFamily, fontSize: 19, lineHeight: 26, color: colors.accent },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  task: { flexBasis: 230, flexGrow: 1, flexShrink: 1, minWidth: 0, padding: 14, gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 17 },
  workerInitial: { backgroundColor: colors.blueTint, borderRadius: 15, width: 49, height: 49, alignItems: "center", justifyContent: "center" },
  workerLetter: { fontFamily, fontWeight: "700", color: colors.blue, fontSize: 21 },
  workerName: { flex: 1, minWidth: 130, gap: 4 },
});
