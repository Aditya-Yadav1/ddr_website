import { useRef, useState } from "react";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, Feedback, Heading, Panel, Row } from "./ui";

export function DemoAccounts({ onChoose }: { onChoose?: (id: string) => void }) {
  const { auth, snapshot } = useSession();
  const { t } = useCopy();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [showOthers, setShowOthers] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const active = snapshot?.state.account.id;
  async function pick(id: string) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await auth("demo-sign-in", { account: id });
      onChoose?.(id);
    } catch (failure) {
      setError(failure);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  const workerAccounts = [
    ["electric-demo", t("Electrician", "इलेक्ट्रीशियन")],
    ["cleaning-demo", t("Cleaner", "सफ़ाई वर्कर")],
    ["painting-demo", t("Painter", "पेंटर")],
  ];
  return <Panel tone="info">
    <Heading size="small">{t("Try the same visit from both sides", "एक ही विज़िट को दोनों तरफ़ से आज़माएँ")}</Heading>
    <Body small>{t("Choose Customer to see a sample booking or Plumber to accept it in Work. Switch accounts here at any time.", "नमूना बुकिंग देखने के लिए ग्राहक चुनें या काम में उसे स्वीकार करने के लिए प्लंबर चुनें। यहाँ कभी भी खाता बदलें।")}</Body>
    <Row>
      <Button compact secondary selected={active === "customer-demo"} disabled={busy} label={t("Customer", "ग्राहक")} onPress={() => void pick("customer-demo")} />
      <Button compact secondary selected={active === "worker-demo"} disabled={busy} label={t("Plumber", "प्लंबर")} onPress={() => void pick("worker-demo")} />
      <Button compact secondary label={showOthers ? t("Fewer accounts", "कम खाते") : t("More demo accounts", "और डेमो खाते")} onPress={() => setShowOthers(!showOthers)} />
    </Row>
    {showOthers && <Row>{workerAccounts.map(([id, label]) => <Button key={id} compact secondary selected={active === id} disabled={busy} label={label} onPress={() => void pick(id)} />)}</Row>}
    <Feedback error={error} />
  </Panel>;
}
