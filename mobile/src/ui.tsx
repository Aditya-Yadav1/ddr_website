import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Booking, Profile, Tier, Unit } from "./api";
import { useCopy } from "./language";

export const colors = {
  paper: "#FAF7F1", white: "#FFFEFB", panel: "#EAF2E9", ink: "#233C32", muted: "#5E6B62",
  border: "#E4E5DA", accent: "#286348", deep: "#1B4C35", light: "#FFFFFF",
  lime: "#F8DCA0", warm: "#FFF0DC", gold: "#805322", error: "#9B3430", orange: "#B64C28", peach: "#FBE8D9",
};

export const serviceImages: Record<string, number> = {
  plumbing: require("../assets/service-1.jpg"),
  electrical: require("../assets/service-2.jpg"),
  cleaning: require("../assets/service-3.jpg"),
  painting: require("../assets/service-4.jpg"),
};
export const heroImage: number = require("../assets/local-home-help.png");
export const activeStatuses: Booking["status"][] = ["pending", "accepted", "en_route", "arrived", "in_progress"];

export function Page({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return <SafeAreaView style={styles.page} edges={["left", "right", "bottom"]}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>{children}</View>
    </ScrollView>
    {footer && <View style={styles.footer}><View style={styles.footerContent}>{footer}</View></View>}
  </SafeAreaView>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

export function Guide({ children }: { children: ReactNode }) {
  return <View style={styles.guide}>
    <View accessible={false} style={styles.guideMark}><Text style={styles.guideLetter}>H</Text></View>
    <Text accessibilityLiveRegion="polite" style={styles.guideText}>{children}</Text>
  </View>;
}

export function Panel({ children, tint }: { children: ReactNode; tint?: "green" | "warm" }) {
  return <View style={[styles.panel, tint === "green" && styles.green, tint === "warm" && styles.warm]}>{children}</View>;
}

export function Heading({ children, size = "large" }: { children: ReactNode; size?: "large" | "medium" | "small" }) {
  return <Text accessibilityRole="header" style={[styles.heading, size === "medium" && styles.headingMedium, size === "small" && styles.headingSmall]}>{children}</Text>;
}

export function Body({ children, small, strong, notice }: { children: ReactNode; small?: boolean; strong?: boolean; notice?: boolean }) {
  return <Text accessibilityRole={notice ? "alert" : undefined} accessibilityLiveRegion={notice ? "polite" : undefined}
    style={[styles.body, small && styles.small, strong && styles.strong]}>{children}</Text>;
}

export function Tag({ children, warm }: { children: ReactNode; warm?: boolean }) {
  return <Text style={[styles.tag, warm && styles.tagWarm]}>{children}</Text>;
}

export function Feedback({ error }: { error?: unknown }) {
  const { translateError } = useCopy();
  return error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{translateError(error)}</Text> : null;
}

export function Button({ label, onPress, disabled, secondary, selected, compact, danger }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean; compact?: boolean; danger?: boolean;
}) {
  const plain = secondary && !selected;
  const [highlighted, setHighlighted] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled), selected }}
    disabled={disabled} onPress={onPress} onHoverIn={() => setHighlighted(true)} onHoverOut={() => setHighlighted(false)}
    onFocus={() => setHighlighted(true)} onBlur={() => setHighlighted(false)} style={({ pressed }) => [
      styles.button, plain && styles.secondary, compact && styles.compact, danger && styles.danger,
      highlighted && (plain ? styles.secondaryHover : styles.buttonHover),
      pressed && styles.pressed, disabled && styles.dim,
    ]}>
    <Text style={[styles.buttonText, plain && styles.secondaryText, danger && styles.dangerText]}>{label}</Text>
  </Pressable>;
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput {...input} accessibilityLabel={label} placeholderTextColor={colors.muted}
      onFocus={(event) => { setFocused(true); input.onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); input.onBlur?.(event); }}
      style={[styles.input, input.multiline && styles.multiline, input.style, focused && styles.inputFocused]} />
    {hint && <Body small>{hint}</Body>}
  </View>;
}

