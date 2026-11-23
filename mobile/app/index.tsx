import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { tasks } from "../src/catalog";
import { offlineDemo } from "../src/api";
import { DemoAccounts } from "../src/demo-accounts";
import { useDiscovery } from "../src/discovery";
import { look, Promises, TaskCard, WorkerPreview } from "../src/discovery-ui";
import { useCopy } from "../src/language";
import { LocationField, PinGate, useLocation } from "../src/location";
import { activeStatuses, Body, BookingCard, Button, colors, Feedback, Field, Heading, heroImage, MainNav, Page, Panel, Row, Section, ServiceImage } from "../src/ui";

export default function CustomerHome() {
  const { snapshot, error, retry } = useDiscovery();
  const { pinCode, locality, ids, checked } = useLocation();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("essentials");
  if (!snapshot) return <Page><Heading>{t("A hand for your home", "घर के काम में मदद")}</Heading><Feedback error={error} /><Button label={t("Try again", "फिर कोशिश करें")} onPress={retry} /></Page>;
  const { catalog, profiles, requests, account, demoPinCode, ratings = [], popular = [] } = snapshot.state;
  const eligible = checked ? profiles.filter((person) => ids.includes(person.id)) : [];
  if (!eligible.length) return <Page footer={<MainNav selected="discover" />}>
    <PinGate demoPin={demoPinCode} />
    {offlineDemo && <DemoAccounts />}
    <Button secondary tone="info" label={t("Customer Support", "ग्राहक सहायता")} onPress={() => router.push("/support")} />
  </Page>;
  const active = requests.filter((booking) => booking.customerId === account.id && activeStatuses.includes(booking.status)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const previous = requests.filter((booking) => booking.customerId === account.id && booking.status === "completed").slice(0, 2);
  const needle = query.trim().toLowerCase();
  const matchedTasks = tasks.filter((task) => [task.task, task.name, task.hi, copy.task(task.service, task.task), ...task.aliases].some((text) => text.toLowerCase().includes(needle)));
  const matchingWorkers = eligible.filter((person) => {
    const service = catalog.services.find((item) => item.id === person.service);
    return [person.name, service?.name, copy.service(person.service, service?.name ?? person.service)]
      .some((term) => term?.toLowerCase().includes(needle));
  }).slice(0, 4);
  const localPopular = popular.filter((item) => item.pinCode === pinCode && eligible.some((person) => person.service === item.service));
  const featured = localPopular.length ? localPopular.map((item) => tasks.find((task) => task.service === item.service && task.task === item.scope)).filter((task): task is typeof tasks[number] => Boolean(task)).slice(0, 4) : [tasks[0], tasks[5], tasks[8], tasks[14]];
  return <Page footer={<MainNav selected="discover" />}>
    <LocationField compact />
    {offlineDemo && <DemoAccounts />}
    <Section><Heading>{locality ? t("Workers in ", "यहाँ उपलब्ध काम करने वाले · ") + locality : t("Workers near you", "आपके आसपास काम करने वाले")}</Heading>
      <Field label={t("Search services or local workers", "सेवा या स्थानीय काम करने वाले खोजें")} value={query} onChangeText={setQuery} placeholder={t("Try leaking tap, fan or kitchen…", "नल, पंखा या रसोई लिखें…")} returnKeyType="search" />
      <Row>{[tasks[0], tasks[5], tasks[8]].map((task) => <Button key={task.id} compact secondary label={copy.task(task.service, task.task)} onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } })} />)}</Row>
    </Section><Feedback error={error} />
    {!!matchingWorkers.length && <Section>
      {matchingWorkers.map((person) => <WorkerPreview key={person.id} person={person}
        rating={ratings.find((rating) => rating.pro === person.id)} service={catalog.services.find((item) => item.id === person.service)?.name ?? person.service}>
        <Button secondary tone="info" label={t("View worker", "काम करने वाले की जानकारी देखें")} onPress={() =>
          router.push({ pathname: "/providers/[id]", params: { id: person.id, pinCode } })} />
      </WorkerPreview>)}
      {eligible.length > matchingWorkers.length && !needle && <Button secondary label={t("View all workers", "सभी काम करने वाले देखें")}
        onPress={() => router.push({ pathname: "/services/[id]", params: { id: "all", workers: "1" } })} />}
    </Section>}
    {needle ? <Section><Heading size="medium">{t("Services", "सेवाएँ")} · {matchedTasks.length}</Heading>
      <View style={look.grid}>{matchedTasks.map((task) => <TaskCard key={task.id} task={task} profiles={eligible} />)}</View>
      {!matchedTasks.length && <Body>{t("Try a task, room or another spelling.", "काम, कमरे का नाम या दूसरी वर्तनी लिखें।")}</Body>}
      <Button secondary label={t("Clear search", "खोज हटाएँ")} onPress={() => setQuery("")} />
    </Section> : <>
      {active && <BookingCard booking={active} />}
      <View style={screen.welcome}><View style={{ flex: 1, gap: 8 }}><Text style={look.eyebrow}>{t("HELLO, NEIGHBOUR", "नमस्ते, पड़ोसी")}</Text><Heading size="medium">{t("Little fixes.\nA happier home.", "छोटे काम।\nघर में बड़ा सुकून।")}</Heading><Body small>{t("Choose your service. Meet your local help.", "सेवा चुनें। अपनी स्थानीय मदद पाएँ।")}</Body></View><Image source={heroImage} style={screen.hero} resizeMode="cover" accessible={false} /></View>
      <Section><Heading size="medium">{t("Care for every corner", "घर के हर कोने की देखभाल")}</Heading><View style={screen.categories}>{catalog.services.map((service) => <Pressable key={service.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/services/[id]", params: { id: service.id } })} style={({ pressed }) => [screen.category, pressed && { opacity: 0.75 }]}><ServiceImage service={service.id} /><Heading size="small">{copy.service(service.id, service.name)} ↗</Heading><Body small>{copy.serviceNote(service.id, service.note)}</Body></Pressable>)}</View></Section>
      <Section><Heading size="medium">{localPopular.length ? t("Most booked near you", "आपके पास सबसे ज़्यादा बुक हुई सेवाएँ") : t("Explore home essentials", "घर की ज़रूरी सेवाएँ")}</Heading><View style={look.grid}>{featured.map((task) => <TaskCard key={task.id} task={task} profiles={eligible} />)}</View></Section>
      <Promises />
      <Section><Heading size="medium">{t("Make a little room for care", "घर की देखभाल के लिए थोड़ा समय")}</Heading><Row>{[["essentials", t("Small fixes", "छोटे काम")], ["fresh", t("A fresh space", "ताज़गी भरा घर")]].map(([id, label]) => <Button key={id} compact secondary selected={collection === id} label={label} onPress={() => setCollection(id)} />)}</Row><View style={look.grid}>{(collection === "fresh" ? [tasks[8], tasks[9], tasks[12]] : [tasks[0], tasks[4], tasks[5]]).map((task) => <TaskCard key={task.id} task={task} profiles={eligible} />)}</View></Section>
      <Panel tone="warning"><Text style={look.eyebrow}>✦ HANDYHIVE PLUS</Text><Heading size="medium">{t("A little more, thoughtfully included.", "थोड़ा और, पूरे ध्यान के साथ।")}</Heading><Body>{t("Everyday covers your selected service. Plus adds the worker’s specific extras, with the difference in price shown clearly.", "एवरीडे में आपकी चुनी सेवा है। प्लस में काम करने वाले की बताई अतिरिक्त सेवाएँ और उनकी साफ़ कीमत है।")}</Body><Button secondary label={t("Explore Plus options →", "प्लस के विकल्प देखें →")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: "all", plus: "1", workers: "1" } })} /></Panel>
      {!!previous.length && <Section><Heading size="medium">{t("A familiar hand", "जानी-पहचानी मदद")}</Heading>{previous.map((booking) => <Panel key={booking.id}><Body strong>{copy.task(booking.service, booking.scope)}</Body><Body>{booking.proName}</Body><Button secondary label={t("Check a new visit", "नई विज़िट देखें")} onPress={() => router.push({ pathname: "/providers/[id]", params: { id: booking.proId, scope: booking.scope, tier: booking.tier, area: booking.area, pinCode: booking.pinCode } })} /></Panel>)}</Section>}
      <Panel><Heading size="medium">{t("Before we knock", "हमारे आने से पहले")}</Heading><Body strong>{t("When is my visit confirmed?", "विज़िट कब पक्की होती है?")}</Body><Body small>{t("When your chosen worker accepts. Follow their response in Bookings.", "काम करने वाले के स्वीकार करने पर। बुकिंग में जवाब देखें।")}</Body><Body strong>{t("Does the visit price cover repairs?", "क्या विज़िट की कीमत में मरम्मत है?")}</Body><Body small>{t("A diagnostic fee covers assessment. Agree on repairs, materials and extra charges before work starts. Payment is arranged directly with the worker.", "जाँच के शुल्क में समस्या की जाँच है। काम शुरू होने से पहले मरम्मत, सामान और अतिरिक्त कीमत तय करें। भुगतान सीधे काम करने वाले से तय होगा।")}</Body></Panel>
    </>}
    <Button secondary tone="info" label={t("Customer Support", "ग्राहक सहायता")} onPress={() => router.push("/support")} />
  </Page>;
}
const screen = StyleSheet.create({
  welcome: { backgroundColor: colors.peach, borderRadius: 22, padding: 20, flexDirection: "row", gap: 12, alignItems: "center" },
  hero: { width: 95, height: 120, borderRadius: 15 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  category: { flexBasis: 155, flexGrow: 1, flexShrink: 1, backgroundColor: colors.white, borderRadius: 17, padding: 11, gap: 8, borderWidth: 1, borderColor: colors.border },
});
