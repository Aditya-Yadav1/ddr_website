import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { offlineDemo } from "../src/api";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, colors, Feedback, Heading, heroImage, Page, serviceImages } from "../src/ui";

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
    <Heading>{t("How are you using HandyHive?", "आप HandyHive कैसे इस्तेमाल करेंगे?")}</Heading>
    {(["customer", "worker"] as const).map((role) => {
      const customer = role === "customer";
      const label = customer ? t("Customer", "ग्राहक") : t("Worker", "काम करने वाले");
      return <Pressable key={role} accessibilityRole="button" accessibilityLabel={label} disabled={busy}
        onPress={() => void enter(role)} style={({ pressed }) => [styles.card, { backgroundColor: customer ? colors.panel : colors.peach, opacity: pressed ? 0.8 : 1 }]}>
        <View style={styles.copy}><Heading size="medium">{label}</Heading>
          <Body>{customer ? t("Find help for your home.", "घर के काम के लिए मदद पाएँ।") : t("Offer your services and manage jobs.", "अपनी सेवाएँ दें और काम सँभालें।")}</Body></View>
        <Image accessible={false} source={customer ? heroImage : serviceImages.electrical} style={styles.image} />
      </Pressable>;
    })}
    <Feedback error={error} />
  </View></Page>;
}
const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 18, paddingVertical: 22 },
  card: { flexDirection: "row", alignItems: "center", minHeight: 125, borderRadius: 20, overflow: "hidden" },
  copy: { flex: 1, padding: 18, gap: 5 },
  image: { width: "30%", height: "100%", minHeight: 125 },
});
