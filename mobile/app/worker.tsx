import { useRouter } from "expo-router";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { activeStatuses, Body, BookingCard, Button, Feedback, Guide, Heading, MainNav, Page, Panel, Row, Section, Tag } from "../src/ui";

export default function WorkerJobs() {
  const { snapshot, error } = useSession();
  const router = useRouter();
  const { t } = useCopy();
  if (!snapshot) return null;
  const { account, profile, requests } = snapshot.state;
  const jobs = requests.filter((booking) => booking.proId === account.id);
  const incoming = jobs.filter((booking) => booking.status === "pending").sort((a, b) => a.deadline - b.deadline);
  const upcoming = jobs.filter((booking) => booking.status !== "pending" && activeStatuses.includes(booking.status))
    .sort((a, b) => a.appointment.localeCompare(b.appointment));
  const history = jobs.filter((booking) => !activeStatuses.includes(booking.status));
  const groups = [
    { name: t("New requests", "नए अनुरोध"), jobs: incoming },
    { name: t("Confirmed jobs", "पक्के काम"), jobs: upcoming },
    { name: t("Past jobs", "पुराने काम"), jobs: history },
  ];

  return <Page footer={<MainNav selected="worker" />}>
    <Heading>{t("Your work", "आपका काम")}</Heading>
    <Feedback error={error} />
    {incoming.length > 0 && <Guide>{t("You have new requests waiting. Open one to see the work, price and response deadline.", "आपके लिए नए अनुरोध आए हैं। काम, कीमत और जवाब की समय सीमा देखने के लिए कोई अनुरोध खोलें।")}</Guide>}
    <Panel tint="green">
      {profile ? <>
        <Row><Heading size="small">{profile.name}</Heading>
          <Tag>{profile.published ? t("Published", "प्रकाशित") : t("Paused", "रुकी हुई")}</Tag></Row>
        <Body>{profile.published
          ? t("Your profile is visible to customers in your service areas.", "आपके सेवा इलाकों में ग्राहक आपकी प्रोफ़ाइल देख सकते हैं।")
          : t("You can manage existing jobs while your profile is paused.", "प्रोफ़ाइल रुकी होने पर भी आप मौजूदा काम संभाल सकते हैं।")}</Body>
        <Button label={t("Profile, rates & availability", "प्रोफ़ाइल, दरें और उपलब्धता")} onPress={() => router.push("/worker-profile")} />
      </> : <>
        <Heading size="small">{t("Offer a home service", "घरेलू सेवा दें")}</Heading>
        <Body>{t("Set up your profile, starting rate and hours to receive Delhi bookings.", "दिल्ली की बुकिंग पाने के लिए प्रोफ़ाइल, शुरुआती दर और काम के घंटे तय करें।")}</Body>
        <Button label={t("Create worker profile", "काम की प्रोफ़ाइल बनाएँ")} onPress={() => router.push("/worker-profile")} />
      </>}
    </Panel>
    {profile && !jobs.length && <Panel><Body>{t("New job requests will appear here.", "काम के नए अनुरोध यहाँ दिखेंगे।")}</Body></Panel>}
    {groups.filter((group) => group.jobs.length).map((group) => <Section key={group.name}>
      <Heading size="medium">{group.name}</Heading>
      {group.jobs.map((job) => <BookingCard key={job.id} booking={job} worker />)}
    </Section>)}
  </Page>;
}
