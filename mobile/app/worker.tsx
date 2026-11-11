import { useRouter } from "expo-router";
import { useSession } from "../src/session";
import { appointmentLabel, Body, bookingStatus, Button, Feedback, Heading, Page, Panel } from "../src/ui";

export default function WorkerJobs() {
  const { snapshot, error } = useSession();
  const router = useRouter();
  if (!snapshot) return null;
  const { account, profile, requests } = snapshot.state;
  const jobs = requests.filter((booking) => booking.proId === account.id);
  return <Page>
    <Heading>Jobs</Heading>
    <Feedback message={error} />
    {!profile && <Body>A worker profile is required to receive requests.</Body>}
    {profile && jobs.length === 0 && <Body>No requests yet.</Body>}
    {jobs.map((job) => <Panel key={job.id}>
      <Body>{job.area} · {appointmentLabel(job.appointment)}</Body>
      <Button secondary label={job.scope + " · " + bookingStatus[job.status]}
        onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: job.id } })} />
    </Panel>)}
  </Page>;
}
