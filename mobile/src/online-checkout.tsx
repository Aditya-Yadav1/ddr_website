import { useState } from "react";
import { Linking } from "react-native";
import type { Booking, ProfileCommand } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, Feedback, Row, Section, Tag } from "./ui";

export function OnlineCheckout({ booking, amount, worker }: { booking: Booking; amount: number; worker: boolean }) {
  const { t, money } = useCopy();
  const { snapshot, changeProfile } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { checkout } = booking;
  const mode = checkout?.mode || snapshot?.state.onlinePaymentMode;
  if (!checkout && (!mode || worker || amount < 100)) return null;

  async function update(action: ProfileCommand) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await changeProfile(action, { job: booking.id, amountPaise: amount, reference: checkout?.reference }); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  return <Section>
    <Body strong>{t("Online checkout · Test only", "ऑनलाइन भुगतान · केवल परीक्षण")}</Body>
    <Body small>{t("No real money is collected in this checkout.", "इस भुगतान में असली पैसे नहीं लिए जाते।")}</Body>
    {checkout && <Row><Tag tone="warning" mark="◷">{t("Checkout pending", "भुगतान लंबित")}</Tag><Body>{money(checkout.amountPaise / 100)}</Body></Row>}
    {!worker && <Row>
      {!checkout && <Button disabled={busy} label={t("Start test checkout", "परीक्षण भुगतान शुरू करें") + " · " + money(amount / 100)}
        onPress={() => void update("checkout-start")} />}
      {checkout && mode === "demo" && <>
        <Button disabled={busy} label={t("Simulate payment", "भुगतान का अभ्यास करें")} onPress={() => void update("checkout-demo")} />
        <Button secondary disabled={busy} label={t("Cancel checkout", "भुगतान रद्द करें")} onPress={() => void update("checkout-cancel")} />
      </>}
      {checkout && mode === "razorpay-test" && (checkout.url
        ? <Button disabled={busy} label={t("Open Razorpay test checkout", "Razorpay परीक्षण भुगतान खोलें")}
          onPress={() => void Linking.openURL(checkout.url!).catch(setError)} />
        : <Button disabled={busy} label={t("Retry checkout setup", "भुगतान सेटअप फिर करें")} onPress={() => void update("checkout-start")} />)}
      {checkout && mode === "razorpay-test" && <Button secondary disabled={busy}
        label={t("Check payment status", "भुगतान की स्थिति देखें")} onPress={() => void update("checkout-check")} />}
    </Row>}
    <Feedback error={error} />
  </Section>;
}
