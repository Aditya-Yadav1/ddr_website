import { useState } from "react";
import type { Booking, Payment } from "./api";
import { balance } from "../shared/booking-agreements";
import { toPaise, type BookingControls } from "./agreement-controls";
import { useCopy } from "./language";
import { useSession } from "./session";
import { OnlineCheckout } from "./online-checkout";
import { Body, Button, Field, Heading, Panel, Row, Section, Tag } from "./ui";

export function paymentBalance(booking: Booking) {
  const { receivedPaise: confirmed, outstandingPaise: due } = balance(booking);
  const reported = (booking.payments ?? []).filter((entry) => entry.status === "reported").reduce((sum, entry) => sum + entry.amountPaise, 0);
  return { confirmed, reported, due };
}

export function PaymentControls({ booking, role, locked, send }: BookingControls) {
  const { t, money, dateTime } = useCopy();
  const { snapshot } = useSession();
  const worker = role === "pro";
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Exclude<Payment["method"], "online">>("upi");
  const [reversing, setReversing] = useState("");
  const [reason, setReason] = useState("");
  if (!booking.bill) return null;
  const { confirmed, reported, due } = paymentBalance(booking);
  const availableToReport = due - reported;
  const methods = { cash: t("Cash", "नकद"), upi: "UPI", other: t("Other", "अन्य") };
  const states = {
    reported: t("Payment reported", "भुगतान की सूचना"),
    confirmed: t("Receipt confirmed by worker", "काम करने वाले ने रसीद की पुष्टि की"),
    disputed: t("Disputed", "विवादित"),
    reversed: t("Receipt reversed", "रसीद वापस ली गई"),
  };
  return <Panel>
    <Heading size="small">{t("Bill and payment", "बिल और भुगतान")}</Heading>
    <Body>{t("Final bill", "अंतिम बिल")} · {money(booking.bill.totalPaise / 100)}</Body>
    <Body>{t("Confirmed receipts", "पुष्टि की गई रसीदें")} · {money(confirmed / 100)}</Body>
    <Body strong>{t("Outstanding", "बकाया")} · {money(due / 100)}</Body>
    {due > 0 && <Body small>{t("Cash and direct UPI payments are confirmed by the worker.", "नकद और सीधे UPI भुगतान की पुष्टि काम करने वाला करता है।")}</Body>}
    {due === 0 && <Tag tone="success" mark="✓">{t("Paid in full", "पूरा भुगतान हुआ")}</Tag>}
    <OnlineCheckout booking={booking} amount={reported ? 0 : due} worker={worker} />
    {booking.payments?.map((entry) => <Section key={entry.id}>
      <Row><Tag tone={entry.status === "confirmed" ? "success" : entry.status === "reported" ? "warning" : entry.status === "disputed" ? "danger" : "neutral"}
        mark={entry.status === "confirmed" ? "✓" : undefined}>{entry.source ? t("Test payment confirmed", "परीक्षण भुगतान की पुष्टि हुई") : states[entry.status]}</Tag><Body strong>{money(entry.amountPaise / 100)}</Body></Row>
      <Body small>{entry.method === "online" ? t("Online test payment", "ऑनलाइन परीक्षण भुगतान") : methods[entry.method]} · {dateTime(entry.at)}
        {entry.source ? " · " + entry.id : " · " + (entry.reportedBy === "pro" ? t("Worker entry", "काम करने वाले ने दर्ज किया") : t("Customer entry", "ग्राहक ने दर्ज किया"))}</Body>
      {!!entry.reversalReason && <Body small>{entry.reversalReason}</Body>}
      {worker && entry.status === "reported" && <Row>
        <Button compact disabled={locked} label={t("Confirm receipt", "रसीद की पुष्टि करें")}
          onPress={() => void send("payment-confirm", { entry: entry.id, decision: "confirmed" })} />
        <Button compact secondary disabled={locked} label={t("Dispute report", "रिपोर्ट पर आपत्ति करें")}
          onPress={() => void send("payment-confirm", { entry: entry.id, decision: "disputed" })} />
      </Row>}
      {worker && !entry.source && entry.status === "confirmed" && (reversing === entry.id ? <Section>
        <Field label={t("Reason for correction", "सुधार का कारण")} value={reason} onChangeText={setReason} maxLength={180} />
        <Row><Button danger disabled={locked || !reason.trim()} label={t("Reverse receipt", "रसीद वापस लें")} onPress={async () => {
          if (await send("payment-reverse", { entry: entry.id, reason })) { setReversing(""); setReason(""); }
        }} /><Button secondary label={t("Go back", "वापस जाएँ")} onPress={() => setReversing("")} /></Row>
      </Section> : <Button compact secondary disabled={locked} label={t("Correct receipt", "रसीद सुधारें")} onPress={() => setReversing(entry.id)} />)}
    </Section>)}
    {!booking.checkout && availableToReport > 0 && <Section>
      <Field label={t("Amount (₹)", "राशि (₹)")} value={amount} onChangeText={setAmount} maxLength={10} keyboardType="decimal-pad" />
      <Row>{(Object.keys(methods) as (keyof typeof methods)[]).map((value) => <Button key={value} compact secondary selected={method === value}
        label={methods[value]} onPress={() => setMethod(value)} />)}</Row>
      <Button secondary={Boolean(!worker && !reported && snapshot?.state.onlinePaymentMode && !booking.checkout && due >= 100)}
        disabled={locked || !(toPaise(amount) > 0 && toPaise(amount) <= availableToReport)}
        label={worker ? t("Record money received", "मिली राशि दर्ज करें") : t("Record cash or UPI payment", "नकद या UPI भुगतान दर्ज करें")}
        onPress={async () => {
          if (await send("payment-report", { amountPaise: toPaise(amount), method, version: booking.payments?.length ?? 0 })) setAmount("");
        }} />
    </Section>}
  </Panel>;
}
