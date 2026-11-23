import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform, StyleSheet, View } from "react-native";
import { api, offlineDemo, type Booking, type Role } from "./api";
import { canUseGps, deviceFix, type GpsFix } from "./device-place";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, colors, Feedback, Heading, Panel, Row, Section, Tag } from "./ui";

type LiveFix = GpsFix & { receivedAt: number };
type Locations = { worker?: LiveFix; customer?: LiveFix };
const foreground = () => Platform.OS === "web" ? !document.hidden : AppState.currentState === "active";

function Separation({ first, second }: { first?: GpsFix; second?: GpsFix }) {
  const { t, language } = useCopy();
  if (!first || !second || Math.max(first.accuracy, second.accuracy) > 150) return null;
  const radians = Math.PI / 180;
  const latitude = (second.latitude - first.latitude) * radians;
  const longitude = (second.longitude - first.longitude) * radians;
  const haversine = Math.sin(latitude / 2) ** 2 + Math.cos(first.latitude * radians)
    * Math.cos(second.latitude * radians) * Math.sin(longitude / 2) ** 2;
  const distance = 12742 * Math.asin(Math.min(1, Math.sqrt(haversine)));
  const formatted = new Intl.NumberFormat(language === "hi" ? "hi-IN" : "en-IN", { style: "unit", unit: distance < 1 ? "meter" : "kilometer",
    maximumFractionDigits: distance < 1 ? 0 : 1 }).format(distance < 1 ? Math.round(distance * 10) * 100 : distance);
  if (distance * 1000 <= first.accuracy + second.accuracy) {
    return <Body small strong>{t("Both pins are within the GPS margin of error.", "दोनों पिन GPS की अनुमानित त्रुटि सीमा के अंदर हैं।")}</Body>;
  }
  return <Body small strong>{formatted} · {t("Approximate straight-line distance", "सीधी रेखा की अनुमानित दूरी")}</Body>;
}

export function VisitProgress({ status }: { status: Booking["status"] }) {
  const { t } = useCopy();
  const labels = [
    t("Requested", "अनुरोध"), t("Confirmed", "पक्की"),
    t("On the way", "रास्ते में"), t("Arrived", "पहुँच गए"),
    t("Work started", "काम शुरू"), t("Completed", "पूरा"),
  ];
  const current = ["pending", "accepted", "en_route", "arrived", "in_progress", "completed"].indexOf(status);
  if (current < 0) return null;
  return <View accessibilityLabel={labels[current]} style={styles.progress}>
    <View style={styles.segments} aria-hidden>
      {labels.map((label, index) => <View key={label} style={[styles.segment,
        index < current && styles.done, index === current && styles.current]} />)}
    </View>
  </View>;
}

