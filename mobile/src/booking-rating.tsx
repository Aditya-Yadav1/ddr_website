import { useState } from "react";
import { useCopy } from "./language";
import { useSession } from "./session";
import { Body, Button, Feedback, Field, Guide, Heading, Panel, Row } from "./ui";
export function BookingRating({ job }: { job: string }) {
  const { snapshot, changeProfile } = useSession();
  const { t } = useCopy();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>();
  if (saved || snapshot?.state.reviewed?.includes(job)) {
    return <Guide tone="success">{t("Thank you. Your review has been submitted.", "धन्यवाद। आपकी समीक्षा भेज दी गई है।")}</Guide>;
  }
  const scoreLabel = (score: number) => t(score + " of 5 stars", "5 में से " + score + " स्टार");
  return <Panel><Heading size="small">{t("Rate your worker", "काम करने वाले को रेटिंग दें")}</Heading>
    <Row>{[1, 2, 3, 4, 5].map((score) => <Button key={score} compact secondary tone="warning" mark="★"
      selected={rating === score} label={String(score)} accessibilityLabel={scoreLabel(score)} disabled={busy} onPress={() => setRating(score)} />)}</Row>
    {rating > 0 && <Body small strong>{scoreLabel(rating)}</Body>}
    <Field label={t("Public review (optional)", "सार्वजनिक समीक्षा (वैकल्पिक)")}
      hint={t("Describe how the work went. Keep contact and address details private.", "बताएँ काम कैसा रहा। संपर्क और पते की जानकारी निजी रखें।")}
      value={comment} onChangeText={setComment} maxLength={500} editable={!busy} multiline />
    <Button label={t("Submit review", "समीक्षा भेजें")} disabled={!rating || busy} onPress={async () => {
      setBusy(true);
      setError(null);
      try {
        await changeProfile("review", { job, rating, comment });
        setSaved(true);
      } catch (failure) {
        setError(failure);
      } finally {
        setBusy(false);
      }
    }} />
    <Feedback error={error} />
  </Panel>;
}
