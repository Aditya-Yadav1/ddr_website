import { useState } from "react";
import { isPinCode } from "../shared/pin-codes";
import type { Snapshot } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, Feedback, Field, Heading, Panel, Row } from "./ui";
type Address = NonNullable<Snapshot["state"]["addresses"]>[number];
export function SavedAddresses({ forPin, onSelect }: { forPin?: string; onSelect?: (address: Address) => void }) {
  const { snapshot, changeProfile } = useSession();
  const { t } = useCopy();
  const placeName = (place: Address) => place.label === "Home" ? t("Home", "घर") : t("Work", "काम की जगह");
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("Home");
  const [area, setArea] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const places = snapshot?.state.addresses ?? [];
  if (onSelect) {
    const matching = places.filter((place) => place.pinCode === forPin);
    if (!matching.length) return null;
    return <Row>{matching.map((place) => <Button key={place.label} secondary compact
      label={t("Use ", "इस्तेमाल करें ") + placeName(place) + " · " + place.address} onPress={() => onSelect(place)} />)}</Row>;
  }
  async function save() {
    setBusy(true); setError(null);
    const landmark = places.find((place) => place.label === label)?.landmark;
    try { await changeProfile("save-address", { label, area, pinCode, address, customerName, landmark }); setEditing(false); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  return <Panel><Heading size="small">{t("Saved places", "सहेजी गई जगहें")}</Heading>
    {places.map((place) => <Panel key={place.label}><Body strong>{placeName(place)}{place.area ? " · " + place.area : ""}</Body><Body small>{place.address}</Body>
      <Body small>{place.pinCode ? t("PIN code", "पिन कोड") + " " + place.pinCode : t("PIN code needed for new bookings", "नई बुकिंग के लिए पिन कोड चाहिए")}</Body>
      <Button secondary label={t("Edit address", "पता बदलें")} onPress={() => { setLabel(place.label); setArea(place.area); setPinCode(place.pinCode ?? ""); setAddress(place.address); setCustomerName(place.customerName); setEditing(true); }} />
    </Panel>)}
    {editing ? <><Row>{["Home", "Work"].map((name) => <Button key={name} compact secondary selected={label === name} label={name === "Home" ? t("Home", "घर") : t("Work", "काम की जगह")} onPress={() => setLabel(name)} />)}</Row>
      <Field label={t("Your name", "आपका नाम")} value={customerName} onChangeText={setCustomerName} maxLength={60} />
      <Field label={t("Locality and city (optional)", "इलाका और शहर (वैकल्पिक)")} value={area} onChangeText={setArea} maxLength={120} />
      <Field label={t("PIN code", "पिन कोड")} value={pinCode} onChangeText={(value) => setPinCode(value.replace(/\D/g, ""))}
        keyboardType="number-pad" maxLength={6} placeholder="110075" />
      <Field label={t("Street and house or flat number", "सड़क और मकान या फ़्लैट नंबर")} value={address} onChangeText={setAddress} maxLength={220} multiline />
      <Button disabled={busy || !customerName.trim() || !isPinCode(pinCode) || address.trim().length < 8} label={t("Save address", "पता सहेजें")} onPress={() => void save()} />
      <Button secondary disabled={busy} label={t("Cancel", "रद्द करें")} onPress={() => setEditing(false)} /></>
      : <Button secondary label={t("Add or update a saved place", "जगह सहेजें या बदलें")} onPress={() => setEditing(true)} />}
    <Feedback error={error} />
  </Panel>;
}
