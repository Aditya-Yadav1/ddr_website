import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { offlineDemo } from "../src/api";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { colors, Feedback, heroImage, Page, serviceImages } from "../src/ui";

export default function Welcome() {
  const router = useRouter();
  const { token, snapshot, logout, chooseRole } = useSession();
  const { t } = useCopy();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function enter(role: "customer" | "worker") {
    if (busy) return;
    setBusy(true);
    try {
      await chooseRole(role);
      const demoWorker = snapshot?.state.account.id !== "customer-demo";
      if (token && (!offlineDemo || demoWorker === (role === "worker"))) {
        router.push(role === "worker" ? "/worker" : "/customer");
      } else {
        if (token) await logout();
        router.push({ pathname: "/sign-in", params: { role } });
      }
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  return <Page><View style={styles.wrap}>
    <Text accessibilityRole="header" style={styles.tagline}>Ghar ka Kaam - ASAAN</Text>
    {(["customer", "worker"] as const).map((role) => {
      const customer = role === "customer";
      const label = customer ? t("Customer", "ग्राहक") : t("Worker", "काम करने वाले");
      return <Pressable key={role} accessibilityRole="button" accessibilityLabel={label} disabled={busy}
        onPress={() => void enter(role)} style={({ pressed }) => [styles.card, { backgroundColor: customer ? colors.deep : colors.peach, opacity: pressed ? 0.8 : 1 }]}>
        <View style={styles.copy}><Text style={[styles.role, { color: customer ? colors.light : colors.ink }]}>{label}</Text>
          <Text style={[styles.detail, { color: customer ? colors.light : colors.ink }]}>{customer ? t("Find help for your home.", "घर के काम के लिए मदद पाएँ।") : t("Offer your services and manage jobs.", "अपनी सेवाएँ दें और काम सँभालें।")}</Text></View>
        <Image accessible={false} source={customer ? heroImage : serviceImages.electrical} style={styles.image} />
      </Pressable>;
    })}
    <Feedback error={error} />
  </View></Page>;
}
const styles = StyleSheet.create({
  tagline: { fontSize: 40, lineHeight: 45, fontWeight: "800", letterSpacing: -1.6, color: colors.ink, marginBottom: 8 },
  role: { fontSize: 27, fontWeight: "800" },
  detail: { fontSize: 16, lineHeight: 22 },
  wrap: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 18, paddingVertical: 22 },
  card: { flexDirection: "row", alignItems: "center", minHeight: 125, borderRadius: 10, overflow: "hidden" },
  copy: { flex: 1, padding: 18, gap: 5 },
  image: { width: "30%", height: "100%", minHeight: 125 },
});
