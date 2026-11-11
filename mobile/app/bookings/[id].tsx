import { useLocalSearchParams } from "expo-router";
import { useBookingAction } from "../../src/booking-action";
import { useSession } from "../../src/session";
import { appointmentLabel, Body, bookingStatus, Button, Feedback, Heading, Page, Panel, rate } from "../../src/ui";

export default function BookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, error: connectionError } = useSession();
  const { send, busy, error } = useBookingAction();
  const booking = snapshot?.state.requests.find((item) => item.id === id);
  if (!booking) return <Page><Heading>Booking unavailable</Heading><Feedback message={connectionError} /></Page>;
  const worker = snapshot?.state.account.id === booking.proId;
  const deadline = booking.status === "pending" && new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short",
  }).format(booking.deadline);
  return <Page>
    <Heading>{booking.scope}</Heading>
    <Feedback message={connectionError} />
    <Panel>
      <Heading>{bookingStatus[booking.status]}</Heading>
      <Body>{booking.area} · {appointmentLabel(booking.appointment)}</Body>
      {!worker && <Body>Worker · {booking.proName}</Body>}
      <Body>{rate(booking)}</Body>
      {deadline && <Body>Respond by {deadline} IST</Body>}
      <Feedback message={error} />
      {worker && booking.status === "pending" && <Button label={busy ? "Accepting…" : "Accept appointment"} disabled={busy}
        onPress={() => void send("transition", { job: booking.id, role: "pro", change: "accept" })} />}
    </Panel>
  </Page>;
}
