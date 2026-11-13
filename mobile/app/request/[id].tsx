import { randomUUID } from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { Payload, Tier, Unit } from "../../src/api";
import { appointmentDays, appointmentTimes } from "../../src/appointments";
import { useBookingAction } from "../../src/booking-action";
import { useCopy } from "../../src/language";
import { LocationField, useLocation } from "../../src/location";
import { useSession } from "../../src/session";
import { PlusBenefits, ServiceOptions } from "../../src/service-options";
import { Body, Button, Feedback, Field, Guide, Heading, Page, Panel, PriceNote, Row, Section, TierPrice } from "../../src/ui";

type Review = {
  intent: string; proId: string; scope: string; area: string; appointment: string; timing: "" | "now"; contact: string;
  tier: Tier; expectedPrice: number; expectedUnit: Unit; expectedIncludes: string; expectedIncludesHi: string;
  customerName: string; address: string; landmark: string; notes: string;
};

export default function RequestAppointment() {
  const params = useLocalSearchParams<{ id: string; scope?: string; area?: string; tier?: Tier; timing?: string }>();
  const { snapshot, error: connectionError, checkSlots } = useSession();
  const { location: area, setLocation, checked, ids } = useLocation();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const { send, busy, error, uncertain } = useBookingAction();
  const profile = snapshot?.state.profiles.find((person) => person.id === params.id);
  const service = snapshot?.state.catalog.services.find((item) => item.id === profile?.service);
  const [scope, setScope] = useState(params.scope ?? "");
  const [tier, setTier] = useState<Tier>(params.tier === "plus" && profile?.plus ? "plus" : "everyday");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [timing, setTiming] = useState<"" | "now">(params.timing === "now" && profile?.immediate ? "now" : "");
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
  const areaValid = Boolean(checked && profile && ids.includes(profile.id));
  const dateValid = days.includes(day);
  const immediate = timing === "now";
  const proId = profile?.id;
  const slotKey = proId && areaValid && (immediate || dateValid)
    ? JSON.stringify([area, immediate ? [] : times.map((slot) => day + "T" + slot), proId, immediate, slotRefresh]) : "";

  useEffect(() => {
    if (params.area) setLocation(params.area);
  }, [params.id, params.area]);

  useEffect(() => {
    if (!slotKey) return;
    let current = true;
    const [place, slots, worker, now] = JSON.parse(slotKey) as [string, string[], string, boolean];
    void checkSlots(place, slots, worker, now).then((result) => {
      if (current) setSlotResult({ key: slotKey, ...result });
    }).catch((failure) => {
      if (current) setSlotResult({ key: slotKey, slots: [], immediate: false, error: failure });
    });
    return () => { current = false; };
  }, [checkSlots, slotKey]);

  if ((!profile || !service) && !review) return <Page><Heading>{t("Worker unavailable", "काम करने वाला उपलब्ध नहीं है")}</Heading></Page>;
  const plus = tier === "plus" ? profile?.plus : null;
  const validSlot = slotResult?.key === slotKey && (immediate ? slotResult.immediate : slotResult.slots.includes(appointment));
  const valid = Boolean(profile && service?.tasks.includes(scope) && areaValid && validSlot && customerName.trim()
    && address.trim().length >= 8 && (tier === "everyday" || plus));
  const reviewedPlus = review?.tier === "plus" ? profile?.plus : null;
  const offerChanged = Boolean(review && (!profile || (review.tier === "plus" && !reviewedPlus)
    || review.expectedPrice !== (reviewedPlus?.price ?? profile.price) || review.expectedUnit !== profile.unit
    || review.expectedIncludes !== (reviewedPlus?.includes || "") || review.expectedIncludesHi !== (reviewedPlus?.includesHi || "")));
  function editReview() {
    setReview(null);
    setSlotRefresh((value) => value + 1);
    if (tier === "plus" && !profile?.plus) setTier("everyday");
  }
  function openReview() {
    if (!valid || !profile) return;
    setReview({
      intent: randomUUID(), proId: profile.id, scope, area, appointment: immediate ? "" : appointment, timing,
      contact: "In-app message", tier, expectedPrice: plus?.price ?? profile.price, expectedUnit: profile.unit,
      expectedIncludes: plus?.includes || "", expectedIncludesHi: plus?.includesHi || "",
      customerName: customerName.trim(), address: address.trim(), landmark: landmark.trim(), notes: notes.trim(),
    });
  }
  async function submit() {
    if (!review || (offerChanged && !uncertain)) return;
    const id = await send("request", review satisfies Payload);
    if (id) router.replace({ pathname: "/bookings/[id]", params: { id } });
  }

  if (review) return <Page>
    <Heading>{t("Review your request", "अपना अनुरोध जाँचें")}</Heading>
    <Feedback error={connectionError} />
    <Guide>{t("Take a quick look. If everything feels right, send this to the worker.", "एक बार जानकारी देख लें। सब सही लगे तो काम करने वाले को अनुरोध भेजें।")}</Guide>
    <Panel tint="green">
      <Heading size="small">{copy.task(service?.id ?? "", review.scope)}</Heading>
      <Body>{profile?.name} · {copy.area(review.area)}</Body>
      <Body>{copy.appointment(review.appointment, review.timing)}</Body>
      <TierPrice price={review.expectedPrice} unit={review.expectedUnit} tier={review.tier} />
      {!!review.expectedIncludes && <PlusBenefits includes={review.expectedIncludes} includesHi={review.expectedIncludesHi} />}
      <PriceNote unit={review.expectedUnit} />
    </Panel>
    <Panel>
      <Heading size="small">{t("Visit details", "विज़िट की जानकारी")}</Heading>
      <Body strong>{review.customerName}</Body>
      <Body>{review.address}{review.landmark ? " · " + review.landmark : ""}</Body>
      {!!review.notes && <Body>{review.notes}</Body>}
      <Body small>{t("Your name, address and visit notes are shared after the worker accepts.", "काम करने वाले के स्वीकार करने के बाद आपका नाम, पता और विज़िट की जानकारी साझा होगी।")}</Body>
    </Panel>
    <Body>{t("The appointment is confirmed when the worker accepts your request.", "काम करने वाले के अनुरोध स्वीकार करने पर बुकिंग पक्की होगी।")}</Body>
    <Feedback error={error} />
    {offerChanged && !uncertain && <Panel tint="warm">
      <Heading size="small">{t("This service option changed", "सेवा के इस विकल्प में बदलाव हुआ है")}</Heading>
      <Body>{t("Review the current rate and included work before sending your request.", "अनुरोध भेजने से पहले नई दर और शामिल काम देखें।")}</Body>
      {profile ? <Button secondary label={t("Review updated service options", "सेवा के नए विकल्प देखें")} disabled={busy} onPress={editReview} />
        : <Button secondary label={t("Explore services", "सेवाएँ खोजें")} disabled={busy} onPress={() => router.navigate("/")} />}
    </Panel>}
    {uncertain && <Body small>{t("The response did not arrive. Retry this same request to check whether it was sent.", "जवाब नहीं मिला। यही अनुरोध फिर भेजकर जाँचें कि वह पहुँचा या नहीं।")}</Body>}
    <Button label={busy ? t("Sending…", "भेज रहे हैं…") : uncertain ? t("Retry request", "अनुरोध फिर भेजें") : t("Send request", "अनुरोध भेजें")}
      disabled={busy || (offerChanged && !uncertain)} onPress={() => void submit()} />
    <Button secondary label={t("Edit request", "अनुरोध बदलें")} disabled={busy || uncertain} onPress={editReview} />
  </Page>;

  if (!profile || !service) return null;
  return <Page>
    <Section>
      <Heading>{copy.service(service.id, service.name)}</Heading>
      <Body strong>{profile.name}</Body>
      <Body strong>{copy.service(service.id, service.name)} · {t(profile.years + " yr experience", profile.years + " साल का अनुभव")}</Body>
      {!!profile.languages?.length && <Body small>{t("Languages", "भाषाएँ")} · {profile.languages.join(", ")}</Body>}
    </Section>
    <Feedback error={connectionError} />
    <Guide>{!scope ? t("Let’s start with the service option, then tell me what needs doing.", "पहले सेवा का विकल्प चुनें, फिर बताइए कौन-सा काम करवाना है।")
      : !areaValid ? t("Got it. Now choose where we should come.", "समझ गए। अब चुनें कि हमें कहाँ आना है।")
        : !validSlot ? t("When would you like the visit? Pick a time that works for you.", "विज़िट कब चाहिए? अपनी सुविधा का समय चुनें।")
          : t("Looking good. Add your visit details below, and we’ll review it together.", "अच्छा है। नीचे विज़िट की जानकारी भरें, फिर सब एक बार जाँच लेंगे।")}</Guide>
    <Section>
      <Heading size="medium">{t("Choose your service option", "सेवा का विकल्प चुनें")}</Heading>
      <Body small>{t("Everyday covers your selected service. Plus adds the worker’s listed extras.", "एवरीडे में आपकी चुनी हुई सेवा है। प्लस में काम करने वाले की बताई अतिरिक्त सेवाएँ भी हैं।")}</Body>
      <ServiceOptions profile={profile} value={tier} onChange={setTier} />
      <PriceNote unit={profile.unit} />
    </Section>
    <Panel>
      <Heading size="small">{t("What needs doing?", "कौन-सा काम करवाना है?")}</Heading>
      {service.tasks.map((task) => <Button key={task} secondary selected={scope === task} label={copy.task(service.id, task)} onPress={() => setScope(task)} />)}
    </Panel>
    <Panel>
      <Heading size="small">{t("Location and timing", "इलाका और समय")}</Heading>
      <LocationField />
      {checked && area.trim() && !areaValid && <Body strong notice>{t("This worker doesn’t serve your location. Choose another worker or enter another area.", "यह काम करने वाला आपके इलाके में सेवा नहीं देता। दूसरा काम करने वाला चुनें या दूसरा इलाका लिखें।")}</Body>}
      {!!profile.immediate && <Row>
        <Button compact secondary selected={!immediate} label={t("Schedule a visit", "विज़िट तय करें")} onPress={() => setTiming("")} />
        <Button compact secondary selected={immediate} label={t("Request now", "अभी अनुरोध करें")} onPress={() => setTiming("now")} />
      </Row>}
      {!immediate && <>
        <Body strong>{t("Choose a date and time (IST)", "तारीख और समय चुनें (IST)")}</Body>
        {!days.length && <Body>{t("This worker has no appointment days this week.", "इस हफ़्ते कोई विज़िट उपलब्ध नहीं है।")}</Body>}
        <Row>{days.map((date) => <Button key={date} compact secondary selected={day === date}
          label={copy.intl({ month: "short", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(date + "T00:00Z"))}
          onPress={() => { setDay(date); setTime(""); setSlotRefresh((value) => value + 1); }} />)}</Row>
      </>}
      {immediate && <Body small>{t("The worker has three minutes to respond to an immediate request.", "तुरंत अनुरोध का जवाब देने के लिए काम करने वाले के पास तीन मिनट होते हैं।")}</Body>}
      {!!slotKey && (slotResult?.key !== slotKey
        ? <Body small>{t("Checking availability…", "उपलब्धता जाँच रहे हैं…")}</Body>
        : slotResult.error ? <>
          <Feedback error={slotResult.error} />
          <Button secondary compact label={t("Check again", "फिर जाँचें")} onPress={() => setSlotRefresh((value) => value + 1)} />
        </> : immediate ? <Body small>{slotResult.immediate
          ? t("Available to request now", "अभी अनुरोध कर सकते हैं")
          : t("An immediate visit is unavailable right now. Choose a date instead.", "अभी तुरंत विज़िट उपलब्ध नहीं है। कोई तारीख चुनें।")}</Body>
          : slotResult.slots.length ? <Row>{slotResult.slots.map((slot) => {
            const clock = slot.slice(11);
            return <Button key={slot} compact secondary selected={time === clock} label={clock} onPress={() => setTime(clock)} />;
          })}</Row> : <Body>{t("No times available on this date.", "इस तारीख को कोई समय उपलब्ध नहीं है।")}</Body>)}
      {!areaValid && <Body small>{t("Enter a covered location to see available times.", "उपलब्ध समय देखने के लिए सेवा वाला इलाका लिखें।")}</Body>}
    </Panel>
    <Panel>
      <Heading size="small">{t("Visit address", "विज़िट का पता")}</Heading>
      <Field label={t("Your name", "आपका नाम")} value={customerName} onChangeText={setCustomerName} maxLength={60} autoComplete="name" />
      <Field label={t("Street and house or flat number", "सड़क और मकान या फ़्लैट नंबर")} value={address} onChangeText={setAddress} maxLength={220} multiline />
      <Field label={t("Landmark (optional)", "पहचान की जगह (वैकल्पिक)")} value={landmark} onChangeText={setLandmark} maxLength={100} />
      <Field label={t("Notes for the worker (optional)", "काम करने वाले के लिए जानकारी (वैकल्पिक)")} value={notes} onChangeText={setNotes} maxLength={280} multiline />
    </Panel>
    <Button label={t("Review request", "अनुरोध जाँचें")} disabled={!valid} onPress={openReview} />
  </Page>;
}
