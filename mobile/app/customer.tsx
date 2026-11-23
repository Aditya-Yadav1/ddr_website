import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useCopy } from "../src/language";
import { LocationField, PinGate, useLocation } from "../src/location";
import { useSession } from "../src/session";
import { colors, Heading, MainNav, Page, ServiceImage } from "../src/ui";

export default function Customer() {
  const { snapshot } = useSession();
  const { pinCode, checked, ids } = useLocation();
  const { t, service: serviceName } = useCopy();
  const router = useRouter();
  return <Page footer={<MainNav selected="discover" />}>
    {!pinCode ? <PinGate demoPin={snapshot?.state.demoPinCode} /> : <>
      <LocationField compact />
      {checked && ids.length > 0 && <><Heading>{t("What do you need help with?", "किस काम में मदद चाहिए?")}</Heading>
        <View style={styles.grid}>{snapshot?.state.catalog.services.map((service) =>
          <Pressable accessibilityRole="button" key={service.id}
            onPress={() => router.push({ pathname: "/services/[id]", params: { id: service.id } })}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
            <ServiceImage service={service.id} /><Heading size="small">{serviceName(service.id, service.name)}</Heading>
          </Pressable>)}</View></>}
    </>}
  </Page>;
}
const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { flexGrow: 1, flexBasis: "44%", maxWidth: "49%", padding: 10, gap: 8, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
});
