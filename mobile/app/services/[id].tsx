import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useCopy } from "../../src/language";
import { LocationField, useLocation } from "../../src/location";
import { useSession } from "../../src/session";
import { ServiceOptions as ServiceOptionCards } from "../../src/service-options";
import { Body, Button, colors, Feedback, Field, Guide, Heading, MainNav, Page, Panel, Row } from "../../src/ui";

export default function ServiceOptions() {
  const params = useLocalSearchParams<{ id: string; query?: string }>();
  const { snapshot, error } = useSession();
  const { location, ids, checked, checking, editing, error: locationError } = useLocation();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const [query, setQuery] = useState(params.query ?? "");
  const [budget, setBudget] = useState("");
  const [filters, setFilters] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const [plus, setPlus] = useState(false);
  if (!snapshot) return null;
  const { catalog, profiles } = snapshot.state;
  const category = catalog.services.find((item) => item.id === params.id);
  const validService = Boolean(category) || params.id === "all";
  const needle = query.trim().toLowerCase();
  const maximum = Number(budget);
  const found = profiles.filter((person) => {
    if (!validService || (category && person.service !== category.id) || (immediate && !person.immediate) || (plus && !person.plus)) return false;
    if (location.trim() && (!checked || !ids.includes(person.id))) return false;
    const price = plus ? person.plus!.price : person.price;
    if (maximum > 0 && price * (person.unit === "hourly" ? 2 : 1) > maximum) return false;
    const service = catalog.services.find((item) => item.id === person.service);
    const terms = [person.name, person.bio, person.bioHi, service?.name, ...person.areas,
      ...(service ? [copy.service(service.id, service.name), ...service.tasks.flatMap((task) => [task, copy.task(service.id, task)])] : [])];
    return !needle || terms.some((term) => term?.toLowerCase().includes(needle));
  }).sort((a, b) => (plus ? a.plus!.price : a.price) * (a.unit === "hourly" ? 2 : 1)
    - (plus ? b.plus!.price : b.price) * (b.unit === "hourly" ? 2 : 1));

  return <Page footer={<MainNav selected="discover" />}>
    <Heading>{category ? copy.service(category.id, category.name) : t("Service options", "सेवा के विकल्प")}</Heading>
    <Feedback error={error} />
    <LocationField compact />
    {editing ? <Guide>{t("Choose a place from the suggestions, and I’ll find who covers it.", "सुझावों में से जगह चुनें। हम देखेंगे कि वहाँ कौन सेवा देता है।")}</Guide>
      : checking ? <Guide>{t("One moment. I’m checking who can help here.", "एक पल रुकें। हम देख रहे हैं कि यहाँ कौन मदद कर सकता है।")}</Guide>
        : found.length > 0 ? <Guide>{location.trim()
          ? t("Here’s who can help in ", "यहाँ मदद कर सकते हैं, इलाका ") + location + t(". Lowest starting prices are shown first.", "। सबसे कम शुरुआती कीमत पहले है।")
          : t("Here are the options. Add your location to see who can visit you.", "ये विकल्प उपलब्ध हैं। अपना इलाका चुनें, ताकि पता चले कि आपके यहाँ कौन आ सकता है।")}</Guide> : null}
    <Row>
      <Button secondary compact selected={filters} label={t("Search & budget", "खोज और बजट")} onPress={() => setFilters(!filters)} />
      <Button secondary compact selected={plus} label={t("Offers Plus", "प्लस उपलब्ध")} onPress={() => setPlus(!plus)} />
      {!!query && <Button secondary compact label={t("Search", "खोज") + " · " + query + " ×"} onPress={() => setQuery("")} />}
    </Row>
    {filters && <Panel>
      <Field label={t("Search jobs or workers", "काम या काम करने वाले को खोजें")} value={query} onChangeText={setQuery} />
      <Field label={t("Maximum starting charge (₹)", "अधिकतम शुरुआती शुल्क (₹)")} value={budget}
        onChangeText={(value) => setBudget(value.replace(/\D/g, ""))} maxLength={6} keyboardType="number-pad" />
      <Button secondary selected={immediate} label={t("Taking immediate requests", "तुरंत अनुरोध ले रहे हैं")} onPress={() => setImmediate(!immediate)} />
    </Panel>}
    {!editing && !checking && !locationError && !found.length && <Panel>
      <Heading size="small">{t("Let’s try another way", "चलिए, दूसरा तरीका देखते हैं")}</Heading>
      <Body>{t("I couldn’t find a match for these choices. Try another area, or give the search a fresh start.", "इन विकल्पों के लिए कोई नहीं मिला। दूसरा इलाका चुनें या खोज के फ़िल्टर हटा दें।")}</Body>
      <Button secondary label={t("Clear filters", "फ़िल्टर हटाएँ")} onPress={() => { setQuery(""); setBudget(""); setImmediate(false); setPlus(false); }} />
      <Button secondary label={t("Choose another service", "दूसरी सेवा चुनें")} onPress={() => router.navigate("/")} />
    </Panel>}
    {found.map((person) => <Panel key={person.id}>
      <Row>
        <View style={screen.avatar}><Text style={screen.initial}>{person.name.trim().slice(0, 1)}</Text></View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Heading size="small">{person.name}</Heading>
          <Body small>{person.years} {t("years’ experience", "साल का अनुभव")}</Body>
        </View>
        <Button compact label={t("Take a look →", "विकल्प देखें →")} onPress={() => router.push({ pathname: "/request/[id]",
          params: { id: person.id, area: location.trim(), tier: plus ? "plus" : "everyday", timing: immediate ? "now" : "" } })} />
      </Row>
      <ServiceOptionCards profile={person} />
    </Panel>)}
  </Page>;
}

const screen = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center" },
  initial: { color: colors.orange, fontSize: 21, fontWeight: "700" },
});
