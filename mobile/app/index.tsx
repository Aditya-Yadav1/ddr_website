import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useCopy } from "../src/language";
import { LocationField, useLocation } from "../src/location";
import { useSession } from "../src/session";
import { activeStatuses, Body, BookingCard, Button, colors, Feedback, Field, fontFamily, Guide, Heading, heroImage, MainNav, Page, Row, Section, ServiceImage } from "../src/ui";

export default function CustomerHome() {
  const { snapshot, error } = useSession();
  const { location, ids, checked } = useLocation();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState("");
  if (!snapshot) return null;
  const { catalog, profiles, requests, account } = snapshot.state;
  const activeBooking = requests.filter((booking) => booking.customerId === account.id
    && activeStatuses.includes(booking.status)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const availableProfiles = location.trim() ? profiles.filter((person) => checked && ids.includes(person.id)) : profiles;
  const open = (service: string) => router.push({ pathname: "/services/[id]", params: { id: service, query: query.trim() } });

  return <Page footer={<MainNav selected="discover" />}>
    <View style={screen.welcome}>
      <View style={screen.welcomeCopy}>
        <Text style={screen.hello}>{t("Hi there. Let’s get it sorted.", "नमस्ते। चलिए, काम आसान करें।")}</Text>
        <Text accessibilityRole="header" style={[screen.title, width < 500 && screen.titleSmall]}>{t("What needs a hand\nat home today?", "आज घर के किस\nकाम में मदद चाहिए?")}</Text>
        <Body small>{t("Find local help, at a price you can see upfront.", "स्थानीय मदद पाएँ। शुरुआती कीमत पहले ही देखें।")}</Body>
      </View>
      {width >= 390 && <Image source={heroImage} style={[screen.welcomeImage, width < 600 && screen.welcomeImageSmall]} resizeMode="cover" accessible={false} />}
    </View>
    <LocationField />
    {checked && ids.length > 0 && <Guide>{t("Good news, we can help here. What shall we get done?", "अच्छी खबर है, यहाँ सेवा उपलब्ध है। कौन-सा काम करवाएँ?")}</Guide>}
    <Feedback error={error} />
    <Section>
      <Heading size="medium">{t("What do you need help with?", "आपको किस काम में मदद चाहिए?")}</Heading>
      <View style={screen.services}>
        {catalog.services.map((item) => {
          const workers = availableProfiles.filter((person) => person.service === item.id)
            .sort((a, b) => a.price * (a.unit === "hourly" ? 2 : 1) - b.price * (b.unit === "hourly" ? 2 : 1));
          const first = workers[0];
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={copy.service(item.id, item.name)}
            accessibilityHint={t("See workers and starting prices", "काम करने वाले और शुरुआती कीमतें देखें")}
            onHoverIn={() => setHovered(item.id)} onHoverOut={() => setHovered("")}
            onPress={() => open(item.id)} style={({ pressed }) => [screen.service, { width: width < 600 ? "48%" : "23.5%" }, hovered === item.id && screen.serviceHover, pressed && screen.pressed]}>
            <ServiceImage service={item.id} />
            <View style={screen.cardTitle}><Text style={screen.serviceTitle}>{copy.service(item.id, item.name)}</Text><Text style={screen.cardArrow}>↗</Text></View>
            <Body small>{copy.serviceNote(item.id, item.note)}</Body>
            {first ? <Text style={screen.price}>{t("From ", "शुरुआत ")}{copy.money(first.price * (first.unit === "hourly" ? 2 : 1))}
              {first.unit === "hourly" ? t(" / 2 hours", " / 2 घंटे") : first.unit === "visit" ? t(" / visit", " / विज़िट") : t(" / package", " / पैकेज")}</Text>
              : <Body small>{t("Check service options", "सेवा के विकल्प देखें")}</Body>}
          </Pressable>;
        })}
      </View>
    </Section>
    <Section>
      <Heading size="medium">{t("Not sure what to pick?", "समझ नहीं आ रहा क्या चुनें?")}</Heading>
      <Field label={t("Tell me what needs fixing", "बताइए, क्या ठीक करवाना है?")} value={query} onChangeText={setQuery}
        placeholder={t("For example, leaking tap", "जैसे, टपकता नल")} returnKeyType="search" onSubmitEditing={() => open("all")} />
      <Row>{[
        { label: t("Leaking tap", "टपकता नल"), service: "plumbing", query: "leaking tap" },
        { label: t("Fan trouble", "पंखे की दिक्कत"), service: "electrical", query: "fan" },
        { label: t("Kitchen cleaning", "रसोई की सफ़ाई"), service: "cleaning", query: "kitchen" },
      ].map((suggestion) => <Button key={suggestion.service} secondary compact label={suggestion.label} onPress={() => router.push({ pathname: "/services/[id]", params: { id: suggestion.service, query: suggestion.query } })} />)}</Row>
      <Button label={t("Help me find the right service →", "सही सेवा खोजें →")} onPress={() => open("all")} />
    </Section>
    {activeBooking && <Section>
      <Heading size="medium">{t("Your current booking", "आपकी चालू बुकिंग")}</Heading>
      <BookingCard booking={activeBooking} />
    </Section>}
  </Page>;
}

const screen = StyleSheet.create({
  welcome: { backgroundColor: colors.peach, borderRadius: 20, padding: 18, flexDirection: "row", gap: 15, alignItems: "center", overflow: "hidden" },
  welcomeCopy: { flex: 1, gap: 8 },
  hello: { fontFamily, color: colors.orange, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  title: { fontFamily, color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: "700", letterSpacing: -1 },
  titleSmall: { fontSize: 27, lineHeight: 32 },
  welcomeImage: { width: 130, height: 130, borderRadius: 14 },
  welcomeImageSmall: { width: 95, height: 145 },
  services: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  service: { padding: 10, borderWidth: 1.5, borderRadius: 16, borderColor: colors.border, backgroundColor: colors.white, gap: 8 },
  serviceHover: { borderColor: colors.accent, backgroundColor: "#F5FAF0" },
  cardTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  cardArrow: { color: colors.accent, fontSize: 21 },
  serviceTitle: { fontFamily, flex: 1, color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  price: { fontFamily, color: colors.accent, backgroundColor: colors.panel, borderRadius: 7, overflow: "hidden", paddingVertical: 6, paddingHorizontal: 7, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