export function Loading() {
  const { t } = useCopy();
  return <Page><ActivityIndicator accessibilityLabel={t("Loading", "लोड हो रहा है")} color={colors.accent} /></Page>;
}

export function LanguageButton() {
  const { t, toggle } = useCopy();
  return <Button compact secondary label={t("हिन्दी", "English")} onPress={toggle} />;
}

export function MainNav({ selected }: { selected: "discover" | "bookings" | "worker" | "account" }) {
  const router = useRouter();
  const { t } = useCopy();
  const links = [
    { id: "discover", path: "/", label: t("Explore", "खोजें"), icon: "⌂" },
    { id: "bookings", path: "/bookings", label: t("Bookings", "बुकिंग") , icon: "≡" },
    { id: "worker", path: "/worker", label: t("Work", "काम"), icon: "◇" },
    { id: "account", path: "/account", label: t("Account", "खाता"), icon: "◉" },
  ] as const;
  return <View style={styles.nav}>
    {links.map(({ id, path, label, icon }) => <Pressable key={id} accessibilityRole="tab" accessibilityLabel={label}
      accessibilityState={{ selected: id === selected }} style={[styles.navItem, id === selected && styles.navSelected]}
      onPress={() => router.navigate(path)}>
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={styles.navText}>{label}</Text>
    </Pressable>)}
  </View>;
}

export function Brand() {
  return <View style={styles.brand}>
    <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
    <Text style={styles.wordmark}>HandyHive</Text>
  </View>;
}

export function ServiceImage({ service }: { service: string }) {
  return serviceImages[service]
    ? <Image source={serviceImages[service]} style={styles.serviceImage} resizeMode="cover" accessible={false} /> : null;
}

export function TierPrice({ price, unit, tier, minimumQuantity }: { price: number; unit: Unit; tier: Tier; minimumQuantity?: number }) {
  const copy = useCopy();
  const minimum = minimumQuantity ?? (unit === "hourly" ? 2 : 1);
  return <Section>
    <Row><Tag warm={tier === "plus"}>{copy.tier(tier)}</Tag><Text style={styles.rate}>{copy.rate({ price, unit })}</Text></Row>
    {unit === "hourly" && <Body small>{copy.t(
      copy.money(price * minimum) + " minimum for " + minimum + " hours",
      minimum + " घंटे के लिए कम से कम " + copy.money(price * minimum),
    )}</Body>}
  </Section>;
}

export function PriceNote({ unit }: { unit: Profile["unit"] }) {
  const { t } = useCopy();
  const notes: Record<Unit, string> = {
    visit: t("This is the diagnostic visit fee. Agree on any repair and parts charges with the worker before work starts.", "यह जाँच की विज़िट का शुल्क है। काम शुरू होने से पहले मरम्मत और पुर्ज़ों की कीमत तय करें।"),
    hourly: t("The final labour cost depends on time worked. Agree on supplies or extra charges before work starts.", "मज़दूरी काम में लगे समय पर निर्भर करती है। काम शुरू होने से पहले सामान और अतिरिक्त शुल्क तय करें।"),
    fixed: t("This rate covers the agreed package. Confirm any additional work or materials before work starts.", "यह दर तय पैकेज के लिए है। काम शुरू होने से पहले अतिरिक्त काम और सामान की कीमत तय करें।"),
  };
  return <Body small>{notes[unit]} {t("Payment is arranged directly with the worker.", "भुगतान सीधे काम करने वाले से तय करें।")}</Body>;
}

export function BookingCard({ booking, worker }: { booking: Booking; worker?: boolean }) {
  const router = useRouter();
  const copy = useCopy();
  const title = copy.task(booking.service, booking.scope);
  return <Panel>
    <Row><Tag>{copy.status(booking.status)}</Tag>{booking.tier === "plus" && <Tag warm>{copy.tier("plus")}</Tag>}</Row>
    <Heading size="small">{title}</Heading>
    <Body small>{worker ? copy.area(booking.area) : booking.proName} · {copy.appointment(booking.appointment, booking.timing)}</Body>
    <Button secondary label={copy.t("View booking", "बुकिंग देखें")} onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: booking.id } })} />
  </Panel>;
}

