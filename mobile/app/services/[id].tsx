import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useCopy } from "../../src/language";
import { LocationField, PinGate, useLocation } from "../../src/location";
import { isPinCode } from "../../shared/pin-codes";
import { useDiscovery } from "../../src/discovery";
import { tasks } from "../../src/catalog";
import { api } from "../../src/api";
import { appointmentDays } from "../../src/appointments";
import { useSession } from "../../src/session";
import { SaveWorker } from "../../src/saved-workers";
import { look, TaskCard, WorkerPreview } from "../../src/discovery-ui";

import { Body, Button, Feedback, Field, Guide, Heading, MainNav, Page, Panel, Row } from "../../src/ui";

export default function ServiceOptions() {
  const params = useLocalSearchParams<{ id: string; query?: string; scope?: string; workers?: string; plus?: string }>();
  const { snapshot, error } = useDiscovery();
  const { token } = useSession();
  const { pinCode, ids, checked, checking, error: locationError } = useLocation();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const [query, setQuery] = useState(params.query ?? "");
  const [budget, setBudget] = useState("");
  const [filters, setFilters] = useState(false);
  const [priceSort, setPriceSort] = useState(false);
  const [day, setDay] = useState("");
  const [clock, setClock] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [availability, setAvailability] = useState<{ key: string; options: Record<string, string[]>; error?: unknown }>();
  const [plus, setPlus] = useState(params.plus === "1");
  const [group, setGroup] = useState("");
  const validPin = isPinCode(pinCode);
  const availabilityKey = params.workers === "1" && day && validPin
    ? new URLSearchParams({ day, pinCode, scope: params.scope ?? "" }).toString() : "";
  const resultKey = availabilityKey + ":" + refresh;
  useEffect(() => {
    if (!availabilityKey) return;
    let current = true;
    api<{ options: Record<string, string[]> }>("availability?" + availabilityKey, token ?? undefined).then(({ options }) => {
      if (current) setAvailability({ key: resultKey, options });
    }).catch((failure) => { if (current) setAvailability({ key: resultKey, options: {}, error: failure }); });
    return () => { current = false; };
  }, [availabilityKey, resultKey, token, snapshot?.revision]);
  if (!snapshot) return <Page><Feedback error={error} /></Page>;
  const { catalog, profiles, demoPinCode, ratings = [] } = snapshot.state;
  if (!checked || !ids.length) return <Page footer={<MainNav selected="discover" />}><PinGate demoPin={demoPinCode} /></Page>;
  const category = catalog.services.find((item) => item.id === params.id);
  const validService = Boolean(category) || params.id === "all";
  const needle = query.trim().toLowerCase();
  const maximum = Number(budget);
  const taskId = tasks.find((task) => task.service === params.id && task.task === params.scope)?.id;
  const dates = appointmentDays(snapshot.serverTime, { ...catalog.defaultHours, days: [0, 1, 2, 3, 4, 5, 6] });
  const checkedSlots = availability?.key === resultKey && !availability.error && availabilityKey ? availability.options : null;
  const chooseSlot = (slots?: string[]) => clock ? slots?.find((slot) => slot.slice(11) === clock) : slots?.[0];
  const priceOf = (person: typeof profiles[number]) => (plus ? person.plus!.price : person.price) * (person.unit === "hourly" ? 2 : 1);
  const found = profiles.filter((person) => {
    if (!validService || (category && person.service !== category.id) || (plus && !person.plus)) return false;
    if (taskId && person.specializations?.length && !person.specializations.includes(taskId)) return false;
    if (checkedSlots && !chooseSlot(checkedSlots[person.id])) return false;
    if (!checked || !ids.includes(person.id)) return false;
    const price = plus ? person.plus!.price : person.price;
    if (maximum > 0 && price * (person.unit === "hourly" ? 2 : 1) > maximum) return false;
    const service = catalog.services.find((item) => item.id === person.service);
    const terms = [person.name, person.bio, person.bioHi, service?.name, ...person.areas,
      ...(service ? [copy.service(service.id, service.name), ...service.tasks.flatMap((task) => [task, copy.task(service.id, task)])] : [])];
    return !needle || terms.some((term) => term?.toLowerCase().includes(needle));
  }).sort((a, b) => priceSort ? priceOf(a) - priceOf(b) : (taskId
    ? Number(Boolean(b.specializations?.includes(taskId))) - Number(Boolean(a.specializations?.includes(taskId))) : 0)
    || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  if (params.workers !== "1") {
    const entries = tasks.filter((task) => (params.id === "all" || task.service === params.id)
      && (!group || task.name === group) && (!needle || [task.task, task.name, task.hi, copy.task(task.service, task.task), ...task.aliases].some((word) => word.toLowerCase().includes(needle))));
    const groups = tasks.filter((task) => params.id === "all" || task.service === params.id);
    const eligible = checked ? profiles.filter((person) => ids.includes(person.id)) : [];
    return <Page footer={<MainNav selected="discover" />}>
      <LocationField compact />
      <Heading>{category ? copy.service(category.id, category.name) : t("Find your service", "अपनी सेवा खोजें")}</Heading>
      <Body>{t("Choose the task first. Then compare your local help.", "पहले काम चुनें। फिर स्थानीय काम करने वालों की तुलना करें।")}</Body>
      <Feedback error={error} />
      <Field label={t("Search in this category", "इस श्रेणी में खोजें")} value={query} onChangeText={setQuery} />
      <Row><Button compact secondary selected={!group} label={t("All tasks", "सभी काम")} onPress={() => setGroup("")} />
        {groups.map((task) => <Button key={task.id} compact secondary selected={group === task.name} label={t(task.name, task.hi)} onPress={() => setGroup(task.name)} />)}</Row>
      <View style={look.grid}>{entries.map((task) => <TaskCard key={task.id} task={task} profiles={eligible} />)}</View>
      {!entries.length && <Body>{t("No matching tasks. Try another search or category.", "कोई काम नहीं मिला। दूसरी खोज या श्रेणी देखें।")}</Body>}
      <Button secondary label={t("Browse workers directly →", "सीधे काम करने वाले देखें →")} onPress={() => router.push({ pathname: "/services/[id]", params: { id: params.id, workers: "1" } })} />
    </Page>;
  }
  return <Page footer={<MainNav selected="discover" />}>
    <LocationField compact />
    <Heading>{category ? copy.service(category.id, category.name) : t("Service options", "सेवा के विकल्प")}</Heading>
    <Feedback error={error} />
    {!!params.scope && <Panel tone="info"><Body strong>{copy.task(params.id, params.scope)}</Body><Body small>{t("Your selected task", "आपका चुना काम")}</Body></Panel>}
    {found.length > 0 && <Guide>{t("Workers serving PIN ", "इस पिन कोड में काम करने वाले: ") + pinCode}</Guide>}
    <Row>
      <Button secondary compact selected={filters} label={t("Search & budget", "खोज और बजट")} onPress={() => setFilters(!filters)} />
      <Button secondary compact selected={plus} label={t("Offers Plus", "प्लस उपलब्ध")} onPress={() => setPlus(!plus)} />
      <Button secondary compact selected={priceSort} label={t("Starting price: low to high", "शुरुआती कीमत: कम से ज़्यादा")} onPress={() => setPriceSort(!priceSort)} />
      {!!query && <Button secondary compact label={t("Search", "खोज") + " · " + query + " ×"} onPress={() => setQuery("")} />}
    </Row>
    {filters && <Panel>
      <Field label={t("Search jobs or workers", "काम या काम करने वाले को खोजें")} value={query} onChangeText={setQuery} />
      <Field label={t("Maximum starting charge (₹)", "अधिकतम शुरुआती शुल्क (₹)")} value={budget}
        onChangeText={(value) => setBudget(value.replace(/\D/g, ""))} maxLength={6} keyboardType="number-pad" />
    </Panel>}
    <Panel>
      <Heading size="small">{t("When do you need a visit?", "आपको विज़िट कब चाहिए?")}</Heading>
      {validPin ? <Row>
        <Button secondary compact selected={!day} label={t("Any date", "कोई भी तारीख")} onPress={() => { setDay(""); setClock(""); }} />
        {dates.map((date) => <Button key={date} secondary compact selected={day === date}
          label={copy.intl({ dateStyle: "medium", timeZone: "UTC" }).format(new Date(date + "T00:00Z"))}
          onPress={() => { setDay(date); setClock(""); setRefresh((value) => value + 1); }} />)}
      </Row> : <Body>{t("Enter a PIN code to check appointments.", "समय देखने के लिए पिन कोड डालें।")}</Body>}
      {!!availabilityKey && availability?.key !== resultKey && <Body small>{t("Checking calendar…", "कैलेंडर देख रहे हैं…")}</Body>}
      {!!availabilityKey && availability?.key === resultKey && !!availability.error && <>
        <Feedback error={availability.error} />
        <Button secondary compact label={t("Check again", "फिर जाँचें")} onPress={() => setRefresh((value) => value + 1)} />
      </>}
      {checkedSlots && Object.keys(checkedSlots).length > 0 && <Row>
        <Button secondary compact selected={!clock} label={t("Any time (IST)", "कोई भी समय (IST)")} onPress={() => setClock("")} />
        {[...new Set(Object.values(checkedSlots).flat().map((slot) => slot.slice(11)))].sort().map((slot) =>
          <Button key={slot} secondary compact selected={clock === slot} label={slot} onPress={() => setClock(slot)} />)}
      </Row>}
    </Panel>
    {!checking && !locationError && !found.length && <Panel>
      <Heading size="small">{t("Let’s try another way", "चलिए, दूसरा तरीका देखते हैं")}</Heading>
      {validPin && <Body>{t("No workers match these choices. Try clearing your filters.", "इन विकल्पों के लिए कोई नहीं मिला। खोज के फ़िल्टर हटाकर देखें।")}</Body>}
      <Button secondary label={t("Clear filters", "फ़िल्टर हटाएँ")} onPress={() => { setQuery(""); setBudget(""); setPlus(false); setDay(""); setClock(""); }} />
      <Button secondary label={t("Choose another service", "दूसरी सेवा चुनें")} onPress={() => router.navigate("/customer")} />
    </Panel>}
    {found.map((person) => <WorkerPreview key={person.id} person={person} rating={ratings.find((rating) => rating.pro === person.id)}
      service={catalog.services.find((item) => item.id === person.service)?.name ?? person.service}
      rate={plus && person.plus ? copy.rate({ price: person.plus.price, maxPrice: person.plus.maxPrice, unit: person.unit }) : undefined}>
      {checkedSlots && !!chooseSlot(checkedSlots[person.id]) &&
        <Body strong>{t("Available", "उपलब्ध")} · {copy.appointment(chooseSlot(checkedSlots[person.id])!)}</Body>}
      <Row>
        <Button compact secondary tone="info" label={t("View worker", "काम करने वाले की जानकारी देखें")} onPress={() => router.push({ pathname: "/providers/[id]",
          params: { id: person.id, scope: params.scope || "", pinCode, tier: plus ? "plus" : "everyday",
            appointment: (checkedSlots && chooseSlot(checkedSlots[person.id])) || "" } })} />
        <SaveWorker worker={person.id} />
      </Row>
    </WorkerPreview>)}
  </Page>;
}
