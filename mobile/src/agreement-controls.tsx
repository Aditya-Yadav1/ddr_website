import { useState } from "react";
import type { Booking, BookingCommand, Materials, Payload, Quote, Role } from "./api";
import { MaterialOptions, useMaterialLabels } from "./job-materials";
import { useCopy } from "./language";
import { Body, Button, Field, Heading, Panel, Row, Section, Tag } from "./ui";

export type BookingControls = {
  booking: Booking;
  role: Role;
  locked: boolean;
  send: (action: BookingCommand, body: Payload) => Promise<string | undefined>;
};

export function toPaise(input: string) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(input.trim())) return NaN;
  const [rupees, fraction = ""] = input.trim().split(".");
  return Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
}

function QuoteSummary({ quote, base }: { quote: Quote; base: number }) {
  const { t, money } = useCopy();
  const materials = useMaterialLabels();
  const status = {
    sent: t("Awaiting approval", "मंज़ूरी का इंतज़ार"),
    accepted: t("Approved", "मंज़ूर"),
    rejected: t("Declined", "अस्वीकृत"),
    superseded: t("Replaced or closed", "बदला या बंद किया गया"),
  };
  return <Section>
    <Row><Body strong>{t("Quote", "कोटेशन")} {quote.version}</Body><Tag>{status[quote.status]}</Tag></Row>
    <Body>{t("Original agreed charge", "मूल तय शुल्क")} · {money(base / 100)}</Body>
    {quote.items.map((item, index) => <Body key={index}>{item.label} · {money(item.amountPaise / 100)}</Body>)}
    {quote.creditPaise > 0 && <Body>{t("Diagnostic fee credit", "जाँच शुल्क की छूट")} · −{money(quote.creditPaise / 100)}</Body>}
    <Body strong>{t("Total", "कुल")} · {money(quote.totalPaise / 100)}</Body>
    <Body small>{materials[quote.materials]} · {quote.minutes} {t("min", "मिनट")}</Body>
    {!!quote.exclusions && <Body small>{t("Excluded work", "शामिल नहीं है")} · {quote.exclusions}</Body>}
  </Section>;
}

