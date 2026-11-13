import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { LanguageProvider, useCopy } from "../src/language";
import { LocationProvider } from "../src/location";
import { SessionProvider, useSession } from "../src/session";
import { Brand, Button, colors, Feedback, LanguageButton, Loading, Page } from "../src/ui";

function Navigation() {
  const { token, snapshot, loading, error, restore } = useSession();
  const { t } = useCopy();
  if (loading) return <Loading />;
  if (token && !snapshot) {
    return <Page><Feedback error={error} /><Button label={t("Reconnect", "फिर कनेक्ट करें")} onPress={() => void restore()} /></Page>;
  }
  return <Stack screenOptions={{
    headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false,
    headerTitleStyle: { fontWeight: "700" }, headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: colors.paper },
    headerRight: () => <LanguageButton />,
  }}>
    <Stack.Protected guard={Boolean(token)}>
      <Stack.Screen name="index" options={{ title: "HandyHive", headerTitle: () => <Brand /> }} />
      <Stack.Screen name="services/[id]" options={{ title: t("Service options", "सेवा के विकल्प") }} />
      <Stack.Screen name="worker" options={{ title: t("Worker workspace", "काम की जगह") }} />
      <Stack.Screen name="worker-profile" options={{ title: t("Worker profile", "काम की प्रोफ़ाइल") }} />
      <Stack.Screen name="account" options={{ title: t("Account", "खाता") }} />
      <Stack.Screen name="request/[id]" options={{ title: t("Request a service", "सेवा का अनुरोध") }} />
      <Stack.Screen name="bookings/index" options={{ title: t("Your bookings", "आपकी बुकिंग") }} />
      <Stack.Screen name="bookings/[id]" options={{ title: t("Booking details", "बुकिंग का विवरण") }} />
    </Stack.Protected>
    <Stack.Protected guard={!token}>
      <Stack.Screen name="sign-in" options={{ title: "HandyHive", headerTitle: () => <Brand /> }} />
    </Stack.Protected>
  </Stack>;
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web" || document.getElementById("handyhive-font")) return;
    const font = document.createElement("link");
    font.id = "handyhive-font";
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(font);
  }, []);
  return <LanguageProvider><SessionProvider><LocationProvider><Navigation /></LocationProvider></SessionProvider></LanguageProvider>;
}
