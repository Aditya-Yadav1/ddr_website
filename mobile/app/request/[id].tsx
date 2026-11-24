import { upperEstimate } from "../../shared/price-range";
import { SavedAddresses } from "../../src/saved-addresses";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { Brief, Payload, Tier, Unit } from "../../src/api";
import { tasks } from "../../src/catalog";
import { appointmentDays, appointmentTimes } from "../../src/appointments";
import { useBookingAction } from "../../src/booking-action";
import { useCopy } from "../../src/language";
import { PinGate, VisitPin, useLocation } from "../../src/location";
import { useDiscovery } from "../../src/discovery";
import { MaterialOptions, useMaterialLabels } from "../../src/job-materials";
import { operationId } from "../../src/operation-id";
import { useSession } from "../../src/session";
import { PlusBenefits, ServiceOptions } from "../../src/service-options";
import { Body, Button, Feedback, Field, Guide, Heading, Page, Panel, PriceNote, Row, Section, TierPrice } from "../../src/ui";
import { isPinCode } from "../../shared/pin-codes";

type Review = {
  safetyVersion: number;
  intent: string; proId: string; scope: string; area: string; pinCode: string; appointment: string; timing: "" | "now"; contact: string;
  tier: Tier; expectedPrice: number; expectedMaxPrice: number; expectedUnit: Unit; expectedIncludes: string; expectedIncludesHi: string;
  customerName: string; address: string; landmark: string; notes: string; brief: Brief; hours: number;
};

