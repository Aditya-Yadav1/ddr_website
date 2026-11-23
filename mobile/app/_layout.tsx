import { Stack } from "expo-router";
import { apiEndpoint, offlineDemo, pilotBuild, usbPilotBuild } from "../src/api";
import { useEffect } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LanguageProvider, useCopy } from "../src/language";
import { LocationProvider } from "../src/location";
import { SessionProvider, useSession } from "../src/session";
import { Body, Brand, Button, colors, Feedback, LanguageButton, Loading, Page } from "../src/ui";

function Navigation() {
  const { token, snapshot, loading, error, restore } = useSession();
  const { t } = useCopy();
  const { width } = useWindowDimensions();
  if (loading) return <Loading />;
  if (token && !snapshot) {
    return <Page><Feedback error={error} /><Button label={t("Reconnect", "फिर कनेक्ट करें")} onPress={() => void restore()} /></Page>;
  }
  return <View style={{ flex: 1, backgroundColor: colors.paper }}>
    {offlineDemo && <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.warm }}><View style={{ padding: 10 }}>
      <Body small strong>{t("Offline demo · fictional data only", "ऑफ़लाइन डेमो · केवल काल्पनिक डेटा")}</Body>
    </View></SafeAreaView>}
    {pilotBuild && <View style={{ padding: 10, backgroundColor: colors.warm }}><Body small>{usbPilotBuild
      ? t("USB pilot · keep the phone connected by cable · test accounts only", "USB पायलट · फ़ोन को केबल से जोड़े रखें · केवल परीक्षण खाते")
      : t("Local pilot · same Wi-Fi · test accounts only", "स्थानीय पायलट · एक ही Wi-Fi · केवल परीक्षण खाते")}</Body><Body small>{apiEndpoint()}</Body></View>}
    <Stack screenOptions={{
    headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false,
    headerTitleStyle: { fontWeight: "700" }, headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: colors.paper },
    headerRight: () => <Brand compact={width < 600} />,
  }}>
    <Stack.Screen name="index" options={{ title: "HandyHive", headerBackVisible: false,
      headerTitle: () => <Brand />, headerRight: () => <LanguageButton /> }} />
      <Stack.Screen name="services/[id]" options={{ title: t("Service options", "सेवा के विकल्प") }} />
      <Stack.Screen name="tasks/[id]" options={{ title: t("Service details", "सेवा की जानकारी") }} />
      <Stack.Screen name="providers/[id]" options={{ title: t("Worker details", "काम करने वाले की जानकारी") }} />
      <Stack.Screen name="request/[id]" options={{ title: t("Request a service", "सेवा का अनुरोध") }} />
      <Stack.Screen name="support" options={{ title: t("Help", "सहायता") }} />
    <Stack.Protected guard={Boolean(token)}>
      <Stack.Screen name="worker" options={{ title: t("Worker workspace", "काम की जगह") }} />
      <Stack.Screen name="worker-profile" options={{ title: t("Worker profile", "काम की प्रोफ़ाइल") }} />
      <Stack.Screen name="account" options={{ title: t("Account", "खाता") }} />
      <Stack.Screen name="bookings/index" options={{ title: t("Your bookings", "आपकी बुकिंग") }} />
      <Stack.Screen name="bookings/[id]" options={{ title: t("Booking details", "बुकिंग का विवरण") }} />
      <Stack.Screen name="bookings/[id]/payment" options={{ title: t("Payment", "भुगतान") }} />
      <Stack.Screen name="bookings/[id]/review" options={{ title: t("Review", "रेटिंग") }} />
    </Stack.Protected>
    <Stack.Protected guard={!token}>
      <Stack.Screen name="sign-in" options={{ title: "HandyHive", headerTitle: () => <Brand />, headerRight: () => null }} />
    </Stack.Protected>
  </Stack></View>;
}

export default function RootLayout() {
  useEffect(() => {
    if (offlineDemo || Platform.OS !== "web" || document.getElementById("handyhive-font")) return;
    const font = document.createElement("link");
    font.id = "handyhive-font";
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(font);
  }, []);
  return <LanguageProvider><SessionProvider><LocationProvider><Navigation /></LocationProvider></SessionProvider></LanguageProvider>;
}
