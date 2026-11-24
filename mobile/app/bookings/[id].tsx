import { balance, canReview } from "../../shared/booking-agreements";
import { BookingSafety } from "../../src/worker-safety";
import { VisitProgress, VisitTracking } from "../../src/visit-tracking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { Booking, BookingCommand, Payload, Role } from "../../src/api";
import { AgreementControls, type BookingControls } from "../../src/agreement-controls";
import { useBookingAction } from "../../src/booking-action";
import { BookingChat } from "../../src/booking-chat";
import { useCopy } from "../../src/language";
import { paymentBalance, PaymentControls } from "../../src/payment-controls";
import { useSession } from "../../src/session";
import { PlusBenefits } from "../../src/service-options";
import { earnings, PilotPrice } from "../../src/pilot-pricing";
import { BookingReport, VisitControls } from "../../src/visit-controls";
import { SaveWorker } from "../../src/saved-workers";
import { activeStatuses, Body, BookingStatus, Button, Feedback, Field, Guide, Heading, Page, Panel, PriceNote, Row, Section, Tag, TierPrice } from "../../src/ui";

function DemoVisit({ booking, locked, send }: BookingControls) {
  const { t } = useCopy();
  const steps: Partial<Record<Booking["status"], { change: string; label: string }>> = {
    pending: { change: "accept", label: t("Simulate worker acceptance", "डेमो अनुरोध स्वीकार करें") },
    accepted: { change: "arrive", label: t("Simulate worker arrival", "डेमो आगमन दर्ज करें") },
    arrived: booking.maxPrice !== undefined && !booking.activeQuote
      ? booking.quotes?.at(-1)?.status === "sent" ? undefined : { change: "quote", label: t("Get demo quote", "डेमो कोटेशन लें") }
      : booking.unit === "visit" && !booking.activeQuote
      ? { change: "diagnostic-only", label: t("Complete demo diagnostic visit", "डेमो जाँच पूरी करें") }
      : { change: "start", label: t("Start demo work", "डेमो काम शुरू करें") },
    in_progress: booking.interrupted ? undefined : { change: "complete", label: t("Complete demo work", "डेमो काम पूरा करें") },
  };
  const step = steps[booking.status === "en_route" ? "accepted" : booking.status];
  if (!step) return null;
  const needsConfirmation = booking.status === "arrived" && booking.safetyVersion && !booking.arrivalConfirmedAt;
  return <Panel tone="warning">
    <Heading size="small">{t("Demo visit", "डेमो विज़िट")}</Heading>
    <Body small>{t("Use these steps to try the booking with a fictional worker.", "इन चरणों से काल्पनिक काम करने वाले के साथ बुकिंग आज़माएँ।")}</Body>
    {needsConfirmation
      ? <Button disabled={locked} label={t("Confirm demo arrival", "डेमो आगमन की पुष्टि करें")}
        onPress={() => void send("arrival-confirm", { confirmed: true })} />
      : <Button disabled={locked} label={step.label} onPress={() => void send("demo-worker-step", { change: step.change })} />}
    {!needsConfirmation && booking.status === "arrived" && booking.quotes?.at(-1)?.status !== "sent" && !booking.activeQuote && <>
      {!!booking.pilot?.repairPrice && <Button secondary disabled={locked} label={t("Get demo repair quote", "डेमो मरम्मत कोटेशन लें")} onPress={() => void send("demo-worker-step", { change: "quote" })} />}
      {booking.pilot?.quantity === 2 && <Button secondary disabled={locked} label={t("Simulate one tap only", "केवल एक नल का डेमो")} onPress={() => void send("demo-worker-step", { change: "one-tap" })} />}
    </>}
  </Panel>;
}

