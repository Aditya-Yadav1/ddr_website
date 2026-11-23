import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { isPinCode } from "../../shared/pin-codes";
import { api, type Tier, type WorkerDetails as Details } from "../../src/api";
import { useDiscovery } from "../../src/discovery";
import { useCopy } from "../../src/language";
import { PinGate, VisitPin, useLocation } from "../../src/location";
import { ProviderActions, ProviderRating } from "../../src/provider-actions";
import { SaveWorker } from "../../src/saved-workers";
import { PlusBenefits } from "../../src/service-options";
import { useSession } from "../../src/session";
import { activeStatuses, Body, Button, Feedback, Heading, Page, Panel, PriceNote, RatingScore, Row, Section, TierPrice } from "../../src/ui";
import { TrustDetails } from "../../src/worker-safety";

export default function WorkerDetails() {
  const params = useLocalSearchParams<{ id: string; pinCode?: string; scope?: string; appointment?: string; tier?: Tier; area?: string }>();
  const router = useRouter();
  const { token } = useSession();
  const { snapshot, error: directoryError, retry } = useDiscovery();
  const { pinCode, setPinCode, checked, ids } = useLocation();
  const copy = useCopy();
  const { t } = copy;
  const [result, setResult] = useState<{ key: string; details?: Details; error?: unknown }>();
  const [attempt, setAttempt] = useState(0);
  const [callError, setCallError] = useState<unknown>();
  const worker = snapshot?.state.profiles.find((person) => person.id === params.id);
  const service = snapshot?.state.catalog.services.find((item) => item.id === worker?.service);
  const selectionReady = !isPinCode(params.pinCode) || params.pinCode === pinCode;
  const eligible = selectionReady && checked && !!worker && ids.includes(worker.id);
  const key = eligible ? JSON.stringify([params.id, pinCode, token]) : "";

  useEffect(() => {
    if (params.pinCode && isPinCode(params.pinCode)) setPinCode(params.pinCode);
  }, [params.pinCode, setPinCode]);
  useEffect(() => {
    if (!key) return;
    let current = true;
    void api<Details>("worker-details?" + new URLSearchParams({ id: params.id, pinCode }), token ?? undefined)
      .then((details) => { if (current) setResult({ key, details }); })
      .catch((error) => { if (current) setResult({ key, error }); });
    return () => { current = false; };
  }, [key, params.id, pinCode, token, snapshot?.revision, attempt]);

  if (!snapshot) return <Page><Feedback error={directoryError} />
    {!!directoryError && <Button secondary label={t("Try again", "फिर कोशिश करें")} onPress={retry} />}</Page>;
  if (!selectionReady) return <Page><Body>{t("Loading your visit PIN…", "विज़िट का पिन लोड हो रहा है…")}</Body></Page>;
  if (!checked) return <Page><PinGate demoPin={snapshot.state.demoPinCode} /></Page>;
  if (!eligible || !worker || !service) return <Page>
    <VisitPin pinCode={pinCode} change />
    <Heading>{t("Worker unavailable for this PIN", "इस पिन कोड में काम करने वाला उपलब्ध नहीं है")}</Heading>
    <Button label={t("Find matching workers", "उपलब्ध काम करने वाले खोजें")} onPress={() => router.dismissTo("/")} />
  </Page>;

  const data = result?.key === key ? result : undefined;
  const rating = snapshot.state.ratings?.find((item) => item.pro === worker.id);
  const appointment = snapshot.state.requests.find((job) => job.proId === worker.id && job.customerId === snapshot.state.account.id
    && activeStatuses.includes(job.status));
  const plus = params.tier === "plus" ? worker.plus : null;
  const tier = plus ? "plus" : "everyday";
  const workPhone = data?.details?.workPhone;
  return <Page footer={<Button label={t("Book this worker", "इस काम करने वाले को बुक करें")} onPress={() =>
    router.push({ pathname: "/request/[id]", params: { ...params, id: worker.id, pinCode, tier } })} />}>
    <VisitPin pinCode={pinCode} change />
    <Panel>
      <Heading>{worker.name}</Heading>
      <ProviderRating rating={rating} />
      <Body>{copy.service(service.id, service.name)} · {worker.years} {t("years’ experience", "साल का अनुभव")}</Body>
      <Body>{t(worker.bio, worker.bioHi || worker.bio)}</Body>
      {!!worker.languages?.length && <Body small>{t("Languages", "भाषाएँ")} · {worker.languages.join(", ")}</Body>}
      {params.scope && <Body strong>{copy.task(service.id, params.scope)}</Body>}
      {params.appointment && <Body small>{copy.appointment(params.appointment)}</Body>}
      <TierPrice price={plus?.price ?? worker.price} unit={worker.unit} tier={tier} />
      {plus && <PlusBenefits includes={plus.includes} includesHi={plus.includesHi} />}
      <PriceNote unit={worker.unit} />
    </Panel>
    <Panel>
      <Heading size="small">{t("Contact worker", "काम करने वाले से संपर्क करें")}</Heading>
      {workPhone && <Button secondary tone="info" label={t("Call ", "कॉल करें ") + workPhone} onPress={() => {
        setCallError(null);
        void Linking.openURL("tel:" + workPhone).catch(setCallError);
      }} />}
      <Feedback error={callError} />
      {appointment ? <Button secondary tone="info" label={t("Open booking for messages", "संदेशों के लिए बुकिंग खोलें")}
        onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: appointment.id } })} />
        : <Body small>{t("You can message this worker in HandyHive after sending a booking request.", "बुकिंग अनुरोध भेजने के बाद HandyHive में इस काम करने वाले को संदेश भेज सकते हैं।")}</Body>}
      {!data && <Body small>{t("Loading worker details…", "काम करने वाले की जानकारी लोड हो रही है…")}</Body>}
      <Feedback error={data?.error} />
      {!!data?.error && <Button compact secondary label={t("Reload worker details", "जानकारी फिर लोड करें")} onPress={() => setAttempt((value) => value + 1)} />}
    </Panel>
    <Panel>
      <Heading size="small">{t("Customer reviews", "ग्राहकों की समीक्षाएँ")}</Heading>
      {data?.details?.reviews.length === 0 && <Body small>{t("This worker has no reviews yet.", "इस काम करने वाले की अभी कोई समीक्षा नहीं है।")}</Body>}
      {data?.details?.reviews.map((review, index) => <Section key={review.created + ":" + index}>
        <Row><RatingScore>{review.rating} / 5</RatingScore><Body small>{t("Verified booking", "सत्यापित बुकिंग")}</Body></Row>
        <Body small>{copy.intl({ dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(review.created)}</Body>
        {!!review.comment && <Body>{review.comment}</Body>}
      </Section>)}
    </Panel>
    <Panel><TrustDetails trust={worker.trust} /></Panel>
    {token && <><SaveWorker worker={worker.id} /><ProviderActions worker={worker.id} /></>}
  </Page>;
}
