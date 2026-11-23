import { useState } from "react";
import { useRouter } from "expo-router";
import type { HelpCase } from "./api";
import type { BookingControls } from "./agreement-controls";
import { appointmentDays } from "./appointments";
import { useCopy } from "./language";
import { BlockProvider } from "./provider-actions";
import { useSession } from "./session";
import { Body, Button, Field, Heading, Panel, Row, Section, Tag } from "./ui";
import { BookingSafetyReport } from "./worker-safety";

export function VisitControls({ booking, role, locked, send }: BookingControls) {
  const copy = useCopy();
  const { t } = copy;
  const { snapshot } = useSession();
  const [changing, setChanging] = useState(false);
  const [day, setDay] = useState(booking.appointment.slice(0, 10));
  const [clock, setClock] = useState(booking.appointment.slice(11));
  const [minutes, setMinutes] = useState(String(booking.duration ?? 60));
  const [reason, setReason] = useState("");
  const [arrival, setArrival] = useState("");
  const proposal = booking.reschedule;
  const now = snapshot?.serverTime ?? Date.now();
  const canReschedule = booking.appointment && ["accepted", "en_route", "arrived"].includes(booking.status);
  const canReportDelay = role === "pro" && ["accepted", "en_route"].includes(booking.status);
  const canSeeDelay = booking.delay && ["accepted", "en_route"].includes(booking.status);
  const proposalPending = proposal?.status === "pending" && proposal.expires > now && canReschedule;
  const canRespond = proposalPending && proposal?.role !== role;
  if (!canReschedule && !canReportDelay && !canSeeDelay && !proposal && !booking.cancellation) return null;
  const dates = appointmentDays(now, { days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00", buffer: 0 });
  return <Panel>
    <Heading size="small">{t("Appointment updates", "विज़िट की जानकारी")}</Heading>
    {booking.cancellation && <Body>{booking.cancellation.role === "pro" ? t("Cancelled by worker", "काम करने वाले ने रद्द किया")
      : t("Cancelled by customer", "ग्राहक ने रद्द किया")}{booking.cancellation.reason ? " · " + booking.cancellation.reason : ""}</Body>}
    {canSeeDelay && booking.delay && <Section>
      <Body strong>{t("Worker’s arrival estimate", "काम करने वाले के पहुँचने का अनुमान")} · {booking.delay.minutes} {t("min", "मिनट")}</Body>
      <Body small>{copy.dateTime(booking.delay.at)}{now > booking.delay.at + booking.delay.minutes * 60_000 ? " · " + t("Estimate has passed", "अनुमान का समय बीत गया") : ""}</Body>
    </Section>}
    {canReportDelay && <Row>
      <Field label={t("Minutes until arrival", "पहुँचने तक मिनट")} value={arrival} onChangeText={(value) => setArrival(value.replace(/\D/g, ""))}
        keyboardType="number-pad" maxLength={3} />
      <Button compact secondary disabled={locked || Number(arrival) < 1 || Number(arrival) > 240}
        label={t("Send arrival estimate", "पहुँचने का अनुमान भेजें")}
        onPress={async () => { if (await send("report-delay", { minutes: Number(arrival) })) setArrival(""); }} />
    </Row>}
    {proposal && <Section>
      <Tag>{proposalPending ? t("Time proposed", "समय प्रस्तावित") : proposal.status === "accepted" ? t("New time confirmed", "नया समय पक्का")
        : proposal.status === "rejected" ? t("Proposal declined", "प्रस्ताव अस्वीकार") : t("Proposal closed", "प्रस्ताव बंद")}</Tag>
      <Body>{copy.appointment(proposal.appointment)} · {proposal.minutes} {t("min", "मिनट")}</Body>
      <Body small>{proposal.reason}</Body>
      {proposalPending && <Body small>{t("Your current appointment stays confirmed until both sides agree.", "दोनों की सहमति तक मौजूदा विज़िट पक्की रहेगी।")}</Body>}
      {canRespond && <Row>
        <Button disabled={locked} label={t("Accept new time", "नया समय स्वीकार करें")} onPress={() => void send("reschedule-respond", { version: proposal.version, decision: "accepted" })} />
        <Button secondary disabled={locked} label={t("Decline new time", "नया समय अस्वीकार करें")} onPress={() => void send("reschedule-respond", { version: proposal.version, decision: "rejected" })} />
      </Row>}
    </Section>}
    {!!canReschedule && !changing && <Button secondary disabled={locked} label={t("Propose a new time", "नया समय सुझाएँ")} onPress={() => setChanging(true)} />}
    {!!canReschedule && changing && <Section>
      <Body strong>{t("Pick a new date (IST)", "नई तारीख चुनें (IST)")}</Body>
      <Row>{dates.map((date) => <Button compact secondary selected={date === day} key={date}
        label={copy.intl({ dateStyle: "medium", timeZone: "UTC" }).format(new Date(date + "T00:00Z"))} onPress={() => setDay(date)} />)}</Row>
      <Field label={t("Start time (HH:MM)", "समय (HH:MM)")} value={clock} onChangeText={setClock} maxLength={5} />
      <Field label={t("Duration in minutes", "अवधि मिनटों में")} value={minutes} onChangeText={(value) => setMinutes(value.replace(/\D/g, ""))} maxLength={3} keyboardType="number-pad" />
      <Field label={t("Reason", "कारण")} value={reason} onChangeText={setReason} maxLength={180} />
      <Row>
        <Button label={t("Send proposal", "प्रस्ताव भेजें")} disabled={locked || !dates.includes(day) || !/^\d\d:\d\d$/.test(clock)
          || !reason.trim() || Number(minutes) < 15 || Number(minutes) > 720} onPress={async () => {
          if (await send("reschedule-propose", { appointment: day + "T" + clock, minutes: Number(minutes), reason, version: proposal?.version ?? 0 })) {
            setChanging(false);
            setReason("");
          }
        }} />
        <Button secondary label={t("Close form", "फ़ॉर्म बंद करें")} onPress={() => setChanging(false)} />
      </Row>
    </Section>}
  </Panel>;
}

export function BookingReport({ booking, role, locked, send }: BookingControls) {
  const router = useRouter();
  const { t, dateTime } = useCopy();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<HelpCase["category"] | "safety" | "">("");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [reply, setReply] = useState("");
  const categories = {
    late: t("Late or no-show", "देर हुई या नहीं आए"),
    scope: t("Work or price", "काम या कीमत"),
    payment: t("Payment", "भुगतान"),
    incomplete: t("Incomplete work", "अधूरा काम"),
  };
  function resetChoice() {
    setCategory("");
    setMessage("");
    setReply("");
    setReplyTo("");
  }

  return <Section>
    {booking.interrupted && <Body strong notice>{t("Work paused. This booking holds the worker’s calendar until both sides resolve the issue.", "काम रुका है। समस्या हल होने तक यह समय बुक रहेगा।")}</Body>}
    <Row><Button compact secondary tone="danger" mark="⚑" expanded={open} label={t("Report", "शिकायत करें")} onPress={() => { setOpen(!open); resetChoice(); }} /></Row>
    {open && <Panel>
    <Heading size="small">{category === "safety" ? t("Safety concern", "सुरक्षा से जुड़ी शिकायत")
      : category ? categories[category] : t("What would you like to report?", "आप किस बारे में शिकायत करना चाहते हैं?")}</Heading>
    {!category && <>
      <Row>{(Object.keys(categories) as HelpCase["category"][]).map((value) => <Button key={value} compact secondary
        label={categories[value]} onPress={() => setCategory(value)} />)}
        <Button compact secondary label={t("Safety concern", "सुरक्षा से जुड़ी शिकायत")} onPress={() => setCategory("safety")} />
      </Row>
      <Button secondary tone="info" label={t("Contact Customer Support", "ग्राहक सहायता से संपर्क करें")}
        onPress={() => router.push({ pathname: "/support", params: { job: booking.id } })} />
      {role === "customer" && <BlockProvider worker={booking.proId} />}
    </>}
    {category === "safety" && <BookingSafetyReport booking={booking} role={role} locked={locked} send={send} />}
    {!!category && category !== "safety" && <Section>
      <Body small>{t("This issue will be shared with both booking participants.", "यह समस्या बुकिंग के दोनों लोगों को दिखेगी।")}</Body>
      <Field label={t("What happened?", "क्या हुआ?")} value={message} onChangeText={setMessage} maxLength={280} multiline editable={!locked} />
      <Button danger disabled={locked || !message.trim()} label={t("Submit report", "शिकायत भेजें")} onPress={async () => {
        if (await send("help-create", { category, message })) resetChoice();
      }} />
    </Section>}
    {category ? <Button secondary label={t("Back to report options", "शिकायत के विकल्पों पर वापस जाएँ")} onPress={resetChoice} />
      : !!booking.helpCases?.length && <Heading size="small">{t("Booking reports", "बुकिंग की शिकायतें")}</Heading>}
    {!category && booking.helpCases?.map((item) => <Section key={item.id}>
      <Row><Body strong>{categories[item.category]}</Body><Tag tone={item.status === "open" ? "warning" : "success"}>{item.status === "open" ? t("Open", "खुला") : t("Resolved", "हल हुआ")}</Tag></Row>
      <Body>{item.message}</Body>
      <Body small>{dateTime(item.at)}</Body>
      {item.notes?.map((note, index) => <Body small key={index}>{note.role === "pro" ? t("Worker", "काम करने वाले") : t("Customer", "ग्राहक")} · {note.message}</Body>)}
      {item.endProposedBy && item.status === "open" && <Body small>{t("Ending this unfinished visit has been proposed.", "यह अधूरी विज़िट बंद करने का प्रस्ताव है।")}</Body>}
      {item.status === "open" && (replyTo === item.id ? <Section>
        <Field label={t("Add a note or describe the resolution", "जानकारी या समाधान लिखें")} value={reply} onChangeText={setReply} maxLength={280} multiline />
        <Row>
          <Button compact secondary disabled={locked || !reply.trim()} label={t("Add note", "जानकारी जोड़ें")} onPress={() => void respond("note")} />
          {(item.endProposedBy ?? item.role) !== role && <Button compact disabled={locked || !reply.trim()}
            label={item.endProposedBy ? t("Agree to end visit", "विज़िट बंद करने पर सहमति दें") : t("Resolve issue", "समस्या हल करें")} onPress={() => void respond("resolve")} />}
          {booking.interrupted && item.category === "incomplete" && !item.endProposedBy && <Button compact secondary disabled={locked || !reply.trim()}
            label={t("Propose ending visit", "विज़िट बंद करने का प्रस्ताव दें")} onPress={() => void respond("end")} />}
        </Row>
      </Section> : <Button compact secondary disabled={locked} label={t("Respond", "जवाब दें")} onPress={() => { setReplyTo(item.id); setReply(""); }} />)}
    </Section>)}
    </Panel>}
  </Section>;

  async function respond(decision: "note" | "resolve" | "end") {
    if (await send("help-respond", { entry: replyTo, decision, message: reply })) {
      setReply("");
      setReplyTo("");
    }
  }
}
