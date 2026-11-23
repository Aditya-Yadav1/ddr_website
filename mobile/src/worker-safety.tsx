import { useState } from "react";
import type { Booking, BookingCommand, Payload, Role, WorkerTrust } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, Feedback, Field, Heading, Panel, Section, Tag } from "./ui";

export function TrustDetails({ trust }: { trust?: WorkerTrust | null }) {
  const { t, dateTime } = useCopy();
  const labels = { identity: t("Identity", "पहचान"), background: t("Background", "पृष्ठभूमि"), skills: t("Service skills", "काम का कौशल") };
  return <Section>
    <Heading size="small">{t("Worker checks", "काम करने वाले की जाँच")}</Heading>
    <Body small>{trust?.phoneVerified ? t("Phone verified by SMS", "SMS से फ़ोन सत्यापित") : t("Phone not independently verified", "फ़ोन स्वतंत्र रूप से सत्यापित नहीं है")}</Body>
    {trust?.suspended && <Tag tone="danger">{t("Bookings suspended", "बुकिंग निलंबित")}</Tag>}
    {(Object.keys(labels) as (keyof typeof labels)[]).map((kind) => {
      const check = trust?.checks[kind];
      const verified = check?.status === "verified";
      return <Section key={kind}>
        <Body small strong>{labels[kind]} · {verified ? t("Checked", "जाँच हुई") : t("Not currently verified", "अभी सत्यापित नहीं")}</Body>
        {verified && check.expiresAt && <Body small>{t("Valid until", "इस तारीख तक मान्य")} {dateTime(check.expiresAt)}</Body>}
      </Section>;
    })}
    {!!trust?.verifiedName && <Body small>{t("Checked name", "जाँचा गया नाम")}: {trust.verifiedName}</Body>}
    <Body small>{t("Keep messages and quotes in HandyHive. Decline requests for advance payments or one-time passwords. At the door, compare the worker’s photo ID with the checked name in your booking.",
      "संदेश और कोटेशन HandyHive में रखें। अग्रिम भुगतान या OTP माँगे जाने पर मना करें। दरवाज़े पर फोटो पहचान पत्र का नाम अपनी बुकिंग में जाँचे गए नाम से मिलाएँ।")}</Body>
    <Body small>{t("Checks reduce uncertainty; they do not guarantee conduct. Match the arriving person to their identity and booking before allowing work.", "जाँच से जानकारी मिलती है; व्यवहार की गारंटी नहीं है। काम से पहले आए व्यक्ति की पहचान और बुकिंग मिलाएँ।")}</Body>
  </Section>;
}

export function VerificationRequest() {
  const { snapshot, changeProfile } = useSession();
  const { t } = useCopy();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const profile = snapshot?.state.profile;
  if (!profile) return null;
  return <Panel>
    <TrustDetails trust={profile.trust} />
    <Feedback error={error} />
    {profile.trust?.requested ? <Body>{t("Verification requested. An operator must review evidence before any check is marked complete. Contact the pilot organiser to arrange your review.", "जाँच का अनुरोध दर्ज है। जाँच पूरी होने से पहले संचालक प्रमाण देखेगा। समीक्षा के लिए पायलट आयोजक से संपर्क करें।")}</Body> : <>
      <Body small>{t("I consent to identity, background and skill checks for worker onboarding. Only check status, expiry and my checked name are shared with customers. Evidence is reviewed separately; do not send ID numbers or documents in chat. Alternative identity documents are accepted. Contact the organiser to withdraw before review.", "मैं काम शुरू करने के लिए पहचान, पृष्ठभूमि और कौशल की जाँच की सहमति देता/देती हूँ। ग्राहकों को केवल जाँच की स्थिति, अवधि और नाम दिखेगा। चैट में पहचान संख्या या दस्तावेज़ न भेजें। वैकल्पिक पहचान दस्तावेज़ स्वीकार हैं। समीक्षा से पहले सहमति वापस लेने के लिए आयोजक से संपर्क करें।")}</Body>
      <Button secondary selected={consent} label={consent ? t("Consent selected", "सहमति चुनी गई") : t("I consent to these checks", "मैं इन जाँचों के लिए सहमत हूँ")} onPress={() => setConsent(!consent)} />
      <Button disabled={!consent || busy} label={t("Request verification", "जाँच का अनुरोध करें")} onPress={async () => {
        setBusy(true); setError(null);
        try { await changeProfile("verification-request", { consent: "worker-checks-v1" }); }
        catch (failure) { setError(failure); } finally { setBusy(false); }
      }} />
    </>}
  </Panel>;
}

type SafetyControls = {
  booking: Booking; role: Role; locked: boolean; send: (action: BookingCommand, body: Payload) => Promise<unknown>;
};

export function BookingSafety({ booking, role, locked, send }: SafetyControls) {
  const { t } = useCopy();
  if (role === "pro" && !booking.arrivalConfirmedAt && !(booking.safetyVersion && booking.status === "arrived")) return null;
  return <Panel tone="warning">
    <Heading size="small">{t("Visit safety", "विज़िट की सुरक्षा")}</Heading>
    {role === "customer" && <TrustDetails trust={booking.workerTrust} />}
    {booking.arrivalConfirmedAt ? <Tag>{t("Customer confirmed arrival identity", "ग्राहक ने आगमन पर पहचान की पुष्टि की")}</Tag>
      : booking.safetyVersion && booking.status === "arrived" ? <>
        <Body>{t("The customer must check the arriving worker’s identity before work starts. Never confirm remotely or for a replacement worker.", "काम शुरू होने से पहले ग्राहक आए व्यक्ति की पहचान जाँचे। दूर से या दूसरे व्यक्ति के लिए पुष्टि न करें।")}</Body>
        {role === "customer" && <Button disabled={locked} label={t("I checked this worker in person", "मैंने इस व्यक्ति की पहचान सामने से जाँची है")} onPress={() => void send("arrival-confirm", { confirmed: true })} />}
      </> : null}
  </Panel>;
}

export function BookingSafetyReport({ booking, locked, send }: SafetyControls) {
  const { t } = useCopy();
  const { snapshot } = useSession();
  const [message, setMessage] = useState("");
  const reports = snapshot?.state.safetyReports?.filter((report) => report.job === booking.id) || [];
  return <Section>
    <Body small>{t("For immediate danger, contact local emergency services.", "तत्काल खतरे में स्थानीय आपात सेवा से संपर्क करें।")}</Body>
    {reports.map((report) => <Section key={report.id}><Body strong>{report.status === "open" ? t("Concern recorded · awaiting review", "शिकायत दर्ज · समीक्षा बाकी") : t("Review closed", "समीक्षा पूरी")}</Body><Body small>{report.message}</Body>{!!report.resolution && <Body small>{report.resolution}</Body>}</Section>)}
    {!reports.some((report) => report.status === "open") && <Section>
      <Body small>{t("Only you and authorised operators can read this report.", "यह शिकायत केवल आप और अधिकृत संचालक पढ़ सकते हैं।")}</Body>
      <Field label={t("What happened?", "क्या हुआ?")} multiline maxLength={1000} value={message} onChangeText={setMessage} editable={!locked} />
      <Button disabled={locked || message.trim().length < 10} label={t("Record private concern", "निजी शिकायत दर्ज करें")} onPress={async () => {
        if (await send("safety-report", { message })) setMessage("");
      }} />
    </Section>}
  </Section>;
}
