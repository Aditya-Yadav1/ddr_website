import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Keyboard, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type PlaceSuggestion } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";
import { readStored, writeStored } from "./storage";
import { Body, Button, colors, Feedback, Field, fontFamily } from "./ui";

type Coverage = { key: string; ids: string[]; error?: unknown };
type ServiceLocation = {
  location: string;
  setLocation: (value: string) => void;
  ids: string[];
  checked: boolean;
  checking: boolean;
  error: unknown;
  retry: () => void;
  editing: boolean;
  beginEdit: () => void;
  cancelEdit: () => void;
};
const LocationContext = createContext<ServiceLocation | null>(null);
const storageKey = "handyhive-service-location";

export function LocationProvider({ children }: { children: ReactNode }) {
  const { token, snapshot } = useSession();
  const [location, updateLocation] = useState("");
  const [result, setResult] = useState<Coverage | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const edited = useRef(false);
  const value = location.trim();
  const key = JSON.stringify([token, value, snapshot?.revision, attempt, editing]);
  useEffect(() => {
    let active = true;
    void readStored(storageKey, true).then((saved) => {
      if (active && !edited.current && saved) updateLocation(saved.slice(0, 120));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!token || editing || value.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      void api<{ ids: string[] }>("coverage?" + new URLSearchParams({ location: value }), token).then((coverage) => {
        if (active) setResult({ key, ids: coverage.ids });
      }).catch((error) => {
        if (active) setResult({ key, ids: [], error });
      });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [editing, key, token, value]);
  useEffect(() => {
    if (!edited.current) return;
    const timer = setTimeout(() => { void writeStored(storageKey, value, true).catch(() => {}); }, 350);
    return () => clearTimeout(timer);
  }, [value]);
  const setLocation = useCallback((next: string) => {
    edited.current = true;
    setEditing(false);
    updateLocation(next.trim().slice(0, 120));
  }, []);
  const beginEdit = useCallback(() => setEditing(true), []);
  const cancelEdit = useCallback(() => setEditing(false), []);
  const current = !editing && result?.key === key ? result : null;
  return <LocationContext.Provider value={{
    location, setLocation, ids: current?.ids ?? [], error: current?.error,
    checked: Boolean(current && !current.error), checking: Boolean(token && !editing && value.length >= 2 && !current),
    retry: () => setAttempt((previous) => previous + 1),
    editing, beginEdit, cancelEdit,
  }}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("Location provider is missing.");
  return context;
}

export function LocationField({ compact = false }: { compact?: boolean }) {
  const { location, setLocation, checked, checking, ids, error, retry, editing, beginEdit, cancelEdit } = useLocation();
  const { token, snapshot } = useSession();
  const { t } = useCopy();
  const [draft, setDraft] = useState(location);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(!compact || !location);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [result, setResult] = useState<{ query: string; suggestions: PlaceSuggestion[]; unavailable: boolean } | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId().replace(/:/g, "");
  const query = draft.trim();
  const needle = query.toLowerCase();
  const local: PlaceSuggestion[] = [...new Set(snapshot?.state.profiles.flatMap((person) => person.areas) ?? [])]
    .filter((area) => area.toLowerCase().includes(needle)).slice(0, 6)
    .map((area) => ({ id: "area-" + area, name: area, description: "", value: area, source: "coverage" }));
  const current = result?.query === query ? result : null;
  const suggestions = current?.suggestions ?? local;
  const searching = open && query.length >= 2 && !current;

  useEffect(() => { setDraft(location); }, [location]);
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); cancelEdit(); }, [cancelEdit]);
  useEffect(() => {
    if (!open || !token || query.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      void api<{ suggestions: PlaceSuggestion[]; unavailable: boolean }>("locations?" + new URLSearchParams({ q: query }), token)
        .then((places) => { if (active) setResult({ query, ...places }); })
        .catch(() => { if (active) setResult({ query, suggestions: local, unavailable: true }); });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query, token]);

  function choose(value: string) {
    Keyboard.dismiss();
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setDraft(value);
    setLocation(value);
    setOpen(false);
    setExpanded(!compact);
    setActiveIndex(-1);
  }
  function keepSelectionOpen() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }
  function finishTyping() {
    setOpen(false);
    setDraft(location);
    cancelEdit();
  }
  if (compact && !expanded && location && !editing) return <Pressable accessibilityRole="button"
    accessibilityLabel={t("Change location", "इलाका बदलें") + ", " + location} onPress={() => setExpanded(true)}
    style={({ pressed }) => [look.selectedLocation, pressed && look.pressed]}>
    <Text style={look.pin}>⌖</Text><Text style={look.selectedText}>{location}</Text><Text style={look.change}>{t("Change", "बदलें")} ↓</Text>
  </Pressable>;
  return <View style={look.container}>
    <Field label={t("Where should we come?", "हम कहाँ आएँ?")}
      placeholder={t("Try Saket, Dwarka, or your locality…", "साकेत, द्वारका या अपना इलाका लिखें…")}
      value={draft} onChangeText={(next) => { setDraft(next); beginEdit(); setOpen(true); setActiveIndex(-1); }}
      onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setOpen(true); }}
      onBlur={() => { blurTimer.current = setTimeout(finishTyping, 180); }}
      onSubmitEditing={() => { if (query.length >= 2) choose((suggestions[activeIndex] ?? suggestions[0])?.value ?? query); }}
      onKeyPress={(event) => {
        const key = event.nativeEvent.key;
        if (key === "Escape") { event.preventDefault(); finishTyping(); }
        if ((key === "ArrowDown" || key === "ArrowUp") && suggestions.length) {
          event.preventDefault(); setOpen(true);
          setActiveIndex((index) => index < 0 ? (key === "ArrowDown" ? 0 : suggestions.length - 1)
            : (index + (key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
        }
      }}
      accessibilityRole="combobox" accessibilityState={{ expanded: open && query.length >= 2 }}
      maxLength={100} autoCorrect={false} autoComplete="off" returnKeyType="search" style={look.searchInput} />
    {open && query.length >= 2 && <View nativeID={listId} accessibilityRole="list" style={look.dropdown}>
      {suggestions.map((place, index) => <Pressable key={place.id} accessibilityRole="button"
        accessibilityLabel={[place.name, place.description].filter(Boolean).join(", ")}
        accessibilityState={{ selected: activeIndex === index }}
        onPressIn={keepSelectionOpen} onFocus={keepSelectionOpen} onPress={() => choose(place.value)} onHoverIn={() => setActiveIndex(index)}
        style={({ pressed }) => [look.option, (pressed || activeIndex === index) && look.optionActive]}>
        <Text style={look.optionPin}>⌖</Text>
        <View style={look.optionText}><Text style={look.optionName}>{place.name}</Text>
          <Text style={look.optionDescription}>{place.source === "coverage" ? t("Workers serve this area", "इस इलाके में सेवा उपलब्ध है") : place.description}</Text></View>
        <Text style={look.arrow}>↗</Text>
      </Pressable>)}
      {searching && <View style={look.lookup}><ActivityIndicator size="small" color={colors.accent} /><Body small>{t("Looking up places…", "जगहें खोज रहे हैं…")}</Body></View>}
      {current?.unavailable && <View style={look.lookup}><Body small>{t("Place search is taking a moment. You can still use the full area name below.", "जगह खोजने में समय लग रहा है। नीचे अपने इलाके का पूरा नाम इस्तेमाल कर सकते हैं।")}</Body></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={t("Use this location, ", "यही इलाका चुनें, ") + query}
        onPressIn={keepSelectionOpen} onPress={() => choose(query)} style={({ pressed }) => [look.manual, pressed && look.optionActive]}>
        <Text style={look.manualText}>{t("Use “", "“")}{query}{t("” as my location", "” को मेरा इलाका चुनें")} →</Text>
      </Pressable>
      {suggestions.some((place) => place.source === "photon") && <Text accessibilityRole="link"
        onPress={() => void Linking.openURL("https://www.openstreetmap.org/copyright")} style={look.attribution}>Photon · © OpenStreetMap</Text>}
    </View>}
    {!open && checking && <Body small>{t("Let me check who can help here…", "यहाँ कौन मदद कर सकता है, हम जाँच रहे हैं…")}</Body>}
    {!open && checked && !ids.length && <Body strong notice>{t("We haven’t reached this area yet. Try another location?", "हम अभी इस इलाके तक नहीं पहुँचे हैं। कोई दूसरा इलाका देखें?")}</Body>}
    <Feedback error={error} />
    {Boolean(error) && <Button compact secondary label={t("Check location again", "इलाके की फिर जाँच करें")} onPress={retry} />}
    {open && query.length === 1 && <Body small>{t("One more letter, and I’ll look for your area.", "एक अक्षर और लिखें, फिर हम आपका इलाका खोजेंगे।")}</Body>}
  </View>;
}

const look = StyleSheet.create({
  container: { gap: 9, zIndex: 5 },
  searchInput: { borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 15, backgroundColor: colors.white },
  dropdown: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 14, overflow: "hidden", marginTop: -3 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, minHeight: 64 },
  optionActive: { backgroundColor: colors.panel },
  optionPin: { fontSize: 22, color: colors.accent, width: 28, textAlign: "center" },
  optionText: { flex: 1, gap: 4 },
  optionName: { fontFamily, color: colors.ink, fontSize: 15, fontWeight: "700" },
  optionDescription: { fontFamily, color: colors.muted, fontSize: 12, lineHeight: 18 },
  arrow: { color: colors.accent, fontSize: 20 },
  lookup: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12 },
  manual: { paddingHorizontal: 16, paddingVertical: 13 },
  manualText: { fontFamily, color: colors.accent, fontWeight: "600", fontSize: 14, lineHeight: 20 },
  attribution: { color: colors.muted, fontSize: 11, paddingHorizontal: 16, paddingBottom: 12 },
  selectedLocation: { flexDirection: "row", gap: 9, alignItems: "center", padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white },
  pin: { fontSize: 22, color: colors.accent },
  selectedText: { fontFamily, flex: 1, color: colors.ink, fontWeight: "600", fontSize: 15 },
  change: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
