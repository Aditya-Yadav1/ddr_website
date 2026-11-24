import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { offlineDemo, type SupportTicket } from "../src/api";
import { useCopy } from "../src/language";
import { operationId } from "../src/operation-id";
import { useSession } from "../src/session";
import { Body, Button, Feedback, Field, Guide, Heading, Page, Panel, Row, Section, Tag } from "../src/ui";

export default function CustomerSupport() {
  const { job, topic } = useLocalSearchParams<{ job?: string; topic?: string }>();
  const router = useRouter();
  const { snapshot, token, changeProfile, error: connectionError } = useSession();
  const { t, task, dateTime } = useCopy();
  const project = topic === "project";
  const [category, setCategory] = useState<SupportTicket["category"] | "">(project ? "other" : topic === "payment" ? "payment" : job ? "booking" : "");
  const [projectPin, setProjectPin] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [sent, setSent] = useState(false);
  const sending = useRef(false);
  const submission = useRef<{ id: string; signature: string } | null>(null);
  const booking = snapshot?.state.requests.find((item) => item.id === job);
  const tickets = snapshot?.state.supportTickets ?? [];
  const topics = {
    booking: t("Booking", "बुकिंग"),
    payment: t("Payment", "भुगतान"),
    account: t("Account", "खाता"),
    other: t("Something else", "कुछ और"),
  };

  async function submit() {
    if (sending.current || !category || message.trim().length < 10) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    setSent(false);
    const fields = { category, job: booking?.id, message: project
      ? ["Project estimate inquiry", "PIN " + projectPin, "Dimensions " + dimensions.trim(), "Timeline " + timeline.trim(), message.trim()].join("\n")
      : message.trim() };
    const signature = JSON.stringify(fields);
    try {
      if (submission.current?.signature !== signature) submission.current = { id: operationId(), signature };
      await changeProfile("support-create", { id: submission.current.id, ...fields });
      submission.current = null;
      setMessage("");
      setSent(true);
    } catch (failure) { setError(failure); }
    finally { sending.current = false; setBusy(false); }
  }

  return <Page>
    <Heading>{project ? t("Request a project estimate", "काम का अनुमान माँगें") : t("Customer Support", "ग्राहक सहायता")}</Heading>
    <Feedback error={connectionError} />
    <Panel tone="info">
      <Heading size="small">{project ? t("Tell us about the work", "काम के बारे में बताएं") : t("Send us a message", "हमें संदेश भेजें")}</Heading>
      {project && <Body>{t("HandyHive reviews your brief and replies here with next steps and any survey fee.", "HandyHive आपका विवरण पढ़कर आगे के कदम और सर्वे शुल्क की जानकारी यहाँ देगा।")}</Body>}
      {offlineDemo ? <Body small>{t("Offline demo requests are saved on this device.", "ऑफ़लाइन डेमो के अनुरोध इस डिवाइस पर सहेजे जाते हैं।")}</Body>
        : <Body small>{t("Send a private request and check this page for a reply.", "निजी अनुरोध भेजें और जवाब के लिए यह पेज देखें।")}</Body>}
      {token ? <>
        {booking && <Tag>{task(booking.service, booking.scope)}</Tag>}
        {project ? <>
          <Field label={t("Project PIN code", "काम का पिन कोड")} value={projectPin} maxLength={6} keyboardType="number-pad" onChangeText={setProjectPin} />
          <Field label={t("Approximate dimensions", "अनुमानित माप")} value={dimensions} maxLength={100} onChangeText={setDimensions} />
          <Field label={t("Preferred timeline", "पसंदीदा समय-सीमा")} value={timeline} maxLength={100} onChangeText={setTimeline} />
        </> : <><Body strong>{t("Choose a topic", "विषय चुनें")}</Body>
        <Row>{(Object.keys(topics) as SupportTicket["category"][]).map((value) => <Button key={value} secondary compact
          label={topics[value]} selected={category === value} disabled={busy} onPress={() => setCategory(value)} />)}</Row></>}
        <Field label={project ? t("Scope, materials and exclusions", "काम, सामान और क्या शामिल नहीं है") : t("How can we help?", "हम कैसे मदद कर सकते हैं?")} multiline maxLength={project ? 700 : 1000} value={message}
          onChangeText={(value) => { setMessage(value); setSent(false); }} editable={!busy} />
        <Button label={project ? t("Send project brief", "काम का विवरण भेजें") : t("Send support request", "सहायता अनुरोध भेजें")} disabled={busy || !category || message.trim().length < 10
          || (project && (!/^[1-9]\d{5}$/.test(projectPin) || !dimensions.trim() || !timeline.trim()))}
          onPress={() => void submit()} />
        <Feedback error={error} />
        {sent && <Guide tone="success">{t("Support request submitted.", "सहायता अनुरोध भेज दिया गया।")}</Guide>}
      </> : <Button label={t("Sign in to contact support", "सहायता से संपर्क करने के लिए साइन इन करें")}
        onPress={() => router.push({ pathname: "/sign-in", params: { support: "1", job, topic } })} />}
    </Panel>
    {!!tickets.length && <Section>
      <Heading size="medium">{t("Your support requests", "आपके सहायता अनुरोध")}</Heading>
      {tickets.map((ticket) => <Panel key={ticket.id}>
        <Row><Heading size="small">{topics[ticket.category]}</Heading>
          <Tag tone={ticket.status === "open" ? "warning" : "success"}>{ticket.status === "open" ? t("Awaiting response", "जवाब का इंतज़ार") : t("Resolved", "हल हुआ")}</Tag></Row>
        <Body small>{dateTime(ticket.created)}</Body>
        <Body>{ticket.message}</Body>
        {!!ticket.response && <Section>
          <Body strong>{t("Reply from Customer Support", "ग्राहक सहायता का जवाब")}</Body>
          <Body>{ticket.response}</Body>
        </Section>}
        {ticket.job && <Button secondary compact label={t("View booking", "बुकिंग देखें")}
          onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: ticket.job } })} />}
      </Panel>)}
    </Section>}
  </Page>;
}
