import { Link, useRouter } from "expo-router";
import { isValidElement, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Booking, Profile, Tier, Unit } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";

export const colors = {
  paper: "#FFF8E9", white: "#FFFEFB", panel: "#DFE9FF", ink: "#172846", muted: "#45536A",
  border: "#E4E5DA", accent: "#2049AD", deep: "#132F76", light: "#FFFFFF",
  lime: "#F8DCA0", warm: "#FFF0DC", gold: "#733D10", error: "#9B3430", orange: "#B64C28", peach: "#FFBD54",
  blue: "#27567C", blueDark: "#1D4260", blueTint: "#EDF4FA", blueLine: "#CADDEB",
  redTint: "#FBEDEC", redDark: "#792723", neutral: "#F0EEE8", control: "#828D85",
};

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const tones = {
  neutral: { ink: colors.ink, fill: colors.neutral, line: colors.border },
  info: { ink: colors.blue, fill: colors.blueTint, line: colors.blueLine },
  success: { ink: colors.accent, fill: colors.panel, line: "#C8DDCC" },
  warning: { ink: colors.gold, fill: colors.warm, line: "#E8D8B8" },
  danger: { ink: colors.error, fill: colors.redTint, line: "#EAC4C2" },
};
const bookingTones: Record<Booking["status"], Tone> = {
  pending: "warning", accepted: "success", en_route: "info", arrived: "info",
  in_progress: "info", completed: "success", cancelled: "neutral", declined: "neutral", expired: "neutral",
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
  const { width } = useWindowDimensions();
  const showFooter = footer && !(width >= 850 && isValidElement(footer) && footer.type === MainNav);
  return <SafeAreaView style={styles.page} edges={["left", "right", "bottom"]}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>{children}</View>
    </ScrollView>
    {showFooter && <View style={styles.footer}><View style={styles.footerContent}>{footer}</View></View>}
  </SafeAreaView>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

export function Guide({ children, tone = "info" }: { children: ReactNode; tone?: Tone }) {
  const { ink, fill } = tones[tone];
  const mark = { neutral: "i", info: "i", success: "✓", warning: "!", danger: "!" }[tone];
  return <View style={[styles.guide, { backgroundColor: fill }]}>
    <View accessible={false} aria-hidden style={styles.guideMark}><Text style={[styles.guideLetter, { color: ink }]}>{mark}</Text></View>
    <Text accessibilityLiveRegion="polite" style={[styles.guideText, { color: ink }]}>{children}</Text>
  </View>;
}

export function Panel({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const palette = tone && tones[tone];
  return <View style={[styles.panel, palette && { backgroundColor: palette.fill, borderColor: palette.line }]}>{children}</View>;
}

export function Heading({ children, size = "large" }: { children: ReactNode; size?: "large" | "medium" | "small" }) {
  return <Text accessibilityRole="header" style={[styles.heading, size === "medium" && styles.headingMedium, size === "small" && styles.headingSmall]}>{children}</Text>;
}

export function Body({ children, small, strong, notice }: { children: ReactNode; small?: boolean; strong?: boolean; notice?: boolean }) {
  return <Text accessibilityRole={notice ? "alert" : undefined} accessibilityLiveRegion={notice ? "polite" : undefined}
    style={[styles.body, small && styles.small, strong && styles.strong]}>{children}</Text>;
}

export function Tag({ children, tone = "neutral", mark }: { children: ReactNode; tone?: Tone; mark?: string }) {
  const { ink, fill } = tones[tone];
  return <Text style={[styles.tag, { color: ink, backgroundColor: fill }]}>
    {mark && <Text aria-hidden>{mark} </Text>}{children}
  </Text>;
}

export function BookingStatus({ status }: { status: Booking["status"] }) {
  const copy = useCopy();
  const tone = bookingTones[status];
  return <Tag tone={tone} mark={tone === "success" ? "✓" : tone === "warning" ? "◷" : undefined}>{copy.status(status)}</Tag>;
}

export function RatingScore({ children }: { children: ReactNode }) {
  return <Body small strong><Text aria-hidden style={styles.ratingStar}>★ </Text>{children}</Body>;
}

export function Feedback({ error }: { error?: unknown }) {
  const { translateError } = useCopy();
  return error ? <ErrorMessage>{translateError(error)}</ErrorMessage> : null;
}

function ErrorMessage({ children }: { children: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{children}</Text>;
}

export function Button({ label, onPress, disabled, secondary, selected, compact, danger, expanded, tone, mark, accessibilityLabel }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean; compact?: boolean; danger?: boolean;
  expanded?: boolean; tone?: Tone; mark?: string; accessibilityLabel?: string;
}) {
  const palette = tones[danger ? "danger" : tone ?? (secondary && !selected ? "neutral" : "info")];
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const emphasis = !secondary && selected === undefined;
  const borderColor = palette === tones.neutral ? colors.control : palette.ink;
  const textColor = disabled ? colors.muted : emphasis ? colors.light : palette.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: Boolean(disabled), selected, expanded }}
    disabled={disabled} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => {
      const highlight = hovered || pressed;
      const fill = emphasis ? (highlight ? danger ? colors.redDark : colors.blueDark : palette.ink)
        : highlight || selected ? palette.fill : colors.white;
      return [
        styles.button, compact && styles.compact,
        { backgroundColor: fill, borderColor }, focused && styles.focused, pressed && styles.pressed, disabled && styles.disabled,
      ];
    }}>
    <Text style={[styles.buttonText, { color: textColor }]}>
      {(mark || (selected && "✓")) && <Text aria-hidden>{mark || "✓"} </Text>}{label}
    </Text>
  </Pressable>;
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput {...input} accessibilityLabel={label} placeholderTextColor={colors.muted}
      onFocus={(event) => { setFocused(true); input.onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); input.onBlur?.(event); }}
      style={[styles.input, input.multiline && styles.multiline, input.style, error && { borderColor: colors.error }, focused && styles.focused]} />
    {error && <ErrorMessage>{error}</ErrorMessage>}
    {hint && <Body small>{hint}</Body>}
  </View>;
}