export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { snapshot, error: connectionError } = useSession();
  const copy = useCopy();
  const { t } = copy;
  const command = useBookingAction(id);
  const booking = snapshot?.state.requests.find((item) => item.id === id);
  const [confirm, setConfirm] = useState("");
  const [estimate, setEstimate] = useState("");
  const [reason, setReason] = useState("");
  if (!booking || !snapshot) return <Page><Heading>{t("Booking unavailable", "बुकिंग उपलब्ध नहीं है")}</Heading><Feedback error={connectionError} /></Page>;
  const worker = snapshot.state.account.id === booking.proId;
  const role: Role = worker ? "pro" : "customer";
  const job = booking.id;
  const canChat = activeStatuses.includes(booking.status);
  const canCancel = canChat && booking.status !== "in_progress" && (!worker || booking.status !== "pending");
  const canEstimate = worker && !booking.agreementVersion && ["pending", "accepted"].includes(booking.status);
  const needsRepairApproval = booking.agreementVersion && (booking.maxPrice !== undefined || booking.unit === "visit") && !booking.activeQuote;
  const provider = snapshot.state.profiles.find((person) => person.id === booking.proId);
  const reviewed = snapshot.state.reviewed?.includes(job);
  const paid = canReview(booking);
  const { due, reported } = paymentBalance(booking);
  const payout = booking.pilot && earnings(booking, balance(booking).receivedPaise);
  const actions: Partial<Record<Booking["status"], { change: string; label: string }[]>> = {
    pending: [{ change: "accept", label: t("Accept request", "अनुरोध स्वीकार करें") }, { change: "decline", label: t("Decline request", "अनुरोध अस्वीकार करें") }],
    accepted: [{ change: "depart", label: t("On my way", "मैं रास्ते में हूँ") }, { change: "arrive", label: t("Mark arrival", "पहुँचने की सूचना दें") }],
    en_route: [{ change: "arrive", label: t("Mark arrival", "पहुँचने की सूचना दें") }],
    arrived: needsRepairApproval && booking.maxPrice !== undefined ? [] : needsRepairApproval ? [{ change: "diagnostic-only", label: t("Close as diagnostic only", "केवल जाँच के रूप में पूरा करें") }]
      : [{ change: "start", label: t("Start work", "काम शुरू करें") }],
    in_progress: booking.interrupted ? [] : [{ change: "complete", label: t("Complete job", "काम पूरा करें") }],
  };
  const transitions = [...(worker ? actions[booking.status] || [] : []),
    ...(canCancel ? [{ change: "cancel", label: t("Cancel booking", "बुकिंग रद्द करें") }] : [])];
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
  const controls = {
    booking, role, locked: command.busy || command.uncertain,
    send: (action: BookingCommand, body: Payload) => command.send(action, { ...body, job, role }),
  };
  async function transition(change: string, label: string) {
    setConfirm(change + "|" + label);
    const result = await command.send("transition", { job, role, change, ...(change === "cancel" && worker && { reason }) });
    if (result) { setConfirm(""); setReason(""); }
  }
  return <Page>
    <Heading>{copy.task(booking.service, booking.scope)}</Heading>
    <Feedback error={connectionError} />
    <Feedback error={command.error} />
    {command.uncertain && <Panel tone="warning">
      <Body>{t("Check whether your last update reached ASAAN.", "जाँचें कि पिछला अपडेट ASAAN तक पहुँचा या नहीं।")}</Body>
      <Button disabled={command.busy} label={t("Retry last update", "पिछला अपडेट फिर भेजें")} onPress={async () => {
        if (await command.retry()) setConfirm("");
      }} />
    </Panel>}
    {guidance[booking.status] && <Guide tone={booking.status === "pending" ? "warning" : booking.status === "accepted" || booking.status === "completed" ? "success" : "info"}>{guidance[booking.status]}</Guide>}
    <Panel>
      <BookingStatus status={booking.status} />
      <VisitProgress status={booking.status} />
      <Body strong>{worker ? copy.area(booking.area) : booking.proName + " · " + copy.area(booking.area)}</Body>
      <Body>{copy.appointment(booking.appointment, booking.timing)}</Body>
      {booking.distanceKm !== undefined && <Body small>{t("Approx.", "लगभग")} {booking.distanceKm} {worker
        ? t("km from your work base", "किमी आपके कार्य आधार से") : t("km from the worker’s base", "किमी काम करने वाले के आधार से")}</Body>}
      {booking.pilot ? <>
        <PilotPrice offer={booking.pilot} />
        {booking.bill?.quantity && <Body>{t("Completed quantity", "पूरी मात्रा")} · {booking.bill.quantity}</Body>}
        {worker && payout && <Body strong>{t("Trial worker payout before expenses", "खर्च से पहले परीक्षण कमाई")} · {copy.money(payout.payout / 100)}</Body>}
      </> : <>
        <TierPrice price={booking.price} maxPrice={booking.maxPrice} legacy={booking.maxPrice === undefined} unit={booking.unit} tier={booking.tier} minimumQuantity={booking.minimumQuantity} />
        {!!booking.includes && <PlusBenefits includes={booking.includes} includesHi={booking.includesHi} />}
        {booking.maxPrice !== undefined && <PriceNote unit={booking.unit} />}
      </>}
      <Body small>{t("Estimated duration", "अनुमानित अवधि")} · {booking.duration ?? (booking.unit === "hourly" ? 120 : 60)} {t("min", "मिनट")}</Body>
      {booking.status === "pending" && <Body small>{t("Response due by", "जवाब देने की समय सीमा")} · {copy.dateTime(booking.deadline)}</Body>}
    </Panel>
    <VisitTracking key={booking.id + role + "-gps"} booking={booking} role={role} />
    {!booking.demoWorker && <BookingSafety key={booking.id + "-safety"} {...controls} />}
    {booking.demoWorker && <DemoVisit {...controls} />}
    {!worker && booking.status === "completed" && <Panel tone={paid ? "success" : "warning"}>
      <Heading size="small">{booking.bill
        ? paid ? t("Payment confirmed", "भुगतान की पुष्टि हुई") : t("Final bill", "अंतिम बिल")
        : t("Final bill unavailable", "अंतिम बिल उपलब्ध नहीं है")}</Heading>
      {!!booking.bill && !paid && <Body strong>{t("Amount due", "बकाया राशि")} · {copy.money(due / 100)}</Body>}
      {!!booking.bill && !paid && reported > 0 && <Body small>{t("Waiting for the worker to confirm your payment.", "काम करने वाले की भुगतान पुष्टि का इंतज़ार है।")}</Body>}
      {reviewed && <Tag tone="success" mark="✓">{t("Review submitted", "रेटिंग भेज दी गई")}</Tag>}
      <Row>
        {paid && !reviewed && <Button label={t("Leave a review", "रेटिंग दें")}
          onPress={() => router.push({ pathname: "/bookings/[id]/review", params: { id: job } })} />}
        {booking.bill && <Button secondary={paid} label={paid ? t("View receipt", "रसीद देखें") : t("Open payment", "भुगतान खोलें")}
          onPress={() => router.push({ pathname: "/bookings/[id]/payment", params: { id: job } })} />}
      </Row>
    </Panel>}
    <BookingReport key={job + "-report"} {...controls} />
    {!booking.demoWorker && needsRepairApproval && booking.status === "arrived" &&
      <Body notice>{t("Work can start after the customer approves a quote.", "ग्राहक के कोटेशन मंज़ूर करने के बाद काम शुरू हो सकती है।")}</Body>}
    <AgreementControls key={booking.id + "-agreement"} {...controls} />
    {booking.details ? <Panel>
      <Heading size="small">{t("Visit details", "विज़िट की जानकारी")}</Heading>
      <Body strong>{booking.details.customerName}</Body>
      <Body>{booking.details.address}</Body>
      {!!booking.pinCode && <Body>{t("PIN code", "पिन कोड")} {booking.pinCode}</Body>}
      {!!booking.details.landmark && <Body>{t("Landmark", "पहचान की जगह")} · {booking.details.landmark}</Body>}
      {!!booking.details.notes && <Body>{booking.details.notes}</Body>}
    </Panel> : worker && booking.status === "pending" && <Body small>
      {t("The customer’s address will be available once you accept.", "स्वीकार करने के बाद ग्राहक का पता दिखेगा।")}
    </Body>}
    {!!transitions.length && <Section>
      {confirm && ["cancel", "decline", "diagnostic-only"].includes(pendingChange) && !command.uncertain && !command.busy
        && transitions.some(({ change }) => change === pendingChange) ? <Panel tone="warning">
          <Body strong>{pendingChange === "cancel" ? t("Cancel this booking?", "यह बुकिंग रद्द करें?")
            : pendingChange === "decline" ? t("Decline this request?", "यह अनुरोध अस्वीकार करें?")
            : t("Close this visit with only the agreed diagnostic charge?", "केवल तय जाँच शुल्क के साथ विज़िट पूरी करें?")}</Body>
          {worker && pendingChange === "cancel" && <Field label={t("Reason for cancellation", "रद्द करने का कारण")} maxLength={180} value={reason} onChangeText={setReason} />}
          <Button danger={pendingChange !== "diagnostic-only"} label={t("Confirm", "पुष्टि करें") + " · " + pendingLabel}
            disabled={worker && pendingChange === "cancel" && !reason.trim()} onPress={() => void transition(pendingChange, pendingLabel)} />
          <Button secondary label={t("Go back", "वापस जाएँ")} onPress={() => setConfirm("")} />
        </Panel> : transitions.map(({ change, label }) => {
          const destructive = change === "cancel" || change === "decline";
          return <Button key={change} label={label} secondary={destructive} danger={destructive}
            disabled={command.busy || command.uncertain} onPress={() => {
              if (destructive || change === "diagnostic-only") setConfirm(change + "|" + label);
              else void transition(change, label);
            }} />;
        })}
    </Section>}
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
    </Panel>}
    <VisitControls key={booking.id + "-visit"} {...controls} />
    {worker && <PaymentControls key={booking.id + "-payment"} {...controls} />}
    {(!worker && provider && !canChat) && <Button secondary label={t("Request another visit", "एक और विज़िट का अनुरोध करें")}
      onPress={() => router.push({ pathname: "/providers/[id]", params: { id: provider.id, area: booking.area, pinCode: booking.pinCode, scope: booking.scope, tier: booking.tier } })} />}
    {!worker && provider && <SaveWorker worker={provider.id} />}
    <BookingChat key={booking.id + role} booking={booking} role={role} />
  </Page>;
}
