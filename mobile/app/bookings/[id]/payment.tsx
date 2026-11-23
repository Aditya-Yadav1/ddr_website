import { useLocalSearchParams, useRouter } from "expo-router";
import { canReview } from "../../../shared/booking-agreements";
import { useBookingAction } from "../../../src/booking-action";
import { useCopy } from "../../../src/language";
import { PaymentControls } from "../../../src/payment-controls";
import { useSession } from "../../../src/session";
import { Body, Button, Feedback, Heading, Page, Panel } from "../../../src/ui";

export default function BookingPayment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const { snapshot, error } = useSession();
  const command = useBookingAction(id && id + ".payment");
  const booking = snapshot?.state.requests.find((item) => item.id === id && item.customerId === snapshot.state.account.id);
  if (!booking || booking.status !== "completed" || !booking.bill) {
    return <Page><Heading>{t("Payment unavailable", "भुगतान उपलब्ध नहीं है")}</Heading><Feedback error={error} /></Page>;
  }
  const paid = canReview(booking);
  const reviewed = snapshot?.state.reviewed?.includes(id);
  return <Page>
    <Heading>{paid ? t("Payment confirmed", "भुगतान की पुष्टि हुई") : t("Pay for your visit", "अपनी विज़िट का भुगतान करें")}</Heading>
    <Body>{copy.task(booking.service, booking.scope)} · {booking.proName}</Body>
    <Feedback error={error || command.error} />
    {command.uncertain && <Panel tone="warning">
      <Button disabled={command.busy} label={t("Retry payment update", "भुगतान अपडेट फिर भेजें")} onPress={() => void command.retry()} />
    </Panel>}
    {paid && !reviewed && <Button label={t("Leave a review", "रेटिंग दें")}
      onPress={() => router.push({ pathname: "/bookings/[id]/review", params: { id } })} />}
    <PaymentControls key={id} booking={booking} role="customer" locked={command.busy || command.uncertain}
      send={(action, body) => command.send(action, { ...body, job: id, role: "customer" })} />
    <Button secondary tone="info" label={t("Customer Support", "ग्राहक सहायता")}
      onPress={() => router.push({ pathname: "/support", params: { job: id, topic: "payment" } })} />
  </Page>;
}
