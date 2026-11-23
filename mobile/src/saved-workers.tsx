import { useRouter } from "expo-router";
import { useState } from "react";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, Feedback, Heading, Panel, Row } from "./ui";

export function SaveWorker({ worker }: { worker: string }) {
  const { snapshot, changeProfile } = useSession();
  const { t } = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const saved = snapshot?.state.savedWorkers?.includes(worker);
  if (!snapshot || worker === snapshot.state.account.id) return null;
  return <Row>
    <Button compact secondary disabled={busy} selected={saved} label={saved ? t("Remove saved worker", "सेव किया गया काम करने वाला हटाएँ")
      : t("Save worker", "काम करने वाले को सेव करें")} onPress={async () => {
        setBusy(true);
        setError(null);
        try { await changeProfile(saved ? "remove-worker" : "save-worker", { worker }); }
        catch (failure) { setError(failure); }
        finally { setBusy(false); }
      }} />
    <Feedback error={error} />
  </Row>;
}

export function SavedWorkers() {
  const router = useRouter();
  const { snapshot } = useSession();
  const copy = useCopy();
  const { t } = copy;
  const ids = snapshot?.state.savedWorkers ?? [];
  if (!ids.length) return null;
  return <Panel>
    <Heading size="small">{t("Saved workers", "सेव किए गए काम करने वाले")}</Heading>
    {ids.map((id) => {
      const person = snapshot?.state.profiles.find((entry) => entry.id === id);
      const name = person?.name ?? snapshot?.state.requests.find((booking) => booking.proId === id)?.proName;
      return <Panel key={id}>
        <Body strong>{name ?? t("Saved worker", "सेव किया गया काम करने वाला")}</Body>
        {person ? <>
          <Body small>{copy.rate(person)} · {t("Service PIN codes", "सेवा के पिन कोड")} {person.pinCodes?.join(", ")}</Body>
          <Button compact label={t("View worker", "काम करने वाले की जानकारी देखें")} onPress={() => router.push({ pathname: "/providers/[id]", params: { id } })} />
        </> : <Body small>{t("Currently unavailable", "अभी उपलब्ध नहीं")}</Body>}
        <SaveWorker worker={id} />
      </Panel>;
    })}
  </Panel>;
}
