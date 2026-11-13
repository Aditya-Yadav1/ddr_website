import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { Booking, Role } from "../../src/api";
import { useBookingAction } from "../../src/booking-action";
import { BookingChat } from "../../src/booking-chat";
import { useCopy } from "../../src/language";
import { useSession } from "../../src/session";
import { PlusBenefits } from "../../src/service-options";
import { activeStatuses, Body, Button, Feedback, Field, Guide, Heading, Page, Panel, PriceNote, Section, Tag, TierPrice } from "../../src/ui";

export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { snapshot, error: connectionError } = useSession();
  const copy = useCopy();
  const { t } = copy;
  const command = useBookingAction();
  const booking = snapshot?.state.requests.find((item) => item.id === id);
  const [confirm, setConfirm] = useState("");
  const [estimate, setEstimate] = useState("");
  if (!booking || !snapshot) return <Page><Heading>{t("Booking unavailable", "बुकिंग उपलब्ध नहीं है")}</Heading><Feedback error={connectionError} /></Page>;
  const worker = snapshot.state.account.id === booking.proId;
  const role: Role = worker ? "pro" : "customer";
  const job = booking.id;
  const canChat = activeStatuses.includes(booking.status);
  const canCancel = !worker && canChat && booking.status !== "in_progress";
  const canEstimate = worker && ["pending", "accepted"].includes(booking.status);
  const provider = snapshot.state.profiles.find((person) => person.id === booking.proId);
  const actions: Partial<Record<Booking["status"], { change: string; label: string }[]>> = {
    pending: [{ change: "accept", label: t("Accept request", "अनुरोध स्वीकार करें") }, { change: "decline", label: t("Decline request", "अनुरोध अस्वीकार करें") }],
    accepted: [{ change: "depart", label: t("On my way", "मैं रास्ते में हूँ") }, { change: "arrive", label: t("Mark arrival", "पहुँचने की सूचना दें") }],
    en_route: [{ change: "arrive", label: t("Mark arrival", "पहुँचने की सूचना दें") }],
    arrived: [{ change: "start", label: t("Start work", "काम शुरू करें") }],
    in_progress: [{ change: "complete", label: t("Complete job", "काम पूरा करें") }],
  };
  const transitions = worker ? actions[booking.status] || [] : canCancel ? [{ change: "cancel", label: t("Cancel booking", "बुकिंग रद्द करें") }] : [];
  const guidance: Partial<Record<Booking["status"], string>> = {
    pending: worker ? t("A new request for you. Check the details before you accept.", "आपके लिए नया अनुरोध है। स्वीकार करने से पहले जानकारी देख लें।")
      : t("Your request is with the worker. I’ll show their response here.", "आपका अनुरोध काम करने वाले के पास है। उनका जवाब यहीं दिखेगा।"),
    accepted: t("The visit is confirmed. You can use messages below to coordinate.", "विज़िट पक्की हो गई है। नीचे संदेशों में बात तय कर सकते हैं।"),
    en_route: worker ? t("On your way? Let the customer know when you arrive.", "रास्ते में हैं? पहुँचने पर ग्राहक को बता दें।")
      : t("Your worker is on the way. Their next update will appear here.", "काम करने वाला रास्ते में है। अगली जानकारी यहीं दिखेगी।"),
    arrived: t("The worker has arrived. Confirm the work and charges together before starting.", "काम करने वाला पहुँच गया है। शुरू करने से पहले काम और कीमत मिलकर तय करें।"),
    completed: t("All done. Your visit details and messages are saved here.", "काम पूरा हो गया। विज़िट की जानकारी और संदेश यहीं सुरक्षित हैं।"),
  };
  const [pendingChange, pendingLabel] = confirm.split("|");
  async function transition(change: string, label: string) {
    setConfirm(change + "|" + label);
    const result = await command.send("transition", { job, role, change });
    if (result) setConfirm("");
  }
  return <Page>
    <Heading>{copy.task(booking.service, booking.scope)}</Heading>
    <Feedback error={connectionError} />
    {guidance[booking.status] && <Guide>{guidance[booking.status]}</Guide>}
    <Panel tint="green">
      <Tag>{copy.status(booking.status)}</Tag>
      <Body strong>{worker ? copy.area(booking.area) : booking.proName + " · " + copy.area(booking.area)}</Body>
      <Body>{copy.appointment(booking.appointment, booking.timing)}</Body>
      <TierPrice price={booking.price} unit={booking.unit} tier={booking.tier} minimumQuantity={booking.minimumQuantity} />
      {!!booking.includes && <PlusBenefits includes={booking.includes} includesHi={booking.includesHi} />}
      <PriceNote unit={booking.unit} />
      <Body small>{t("Estimated duration", "अनुमानित अवधि")} · {booking.duration ?? (booking.unit === "hourly" ? 120 : 60)} {t("min", "मिनट")}</Body>
      {booking.status === "pending" && <Body small>{t("Response due by", "जवाब देने की समय सीमा")} · {copy.dateTime(booking.deadline)}</Body>}
    </Panel>
    {booking.details ? <Panel>
      <Heading size="small">{t("Visit details", "विज़िट की जानकारी")}</Heading>
      <Body strong>{booking.details.customerName}</Body>
      <Body>{booking.details.address}</Body>
      {!!booking.details.landmark && <Body>{t("Landmark", "पहचान की जगह")} · {booking.details.landmark}</Body>}
      {!!booking.details.notes && <Body>{booking.details.notes}</Body>}
    </Panel> : worker && booking.status === "pending" && <Body small>
      {t("The customer’s address will be available once you accept.", "स्वीकार करने के बाद ग्राहक का पता दिखेगा।")}
    </Body>}
    {(Boolean(transitions.length) || command.error || command.uncertain) ? <Section>
      <Feedback error={command.error} />
      {command.uncertain && pendingChange && <Button label={t("Retry", "फिर कोशिश करें") + " · " + pendingLabel}
        disabled={command.busy} onPress={() => void transition(pendingChange, pendingLabel)} />}
      {confirm && (pendingChange === "cancel" || pendingChange === "decline") && !command.uncertain && !command.busy
        && transitions.some(({ change }) => change === pendingChange) ? <Panel tint="warm">
          <Body strong>{pendingChange === "cancel" ? t("Cancel this booking?", "यह बुकिंग रद्द करें?") : t("Decline this request?", "यह अनुरोध अस्वीकार करें?")}</Body>
          <Button danger label={t("Confirm", "पुष्टि करें") + " · " + pendingLabel} onPress={() => void transition(pendingChange, pendingLabel)} />
          <Button secondary label={t("Go back", "वापस जाएँ")} onPress={() => setConfirm("")} />
        </Panel> : transitions.map(({ change, label }) => {
          const destructive = change === "cancel" || change === "decline";
          return <Button key={change} label={label} secondary={destructive} danger={destructive}
            disabled={command.busy || command.uncertain} onPress={() => {
              if (destructive) setConfirm(change + "|" + label);
              else void transition(change, label);
            }} />;
        })}
    </Section> : null}
    {canEstimate && <Panel>
      <Heading size="small">{t("Job duration", "काम की अवधि")}</Heading>
      <Field label={t("Estimated minutes", "अनुमानित मिनट")} placeholder={String(booking.duration)} value={estimate}
        onChangeText={(value) => setEstimate(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={3}
        editable={!command.busy && !command.uncertain} />
      <Button secondary label={t("Save estimate", "अनुमान सेव करें")} disabled={command.busy || command.uncertain || Number(estimate) < 15 || Number(estimate) > 720}
        onPress={async () => {
          setConfirm("");
          if (await command.send("estimate", { job, role, minutes: Number(estimate) })) setEstimate("");
        }} />
      {command.uncertain && !confirm && <Button label={t("Retry estimate", "अनुमान फिर भेजें")} disabled={command.busy}
        onPress={async () => { if (await command.send("estimate", { job, role, minutes: Number(estimate) })) setEstimate(""); }} />}
    </Panel>}
    {(!worker && provider && !canChat) && <Button label={t("Request another visit", "एक और विज़िट का अनुरोध करें")}
      onPress={() => router.push({ pathname: "/request/[id]", params: { id: provider.id, area: booking.area, scope: booking.scope, tier: booking.tier } })} />}
    <BookingChat key={booking.id + role} booking={booking} role={role} />
  </Page>;
}
