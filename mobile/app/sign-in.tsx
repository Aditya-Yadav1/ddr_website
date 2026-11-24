import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { api, offlineDemo, type PhoneChallenge, type PhoneMode } from "../src/api";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, Button, Feedback, Field, Heading, Page, Panel, Row } from "../src/ui";

export default function SignIn() {
  const { next, support, job, topic, role } = useLocalSearchParams<{ role?: string; next?: string; support?: string; job?: string; topic?: string }>();
  const { token, auth, chooseRole, startPhone, role: sessionRole, error: sessionError } = useSession();
  const { t } = useCopy();
  const [phoneMode, setPhoneMode] = useState<PhoneMode>();
  const [googleReady, setGoogleReady] = useState(false);
  const [operatorGoogleOnly, setOperatorGoogleOnly] = useState(false);
  const [mode, setMode] = useState<"phone" | "login" | "register">("phone");
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [code, setCode] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (offlineDemo) return;
    let active = true;
    void api<{ phoneMode: PhoneMode; operatorGoogleOnly?: boolean; firebase?: { apiKey: string; authDomain: string; projectId: string; appId: string } | null }>("config").then(async (config) => {
      if (active) {
        setPhoneMode(config.phoneMode);
        setGoogleReady(Boolean(config.firebase));
        setOperatorGoogleOnly(Boolean(config.operatorGoogleOnly));
        if (config.phoneMode === "invite") setMode("login");
      }
      if (active && config.firebase) {
        try { const google = await import("../src/google-auth"); google.configureGoogle(config.firebase); const idToken = await google.finishGoogleRedirect(); if (idToken && active) await auth("google-sign-in", { idToken }); }
        catch (failure) { if (active) setError(failure); }
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function googleSignIn() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (role === "customer" || role === "worker") await chooseRole(role);
      const { startGoogle } = await import("../src/google-auth");
      const idToken = await startGoogle();
      if (idToken) await auth("google-sign-in", { idToken });
    }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (role === "customer" || role === "worker") await chooseRole(role);
      if (offlineDemo) await auth("demo-sign-in", { account: role === "worker" ? "worker-demo" : "customer-demo" });
      else if (mode !== "phone") await auth(mode, { handle, password, ...(phoneMode === "invite" && mode === "register" && { invite: invite.trim() }) });
      else if (challenge) await auth("phone-verify", { challenge: challenge.challenge, code });
      else {
        const digits = phone.replace(/\D/g, "");
        setChallenge(await startPhone(digits.length === 12 ? "+" + digits : "+91" + digits));
      }
    } catch (failure) {
      setError(failure);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function switchMode(next: typeof mode) {
    setError(null);
    setPassword("");
    setMode(next);
  }
  if (token) {
    if (role === "operator" || operatorGoogleOnly) return <Redirect href="/admin" />;
    if (support === "1") return <Redirect href={{ pathname: "/support", params: { job, topic } }} />;
    if (next) {
      try {
        const choice = JSON.parse(next);
        if (typeof choice?.id === "string") return <Redirect href={{ pathname: "/request/[id]", params: choice }} />;
      } catch { /* Use the workspace when the booking link is incomplete. */ }
    }
    return <Redirect href={(role ?? sessionRole) === "worker" ? "/worker" : "/customer"} />;
  }
  const title = role === "worker" ? t("Worker sign-in", "काम करने वाले का साइन इन") : t("Customer sign-in", "ग्राहक साइन इन");
  if (role === "operator" || operatorGoogleOnly) return <Page>
    <Heading>{t("Operations sign-in", "संचालन साइन इन")}</Heading>
    <Panel>
      <Body>{t("Use the Google account authorised to approve workers.", "काम करने वालों की मंज़ूरी के लिए अधिकृत Google खाता इस्तेमाल करें।")}</Body>
      <Feedback error={error || sessionError} />
      <Button label={t("Continue with Google", "Google से जारी रखें")} disabled={busy || !operatorGoogleOnly || !googleReady} onPress={() => void googleSignIn()} />
    </Panel>
  </Page>;
  if (offlineDemo) return <Page><Heading>{title}</Heading>
    <Panel><Body>{t("Try this workspace with a sample account.", "नमूना खाते से आज़माएँ।")}</Body>
      <Feedback error={error} /><Button label={t("Sign in to preview", "प्रीव्यू में साइन इन करें")} disabled={busy} onPress={() => void submit()} /></Panel>
  </Page>;
  const invited = phoneMode === "invite";
  const ready = mode !== "phone" ? Boolean(handle.trim() && password && (!invited || mode !== "register" || invite.trim()))
    : Boolean(phoneMode && (challenge ? /^\d{6}$/.test(code) : /^(?:91)?[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))));
  return <Page>
    <Heading>{title}</Heading>
    <Panel>
      {googleReady && <Button secondary label={busy ? t("Please wait…", "कृपया रुकें…") : t("Continue with Google", "Google से जारी रखें")} disabled={busy} onPress={() => void googleSignIn()} />}
      {googleReady && <Body small>{t("Your Google account creates an ASAAN account. Verify your phone separately when a service requires it.", "आपके Google खाते से आसान खाता बनता है। ज़रूरत होने पर फ़ोन अलग से सत्यापित करें।")}</Body>}
      <Heading size="small">{invited ? (mode === "register" ? t("Create an account", "खाता बनाएँ") : t("Sign in with your username", "यूज़रनेम से साइन इन करें"))
        : mode === "phone" ? (challenge ? t("Almost there. Your code?", "बस एक कदम और। आपका कोड?") : t("Let’s get you signed in", "चलिए, साइन इन करें"))
        : mode === "register" ? t("Create a preview account", "प्रीव्यू खाता बनाएँ") : t("Preview account sign-in", "प्रीव्यू खाते में साइन इन")}</Heading>
      {mode === "phone" && !challenge && <Field label={t("Indian mobile number", "भारतीय मोबाइल नंबर")}
        placeholder="+91 98765 43210" keyboardType="phone-pad" autoComplete="tel" value={phone}
        onChangeText={setPhone} editable={!busy} onSubmitEditing={() => { if (ready) void submit(); }} />}
      {mode === "phone" && challenge && <>
        <Body small>{challenge.previewCode
          ? t("Local preview code: ", "स्थानीय प्रीव्यू कोड: ") + challenge.previewCode
          : t("Enter the six-digit code sent by SMS.", "एसएमएस से आया छह अंकों का कोड डालें।")}</Body>
        <Field label={t("Six-digit code", "छह अंकों का कोड")} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
          keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} editable={!busy} onSubmitEditing={() => { if (ready) void submit(); }} />
      </>}
      {mode !== "phone" && <>
        {invited && mode === "register" && <Field label={t("Invitation code", "आमंत्रण कोड")} value={invite} onChangeText={setInvite}
          maxLength={128} autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy} />}
        <Field label={t("Username", "यूज़रनेम")} testID="username" value={handle} onChangeText={setHandle}
          autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!busy} />
        <Field label={t("Password", "पासवर्ड")} testID="password" value={password} onChangeText={setPassword}
          hint={mode === "register" ? t("Use at least 12 characters.", "कम से कम 12 अक्षर रखें।") : undefined}
          secureTextEntry autoComplete={mode === "register" ? "new-password" : "current-password"} editable={!busy}
          onSubmitEditing={() => { if (ready) void submit(); }} />
      </>}
      <Feedback error={error || sessionError} />
      <Button label={busy ? t("Please wait…", "कृपया रुकें…") : mode === "phone"
        ? (challenge ? t("Verify and sign in →", "सत्यापित करके आगे बढ़ें →") : t("Send me a code →", "मुझे कोड भेजें →"))
        : mode === "register" ? t("Create account", "खाता बनाएँ") : t("Sign in", "साइन इन करें")}
        disabled={busy || !ready} onPress={() => void submit()} />
      {mode === "phone" && challenge && <Button secondary label={t("Change number or request a new code", "नंबर बदलें या नया कोड माँगें")}
        disabled={busy} onPress={() => { setChallenge(null); setCode(""); setError(null); }} />}
    </Panel>
    {invited && <Button secondary label={mode === "register" ? t("Use an existing account", "मौजूदा खाता इस्तेमाल करें") : t("Create an account", "खाता बनाएँ")}
      disabled={busy} onPress={() => switchMode(mode === "register" ? "login" : "register")} />}
    {phoneMode === "preview" && <Row>
      {mode !== "login" && <Button secondary compact label={t("Use a preview account", "प्रीव्यू खाता इस्तेमाल करें")} onPress={() => switchMode("login")} disabled={busy} />}
      {mode !== "register" && <Button secondary compact label={t("Create preview account", "प्रीव्यू खाता बनाएँ")} onPress={() => switchMode("register")} disabled={busy} />}
      {mode !== "phone" && <Button secondary compact label={t("Use phone", "फ़ोन इस्तेमाल करें")} onPress={() => switchMode("phone")} disabled={busy} />}
    </Row>}
  </Page>;
}
