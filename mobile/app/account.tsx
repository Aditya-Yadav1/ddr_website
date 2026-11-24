import { SavedAddresses } from "../src/saved-addresses";
import { SavedWorkers } from "../src/saved-workers";
import { ProviderSafetyHistory } from "../src/provider-actions";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Platform, View } from "react-native";
import { api, offlineDemo, type PhoneChallenge } from "../src/api";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, Button, Feedback, Field, Heading, MainNav, Page, Panel, Section } from "../src/ui";

export default function Account() {
  const { snapshot, logout, role, token, refresh, changeProfile, error: connectionError } = useSession();
  const copy = useCopy();
  const { t } = copy;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const handle = snapshot?.state.account.handle ?? "";
  const account = snapshot?.state.account;
  const [googleReady, setGoogleReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [code, setCode] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  useEffect(() => {
    if (offlineDemo || Platform.OS !== "web") return;
    let active = true;
    void api<{ firebase?: { apiKey: string; authDomain: string; projectId: string; appId: string } | null }>("config").then(async ({ firebase }) => {
      if (active && firebase) { const { configureGoogle } = await import("../src/google-auth"); configureGoogle(firebase); setGoogleReady(true); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function saveName() {
    if (busy) return;
    setBusy(true); setError(null);
    try { await changeProfile("account-profile", { name }); setEditingName(false); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  async function verifyPhone() {
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      if (!challenge) {
        const digits = phone.replace(/\D/g, "");
        setChallenge(await api<PhoneChallenge>("phone-start", undefined, { phone: digits.length === 12 ? "+" + digits : "+91" + digits }));
      } else {
        await api("phone-link", token, { challenge: challenge.challenge, code });
        setChallenge(null); setCode(""); await refresh();
      }
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  async function connectGoogle() {
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      const { startGoogle } = await import("../src/google-auth");
      const idToken = await startGoogle();
      if (idToken) { await api("google-link", token, { idToken }); await refresh(); }
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
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
    <Panel>
      <Heading size="small">{account?.name || t("Your profile", "आपकी प्रोफ़ाइल")}</Heading>
      {editingName ? <><Field label={t("Full name", "पूरा नाम")} value={name} onChangeText={setName} maxLength={100} />
        <Button disabled={busy || name.trim().length < 2} label={t("Save name", "नाम सहेजें")} onPress={() => void saveName()} />
        <Button secondary disabled={busy} label={t("Cancel", "रद्द करें")} onPress={() => setEditingName(false)} /></>
        : <Button compact secondary label={t("Edit name", "नाम बदलें")} onPress={() => { setName(account?.name || ""); setEditingName(true); }} />}
      {!!account?.photo && <Image source={{ uri: account.photo }} accessibilityLabel={t("Account photograph", "खाते की तस्वीर")} style={{ width: 64, height: 64, borderRadius: 32 }} />}
      {!!account?.email && <Body>{account.email}</Body>}
      <Body small>{account?.googleLinked ? t("Google account linked", "Google खाता जुड़ा है") : handle.startsWith("phone_") ? t("Signed in with your mobile number", "मोबाइल नंबर से साइन इन है") : t("Signed in", "साइन इन है")}</Body>
      {!!account?.phone && <Body>{t("Verified phone: ", "सत्यापित फ़ोन: ") + account.phone}</Body>}
      {!offlineDemo && !account?.phone && <>
        <Heading size="small">{t("Verify a mobile number", "मोबाइल नंबर सत्यापित करें")}</Heading>
        {challenge ? <><Body small>{challenge.previewCode ? t("Local preview code: ", "स्थानीय प्रीव्यू कोड: ") + challenge.previewCode : t("Enter the code sent by SMS.", "एसएमएस से आया कोड डालें।")}</Body>
          <Field label={t("Six-digit code", "छह अंकों का कोड")} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />
          <Button disabled={busy || !/^\d{6}$/.test(code)} label={t("Verify phone", "फ़ोन सत्यापित करें")} onPress={() => void verifyPhone()} />
          <Button secondary disabled={busy} label={t("Change number", "नंबर बदलें")} onPress={() => { setChallenge(null); setCode(""); }} />
        </> : <><Field label={t("Indian mobile number", "भारतीय मोबाइल नंबर")} placeholder="+91 98765 43210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button disabled={busy || !/^(?:91)?[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))} label={t("Send verification code", "सत्यापन कोड भेजें")} onPress={() => void verifyPhone()} />
        </>}
      </>}
      {googleReady && !account?.googleLinked && <Button secondary label={t("Link Google account", "Google खाता जोड़ें")} disabled={busy} onPress={() => void connectGoogle()} />}
      {googleReady && !account?.googleLinked && <Body small>{t("Linking keeps this account and its bookings. Use the Google account you want to sign in with later.", "जोड़ने पर यही खाता और बुकिंग बनी रहेंगी। वही Google खाता चुनें जिससे आगे साइन इन करेंगे।")}</Body>}
    </Panel>
    <Feedback error={connectionError} />
    <Button secondary tone="info" label={t("Customer Support", "ग्राहक सहायता")} onPress={() => router.push("/support")} />
    {role === "customer" && <><SavedAddresses /><SavedWorkers /><ProviderSafetyHistory /></>}
    {!!snapshot?.state.bookingUpdates?.length && <Section>
      <Heading size="medium">{t("Notifications", "सूचनाएँ")}</Heading>
      {snapshot.state.bookingUpdates.map((update) => {
        const booking = snapshot.state.requests.find((item) => item.id === update.job);
        if (!booking) return null;
        return <Panel key={update.id ?? update.job + update.label}>
          <Heading size="small">{!update.read ? "• " : ""}{copy.updateLabel(update.label)}</Heading>
          <Body>{copy.task(booking.service, booking.scope)}</Body>
          <Body small>{update.role === "pro" ? t("Worker job", "आपका काम") : booking.proName} · {copy.dateTime(update.created)}</Body>
          <Button secondary label={t("View booking", "बुकिंग देखें")} onPress={() => { if (!offlineDemo && update.id && !update.read) void changeProfile("notification-read", { id: update.id }).catch(setError); router.push({ pathname: "/bookings/[id]", params: { id: update.job } }); }} />
          {!offlineDemo && update.id && !update.read && <Button secondary compact label={t("Mark as read", "पढ़ा हुआ चिह्नित करें")} onPress={() => void changeProfile("notification-read", { id: update.id }).catch(setError)} />}
        </Panel>;
      })}
    </Section>}
    {!offlineDemo && <Panel><Heading size="small">{t("Account deletion", "खाता हटाने का अनुरोध")}</Heading>
      <Body small>{t("Request review of account deletion. This records a private operator request; it does not immediately remove bookings or payment records.", "खाता हटाने की समीक्षा माँगें। यह निजी ऑपरेटर अनुरोध दर्ज करता है; बुकिंग या भुगतान रिकॉर्ड तुरंत नहीं हटते।")}</Body>
      {snapshot?.state.deletionRequested ? <Body strong>{t("Deletion request recorded", "खाता हटाने का अनुरोध दर्ज है")}</Body>
        : confirmDeletion ? <><Button danger label={t("Confirm deletion request", "खाता हटाने के अनुरोध की पुष्टि करें")} disabled={busy}
            onPress={async () => { setBusy(true); setError(null); try { await changeProfile("account-deletion-request", {}); setConfirmDeletion(false); } catch (failure) { setError(failure); } finally { setBusy(false); } }} />
          <Button secondary label={t("Keep account", "खाता बनाए रखें")} onPress={() => setConfirmDeletion(false)} /></>
        : <Button secondary danger label={t("Request account deletion", "खाता हटाने का अनुरोध करें")} onPress={() => setConfirmDeletion(true)} />}
    </Panel>}
    <Panel>
      <Body>{handle.startsWith("phone_") ? t("Signed in with your mobile number", "मोबाइल नंबर से साइन इन है") : handle}</Body>
      <Feedback error={error} />
      <Button secondary danger label={t("Sign out", "साइन आउट करें")} disabled={busy} onPress={() => void signOut()} />
    </Panel>
  </Page>;
}