export function Loading() {
  const { t } = useCopy();
  return <Page><ActivityIndicator accessibilityLabel={t("Loading", "लोड हो रहा है")} color={colors.blue} /></Page>;
}

export function LanguageButton() {
  const { t, toggle } = useCopy();
  return <Button compact secondary label={t("हिन्दी", "English")} onPress={toggle} />;
}

export function MainNav({ selected }: { selected: "discover" | "bookings" | "worker" | "account" }) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { t } = useCopy();
  const { role, token } = useSession();
  const links = [
    { id: "discover", path: "/customer", label: t("Explore", "खोजें"), icon: "⌂" },
    { id: "bookings", path: "/bookings", label: t("Bookings", "बुकिंग") , icon: "≡" },
    { id: "worker", path: "/worker", label: t("Work", "काम"), icon: "◇" },
    { id: "account", path: "/account", label: t("Account", "खाता"), icon: "◉" },
  ] as const;
  if (width >= 850) return null;
  return <View style={styles.nav}>
    {links.filter(({ id }) => id === "account" || (role === "worker" ? id === "worker" : id !== "worker")).map(({ id, path, label, icon }) => <Pressable key={id} accessibilityRole="tab" accessibilityLabel={label}
      accessibilityState={{ selected: id === selected }} style={[styles.navItem, id === selected && styles.navSelected]}
      onPress={() => router.navigate(!token && (id === "bookings" || id === "account")
        ? { pathname: "/sign-in", params: { role: "customer" } } : path)}>
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={styles.navText}>{label}</Text>
    </Pressable>)}
  </View>;
}


export function DesktopNav() {
  const router = useRouter();
  const { token, snapshot } = useSession();
  const { t } = useCopy();
  const links = [
    [t("Services", "सेवाएँ"), "/services/all"],
    [t("Bookings", "बुकिंग"), token ? "/bookings" : "/sign-in"],
    [t("Help", "सहायता"), "/help"],
    ...(snapshot?.state.isAdmin ? [[t("Operations", "संचालन"), "/admin"]] : []),
    [t("Work", "काम"), token ? "/worker" : "/sign-in?role=worker"],
    [token ? t("Account", "खाता") : t("Sign in", "साइन इन"), token ? "/account" : "/sign-in"],
  ];
  return <View style={styles.desktopNav}>{links.map(([label, path]) => <Pressable key={label} accessibilityRole="link" accessibilityLabel={label}
    onPress={() => router.push(path as "/help")} style={({ pressed }) => [styles.desktopNavLink, pressed && styles.pressed]}>
    <Text style={styles.desktopNavText}>{label}</Text></Pressable>)}<LanguageButton /></View>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useCopy();
  const [focused, setFocused] = useState(false);
  return <Link href="/" dismissTo asChild>
    <Pressable accessibilityRole="link" accessibilityLabel={t("ASAAN home", "ASAAN होम")}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={StyleSheet.flatten([styles.brand, focused && styles.focused])}>
      <View aria-hidden style={styles.brandMark}><Text style={styles.brandMarkText}>A</Text></View>
      {!compact && <Text style={styles.wordmark}>ASAAN</Text>}
    </Pressable>
  </Link>;
}

export function ServiceImage({ service, large = false }: { service: string; large?: boolean }) {
  return serviceImages[service]
    ? <Image source={serviceImages[service]} style={[styles.serviceImage, large && { height: 260, borderRadius: 4 }]} resizeMode="cover" accessible={false} /> : null;
}

export function TierPrice({ price, maxPrice, legacy, unit, tier, minimumQuantity }: { price: number; maxPrice?: number; legacy?: boolean; unit: Unit; tier: Tier; minimumQuantity?: number }) {
  const copy = useCopy();
  const minimum = minimumQuantity ?? (unit === "hourly" ? 2 : 1);
  return <Section>
    <Row><Tag tone={tier === "plus" ? "warning" : "neutral"}>{copy.tier(tier)}</Tag><Text style={styles.rate}>{legacy ? copy.money(price) : copy.rate({ price, maxPrice, unit })}</Text></Row>
    {unit === "hourly" && <Body small>{copy.t(
      minimum + " hours minimum",
      "कम से कम " + minimum + " घंटे",
    )}</Body>}
  </Section>;
}

