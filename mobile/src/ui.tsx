import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Booking, Profile } from "./api";

export const colors = {
  paper: "#F7F3EA", panel: "#EEE8DB", ink: "#26231E", muted: "#5E574A",
  border: "#C8BFAE", accent: "#9D431C", light: "#FFF7EB", error: "#8C2927",
};

export function Page({ children }: { children: ReactNode }) {
  return <SafeAreaView style={styles.page} edges={["left", "right", "bottom"]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  </SafeAreaView>;
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Feedback({ message }: { message?: string }) {
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null;
}

export function Button({ label, onPress, disabled, secondary, selected }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean;
}) {
  const plain = secondary && !selected;
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: Boolean(disabled), selected }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.button, plain && styles.secondary, (pressed || disabled) && styles.dim]}
  >
    <Text style={[styles.buttonText, plain && styles.secondaryText]}>{label}</Text>
  </Pressable>;
}

export function Loading() {
  return <Page><ActivityIndicator accessibilityLabel="Loading" color={colors.accent} /></Page>;
}

export const bookingStatus: Record<Booking["status"], string> = {
  pending: "Awaiting response", accepted: "Confirmed", expired: "Request expired",
  declined: "Declined", cancelled: "Cancelled", en_route: "On the way",
  arrived: "Arrived", in_progress: "In progress", completed: "Completed",
};

export function appointmentLabel(appointment: string) {
  if (!appointment) return "Flexible timing";
  const time = new Date(appointment + "+05:30");
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short",
  }).format(time) + " IST";
}

export function rate(profile: Pick<Profile, "price" | "unit">) {
  const unit = { visit: "diagnostic visit", hourly: "hour", fixed: "package" }[profile.unit];
  return "₹" + profile.price + " / " + unit;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 14 },
  panel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 16, gap: 10 },
  heading: { fontSize: 25, fontWeight: "700", color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.muted },
  error: { fontSize: 16, lineHeight: 23, color: colors.error },
  button: { borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, justifyContent: "center" },
  secondary: { borderColor: colors.border, backgroundColor: colors.paper },
  buttonText: { fontSize: 16, fontWeight: "600", color: colors.light },
  secondaryText: { color: colors.ink },
  dim: { opacity: 0.55 },
});
