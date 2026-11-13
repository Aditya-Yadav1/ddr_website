import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ApiError, type Booking, type Role } from "./api";
import { useCopy } from "./language";
import { useSession } from "./session";
import { readStored, removeStored, writeStored } from "./storage";
import { activeStatuses, Body, Button, colors, Feedback, Field, Heading, Panel, Row } from "./ui";

type Draft = { text: string; operationId?: string };
const blank = { text: "" };
// A reopened conversation waits for the previous screen's pending draft writes.
const pendingDrafts = new Map<string, Promise<void>>();

export function BookingChat({ booking, role }: { booking: Booking; role: Role }) {
  const { changeBooking, snapshot } = useSession();
  const copy = useCopy();
  const { t } = copy;
  const key = "handyhive-chat-" + snapshot?.state.account.id + "-" + booking.id;
  const canChat = activeStatuses.includes(booking.status);
  const [draft, setDraft] = useState<Draft>(blank);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    void (pendingDrafts.get(key) ?? Promise.resolve()).catch(() => {}).then(() => readStored(key)).then((saved) => {
      if (active && saved) {
        const value = JSON.parse(saved) as Draft;
        if (typeof value.text === "string") setDraft(value);
      }
    }).catch(() => {}).finally(() => {
      if (active) setLoaded(true);
    });
    return () => { active = false; };
  }, [key]);

  function persist(next: Draft) {
    const saved = (pendingDrafts.get(key) ?? Promise.resolve()).catch(() => {}).then(() => next.text
      ? writeStored(key, JSON.stringify(next)) : removeStored(key));
    pendingDrafts.set(key, saved);
    void saved.finally(() => {
      if (pendingDrafts.get(key) === saved) pendingDrafts.delete(key);
    }).catch(() => {});
    return saved;
  }

  function editMessage(text: string) {
    const next = { text };
    setDraft(next);
    setError(null);
    void persist(next).catch(setError);
  }

  async function sendMessage() {
    if (sending.current || !draft.text.trim()) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const operationId = draft.operationId ?? randomUUID();
    const pending = { text: draft.text.trim(), operationId };
    try {
      await persist(pending);
      setDraft(pending);
      await changeBooking("message", { job: booking.id, role, message: pending.text, operationId });
      setDraft(blank);
      await persist(blank).catch(() => {});
    } catch (failure) {
      if (failure instanceof ApiError && failure.status < 500) {
        const unsent = { text: pending.text };
        setDraft(unsent);
        await persist(unsent).catch(() => {});
      }
      setError(failure);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (!canChat && !booking.messages.length && !draft.operationId) return null;
  return <Panel>
    <Heading size="small">{t("Messages", "संदेश")}</Heading>
    {booking.messages.map((message, index) => <View key={index} style={[styles.message, message.role === role && styles.mine]}>
      <Row><Body small strong>{message.role === role ? t("You", "आप") : role === "pro" ? t("Customer", "ग्राहक") : booking.proName}</Body>
        <Body small>{copy.dateTime(message.time)}</Body></Row>
      <Body>{message.message}</Body>
    </View>)}
    {!booking.messages.length && <Body small>{t("Use messages to coordinate this visit.", "विज़िट की बात तय करने के लिए संदेश भेजें।")}</Body>}
    {(canChat || draft.operationId) && <>
      <Field label={t("Write a message", "संदेश लिखें")} value={draft.text} multiline maxLength={280}
        onChangeText={editMessage} editable={loaded && !busy && !draft.operationId} />
      {draft.operationId && !busy && <Body small>{t(
        "Retry to check whether this message went through.",
        "यह संदेश पहुँचा या नहीं, फिर कोशिश करके जाँचें।",
      )}</Body>}
      <Feedback error={error} />
      <Button label={busy ? t("Sending…", "भेज रहे हैं…") : draft.operationId ? t("Retry message", "संदेश फिर भेजें") : t("Send message", "संदेश भेजें")}
        disabled={!loaded || busy || !draft.text.trim()} onPress={() => void sendMessage()} />
    </>}
  </Panel>;
}

const styles = StyleSheet.create({
  message: { backgroundColor: colors.paper, borderRadius: 13, padding: 10, gap: 3, alignSelf: "flex-start", maxWidth: "100%" },
  mine: { backgroundColor: colors.panel, alignSelf: "flex-end" },
});
