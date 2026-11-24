import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { matchingTasks } from "../src/catalog";
import { information } from "../src/information";
import { useDiscovery } from "../src/discovery";
import { useCopy } from "../src/language";
import { LocationField, useLocation } from "../src/location";
import { useSession } from "../src/session";
import { Body, Button, colors, Feedback, Field, Heading, heroImage, Page, Row, ServiceImage } from "../src/ui";

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const { t, service: serviceName, task: taskName } = useCopy();
  const { token } = useSession();
  const { snapshot, error, retry } = useDiscovery();
  const { pinCode, checked, ids } = useLocation();
  const [query, setQuery] = useState("");
  const results = useMemo(() => query.trim() ? matchingTasks(query).slice(0, 6) : [], [query]);
  const services = snapshot?.state.catalog.services ?? [];
  const localServices = checked ? new Set(snapshot?.state.profiles.filter((person) => ids.includes(person.id)).map((person) => person.service)) : null;
  return <Page>
    {!wide && <View style={styles.top}><Row>
      {wide && <Button compact secondary label={t("All services", "सभी सेवाएँ")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: "all" } })} />}
      {wide && <Button compact secondary label={t("My bookings", "मेरी बुकिंग")} onPress={() => router.push(token ? "/bookings" : "/sign-in")} />}
      <Button compact secondary label={token ? t("Account", "खाता") : t("Sign in", "साइन इन")} onPress={() => router.push(token ? "/account" : "/sign-in")} />
    </Row></View>}
    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={styles.heroCopy}><Text style={styles.eyebrow}>{t("HOME SERVICES IN YOUR AREA", "आपके इलाके में घरेलू सेवाएँ")}</Text>
        <Heading>{t("Find help for the jobs at home", "घर के काम के लिए मदद खोजें")}</Heading>
        <Body>{t("Browse services, compare local professionals and request a time that works for you.", "सेवाएँ देखें, स्थानीय काम करने वालों की तुलना करें और सुविधाजनक समय चुनें।")}</Body>
        <LocationField compact />
        <Field label={t("What needs fixing or cleaning?", "क्या ठीक करवाना या साफ़ करवाना है?")} placeholder={t("Try leaking tap, fan or bathroom cleaning", "जैसे नल, पंखा या बाथरूम सफ़ाई")}
          value={query} onChangeText={setQuery} onSubmitEditing={() => router.push({ pathname: "/services/[id]", params: { id: "all", query } })} />
        {!!query && <View style={styles.suggestions}>{results.length ? results.map((task) => <Pressable key={task.id} accessibilityRole="link" onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } })} style={styles.suggestion}><Text style={styles.suggestionText}>{taskName(task.service, task.task)}</Text></Pressable>)
          : <Body small>{t("No matching service. Try another word.", "सेवा नहीं मिली। दूसरा शब्द लिखें।")}</Body>}</View>}
        {checked && <Body small>{ids.length ? t(`Showing professionals serving ${pinCode}`, `${pinCode} में उपलब्ध काम करने वाले`) : t("No professionals currently serve this PIN code. You can still browse services.", "इस पिन कोड में अभी कोई काम करने वाला नहीं है। आप सेवाएँ देख सकते हैं।")}</Body>}
      </View><Image source={heroImage} accessibilityLabel={t("Home services illustration", "घरेलू सेवा की तस्वीर")} style={[styles.heroImage, wide && styles.heroImageWide]} resizeMode="cover" /></View>
    <Feedback error={error} />{!!error && <Button secondary label={t("Try again", "फिर कोशिश करें")} onPress={retry} />}
    <View style={styles.section}><Heading size="medium">{t("Explore services", "सेवाएँ देखें")}</Heading>
      <View style={styles.grid}>{services.map((service) => <Pressable key={service.id} accessibilityRole="link" onPress={() => router.push({ pathname: "/services/[id]", params: { id: service.id } })} style={[styles.category, wide && styles.categoryWide]}>
        <ServiceImage service={service.id} /><Text style={styles.categoryName}>{serviceName(service.id, service.name)}</Text><Body small>{service.note}</Body>
        {localServices && <Body small>{localServices.has(service.id) ? t("Professionals in your area", "आपके इलाके में काम करने वाले") : t("Currently unavailable here", "यहाँ अभी उपलब्ध नहीं")}</Body>}
      </Pressable>)}</View>
      <Button secondary label={t("See every service →", "सभी सेवाएँ देखें →")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: "all" } })} /></View>
    <View style={styles.info}><Heading size="medium">{t("How booking works", "बुकिंग कैसे होती है")}</Heading>
      <View style={[styles.steps, wide && styles.stepsWide]}>{[
        [t("1. Choose the work", "1. काम चुनें"), t("Tell us what needs attention and enter your PIN code.", "काम बताएं और अपना पिन कोड डालें।")],
        [t("2. Compare professionals", "2. काम करने वालों की तुलना करें"), t("Check their starting charges, scope and available times.", "शुरुआती शुल्क, काम और उपलब्ध समय देखें।")],
        [t("3. Confirm details", "3. जानकारी तय करें"), t("Send a request. Approve any additional quote before work begins.", "अनुरोध भेजें। अतिरिक्त काम की कीमत पहले मंज़ूर करें।")]
      ].map(([title, body]) => <View key={title} style={styles.step}><Text style={styles.stepTitle}>{title}</Text><Body small>{body}</Body></View>)}</View></View>
    <View style={styles.join}><View style={{ flex: 1, gap: 8 }}><Heading size="medium">{t("Offer your services", "अपनी सेवाएँ दें")}</Heading><Body>{t("Create a professional profile, set your service area and manage requests in one place.", "प्रोफ़ाइल बनाएँ, अपना सेवा क्षेत्र चुनें और काम के अनुरोध सँभालें।")}</Body></View><Button label={t("Professional workspace →", "काम की जगह →")} onPress={() => router.push(token ? "/worker" : { pathname: "/sign-in", params: { role: "worker" } })} /></View>
    <View style={styles.footer}><Body small>{t("ASAAN · Home services marketplace", "आसान · घरेलू सेवाओं का बाज़ार")}</Body>
      <View style={styles.footerLinks}><Button compact secondary label={t("Help", "सहायता")} onPress={() => router.push("/help")} />
      {Object.entries(information).map(([topic, page]) => <Button key={topic} compact secondary label={t(...page.title)}
        onPress={() => router.push({ pathname: "/information/[topic]", params: { topic } })} />)}</View></View>
  </Page>;
}
const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  hero: { backgroundColor: colors.warm, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  heroWide: { flexDirection: "row", minHeight: 390 }, heroCopy: { flex: 1, padding: 26, gap: 14, minWidth: 270 },
  heroImage: { width: "100%", height: 200 }, heroImageWide: { width: "38%", height: "100%", minHeight: 390 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  suggestions: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 8 },
  suggestion: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, suggestionText: { color: colors.ink, fontSize: 15 },
  section: { gap: 16 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  category: { flexBasis: "45%", flexGrow: 1, minWidth: 150, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 7 },
  categoryWide: { flexBasis: "22%" }, categoryName: { fontSize: 18, fontWeight: "700", color: colors.ink },
  info: { paddingVertical: 20, gap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  steps: { gap: 18 }, stepsWide: { flexDirection: "row" }, step: { flex: 1, gap: 7 }, stepTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  join: { backgroundColor: colors.panel, padding: 23, gap: 16, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", gap: 8, maxWidth: 850 },
  footer: { borderTopWidth: 1, borderColor: colors.border, paddingVertical: 20, gap: 12, flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
});
