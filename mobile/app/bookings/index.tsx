import { useRouter } from "expo-router";
import { useCopy } from "../../src/language";
import { useSession } from "../../src/session";
import { activeStatuses, Body, BookingCard, Button, Feedback, Heading, MainNav, Page, Panel, Section } from "../../src/ui";

export default function Bookings() {
  const { snapshot, error } = useSession();
  const { t } = useCopy();
  const router = useRouter();
  if (!snapshot) return null;
  const { account, requests } = snapshot.state;
  const bookings = requests.filter((booking) => booking.customerId === account.id);
  const active = bookings.filter((booking) => activeStatuses.includes(booking.status));
  const history = bookings.filter((booking) => !activeStatuses.includes(booking.status));
  return <Page footer={<MainNav selected="bookings" />}>
    <Heading>{t("Your bookings", "आपकी बुकिंग")}</Heading>
    <Feedback error={error} />
    {!bookings.length && <Panel>
      <Heading size="small">{t("No bookings yet", "अभी कोई बुकिंग नहीं")}</Heading>
      <Body>{t("Requests and past appointments will appear here.", "आपके अनुरोध और पिछली बुकिंग यहाँ दिखेंगी।")}</Body>
      <Button label={t("Explore services", "सेवाएँ खोजें")} onPress={() => router.navigate("/")} />
    </Panel>}
    {!!active.length && <Section>
      <Heading size="medium">{t("Open bookings", "चालू बुकिंग")}</Heading>
      {active.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
    </Section>}
    {!!history.length && <Section>
      <Heading size="medium">{t("Past bookings", "पुरानी बुकिंग")}</Heading>
      {history.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
    </Section>}
  </Page>;
}
