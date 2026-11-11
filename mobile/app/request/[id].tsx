import { randomUUID } from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { appointmentDays, appointmentTimes } from "../../src/appointments";
import { useBookingAction } from "../../src/booking-action";
import { useSession } from "../../src/session";
import { appointmentLabel, Body, Button, Feedback, Heading, Page, Panel, rate } from "../../src/ui";

const dateLabel = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" });
const choicesStyle = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: 8 } }).row;

export default function RequestAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, error: connectionError } = useSession();
  const router = useRouter();
  const { send, busy, error } = useBookingAction();
  const [intent] = useState(randomUUID);
  const [scope, setScope] = useState("");
  const [area, setArea] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [review, setReview] = useState(false);
  if (!snapshot) return null;
  const profile = snapshot.state.profiles.find((person) => person.id === id);
  const service = snapshot.state.catalog.services.find((item) => item.id === profile?.service);
  if (!profile || !service) return <Page><Heading>Professional unavailable</Heading></Page>;
  const hours = profile.hours ?? snapshot.state.catalog.defaultHours;
  const days = appointmentDays(snapshot.serverTime, hours);
  const times = appointmentTimes(hours, profile.unit);
  const appointment = day && time ? day + "T" + time : "";
  const valid = service.tasks.includes(scope) && profile.areas.includes(area) && days.includes(day) && times.includes(time);
  const proId = profile.id;
  async function submit() {
    const jobId = await send("request", { intent, proId, scope, area, appointment, contact: "In-app message" });
    if (jobId) router.replace({ pathname: "/bookings/[id]", params: { id: jobId } });
  }
  return <Page>
    <Heading>{profile.name}</Heading>
    <Body>{service.name} · {rate(profile)}</Body>
    <Body>{profile.bio}</Body>
    <Feedback message={connectionError} />
    {review ? <Panel>
      <Heading>Review appointment</Heading>
      <Body>{scope} · {area}</Body>
      <Body>{appointmentLabel(appointment)}</Body>
      <Body>{rate(profile)}</Body>
      <Body>Your appointment is confirmed when the worker accepts.</Body>
      <Feedback message={error} />
      <Button label={busy ? "Sending…" : "Send request"} disabled={busy || !valid} onPress={() => void submit()} />
      <Button secondary label="Edit appointment" disabled={busy} onPress={() => setReview(false)} />
    </Panel> : <>
      <Body>What needs doing?</Body>
      {service.tasks.map((task) => <Button key={task} label={task} secondary selected={scope === task} onPress={() => setScope(task)} />)}
      <Body>Neighbourhood</Body>
      <View style={choicesStyle}>
        {profile.areas.map((place) => <Button key={place} label={place} secondary selected={area === place} onPress={() => setArea(place)} />)}
      </View>
      <Body>Date and time in IST</Body>
      {(!days.length || !times.length) && <Body>This worker has no appointment hours this week.</Body>}
      <View style={choicesStyle}>
        {days.map((date) => <Button key={date} label={dateLabel.format(new Date(date + "T00:00Z"))}
          secondary selected={day === date} onPress={() => setDay(date)} />)}
      </View>
      {day && <View style={choicesStyle}>
        {times.map((slot) => <Button key={slot} label={slot} secondary selected={time === slot} onPress={() => setTime(slot)} />)}
      </View>}
      <Button label="Review appointment" disabled={!valid} onPress={() => setReview(true)} />
    </>}
  </Page>;
}
