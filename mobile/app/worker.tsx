import { useState } from "react";
import { useRouter } from "expo-router";
import { VerificationRequest } from "../src/worker-safety";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { paymentBalance } from "../src/payment-controls";
import { activeStatuses, Body, BookingCard, Button, Feedback, Heading, MainNav, Page, Panel, Row, Section, Tag } from "../src/ui";

export default function WorkerJobs() {
  const { snapshot, error } = useSession();
  const router = useRouter();
  const { t, money } = useCopy();
  const [details, setDetails] = useState(false);
  if (!snapshot) return null;
  const { account, profile, requests } = snapshot.state;
  const jobs = requests.filter((booking) => booking.proId === account.id);
  const incoming = jobs.filter((booking) => booking.status === "pending").sort((a, b) => a.deadline - b.deadline);
  const upcoming = jobs.filter((booking) => booking.status !== "pending" && activeStatuses.includes(booking.status))
    .sort((a, b) => a.appointment.localeCompare(b.appointment));
  const history = jobs.filter((booking) => !activeStatuses.includes(booking.status));
  const agreedValue = (job: typeof jobs[number]) => job.quotes?.find((quote) => quote.version === job.activeQuote)?.totalPaise ?? job.basePaise ?? 0;
  const agreedUpcoming = upcoming.reduce((sum, job) => sum + agreedValue(job), 0);
  const billed = history.reduce((sum, job) => sum + (job.bill?.totalPaise ?? 0), 0);
  const received = history.reduce((sum, job) => sum + paymentBalance(job).confirmed, 0);
  const needsSetup = !profile?.pinCodes?.length || (snapshot.state.requireVerification && !profile.trust?.eligible);
  const groups = [
    { name: t("New requests", "नए अनुरोध"), jobs: incoming },
    { name: t("Confirmed jobs", "पक्के काम"), jobs: upcoming },
    { name: t("Past jobs", "पुराने काम"), jobs: history },
  ];

  return <Page footer={<MainNav selected="worker" />}>
    <Heading>{t("Your work", "आपका काम")}</Heading>
    <Feedback error={error} />
    <Panel>
      {profile ? <>
        <Row><Heading size="small">{profile.name}</Heading>
          <Tag tone={profile.trust?.suspended ? "danger" : needsSetup ? "warning" : profile.published ? "success" : "neutral"}>{profile.trust?.suspended ? t("Suspended", "निलंबित") : snapshot.state.requireVerification && !profile.trust?.eligible
            ? t("Checks required", "जाँच ज़रूरी") : !profile.pinCodes?.length ? t("PIN codes required", "पिन कोड ज़रूरी")
              : profile.published ? t("Published", "प्रकाशित") : t("Paused", "रुकी हुई")}</Tag></Row>
        <Body>{!profile.pinCodes?.length ? t("Add your service PIN codes to receive new bookings.", "नई बुकिंग पाने के लिए सेवा के पिन कोड जोड़ें।")
          : profile.published && !profile.trust?.suspended && (!snapshot.state.requireVerification || profile.trust?.eligible)
          ? t("Customers can find your profile in the PIN codes you serve.", "आपके सेवा वाले पिन कोड में ग्राहक आपकी प्रोफ़ाइल देख सकते हैं।")
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
    {profile && <Button secondary label={details ? t("Hide business details", "व्यवसाय विवरण छिपाएँ") : t("Verification and earnings", "सत्यापन और कमाई")} onPress={() => setDetails(!details)} />}
    {details && <><VerificationRequest />
    {jobs.some((job) => job.agreementVersion) && <Panel>
      <Heading size="small">{t("Work and payments", "काम और भुगतान")}</Heading>
      <Body>{t("Confirmed upcoming work", "आगामी पक्का काम")} · {money(agreedUpcoming / 100)}</Body>
      <Body>{t("Completed bills", "पूरे हुए कामों के बिल")} · {money(billed / 100)}</Body>
      <Body>{t("Confirmed receipts", "पुष्टि की गई रसीदें")} · {money(received / 100)}</Body>
      <Body strong>{t("Outstanding", "बकाया")} · {money((billed - received) / 100)}</Body>
      {history.filter((job) => paymentBalance(job).due > 0).map((job) => <Button key={job.id} secondary compact
        label={t("View unpaid bill", "बकाया बिल देखें") + " · " + money(paymentBalance(job).due / 100)}
        onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: job.id } })} />)}
    </Panel>}
    </>}
  </Page>;
}
