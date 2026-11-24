import type { PilotOffer, PilotRate, Profile, Tier } from "./api";
import { useCopy } from "./language";
import { Body, Button, Heading, Panel } from "./ui";

export const { rateFor, offerFor, eligible, commission, earnings } = require("../shared/pilot-pricing") as {
  rateFor: (service: string | undefined, scope: string | undefined, pin: string) => PilotRate | null;
  offerFor: (rate: PilotRate | null, tier: Tier) => PilotOffer | null;
  eligible: (person: Profile | undefined, rate: PilotRate) => boolean;
  commission: (paise: number, rate?: number) => number;
  earnings: (job: import("./api").Booking, received: number) => { labour: number; payout: number; collectedLabour: number; fee: number };
};

export function PilotPrice({ offer }: { offer: PilotOffer }) {
  const { t, money } = useCopy();
  return <>
    <Body strong>{money(offer.price)} · {offer.repairPrice ? t("inspection", "जाँच") : t("fixed labour", "श्रम का तय शुल्क")}</Body>
    <Body>{offer.quantity === 2 ? t(offer.includes, offer.includesHi) : t(offer.description, offer.hi)}</Body>
    <Body small>{offer.minutes} {t("min · Parts and work outside this scope require approval.", "मिनट · पुर्ज़ों और अतिरिक्त काम के लिए मंज़ूरी चाहिए।")}</Body>
  </>;
}

export function PilotChoices({ rate, tier, onChange }: { rate: PilotRate; tier: Tier; onChange: (tier: Tier) => void }) {
  const { t, money } = useCopy();
  const everyday = offerFor(rate, "everyday")!;
  const plus = offerFor(rate, "plus");
  return <>
    <Panel tone={tier === "everyday" ? "info" : undefined}>
      <Heading size="small">{rate.repairPrice ? t("Inspection visit", "जाँच की विज़िट") : t("Everyday", "एवरीडे")}</Heading>
      <PilotPrice offer={everyday} />
      {plus && <Button secondary selected={tier === "everyday"} label={t("Choose one tap", "एक नल चुनें")} onPress={() => onChange("everyday")} />}
    </Panel>
    {plus && <Panel tone={tier === "plus" ? "info" : undefined}>
      <Heading size="small">{t("Plus · Two taps in one visit", "प्लस · एक विज़िट में दो नल")}</Heading>
      <PilotPrice offer={plus} />
      <Body strong>{t("Save ", "बचत ") + money(rate.price + (rate.addOn ?? 0) - plus.price)
        + t(" compared with adding the second tap separately in the same visit.", " उसी विज़िट में दूसरा नल अलग जोड़ने की तुलना में।")}</Body>
      <Button secondary selected={tier === "plus"} label={t("Choose two taps", "दो नल चुनें")} onPress={() => onChange("plus")} />
    </Panel>}
  </>;
}
