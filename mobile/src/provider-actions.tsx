import { useState } from "react";
import { useRouter } from "expo-router";
import { useCopy } from "./language";
import { useSession } from "./session";
import type { WorkerRating } from "./api";
import { Body, Button, Feedback, Field, Heading, Panel, RatingScore, Row, Section } from "./ui";

export function ProviderRating({ rating }: { rating?: WorkerRating }) {
  const { t } = useCopy();
  return rating ? <RatingScore>{rating.rating.toFixed(1)} / 5 · {rating.count} {rating.count === 1 ? t("review", "समीक्षा") : t("reviews", "समीक्षाएँ")}</RatingScore>
    : <Body small>{t("New · No reviews yet", "नए · अभी कोई समीक्षा नहीं")}</Body>;
}

export function BlockProvider({ worker, onBlocked }: { worker: string; onBlocked?: () => void }) {
  const { snapshot, changeProfile } = useSession();
  const { t } = useCopy();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const blocked = snapshot?.state.blockedWorkers?.some(({ id }) => id === worker);
  if (!snapshot || snapshot.state.account.id === worker) return null;
  return <Section>
    {confirm && <Body small>{t("This worker will be hidden from your results and cannot receive new bookings from you. Manage blocks in Account. Existing bookings stay accessible.",
      "यह काम करने वाला आपके नतीजों में नहीं दिखेगा और आप उनसे नई बुकिंग नहीं कर सकेंगे। ब्लॉक खाते में बदलें। मौजूदा बुकिंग उपलब्ध रहेंगी।")}</Body>}
    <Row>
      <Button compact secondary disabled={busy} label={blocked ? t("Unblock provider", "ब्लॉक हटाएँ")
        : confirm ? t("Confirm block", "ब्लॉक की पुष्टि करें") : t("Block provider", "काम करने वाले को ब्लॉक करें")} onPress={async () => {
        if (!blocked && !confirm) { setConfirm(true); return; }
        setBusy(true);
        setError(null);
        try {
          await changeProfile(blocked ? "unblock-worker" : "block-worker", { worker });
          setConfirm(false);
          if (!blocked) onBlocked?.();
        } catch (failure) { setError(failure); }
        finally { setBusy(false); }
      }} />
      {confirm && <Button compact secondary disabled={busy} label={t("Cancel", "रद्द करें")} onPress={() => setConfirm(false)} />}
    </Row>
    <Feedback error={error} />
  </Section>;
}

export function ProviderActions({ worker }: { worker: string }) {
  const router = useRouter();
  const { snapshot, changeProfile } = useSession();
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<unknown>();
  const filed = snapshot?.state.safetyReports?.some((report) => !report.job && report.worker === worker && report.status === "open");
  const categories = {
    identity: t("Identity mismatch", "पहचान मेल नहीं खाती"),
    fraud: t("Suspected fraud", "धोखाधड़ी का शक"),
    conduct: t("Unsafe conduct", "असुरक्षित व्यवहार"),
    other: t("Other concern", "अन्य शिकायत"),
  };
  return <Section>
    <Row><Button compact secondary tone="danger" mark="⚑" expanded={open} label={t("Report", "शिकायत करें")} onPress={() => setOpen(!open)} /></Row>
    {open && <Panel>
      <Heading size="small">{t("What would you like to report?", "आप किस बारे में शिकायत करना चाहते हैं?")}</Heading>
      {filed ? <Body small>{t("Your private report is awaiting review. Track it in Account.", "आपकी निजी शिकायत की समीक्षा बाकी है। खाते में स्थिति देखें।")}</Body>
      : <Section>
        <Body small>{t("Only you and the review team can see this report.", "यह शिकायत केवल आप और समीक्षा टीम देख सकते हैं।")}</Body>
        <Row>{Object.entries(categories).map(([value, label]) => <Button key={value} compact secondary label={label}
          selected={value === category} disabled={busy} onPress={() => setCategory(value)} />)}</Row>
        {category && <>
          <Field label={t("What happened?", "क्या हुआ?")} value={message} onChangeText={setMessage} maxLength={950} multiline editable={!busy} />
          <Button danger disabled={busy || !category || message.trim().length < 10} label={t("Send private report", "निजी शिकायत भेजें")} onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await changeProfile("report-worker", { worker, category, message });
              setMessage("");
              setCategory("");
            } catch (failure) { setError(failure); }
            finally { setBusy(false); }
          }} />
        </>}
      </Section>}
      <Feedback error={error} />
      <Button secondary tone="info" label={t("Contact Customer Support", "ग्राहक सहायता से संपर्क करें")} onPress={() => router.push("/support")} />
      <BlockProvider worker={worker} onBlocked={() => router.replace("/customer")} />
    </Panel>}
  </Section>;
}

export function ProviderSafetyHistory() {
  const { snapshot } = useSession();
  const { t, dateTime } = useCopy();
  const blocked = snapshot?.state.blockedWorkers ?? [];
  const reports = snapshot?.state.safetyReports ?? [];
  return <Panel>
    <Heading size="small">{t("Blocked providers", "ब्लॉक किए गए काम करने वाले")}</Heading>
    {blocked.length === 0 && <Body small>{t("No blocked providers", "किसी को ब्लॉक नहीं किया है")}</Body>}
    {blocked.map(({ id, name }) => <Section key={id}><Body strong>{name}</Body><BlockProvider worker={id} /></Section>)}
    {reports.length > 0 && <Section>
      <Heading size="small">{t("Your private safety reports", "आपकी निजी सुरक्षा शिकायतें")}</Heading>
      {reports.map((report) => <Section key={report.id}>
        <Body strong>{report.status === "open" ? t("Awaiting review", "समीक्षा बाकी है") : t("Review closed", "समीक्षा पूरी हुई")} · {dateTime(report.created)}</Body>
        <Body small>{report.message}</Body>
        {!!report.resolution && <Body small>{report.resolution}</Body>}
      </Section>)}
    </Section>}
  </Panel>;
}