export default function RequestAppointment() {
  const params = useLocalSearchParams<{ id: string; scope?: string; area?: string; pinCode?: string; tier?: Tier; appointment?: string }>();
  const { token, snapshot, error: connectionError, checkSlots } = useSession();
  const { snapshot: discovery } = useDiscovery();
  const { pinCode, setPinCode, checked, ids } = useLocation();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const { send, busy, error, uncertain, retry } = useBookingAction("request." + params.id);
  const profile = snapshot?.state.profiles.find((person) => person.id === params.id);
  const service = snapshot?.state.catalog.services.find((item) => item.id === profile?.service);
  const [scope, setScope] = useState(params.scope ?? "");
  const [area, setArea] = useState(params.area === params.pinCode ? "" : params.area ?? "");
  const [tier, setTier] = useState<Tier>(params.tier === "plus" ? "plus" : "everyday");
  const [day, setDay] = useState(params.appointment?.slice(0, 10) ?? "");
  const [time, setTime] = useState(params.appointment?.slice(11) ?? "");
  const materialLabels = useMaterialLabels();
  const [brief, setBrief] = useState<Brief>({ problem: "", materials: profile?.unit === "visit" ? "inspect" : "none", readiness: "unknown" });
  const [agreedHours, setAgreedHours] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
  const [slotResult, setSlotResult] = useState<{ key: string; slots: string[]; immediate: boolean; error?: unknown } | null>(null);
  const hours = profile?.hours ?? snapshot?.state.catalog.defaultHours;
  const days = hours && snapshot ? appointmentDays(snapshot.serverTime, hours) : [];
  const times = hours && profile ? appointmentTimes(hours, profile.unit) : [];
  const appointment = day && time ? day + "T" + time : "";
  const selectionReady = !isPinCode(params.pinCode) || params.pinCode === pinCode;
  const areaValid = Boolean(selectionReady && checked && profile && ids.includes(profile.id));
  const dateValid = days.includes(day);
  const proId = profile?.id;
  const allowedTasks = service?.tasks.filter((task) => {
    const entry = tasks.find((item) => item.task === task && item.service === service.id);
    return profile?.specializations?.length ? profile.specializations.includes(entry?.id ?? "") : entry?.legacy;
  }) ?? [];
  const slotKey = proId && areaValid && dateValid
    ? JSON.stringify([pinCode, times.map((slot) => day + "T" + slot), proId, scope, agreedHours, slotRefresh]) : "";

  useEffect(() => {
    if (params.pinCode && isPinCode(params.pinCode)) setPinCode(params.pinCode);
  }, [params.id, params.pinCode, setPinCode]);

  useEffect(() => {
    if (!slotKey) return;
    let current = true;
    const [pin, slots, worker, task, quantity] = JSON.parse(slotKey) as [string, string[], string, string, number];
    void checkSlots(pin, slots, worker, false, task, quantity).then((result) => {
      if (current) setSlotResult({ key: slotKey, ...result });
    }).catch((failure) => {
      if (current) setSlotResult({ key: slotKey, slots: [], immediate: false, error: failure });
    });
    return () => { current = false; };
  }, [checkSlots, slotKey]);

  if (!review && uncertain) return <Page>
    <Heading>{t("Check your last request", "अपना पिछला अनुरोध जाँचें")}</Heading>
    <Feedback error={error} />
    <Button label={t("Retry last request", "पिछला अनुरोध फिर भेजें")} disabled={busy} onPress={async () => {
      const id = await retry();
      if (id) router.replace({ pathname: "/bookings/[id]", params: { id } });
    }} />
  </Page>;
  if (!review && !selectionReady) return <Page><Body>{t("Loading your visit PIN…", "विज़िट का पिन लोड हो रहा है…")}</Body></Page>;
  if (!review && !checked) return <Page><PinGate demoPin={discovery?.state.demoPinCode} /></Page>;
  if (!token && ids.includes(params.id)) return <Page>
    <VisitPin pinCode={pinCode} change />
    <Heading>{t("Sign in to book", "बुक करने के लिए साइन इन करें")}</Heading>
    <Button label={t("Sign in", "साइन इन करें")}
      onPress={() => router.push({ pathname: "/sign-in", params: { next: JSON.stringify({ ...params, pinCode }) } })} />
  </Page>;
  if (!review && (!profile || !service || !areaValid)) return <Page>
    <VisitPin pinCode={pinCode} change />
    <Heading>{t("Worker unavailable for this PIN", "इस पिन कोड में काम करने वाला उपलब्ध नहीं है")}</Heading>
    <Button label={t("Find matching workers", "उपलब्ध काम करने वाले खोजें")} onPress={() => router.dismissTo("/")} />
  </Page>;
  const plus = tier === "plus" ? profile?.plus : null;
  const availability = slotResult?.key === slotKey ? slotResult : null;
  const validSlot = availability?.slots.includes(appointment) ?? false;
  let appointmentIssue = "";
  if (!days.length) appointmentIssue = t("This worker has no appointment days this week.", "इस हफ़्ते इस काम करने वाले का कोई समय उपलब्ध नहीं है।");
  else if (!dateValid) appointmentIssue = t("Choose an appointment date and time.", "विज़िट की तारीख और समय चुनें।");
  else if (!availability) appointmentIssue = t("Checking available times…", "उपलब्ध समय जाँच रहे हैं…");
  else if (availability.error) appointmentIssue = t("Try checking appointment times again.", "विज़िट का समय फिर जाँचें।");
  else if (!availability.slots.length) appointmentIssue = t("Choose another date to see more times.", "अधिक समय देखने के लिए दूसरी तारीख चुनें।");
  else if (!validSlot) appointmentIssue = t("Choose an available appointment time.", "विज़िट के लिए उपलब्ध समय चुनें।");
  const reviewIssues = [
    !allowedTasks.includes(scope) && t("Choose the task you want done.", "वह काम चुनें जो आप करवाना चाहते हैं।"),
    !brief.problem.trim() && t("Describe the task.", "काम का विवरण लिखें।"),
    profile?.unit !== "visit" && brief.materials === "inspect" && t("Choose who will bring the materials.", "चुनें कि सामान कौन लाएगा।"),
    tier === "plus" && !plus && t("Choose an available service option.", "उपलब्ध सेवा का विकल्प चुनें।"),
    appointmentIssue,
    !customerName.trim() && t("Enter your name.", "अपना नाम लिखें।"),
    address.trim().length < 8 && t("Enter a visit address of at least 8 characters.", "विज़िट का पता कम से कम 8 अक्षरों में लिखें।"),
  ].filter((issue): issue is string => typeof issue === "string" && issue.length > 0);
  const valid = reviewIssues.length === 0;
  const reviewedPlus = review?.tier === "plus" ? profile?.plus : null;
  const offerChanged = Boolean(review && (!profile || (review.tier === "plus" && !reviewedPlus)
    || review.expectedMaxPrice !== upperEstimate(reviewedPlus ?? profile) || review.expectedPrice !== (reviewedPlus?.price ?? profile.price) || review.expectedUnit !== profile.unit
    || review.expectedIncludes !== (reviewedPlus?.includes || "") || review.expectedIncludesHi !== (reviewedPlus?.includesHi || "")));
  function editReview() {
    setReview(null);
    setSlotRefresh((value) => value + 1);
    if (tier === "plus" && !profile?.plus) setTier("everyday");
  }
  function openReview() {
    if (!valid || !profile) return;
    setReview({
      safetyVersion: 1, intent: operationId(), proId: profile.id, scope, area: area.trim(), pinCode, appointment, timing: "",
      contact: "In-app message", tier, expectedPrice: plus?.price ?? profile.price, expectedMaxPrice: upperEstimate(plus ?? profile), expectedUnit: profile.unit,
      expectedIncludes: plus?.includes || "", expectedIncludesHi: plus?.includesHi || "",
      customerName: customerName.trim(), address: address.trim(), landmark: landmark.trim(), notes: notes.trim(),
      brief: { ...brief, problem: brief.problem.trim() }, hours: agreedHours,
    });
  }
  async function submit() {
    if (!review || (offerChanged && !uncertain)) return;
    const id = await send("request", review satisfies Payload);
    if (id) router.replace({ pathname: "/bookings/[id]", params: { id } });
  }

  if (review) return <Page key="request-review">
    <Heading>{t("Review your request", "अपना अनुरोध जाँचें")}</Heading>
    <Feedback error={connectionError} />
    <Guide>{t("Take a quick look. If everything feels right, send this to the worker.", "एक बार जानकारी देख लें। सब सही लगे तो काम करने वाले को अनुरोध भेजें।")}</Guide>
    <Panel tone="info">
      <Heading size="small">{copy.task(service?.id ?? "", review.scope)}</Heading>
      <Body>{profile?.name}</Body>
      <Body>{copy.appointment(review.appointment, review.timing)}</Body>
      <TierPrice price={review.expectedPrice} maxPrice={review.expectedMaxPrice} unit={review.expectedUnit} tier={review.tier} />
      {!!review.expectedIncludes && <PlusBenefits includes={review.expectedIncludes} includesHi={review.expectedIncludesHi} />}
      <PriceNote unit={review.expectedUnit} />
      <Body strong>{t("Estimated total", "अनुमानित कुल")}
        {" · "}{copy.range(review.expectedPrice, review.expectedMaxPrice, review.expectedUnit === "hourly" ? review.hours : 1)}</Body>
      {review.expectedUnit === "hourly" && <Body small>{review.hours} {t("agreed hours", "तय घंटे")}</Body>}
      <Body small>{t("Pay the worker directly at the end of the visit.", "विज़िट के अंत में काम करने वाले को सीधे भुगतान करें।")}</Body>
    </Panel>
    <Panel>
      <Heading size="small">{t("Task and materials", "काम और सामान")}</Heading>
      <Body>{review.brief.problem}</Body>
      <Body>{materialLabels[review.brief.materials]}</Body>
      {review.brief.materials === "customer" && <Body small>{review.brief.readiness === "ready" ? t("Materials ready", "सामान तैयार है")
        : review.brief.readiness === "not_ready" ? t("Materials still needed", "सामान अभी चाहिए") : t("Readiness unconfirmed", "सामान तैयार है या नहीं, तय नहीं")}</Body>}
      <Body small>{t("This task brief is shared with the worker before they accept.", "यह काम की जानकारी स्वीकार करने से पहले काम करने वाले को दिखेगी।")}</Body>
    </Panel>
    <Panel>
      <Heading size="small">{t("Visit details", "विज़िट की जानकारी")}</Heading>
      <Body strong>{review.customerName}</Body>
      <Body>{review.address}{review.landmark ? " · " + review.landmark : ""}</Body>
      <Body>{review.area ? copy.area(review.area) + " · " : ""}{t("PIN code", "पिन कोड")} {review.pinCode}</Body>
      {!!review.notes && <Body>{review.notes}</Body>}
      <Body small>{t("Your name, address and visit notes are shared after the worker accepts.", "काम करने वाले के स्वीकार करने के बाद आपका नाम, पता और विज़िट की जानकारी साझा होगी।")}</Body>
    </Panel>
    <Body>{t("The appointment is confirmed when the worker accepts your request.", "काम करने वाले के अनुरोध स्वीकार करने पर बुकिंग पक्की होगी।")}</Body>
    <Feedback error={error} />
    {offerChanged && !uncertain && <Panel tone="warning">
      <Heading size="small">{t("This service option changed", "सेवा के इस विकल्प में बदलाव हुआ है")}</Heading>
      <Body>{t("Review the current rate and included work before sending your request.", "अनुरोध भेजने से पहले नई दर और शामिल काम देखें।")}</Body>
      {profile ? <Button secondary label={t("Review updated service options", "सेवा के नए विकल्प देखें")} disabled={busy} onPress={editReview} />
        : <Button secondary label={t("Explore services", "सेवाएँ खोजें")} disabled={busy} onPress={() => router.navigate("/customer")} />}
    </Panel>}
    {uncertain && <Body small>{t("The response did not arrive. Retry this same request to check whether it was sent.", "जवाब नहीं मिला। यही अनुरोध फिर भेजकर जाँचें कि वह पहुँचा या नहीं।")}</Body>}
    <Button label={busy ? t("Sending…", "भेज रहे हैं…") : uncertain ? t("Retry request", "अनुरोध फिर भेजें") : t("Send request", "अनुरोध भेजें")}
      disabled={busy || (offerChanged && !uncertain)} onPress={() => void submit()} />
    <Button secondary label={t("Edit request", "अनुरोध बदलें")} disabled={busy || uncertain} onPress={editReview} />
  </Page>;

  if (!profile || !service) return null;
  return <Page key="request-details">
    <VisitPin pinCode={pinCode} change />
    <Section>
      <Heading>{t("Book your visit", "अपनी विज़िट बुक करें")}</Heading>
      <Body strong>{profile.name} · {copy.service(service.id, service.name)}</Body>
    </Section>
    <Feedback error={connectionError} />
    <Guide>{!scope ? t("Let’s start with the service option, then tell me what needs doing.", "पहले सेवा का विकल्प चुनें, फिर बताइए कौन-सा काम करवाना है।")
      : !validSlot ? t("When would you like the visit? Pick a time that works for you.", "विज़िट कब चाहिए? अपनी सुविधा का समय चुनें।")
          : t("Looking good. Add your visit details below, and we’ll review it together.", "अच्छा है। नीचे विज़िट की जानकारी भरें, फिर सब एक बार जाँच लेंगे।")}</Guide>
    <Section>
      <Heading size="medium">{t("Choose your service option", "सेवा का विकल्प चुनें")}</Heading>
      <Body small>{t("Everyday covers your selected service. Plus adds the worker’s listed extras.", "एवरीडे में आपकी चुनी हुई सेवा है। प्लस में काम करने वाले की बताई अतिरिक्त सेवाएँ भी हैं।")}</Body>
      <ServiceOptions profile={profile} value={tier} onChange={setTier} />
      <PriceNote unit={profile.unit} />
      {profile.unit === "hourly" && <Panel>
        <Heading size="small">{t("Agree how many hours to book", "काम के घंटे तय करें")}</Heading>
        <Row>{[2, 3, 4, 5, 6, 7, 8].map((quantity) => <Button key={quantity} compact secondary selected={agreedHours === quantity}
          label={String(quantity)} onPress={() => { setAgreedHours(quantity); setTime(""); }} />)}</Row>
        <Body strong>{t("Estimated total", "अनुमानित कुल")} · {copy.range((plus ?? profile).price, upperEstimate(plus ?? profile), agreedHours)}</Body>
      </Panel>}
    </Section>
    <Panel>
      <Heading size="small">{t("What needs doing?", "कौन-सा काम करवाना है?")}</Heading>
      {allowedTasks.map((task) => <Button key={task} secondary selected={scope === task} label={copy.task(service.id, task)} onPress={() => setScope(task)} />)}
      <Field label={t("Describe the task", "काम का विवरण लिखें")} value={brief.problem} maxLength={280} multiline
        hint={t("Include quantities or preparation details. Keep your address and phone number out of this brief.", "काम की मात्रा या तैयारी लिखें। यहाँ अपना पता या फ़ोन नंबर न लिखें।")}
        onChangeText={(problem) => setBrief({ ...brief, problem })} />
      <Body strong>{t("Who brings the materials?", "सामान कौन लाएगा?")}</Body>
      <MaterialOptions value={brief.materials} inspection={profile.unit === "visit"}
        onChange={(materials) => setBrief({ ...brief, materials, readiness: "unknown" })} />
      {brief.materials === "customer" && <Row>
        <Button compact secondary selected={brief.readiness === "ready"} label={t("Ready for the visit", "विज़िट के लिए तैयार")}
          onPress={() => setBrief({ ...brief, readiness: "ready" })} />
        <Button compact secondary selected={brief.readiness === "not_ready"} label={t("Still needed", "अभी चाहिए")}
          onPress={() => setBrief({ ...brief, readiness: "not_ready" })} />
      </Row>}
    </Panel>
    <Panel>
      <Heading size="small">{t("Appointment", "विज़िट का समय")}</Heading>
      <Body strong>{t("Choose a date (IST)", "तारीख चुनें (IST)")}</Body>
      {!days.length && <Body>{t("This worker has no appointment days this week.", "इस हफ़्ते कोई विज़िट उपलब्ध नहीं है।")}</Body>}
      <Row>{days.map((date) => <Button key={date} compact secondary selected={day === date}
        label={copy.intl({ month: "short", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(date + "T00:00Z"))}
        onPress={() => { setDay(date); setTime(""); setSlotRefresh((value) => value + 1); }} />)}</Row>
      {!!slotKey && (!availability
        ? <Body small>{t("Checking available times…", "उपलब्ध समय जाँच रहे हैं…")}</Body>
        : availability.error ? <>
          <Feedback error={availability.error} />
          <Button secondary compact label={t("Check again", "फिर जाँचें")} onPress={() => setSlotRefresh((value) => value + 1)} />
        </> : availability.slots.length ? <>
          <Body strong>{t("Choose a time (IST)", "समय चुनें (IST)")}</Body>
          <Row>{availability.slots.map((slot) => {
            const clock = slot.slice(11);
            return <Button key={slot} compact secondary selected={time === clock} label={clock} onPress={() => setTime(clock)} />;
          })}</Row>
        </> : <Body>{t("No times available on this date. Choose another date.", "इस तारीख को कोई समय उपलब्ध नहीं है। दूसरी तारीख चुनें।")}</Body>)}
    </Panel>
    <Panel>
      <Heading size="small">{t("Visit address", "विज़िट का पता")}</Heading>
      <SavedAddresses forPin={pinCode} onSelect={(place) => {
        setArea(place.area);
        setCustomerName(place.customerName);
        setAddress(place.address);
        setLandmark(place.landmark);
      }} />
      <Field label={t("Your name", "आपका नाम")} value={customerName} onChangeText={setCustomerName} maxLength={60} autoComplete="name" />
      <Field label={t("Street and house or flat number", "सड़क और मकान या फ़्लैट नंबर")} value={address} onChangeText={setAddress} maxLength={220} multiline />
      <Field label={t("Locality (optional)", "इलाका (वैकल्पिक)")} value={area} onChangeText={setArea} maxLength={120} />
      <Field label={t("Landmark (optional)", "पहचान की जगह (वैकल्पिक)")} value={landmark} onChangeText={setLandmark} maxLength={100} />
      <Field label={t("Notes for the worker (optional)", "काम करने वाले के लिए जानकारी (वैकल्पिक)")} value={notes} onChangeText={setNotes} maxLength={280} multiline />
    </Panel>
    {!valid && <Panel tone="warning">
      <Heading size="small">{t("Before you review", "अनुरोध जाँचने से पहले")}</Heading>
      {reviewIssues.map((issue) => <Body key={issue}>{issue}</Body>)}
    </Panel>}
    <Button label={t("Review request", "अनुरोध जाँचें")} disabled={!valid} onPress={openReview} />
  </Page>;
}
