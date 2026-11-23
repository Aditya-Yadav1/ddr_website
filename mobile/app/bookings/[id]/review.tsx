import { useLocalSearchParams, useRouter } from "expo-router";
import { canReview } from "../../../shared/booking-agreements";
import { BookingRating } from "../../../src/booking-rating";
import { useCopy } from "../../../src/language";
import { useSession } from "../../../src/session";
import { Body, Button, Feedback, Heading, Page } from "../../../src/ui";

export default function BookingReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const copy = useCopy();
  const { t } = copy;
  const { snapshot, error } = useSession();
  const booking = snapshot?.state.requests.find((item) => item.id === id && item.customerId === snapshot.state.account.id);
  const reviewed = snapshot?.state.reviewed?.includes(id);
  if (!booking || booking.status !== "completed") {
    return <Page><Heading>{t("Review unavailable", "रेटिंग उपलब्ध नहीं है")}</Heading><Feedback error={error} /></Page>;
  }
  return <Page>
    <Heading>{t("Review your visit", "अपनी विज़िट की रेटिंग दें")}</Heading>
    <Body>{copy.task(booking.service, booking.scope)} · {booking.proName}</Body>
    <Feedback error={error} />
    {reviewed || canReview(booking) ? <BookingRating key={id} job={id} /> : <>
      <Body>{t("Your payment must be confirmed before you can leave a review.", "रेटिंग देने से पहले भुगतान की पुष्टि ज़रूरी है।")}</Body>
      {booking.bill ? <Button label={t("Open payment", "भुगतान खोलें")}
        onPress={() => router.replace({ pathname: "/bookings/[id]/payment", params: { id } })} />
        : <Button secondary tone="info" label={t("Customer Support", "ग्राहक सहायता")}
          onPress={() => router.push({ pathname: "/support", params: { job: id, topic: "payment" } })} />}
    </>}
    <Button secondary label={t("Back to booking", "बुकिंग पर वापस जाएँ")}
      onPress={() => router.dismissTo({ pathname: "/bookings/[id]", params: { id } })} />
  </Page>;
}
