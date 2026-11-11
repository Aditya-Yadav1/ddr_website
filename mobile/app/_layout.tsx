import { Stack } from "expo-router";
import { SessionProvider, useSession } from "../src/session";
import { Button, colors, Feedback, Loading, Page } from "../src/ui";

function Navigation() {
  const { token, snapshot, loading, error, restore } = useSession();
  if (loading) return <Loading />;
  if (token && !snapshot) {
    return <Page><Feedback message={error} /><Button label="Reconnect" onPress={() => void restore()} /></Page>;
  }
  return <Stack screenOptions={{
    headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink,
    contentStyle: { backgroundColor: colors.paper },
  }}>
    <Stack.Protected guard={Boolean(token)}>
      <Stack.Screen name="index" options={{ title: "HandyHive" }} />
      <Stack.Screen name="worker" options={{ title: "Worker workspace" }} />
      <Stack.Screen name="request/[id]" options={{ title: "Request an appointment" }} />
      <Stack.Screen name="bookings/[id]" options={{ title: "Booking details" }} />
    </Stack.Protected>
    <Stack.Protected guard={!token}>
      <Stack.Screen name="sign-in" options={{ title: "HandyHive" }} />
    </Stack.Protected>
  </Stack>;
}

export default function RootLayout() {
  return <SessionProvider><Navigation /></SessionProvider>;
}