export const fontFamily = Platform.OS === "web" ? "'DM Sans', sans-serif" : Platform.OS === "ios" ? "System" : "sans-serif";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 22 },
  content: { width: "100%", maxWidth: 860, alignSelf: "center", gap: 22, paddingBottom: 12 },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: 10 },
  footerContent: { maxWidth: 860, width: "100%", alignSelf: "center" },
  panel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 16, padding: 18, gap: 13 },
  green: { backgroundColor: colors.panel },
  warm: { backgroundColor: colors.warm, borderColor: "#E8D8B8" },
  section: { gap: 9 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  heading: { fontFamily, fontSize: 29, lineHeight: 36, fontWeight: "700", color: colors.ink, letterSpacing: -0.7 },
  headingMedium: { fontSize: 23, lineHeight: 30, letterSpacing: -0.4 },
  headingSmall: { fontSize: 18, lineHeight: 24 },
  body: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.muted },
  small: { fontSize: 14, lineHeight: 20 },
  strong: { fontWeight: "700", color: colors.ink },
  tag: { fontFamily, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12, fontWeight: "700", color: colors.deep, backgroundColor: colors.panel, overflow: "hidden" },
  tagWarm: { backgroundColor: colors.deep, color: "#F8DCA0" },
  error: { fontSize: 14, lineHeight: 21, padding: 10, borderRadius: 10, color: colors.error, backgroundColor: "#FBECE6" },
  button: { borderWidth: 1, borderColor: colors.accent, borderRadius: 12, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 13, minHeight: 50, justifyContent: "center" },
  buttonHover: { backgroundColor: colors.deep },
  secondaryHover: { backgroundColor: colors.panel, borderColor: colors.accent },
  secondary: { borderColor: colors.border, backgroundColor: colors.white },
  compact: { alignSelf: "flex-start", paddingHorizontal: 12 },
  danger: { borderColor: "#E4C6B8", backgroundColor: colors.white },
  buttonText: { fontFamily, textAlign: "center", fontSize: 15, lineHeight: 21, fontWeight: "600", color: colors.light },
  secondaryText: { color: colors.ink },
  dangerText: { color: colors.error },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.52 },
  field: { gap: 5 },
  fieldLabel: { fontFamily, fontSize: 15, lineHeight: 21, color: colors.ink, fontWeight: "600" },
  input: { fontFamily, minHeight: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 11, color: colors.ink, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 22 },
  inputFocused: { borderColor: colors.accent, backgroundColor: "#FEFFF9" },
  multiline: { minHeight: 86, textAlignVertical: "top" },
  nav: { flexDirection: "row", paddingVertical: 6, gap: 4 },
  navItem: { flex: 1, alignItems: "center", minHeight: 54, padding: 7, borderRadius: 12, gap: 2 },
  navSelected: { backgroundColor: colors.panel },
  navIcon: { fontSize: 20, fontWeight: "800", color: colors.accent },
  navText: { fontFamily, fontSize: 12, fontWeight: "600", color: colors.ink, textAlign: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.peach, width: 34, height: 34 },
  brandMarkText: { fontFamily, fontSize: 22, fontWeight: "700", color: colors.orange },
  wordmark: { fontFamily, color: colors.ink, fontSize: 20, fontWeight: "700" },
  serviceImage: { width: "100%", height: 100, backgroundColor: colors.panel, borderRadius: 11 },
  guide: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 15, backgroundColor: colors.panel, borderRadius: 15 },
  guideMark: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  guideLetter: { fontFamily, fontWeight: "700", color: colors.accent, fontSize: 18 },
  guideText: { fontFamily, flex: 1, color: colors.deep, fontSize: 15, lineHeight: 23, paddingTop: 3 },
  rate: { fontFamily, fontSize: 19, lineHeight: 27, fontWeight: "700", color: colors.ink },
});
