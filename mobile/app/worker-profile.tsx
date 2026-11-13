import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import type { Payload, ProfileCommand, Unit } from "../src/api";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, Button, Feedback, Field, Heading, Page, Panel, Row, Section } from "../src/ui";

export default function WorkerProfile() {
  const { snapshot, changeProfile, error: connectionError } = useSession();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const profile = snapshot?.state.profile;
  const catalog = snapshot?.state.catalog;
  const currentHours = profile?.hours ?? catalog?.defaultHours;
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [bioHi, setBioHi] = useState(profile?.bioHi ?? "");
  const [service, setService] = useState(profile?.service ?? "");
  const [areasText, setAreasText] = useState(profile?.areas.join("\n") ?? "");
  const areas = areasText.split(/[\n;]/).map((area) => area.trim()).filter(Boolean);
  const [years, setYears] = useState(profile ? String(profile.years) : "");
  const [price, setPrice] = useState(profile ? String(profile.price) : "");
  const [unit, setUnit] = useState<Unit>(profile?.unit ?? "visit");
  const [languages, setLanguages] = useState(profile?.languages?.join(", ") ?? "");
  const [plus, setPlus] = useState(Boolean(profile?.plus));
  const [plusPrice, setPlusPrice] = useState(profile?.plus ? String(profile.plus.price) : "");
  const [includes, setIncludes] = useState(profile?.plus?.includes ?? "");
  const [includesHi, setIncludesHi] = useState(profile?.plus?.includesHi ?? "");
  const [days, setDays] = useState(currentHours?.days ?? []);
  const [opens, setOpens] = useState(currentHours?.start ?? "");
  const [closes, setCloses] = useState(currentHours?.end ?? "");
  const [buffer, setBuffer] = useState(String(currentHours?.buffer ?? 30));
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [busy, setBusy] = useState<ProfileCommand | "">("");
  const [error, setError] = useState<{ action: ProfileCommand; failure: unknown } | null>(null);
  const [saved, setSaved] = useState<ProfileCommand | "">("");
  const working = useRef(false);
  if (!catalog) return null;

  async function submit(action: ProfileCommand, body: Payload) {
    if (working.current) return false;
    working.current = true;
    setBusy(action);
    setError(null);
    setSaved("");
    try {
      await changeProfile(action, body);
      setSaved(action);
      return true;
    } catch (failure) {
      setError({ action, failure });
      return false;
    } finally {
      setBusy("");
      working.current = false;
    }
  }
  async function saveProfile() {
    const stored = await submit("profile", {
      name, bio, bioHi, service, areas, years: Number(years), price: Number(price), unit, credential: profile?.credential || "",
      languages: languages.split(/[,،]/).map((value) => value.trim()).filter(Boolean),
      plus: plus ? { price: Number(plusPrice), includes, includesHi } : null,
    });
    if (stored && !profile) router.replace("/worker");
  }
  const profileValid = Boolean(name.trim() && bio.trim() && service && areas.length && years !== "" && Number(years) <= 70
    && Number(price) >= 1 && Number(price) <= 100000 && (!plus || (Number(plusPrice) > Number(price) && Number(plusPrice) <= 100000 && includes.trim())));
  const clocks = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const weekday = [
    t("Sun", "रवि"), t("Mon", "सोम"), t("Tue", "मंगल"), t("Wed", "बुध"), t("Thu", "गुरु"), t("Fri", "शुक्र"), t("Sat", "शनि"),
  ];
  const examples: Record<string, [string, string]> = {
    plumbing: ["Check adjacent fittings and document where the leak starts.", "आस-पास की फिटिंग जाँचें और लीकेज की जगह लिखें।"],
    electrical: ["Check neighbouring outlets and share a written fault summary.", "आस-पास के सॉकेट जाँचें और खराबी का लिखित विवरण दें।"],
    cleaning: ["Detail skirting and wipe accessible cabinet fronts.", "स्कर्टिंग की बारीक सफ़ाई और अलमारियों के सामने के हिस्से की सफ़ाई।"],
    painting: ["Protect nearby furniture and prepare one extra patch of wall.", "पास के फ़र्नीचर को ढकें और दीवार के एक अतिरिक्त हिस्से की तैयारी करें।"],
  };
  const amount = (value: string) => value.replace(/\D/g, "");
  function feedback(...actions: ProfileCommand[]) {
    return <>
      <Feedback error={error && actions.includes(error.action) ? error.failure : null} />
      {saved && actions.includes(saved) && <Body small strong>{t("Changes saved", "बदलाव सेव हो गए")}</Body>}
    </>;
  }

  return <Page>
    <Heading>{profile ? t("Manage your service", "अपनी सेवा संभालें") : t("Create your worker profile", "काम की प्रोफ़ाइल बनाएँ")}</Heading>
    <Feedback error={connectionError} />
    <Panel>
      <Heading size="small">{t("Public profile", "सार्वजनिक प्रोफ़ाइल")}</Heading>
      <Field label={t("Name customers will see", "ग्राहकों को दिखने वाला नाम")} value={name} onChangeText={setName} maxLength={60} />
      <Body strong>{t("Service", "सेवा")}</Body>
      <Row>{catalog.services.map((item) => <Button key={item.id} secondary compact selected={service === item.id}
        label={copy.service(item.id, item.name)} onPress={() => setService(item.id)} />)}</Row>
      <Field label={t("Areas you serve", "आप किन इलाकों में काम करते हैं?")} value={areasText} onChangeText={setAreasText}
        hint={t("Enter one locality per line, including the city. Add only places you can visit.", "हर लाइन में एक इलाका और शहर लिखें। केवल वही जगह जोड़ें जहाँ आप जा सकते हैं।")}
        placeholder={t("Locality, city", "इलाका, शहर")} multiline maxLength={1600} />
      <Field label={t("Years of experience", "अनुभव के साल")} value={years} onChangeText={(value) => setYears(amount(value))} maxLength={2} keyboardType="number-pad" />
      <Field label={t("Describe your work", "अपने काम का विवरण दें")} value={bio} onChangeText={setBio} maxLength={360} multiline />
      <Field label={t("Description in Hindi (optional)", "हिन्दी में विवरण (वैकल्पिक)")} value={bioHi} onChangeText={setBioHi} maxLength={360} multiline />
      <Field label={t("Languages you speak (optional)", "आप कौन-सी भाषाएँ बोलते हैं? (वैकल्पिक)")} placeholder={t("Hindi, English", "हिन्दी, अंग्रेज़ी")}
        hint={t("Separate languages with commas.", "भाषाओं को कॉमा से अलग करें।")} value={languages} onChangeText={setLanguages} maxLength={150} />
    </Panel>
    <Panel tint="green">
      <Heading size="small">{t("Everyday rate", "एवरीडे की दर")}</Heading>
      <Body>{t("Set a starting rate for your regular service.", "अपनी सामान्य सेवा की शुरुआती दर तय करें।")}</Body>
      <Row>
        <Button compact secondary selected={unit === "visit"} label={t("Diagnostic visit", "जाँच की विज़िट")} onPress={() => setUnit("visit")} />
        <Button compact secondary selected={unit === "hourly"} label={t("Hourly", "प्रति घंटा")} onPress={() => setUnit("hourly")} />
        <Button compact secondary selected={unit === "fixed"} label={t("Fixed package", "तय पैकेज")} onPress={() => setUnit("fixed")} />
      </Row>
      <Field label={t("Everyday price (₹)", "एवरीडे की कीमत (₹)")} value={price} onChangeText={(value) => setPrice(amount(value))}
        keyboardType="number-pad" maxLength={6} />
      {unit === "hourly" && <Body small>{t("Hourly bookings have a two-hour minimum.", "घंटे वाली बुकिंग कम से कम दो घंटे की होती है।")}</Body>}
    </Panel>
    <Panel tint="warm">
      <Heading size="small">{t("Plus option", "प्लस का विकल्प")}</Heading>
      <Body>{t("Offer an optional higher rate with specific extra work included. It uses the same billing unit as Everyday.", "स्पष्ट अतिरिक्त काम के साथ वैकल्पिक ऊँची दर दें। इसका शुल्क एवरीडे की तरह विज़िट, घंटे या पैकेज के हिसाब से होगा।")}</Body>
      <Button secondary compact selected={plus} label={plus ? t("Plus enabled", "प्लस चालू है") : t("Offer Plus", "प्लस दें")} onPress={() => setPlus(!plus)} />
      {plus && <>
        <Field label={t("Plus price (₹)", "प्लस की कीमत (₹)")} value={plusPrice}
          onChangeText={(value) => setPlusPrice(amount(value))} maxLength={6} keyboardType="number-pad" />
        <Field label={t("Extra work included in Plus", "प्लस में शामिल अतिरिक्त काम")}
          placeholder={examples[service] ? t(...examples[service]) : undefined} value={includes} onChangeText={setIncludes} maxLength={220} multiline />
        <Field label={t("Plus details in Hindi (optional)", "हिन्दी में प्लस की जानकारी (वैकल्पिक)")}
          value={includesHi} onChangeText={setIncludesHi} maxLength={220} multiline />
      </>}
    </Panel>
    <Section>
      {feedback("profile")}
      <Button label={busy === "profile" ? t("Saving…", "सेव हो रहा है…") : profile ? t("Save profile and rates", "प्रोफ़ाइल और दरें सेव करें")
        : t("Publish profile", "प्रोफ़ाइल प्रकाशित करें")} disabled={!!busy || !profileValid} onPress={() => void saveProfile()} />
    </Section>
    {profile && <>
      <Panel>
        <Heading size="small">{t("Profile availability", "प्रोफ़ाइल की उपलब्धता")}</Heading>
        <Body>{profile.published
          ? t("Your profile is listed in search.", "आपकी प्रोफ़ाइल खोज में दिख रही है।")
          : t("Your profile is paused. Existing bookings are still in your workspace.", "आपकी प्रोफ़ाइल रुकी है। मौजूदा बुकिंग आपके काम के पेज पर है।")}</Body>
        <Button secondary label={profile.published ? t("Pause profile", "प्रोफ़ाइल रोकें") : t("Resume profile", "प्रोफ़ाइल फिर चालू करें")}
          disabled={!!busy} onPress={() => void submit("published", { enabled: !profile.published })} />
        <Button secondary label={profile.immediate ? t("Stop immediate requests", "तुरंत अनुरोध बंद करें") : t("Take immediate requests", "तुरंत अनुरोध लें")}
          disabled={!!busy} onPress={() => void submit("immediate", { enabled: !profile.immediate })} />
        {feedback("published", "immediate")}
      </Panel>
      <Panel>
        <Heading size="small">{t("Working hours (IST)", "काम के घंटे (IST)")}</Heading>
        <Row>{weekday.map((label, index) => <Button key={label} compact secondary selected={days.includes(index)}
          label={label} onPress={() => setDays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index])} />)}</Row>
        <Field label={t("Open time (HH:MM)", "शुरुआत का समय (HH:MM)")} value={opens} onChangeText={setOpens} maxLength={5} placeholder="09:00" />
        <Field label={t("Close time (HH:MM)", "समाप्ति का समय (HH:MM)")} value={closes} onChangeText={setCloses} maxLength={5} placeholder="18:00" />
        <Field label={t("Travel buffer (minutes)", "यात्रा के लिए अतिरिक्त समय (मिनट)")} value={buffer}
          onChangeText={(value) => setBuffer(amount(value))} keyboardType="number-pad" maxLength={3} />
        {feedback("hours")}
        <Button secondary label={t("Save working hours", "काम के घंटे सेव करें")}
          disabled={!!busy || !clocks.test(opens) || !clocks.test(closes) || opens >= closes || buffer === "" || Number(buffer) > 180}
          onPress={() => void submit("hours", { days, start: opens, end: closes, buffer: Number(buffer) })} />
      </Panel>
      <Panel>
        <Heading size="small">{t("Blocked time", "आरक्षित समय")}</Heading>
        <Body small>{t("Use Delhi time in the format YYYY-MM-DD HH:MM.", "दिल्ली का समय YYYY-MM-DD HH:MM के फ़ॉर्मेट में डालें।")}</Body>
        <Field label={t("From", "से")} placeholder="2026-12-01 09:00" value={blockStart} onChangeText={setBlockStart} maxLength={16} />
        <Field label={t("Until", "तक")} placeholder="2026-12-01 12:00" value={blockEnd} onChangeText={setBlockEnd} maxLength={16} />
        {feedback("block", "remove-block")}
        <Button secondary label={t("Block this time", "यह समय रोकें")} disabled={!!busy || blockStart.length !== 16 || blockEnd.length !== 16}
          onPress={async () => {
            if (await submit("block", { start: blockStart.replace(" ", "T"), end: blockEnd.replace(" ", "T") })) {
              setBlockStart(""); setBlockEnd("");
            }
          }} />
        {profile.blocks?.map((block) => <Section key={block.id}>
          <Body>{copy.appointment(block.start)} — {copy.appointment(block.end)}</Body>
          <Button secondary danger compact label={t("Remove block", "रोक हटाएँ")} disabled={!!busy}
            onPress={() => void submit("remove-block", { id: block.id })} />
        </Section>)}
      </Panel>
    </>}
  </Page>;
}