export function AgreementControls({ booking, role, locked, send }: BookingControls) {
  const { t, money } = useCopy();
  const labels = useMaterialLabels();
  const [composing, setComposing] = useState(false);
  const [history, setHistory] = useState(false);
  const [items, setItems] = useState([{ label: "", amount: "" }]);
  const [materials, setMaterials] = useState<Materials>("none");
  const [minutes, setMinutes] = useState(String(booking.duration ?? 60));
  const [credit, setCredit] = useState("");
  const [exclusions, setExclusions] = useState("");
  const brief = booking.brief;
  if (!brief) return null;
  const base = booking.basePaise ?? 0;
  const latest = booking.quotes?.at(-1);
  const approved = booking.quotes?.find((quote) => quote.version === booking.activeQuote);
  const canQuote = role === "pro" && ["arrived", "in_progress"].includes(booking.status);
  const canApprove = role === "customer" && latest?.status === "sent" && ["arrived", "in_progress"].includes(booking.status);
  const amounts = items.map(({ label, amount }) => ({ label: label.trim(), amountPaise: toPaise(amount) }));
  const creditPaise = credit ? toPaise(credit) : 0;
  const quoteTotal = base + amounts.reduce((sum, item) => sum + (item.amountPaise || 0), 0) - (creditPaise || 0);
  const quoteValid = amounts.every((item) => item.label && item.amountPaise > 0 && item.amountPaise <= 10_000_000)
    && Number(minutes) >= 15 && Number(minutes) <= 720 && creditPaise >= 0 && creditPaise <= base && quoteTotal >= base;
  function updateItem(index: number, patch: Partial<typeof items[number]>) {
    setItems((current) => current.map((item, at) => at === index ? { ...item, ...patch } : item));
  }

  return <Panel>
    <Heading size="small">{t("Job agreement", "काम की सहमति")}</Heading>
    <Body>{brief.problem}</Body>
    <Body>{labels[brief.materials]}</Body>
    {brief.materials === "customer" && <Body small>{{
      ready: t("Materials ready", "सामान तैयार है"),
      not_ready: t("Materials still needed", "सामान अभी चाहिए"),
      unknown: t("Readiness unconfirmed", "सामान तैयार है या नहीं, तय नहीं"),
    }[brief.readiness]}</Body>}
    <Body strong>{booking.unit === "visit" ? t("Agreed diagnostic charge", "जाँच का तय शुल्क") : t("Original agreed charge", "मूल तय शुल्क")}
      {" · "}{money(base / 100)}</Body>
    {booking.agreedHours && <Body small>{booking.agreedHours} {t("agreed hours", "तय घंटे")}</Body>}
    <Body small>{booking.demoWorker
      ? t("Use test checkout after the demo visit.", "डेमो विज़िट के बाद परीक्षण भुगतान करें।")
      : t("Pay the worker directly at the end of the visit.", "विज़िट के अंत में काम करने वाले को सीधे भुगतान करें।")}</Body>
    {booking.diagnosticOnly && <Tag>{t("Diagnostic visit completed", "जाँच की विज़िट पूरी हुई")}</Tag>}
    {approved && <QuoteSummary quote={approved} base={base} />}
    {latest && latest.version !== approved?.version && <QuoteSummary quote={latest} base={base} />}
    {latest?.status === "sent" && approved && <Body strong>{t("Change to agreed total", "तय कुल में बदलाव")} · {money((latest.totalPaise - approved.totalPaise) / 100)}</Body>}
    {canApprove && <Row>
      <Button disabled={locked} label={t("Approve quote", "कोटेशन मंज़ूर करें")}
        onPress={() => void send("quote-respond", { version: latest.version, decision: "accepted" })} />
      <Button disabled={locked} secondary label={t("Decline quote", "कोटेशन अस्वीकार करें")}
        onPress={() => void send("quote-respond", { version: latest.version, decision: "rejected" })} />
    </Row>}
    {canQuote && !composing && <Button secondary label={latest ? t("Write a revised quote", "नया कोटेशन लिखें") : t("Write a quote", "कोटेशन लिखें")}
      disabled={locked} onPress={() => setComposing(true)} />}
    {composing && canQuote && <Section>
      <Heading size="small">{t("Quote for repair or extra work", "मरम्मत या अतिरिक्त काम का कोटेशन")}</Heading>
      {items.map((item, index) => <Section key={index}>
        <Field label={t("Work or material", "काम या सामान")} value={item.label} maxLength={120} onChangeText={(label) => updateItem(index, { label })} />
        <Field label={t("Charge (₹)", "शुल्क (₹)")} value={item.amount} maxLength={10} keyboardType="decimal-pad" onChangeText={(amount) => updateItem(index, { amount })} />
        {items.length > 1 && <Button compact secondary label={t("Remove item", "आइटम हटाएँ")} onPress={() => setItems(items.filter((_, at) => at !== index))} />}
      </Section>)}
      {items.length < 8 && <Button compact secondary label={t("Add item", "आइटम जोड़ें")} onPress={() => setItems([...items, { label: "", amount: "" }])} />}
      <MaterialOptions value={materials} onChange={setMaterials} />
      <Field label={t("What’s excluded?", "क्या शामिल नहीं है?")} value={exclusions} maxLength={220} onChangeText={setExclusions} />
      <Field label={t("Updated duration in minutes", "नई अवधि मिनटों में")} value={minutes} maxLength={3} keyboardType="number-pad"
        onChangeText={(value) => setMinutes(value.replace(/\D/g, ""))} />
      {booking.unit === "visit" && <Field label={t("Credit towards repair (₹)", "मरम्मत पर जाँच शुल्क की छूट (₹)")}
        value={credit} maxLength={10} keyboardType="decimal-pad" onChangeText={setCredit} />}
      <Body strong>{t("Total including original charge", "मूल शुल्क सहित कुल")} · {money(quoteTotal / 100)}</Body>
      <Row>
        <Button label={t("Send quote for approval", "मंज़ूरी के लिए कोटेशन भेजें")} disabled={locked || !quoteValid} onPress={async () => {
          if (await send("quote-send", { version: latest?.version ?? 0, items: amounts, materials, minutes: Number(minutes), exclusions, creditPaise })) {
            setComposing(false);
            setItems([{ label: "", amount: "" }]);
            setCredit("");
            setExclusions("");
          }
        }} />
        <Button secondary label={t("Close form", "फ़ॉर्म बंद करें")} onPress={() => setComposing(false)} />
      </Row>
    </Section>}
    {(booking.quotes ?? []).length > (latest?.version === approved?.version ? 1 : approved ? 2 : 1)
      && <Button compact secondary label={history ? t("Hide older quotes", "पुराने कोटेशन छिपाएँ") : t("Show older quotes", "पुराने कोटेशन देखें")}
        onPress={() => setHistory(!history)} />}
    {history && booking.quotes?.filter((quote) => quote.version !== latest?.version && quote.version !== approved?.version)
      .map((quote) => <QuoteSummary key={quote.version} quote={quote} base={base} />)}
  </Panel>;
}