export function PriceNote({ unit }: { unit: Profile["unit"] }) {
  const { t } = useCopy();
  return <Body small>{t("This range is an estimate. After seeing the work, your worker sends an itemised quote for you to approve before work starts.", "यह अनुमानित सीमा है। काम देखकर काम करने वाला खर्च का विवरण भेजेगा। आपकी मंज़ूरी के बाद काम शुरू होगा।")}</Body>;
}

export function BookingCard({ booking, worker }: { booking: Booking; worker?: boolean }) {
  const router = useRouter();
  const copy = useCopy();
  const title = copy.task(booking.service, booking.scope);
  return <Panel>
    <Row><BookingStatus status={booking.status} />{booking.tier === "plus" && <Tag tone="warning">{copy.tier("plus")}</Tag>}</Row>
    <Heading size="small">{title}</Heading>
    <Body small>{worker ? copy.area(booking.area) : booking.proName} · {copy.appointment(booking.appointment, booking.timing)}</Body>
    <Button secondary label={copy.t("View booking", "बुकिंग देखें")} onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: booking.id } })} />
  </Panel>;
}

export const fontFamily = Platform.OS === "web" ? "'DM Sans', sans-serif" : Platform.OS === "ios" ? "System" : "sans-serif";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 22 },
  content: { width: "100%", maxWidth: 1180, alignSelf: "center", gap: 22, paddingBottom: 12 },
  desktopNav: { flexDirection: "row", alignItems: "center", gap: 6 },
  desktopNavLink: { paddingHorizontal: 10, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  desktopNavText: { fontFamily, color: colors.ink, fontWeight: "600", fontSize: 14 },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: 10 },
  footerContent: { maxWidth: 1180, width: "100%", alignSelf: "center" },
  panel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 16, padding: 18, gap: 13 },
  section: { gap: 9 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  heading: { fontFamily, fontSize: 29, lineHeight: 36, fontWeight: "700", color: colors.ink, letterSpacing: -0.7 },
  headingMedium: { fontSize: 23, lineHeight: 30, letterSpacing: -0.4 },
  headingSmall: { fontSize: 18, lineHeight: 24 },
  body: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.muted },
  small: { fontSize: 14, lineHeight: 20 },
  strong: { fontWeight: "700", color: colors.ink },
  tag: { fontFamily, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12, fontWeight: "700", overflow: "hidden" },
  ratingStar: { color: colors.gold },
  error: { fontFamily, fontSize: 14, lineHeight: 21, padding: 10, borderRadius: 10, color: colors.error, backgroundColor: colors.redTint },
  button: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, minHeight: 50, justifyContent: "center" },
  compact: { alignSelf: "flex-start", paddingHorizontal: 12 },
  buttonText: { fontFamily, textAlign: "center", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  focused: { outlineColor: colors.blue, outlineWidth: 2, outlineOffset: 2, outlineStyle: "solid" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { backgroundColor: colors.neutral, borderColor: colors.border },
  field: { gap: 5 },
  fieldLabel: { fontFamily, fontSize: 15, lineHeight: 21, color: colors.ink, fontWeight: "600" },
  input: { fontFamily, minHeight: 52, borderWidth: 1.5, borderColor: colors.control, borderRadius: 11, color: colors.ink, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 22 },
  multiline: { minHeight: 86, textAlignVertical: "top" },
  nav: { flexDirection: "row", paddingVertical: 6, gap: 4 },
  navItem: { flex: 1, alignItems: "center", minHeight: 54, padding: 7, borderRadius: 12, gap: 2 },
  navSelected: { backgroundColor: colors.blueTint },
  navIcon: { fontSize: 20, fontWeight: "800", color: colors.blue },
  navText: { fontFamily, fontSize: 12, fontWeight: "600", color: colors.ink, textAlign: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 5, minWidth: 44, minHeight: 44, borderRadius: 10 },
  brandMark: { alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.peach, width: 34, height: 34 },
  brandMarkText: { fontFamily, fontSize: 22, fontWeight: "800", color: colors.deep },
  wordmark: { fontFamily, color: colors.ink, fontSize: 20, fontWeight: "700" },
  serviceImage: { width: "100%", height: 100, backgroundColor: colors.panel, borderRadius: 11 },
  guide: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 15, borderRadius: 15 },
  guideMark: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  guideLetter: { fontFamily, fontWeight: "700", fontSize: 18 },
  guideText: { fontFamily, flex: 1, fontSize: 15, lineHeight: 23, paddingTop: 3 },
  rate: { fontFamily, fontSize: 19, lineHeight: 27, fontWeight: "700", color: colors.ink },
});
