import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Image, Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isPinCode } from "../shared/pin-codes";
import { localPlaces } from "../shared/local-places";
import { devicePlace, type VisitPlace } from "./device-place";
import { api, offlineDemo } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";
import { readStored, writeStored } from "./storage";
import { Body, Button, colors, Feedback, Field, fontFamily, Guide, Heading, heroImage, Panel, Row, Section, Tag } from "./ui";

type Coverage = { key: string; ids: string[]; error?: unknown };
type ServiceLocation = {
  pinCode: string;
  locality: string;
  setPinCode: (value: string, locality?: string) => void;
  ids: string[];
  checked: boolean;
  checking: boolean;
  error: unknown;
  retry: () => void;
};
const LocationContext = createContext<ServiceLocation | null>(null);
const storageKey = "handyhive-service-pin";

export function LocationProvider({ children }: { children: ReactNode }) {
  const { token, snapshot } = useSession();
  const [{ pinCode, value: locality }, updatePlace] = useState<VisitPlace>(
    offlineDemo ? { pinCode: "110017", value: "Saket, Delhi" } : { pinCode: "", value: "" });
  const [result, setResult] = useState<Coverage | null>(null);
  const [attempt, setAttempt] = useState(0);
  const edited = useRef(false);
  const key = JSON.stringify([token, pinCode]);
  const valid = isPinCode(pinCode);

  useEffect(() => {
    let active = true;
    void readStored(storageKey, true).then((saved) => {
      if (!active || edited.current || !saved) return;
      const place = isPinCode(saved) ? { pinCode: saved, value: "" } : JSON.parse(saved);
      if (place && isPinCode(place.pinCode) && typeof place.value === "string") updatePlace(place);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!valid) return;
    let active = true;
    const timer = setTimeout(() => {
      void api<{ ids: string[] }>("coverage?" + new URLSearchParams({ pinCode }), token || undefined).then(({ ids }) => {
        if (active) setResult({ key, ids });
      }).catch((error) => {
        if (active) setResult({ key, ids: [], error });
      });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [key, pinCode, token, valid, snapshot?.revision, attempt]);
  useEffect(() => {
    if (!edited.current || (!valid && pinCode)) return;
    void writeStored(storageKey, pinCode ? JSON.stringify({ pinCode, value: locality }) : "", true).catch(() => {});
  }, [pinCode, locality, valid]);
  const setPinCode = useCallback((value: string, label?: string) => {
    edited.current = true;
    updatePlace((previous) => ({
      pinCode: value, value: label ?? (value === previous.pinCode ? previous.value : ""),
    }));
  }, []);
  const current = valid && result?.key === key ? result : null;
  return <LocationContext.Provider value={{
    pinCode, locality, setPinCode, ids: current?.ids ?? [], error: current?.error,
    checked: Boolean(current && !current.error), checking: valid && !current,
    retry: () => setAttempt((previous) => previous + 1),
  }}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("Location provider is missing.");
  return context;
}

export function DemoLocationButton({ pin }: { pin?: string }) {
  const { pinCode, setPinCode } = useLocation();
  const { t } = useCopy();
  if (!pin || pinCode === pin) return null;
  const place = localPlaces(pin)[0];
  return <Button secondary compact label={t("Try demo location", "डेमो जगह आज़माएँ") + " · " + (place?.name || pin)} onPress={() => setPinCode(pin, place?.value)} />;
}

export function LocationField({ compact = false }: { compact?: boolean }) {
  const { pinCode, locality, setPinCode, checked, checking, ids, error, retry } = useLocation();
  const { t } = useCopy();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{ term: string; places: VisitPlace[]; failed: boolean } | null>(null);
  const [gps, setGps] = useState<"idle" | "busy" | "denied" | "missing">("idle");
  const [detected, setDetected] = useState<VisitPlace | null>(null);
  const attempt = useRef(0);
  const term = query.trim();
  const direct = isPinCode(term);
  const searchable = term.length >= 2 && !direct;
  const collapsed = compact && !editing && isPinCode(pinCode);
  const canLocate = !offlineDemo && (Platform.OS !== "web" || globalThis.isSecureContext);
  useEffect(() => () => { attempt.current++; }, []);
  useEffect(() => {
    if (!searchable || collapsed || offlineDemo) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await api<{ suggestions: VisitPlace[]; unavailable: boolean }>(
          "locations?" + new URLSearchParams({ q: term, postal: "1" }));
        if (active) setRemote({ term, places: result.suggestions.filter((place) => isPinCode(place.pinCode)), failed: result.unavailable });
      } catch {
        if (active) setRemote({ term, places: [], failed: true });
      }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [term, searchable, collapsed]);
  const result = remote?.term === term ? remote : null;
  const local = searchable ? localPlaces(term) : [];
  const choices = [...local, ...(result?.places ?? [])].filter((place, index, list) =>
    list.findIndex((other) => other.pinCode === place.pinCode && other.value === place.value) === index).slice(0, 8);
  function reset(value = "") {
    attempt.current++;
    setQuery(value);
    setRemote(null);
    setDetected(null);
    setGps("idle");
  }
  function choose(place: VisitPlace) {
    reset();
    setPinCode(place.pinCode, place.value);
    if (pinCode === place.pinCode && error) retry();
    setEditing(false);
    Keyboard.dismiss();
  }
  async function locate() {
    reset();
    const id = attempt.current;
    setGps("busy");
    const timeout = setTimeout(() => {
      if (id === attempt.current) { attempt.current++; setGps("missing"); }
    }, 30000);
    try {
      const place = await devicePlace();
      if (id !== attempt.current) return;
      setDetected(place);
      setGps(place ? "idle" : "missing");
    } catch (failure) {
      if (id === attempt.current) setGps(failure instanceof Error && failure.message === "denied" ? "denied" : "missing");
    } finally { clearTimeout(timeout); }
  }
  return <View style={look.container}>
    {collapsed ? <Pressable accessibilityRole="button"
      accessibilityLabel={t("Change visit location", "विज़िट की जगह बदलें") + ", " + (locality || pinCode)}
      onPress={() => setEditing(true)} style={({ pressed }) => [look.selected, pressed && { opacity: 0.75 }]}>
      <Text style={look.label}>{locality || t("Visit location", "विज़िट की जगह")} · {pinCode}</Text>
      <Text style={look.change}>{t("Change", "बदलें")}</Text>
    </Pressable> : <>
      <Field label={t("Search your location", "अपनी जगह खोजें")} value={query}
        placeholder={t("Locality, sector or landmark", "इलाका, सेक्टर या लैंडमार्क")} onChangeText={reset}
        autoFocus={compact && editing} autoCapitalize="words" maxLength={100}
        onSubmitEditing={() => { if (direct) choose({ value: "", pinCode: term }); }} />
      {direct && <Button label={t("Find workers", "काम करने वाले खोजें") + " · " + term} onPress={() => choose({ value: "", pinCode: term })} />}
      {choices.map((place) => <Button secondary tone="info" key={place.value + place.pinCode}
        label={place.value + " · " + place.pinCode} onPress={() => choose(place)} />)}
      {searchable && !choices.length && <Body small>{!result && !offlineDemo
        ? t("Searching places…", "जगह खोज रहे हैं…")
        : result?.failed ? t("Location search is unavailable. Try a known locality or enter your PIN.", "अभी जगह खोज नहीं पाए। इलाका या पिन कोड डालें।")
        : t("No matching postal area. Try a nearby landmark, sector or PIN.", "डाक क्षेत्र नहीं मिला। पास का लैंडमार्क, सेक्टर या पिन आज़माएँ।")}</Body>}
      {canLocate && <Button secondary compact tone="info" disabled={gps === "busy"}
        label={gps === "busy" ? t("Finding your location…", "आपकी जगह खोज रहे हैं…") : t("Use my current location", "मेरी मौजूदा जगह इस्तेमाल करें")}
        onPress={() => void locate()} />}
      {detected && <Button label={t("Use this location", "यह जगह इस्तेमाल करें") + " · " + [detected.value, detected.pinCode].filter(Boolean).join(" · ")}
        onPress={() => choose(detected)} />}
      {gps === "denied" && <Guide tone="warning">{t("Location access is off. Search for your locality above.", "जगह की अनुमति बंद है। ऊपर अपना इलाका खोजें।")}</Guide>}
      {gps === "missing" && <Guide tone="warning">{t("We couldn’t confirm a postal area here. Search for your locality or enter a PIN.", "यहाँ डाक क्षेत्र की पुष्टि नहीं हुई। अपना इलाका खोजें या पिन डालें।")}</Guide>}
      {compact && editing && <Button secondary compact label={t("Cancel", "रद्द करें")} onPress={() => { reset(); setEditing(false); }} />}
    </>}
    {checking && <Body small>{t("Checking available workers…", "उपलब्ध काम करने वाले खोज रहे हैं…")}</Body>}
    {checked && !ids.length && <Guide tone="warning">{t("No workers serve this location yet", "अभी यहाँ कोई काम करने वाला उपलब्ध नहीं है")} · {[locality, pinCode].filter(Boolean).join(" · ")}</Guide>}
    <Feedback error={error} />
    {Boolean(error) && <Button compact secondary label={t("Check coverage again", "उपलब्धता फिर जाँचें")} onPress={retry} />}
  </View>;
}

export function PinGate({ demoPin }: { demoPin?: string }) {
  const { t } = useCopy();
  return <Panel tone="info">
    <View style={look.intro}>
      <View style={look.introCopy}><Section>
        <Heading>{t("Where is the visit?", "विज़िट कहाँ होगी?")}</Heading>
        <Body>{t("Choose your neighbourhood to find workers nearby.", "आसपास काम करने वाले खोजने के लिए अपना इलाका चुनें।")}</Body>
      </Section></View>
      <Image source={heroImage} style={look.introImage} resizeMode="cover" accessible={false} />
    </View>
    <LocationField />
    {demoPin && <Row><DemoLocationButton pin={demoPin} /></Row>}
  </Panel>;
}

export function VisitPin({ pinCode, change = false }: { pinCode: string; change?: boolean }) {
  const { setPinCode } = useLocation();
  const { t } = useCopy();
  const router = useRouter();
  return <Row>
    <Tag tone="info">{t("Visit PIN", "विज़िट का पिन")} {pinCode}</Tag>
    {change && <Button compact secondary label={t("Change location", "जगह बदलें")} onPress={() => {
      setPinCode("");
      router.dismissTo("/");
    }} />}
  </Row>;
}

const look = StyleSheet.create({
  container: { gap: 9 },
  intro: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 14 },
  introCopy: { flexGrow: 1, flexBasis: 150 },
  introImage: { width: 84, height: 92, borderRadius: 12, backgroundColor: colors.peach },
  selected: { flexDirection: "row", alignItems: "center", gap: 9, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  label: { flex: 1, fontFamily, color: colors.ink, fontWeight: "600" },
  change: { color: colors.blue, fontFamily, fontWeight: "600" },
});
