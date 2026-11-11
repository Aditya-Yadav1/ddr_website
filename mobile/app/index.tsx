import { useRouter } from "expo-router";
import { useState } from "react";
import { errorMessage } from "../src/api";
import { useSession } from "../src/session";
import { appointmentLabel, Body, bookingStatus, Button, Feedback, Heading, Page, Panel, rate } from "../src/ui";

export default function CustomerHome() {
  const { snapshot, error, logout } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  if (!snapshot) return null;
  const { account, profile, profiles, requests } = snapshot.state;
  const bookings = requests.filter((booking) => booking.customerId === account.id);
  async function signOut() {
    setSigningOut(true);
    setLogoutError("");
    try { await logout(); }
    catch (failure) { setLogoutError(errorMessage(failure)); }
    finally { setSigningOut(false); }
  }
  return <Page>
    <Heading>Book a service</Heading>
    <Feedback message={error} />
    {profile && <Button label="Open worker workspace" secondary onPress={() => router.push("/worker")} />}
    <Body>Professionals in Delhi</Body>
    {profiles.length === 0 && <Body>There are no published professionals yet.</Body>}
    {profiles.map((person) => <Panel key={person.id}>
      <Heading>{person.name}</Heading>
      <Body>{snapshot.state.catalog.services.find((service) => service.id === person.service)?.name ?? person.service} · {person.areas.join(", ")}</Body>
      <Body>{rate(person)}</Body>
      <Button label={"View " + person.name} onPress={() => router.push({ pathname: "/request/[id]", params: { id: person.id } })} />
    </Panel>)}
    <Heading>Your bookings</Heading>
    {bookings.length === 0 && <Body>No bookings yet.</Body>}
    {bookings.map((booking) => <Panel key={booking.id}>
      <Body>{booking.proName} · {appointmentLabel(booking.appointment)}</Body>
      <Button secondary label={booking.scope + " · " + bookingStatus[booking.status]}
        onPress={() => router.push({ pathname: "/bookings/[id]", params: { id: booking.id } })} />
    </Panel>)}
    <Feedback message={logoutError} />
    <Button secondary label="Sign out" onPress={() => void signOut()} disabled={signingOut} />
  </Page>;
}
