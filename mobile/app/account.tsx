import { useRouter } from "expo-router";
import { useState } from "react";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, Button, Feedback, Heading, LanguageButton, MainNav, Page, Panel, Row, Section } from "../src/ui";

export default function Account() {
  const { snapshot, logout, error: connectionError } = useSession();
  const copy = useCopy();
  const { t } = copy;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const handle = snapshot?.state.account.handle ?? "";
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await logout(); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  return <Page footer={<MainNav selected="account" />}>
    <Heading>{t("Your account", "आपका खाता")}</Heading>
    <Feedback error={connectionError} />
    <Panel>
      <Heading size="small">{t("Language", "भाषा")}</Heading>
      <Row><Body>{t("English", "हिन्दी")}</Body><LanguageButton /></Row>
    </Panel>
    {!!snapshot?.state.bookingUpdates?.length && <Section>
      <Heading size="medium">{t("Booking updates", "बुकिंग के अपडेट")}</Heading>
      {snapshot.state.bookingUpdates.map((update) => {
        const booking = snapshot.state.requests.find((item) => item.id === update.job);
        if (!booking) return null;
        return <Panel key={update.job + update.label}>
          <Heading size="small">{copy.updateLabel(update.label)}</Heading>
          <Body>{copy.task(booking.service, booking.scope)}</Body>
          <Body small>{update.role === "pro" ? t("Worker job", "आपका काम") : booking.proName} · {copy.dateTime(update.created)}</Body>
          <Button secondary label={t("View booking", "बुकिंग देखें")} onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: update.job } })} />
        </Panel>;
      })}
    </Section>}
    <Panel>
      <Body>{handle.startsWith("phone_") ? t("Signed in with your mobile number", "मोबाइल नंबर से साइन इन है") : handle}</Body>
      <Feedback error={error} />
      <Button secondary danger label={t("Sign out", "साइन आउट करें")} disabled={busy} onPress={() => void signOut()} />
    </Panel>
  </Page>;
}
