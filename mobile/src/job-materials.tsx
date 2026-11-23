import type { Materials } from "./api";
import { useCopy } from "./language";
import { Button, Row } from "./ui";

export function useMaterialLabels(): Record<Materials, string> {
  const { t } = useCopy();
  return {
    customer: t("Customer supplies materials", "सामान ग्राहक लाएँगे"),
    worker: t("Worker supplies materials", "सामान काम करने वाले लाएँगे"),
    none: t("No materials needed", "सामान की ज़रूरत नहीं"),
    inspect: t("Decide after inspection", "जाँच के बाद तय करेंगे"),
  };
}

export function MaterialOptions({ value, onChange, inspection }: {
  value: Materials; onChange: (value: Materials) => void; inspection?: boolean;
}) {
  const labels = useMaterialLabels();
  const choices: Materials[] = inspection ? ["customer", "worker", "none", "inspect"] : ["customer", "worker", "none"];
  return <Row>{choices.map((choice) => <Button key={choice} compact secondary selected={value === choice}
    label={labels[choice]} onPress={() => onChange(choice)} />)}</Row>;
}