function Point({ title, fix, demo = false }: { title: string; fix?: GpsFix; demo?: boolean }) {
  const { t } = useCopy();
  const [error, setError] = useState<unknown>();
  return <View style={styles.point}>
    <Body small strong>{title}</Body>
    {fix ? <>
      <Row><Tag tone={fix.accuracy <= 150 ? "success" : "warning"}>{demo ? t("Sample pin", "नमूना पिन") : t("Latest GPS fix", "ताज़ा GPS रीडिंग")}</Tag>
        <Body small>±{Math.ceil(fix.accuracy)} m</Body></Row>
      {!demo && <Button secondary compact label={t("View on OpenStreetMap ↗", "OpenStreetMap पर देखें ↗")} onPress={() => {
        const { latitude, longitude } = fix;
        void Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`).catch(setError);
      }} />}
    </> : <Body small>{t("No current location shared", "अभी कोई जगह साझा नहीं की गई")}</Body>}
    <Feedback error={error} />
  </View>;
}

function SampleTracking() {
  const { t } = useCopy();
  const [step, setStep] = useState(-1);
  const worker = step >= 0 ? { latitude: 28.59, longitude: [77.033, 77.041, 77.047][step], accuracy: [42, 25, 12][step] } : undefined;
  const customer = step >= 0 ? { latitude: 28.59, longitude: 77.05, accuracy: 18 } : undefined;
  return <Panel tone="info">
    <Heading size="small">{t("Live location preview", "लाइव लोकेशन का प्रीव्यू")}</Heading>
    <Body small>{t("Sample GPS readings for a visit. Try the controls without sharing your location.", "विज़िट के लिए नमूना GPS रीडिंग। अपनी जगह साझा किए बिना आज़माएँ।")}</Body>
    <Row>
      <Point demo title={t("Worker", "काम करने वाला")} fix={worker} />
      <Point demo title={t("Customer", "ग्राहक")} fix={customer} />
    </Row>
    <Separation first={worker} second={customer} />
    <Row>
      <Button compact disabled={step === 2} label={step < 0 ? t("Try GPS preview", "GPS प्रीव्यू आज़माएँ") : t("Refresh sample reading", "नमूना रीडिंग अपडेट करें")} onPress={() => setStep(step + 1)} />
      {step >= 0 && <Button compact secondary label={t("Stop preview", "प्रीव्यू रोकें")} onPress={() => setStep(-1)} />}
    </Row>
  </Panel>;
}

function LiveTracking({ job, role }: { job: string; role: Role }) {
  const { t } = useCopy();
  const { token } = useSession();
  const [focused, setFocused] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [locations, setLocations] = useState<Locations>({});
  const [gpsError, setGpsError] = useState<unknown>();
  const [readError, setReadError] = useState(false);
  const query = "visit-location?" + new URLSearchParams({ job });
  useFocusEffect(useCallback(() => {
    setFocused(true);
    const pause = () => { if (!foreground()) setSharing(false); };
    const listener = AppState.addEventListener("change", pause);
    if (Platform.OS === "web") document.addEventListener("visibilitychange", pause);
    return () => {
      setFocused(false);
      setSharing(false);
      listener.remove();
      if (Platform.OS === "web") document.removeEventListener("visibilitychange", pause);
    };
  }, []));

  useEffect(() => {
    if (!token || !focused) return;
    let active = true;
    let next: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const updates = await api<Locations>(query, token ?? undefined);
        if (!active) return;
        setLocations(updates);
        setReadError(false);
      } catch {
        if (active) { setLocations({}); setReadError(true); }
      } finally {
        if (active) next = setTimeout(poll, 4000);
      }
    }
    void poll();
    return () => { active = false; clearTimeout(next); };
  }, [query, token, focused]);

  useEffect(() => {
    if (!sharing || !token || !focused) return;
    let active = true;
    let shareId: string | undefined;
    let next: ReturnType<typeof setTimeout>;
    const revoke = (id: string) => api("visit-location", token, { job, id, action: "stop" }).catch(() => {});
    async function publish() {
      try {
        const fix = await Promise.race([deviceFix(), new Promise<never>((_, reject) => {
          next = setTimeout(() => reject(new Error("unavailable")), 15_000);
        })]);
        clearTimeout(next);
        if (!active || !foreground()) return;
        if (!shareId) {
          const { id } = await api<{ id: string }>("visit-location", token ?? undefined, { job, action: "start" });
          if (!active || !foreground()) { void revoke(id); return; }
          shareId = id;
        }
        await api("visit-location", token ?? undefined, { job, id: shareId, action: "update", ...fix });
        if (active) next = setTimeout(publish, 8000);
      } catch (error) {
        clearTimeout(next);
        if (active) { setGpsError(error); setSharing(false); }
      }
    }
    void publish();
    return () => {
      active = false;
      clearTimeout(next);
      if (shareId) void revoke(shareId);
    };
  }, [job, focused, sharing, token]);
  const own = role === "pro" ? locations.worker : locations.customer;
  const other = role === "pro" ? locations.customer : locations.worker;
  const { message } = gpsError instanceof Error ? gpsError : { message: "" };
  return <Panel tone="info">
    <Heading size="small">{t("Live visit location", "विज़िट की लाइव लोकेशन")}</Heading>
    <Body small>{t("Share your exact location with the other person on this booking while this screen is open. Sharing ends when you leave or the worker marks arrival.", "इस स्क्रीन के खुले रहने पर अपनी सटीक जगह बुकिंग के दूसरे व्यक्ति से साझा करें। स्क्रीन छोड़ने या काम करने वाले के पहुँचने पर साझाकरण बंद होगा।")}</Body>
    <Row>
      <Point title={t("Your location", "आपकी जगह")} fix={sharing ? own : undefined} />
      <Point title={role === "pro" ? t("Customer", "ग्राहक") : t("Worker", "काम करने वाला")} fix={other} />
    </Row>
    <Separation first={sharing ? own : undefined} second={other} />
    {!!(own || other) && <Body small>{t("Opening the map sends that pin to OpenStreetMap.", "नक्शा खोलने पर पिन OpenStreetMap को भेजा जाता है।")}</Body>}
    {canUseGps() ? <Button label={sharing ? t("Stop sharing", "साझा करना बंद करें") : t("Share my live location", "मेरी लाइव लोकेशन साझा करें")}
      secondary={sharing} onPress={() => { setGpsError(null); setSharing(!sharing); }} />
      : <Body small>{t("Location sharing needs GPS access and a secure HTTPS connection.", "जगह साझा करने के लिए GPS और सुरक्षित HTTPS कनेक्शन चाहिए।")}</Body>}
    {sharing && !own && <Body small>{t("Getting your location…", "आपकी जगह खोज रहे हैं…")}</Body>}
    {Boolean(gpsError) && <Feedback error={message === "denied"
      ? new Error(t("Allow location access to start sharing.", "साझा करने के लिए जगह की अनुमति दें।"))
      : message === "unavailable" ? new Error(t("Couldn’t get a GPS reading. Try again outdoors.", "GPS रीडिंग नहीं मिली। बाहर जाकर फिर कोशिश करें।")) : gpsError} />}
    {readError && <Body small>{t("Location updates are temporarily unavailable.", "जगह के अपडेट अभी उपलब्ध नहीं हैं।")}</Body>}
  </Panel>;
}

export function VisitTracking({ booking, role }: { booking: Booking; role: Role }) {
  if (offlineDemo && ["pending", "accepted", "en_route"].includes(booking.status)) return <SampleTracking />;
  return booking.status === "en_route" ? <LiveTracking job={booking.id} role={role} /> : null;
}

const styles = StyleSheet.create({
  progress: { gap: 7 },
  segments: { flexDirection: "row", gap: 4 },
  segment: { height: 6, borderRadius: 3, backgroundColor: colors.border, flex: 1 },
  current: { backgroundColor: colors.peach },
  done: { backgroundColor: colors.accent },
  point: { flexBasis: 135, flexGrow: 1, gap: 7, padding: 12, borderRadius: 10, backgroundColor: colors.white },
});
