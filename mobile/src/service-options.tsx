import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Plus, Profile, Tier, Unit } from "./api";
import { useCopy } from "./language";
import { colors, fontFamily } from "./ui";

const premium = { ink: "#203E35", gold: "#E9D2A0", paper: "#FFFCF5", border: "#D7BF88", muted: "#F1E5CA", text: "#6A5126" };

export function PlusBenefits({ includes, includesHi }: Pick<Plus, "includes" | "includesHi">) {
  const { t } = useCopy();
  return <View style={styles.extras}>
    <Text style={styles.extrasLabel}>{t("YOUR PLUS EXTRAS", "प्लस में आपके लिए अतिरिक्त")}</Text>
    <View style={styles.benefit}>
      <Text accessible={false} style={styles.extraMark}>+</Text>
      <Text style={styles.extraText}>{t(includes, includesHi || includes)}</Text>
    </View>
  </View>;
}

export function ServiceOptions({ profile, value, onChange }: {
  profile: Profile; value?: Tier; onChange?: (tier: Tier) => void;
}) {
  const { t } = useCopy();
  return <View style={styles.options} accessibilityRole={onChange ? "radiogroup" : undefined}
    accessibilityLabel={t("Service options", "सेवा के विकल्प")}>
    <OptionCard profile={profile} tier="everyday" selected={value === "everyday"} onChange={onChange} />
    {profile.plus && <OptionCard profile={profile} tier="plus" selected={value === "plus"} onChange={onChange} />}
  </View>;
}

function OptionCard({ profile, tier, selected, onChange }: {
  profile: Profile; tier: Tier; selected: boolean; onChange?: (tier: Tier) => void;
}) {
  const copy = useCopy();
  const { t } = copy;
  const [focused, setFocused] = useState(false);
  const plus = tier === "plus" ? profile.plus : null;
  const price = plus?.price ?? profile.price;
  const scope: Record<Unit, string> = {
    visit: t("A diagnostic visit for the task you select.", "आपके चुने हुए काम की जाँच के लिए विज़िट।"),
    hourly: t("Time for the work you agree with the worker.", "काम करने वाले से तय किए गए काम के लिए समय।"),
    fixed: t("The work included in your agreed package.", "आपके तय पैकेज में शामिल काम।"),
  };
  const delta = copy.rate({ price: price - profile.price, unit: profile.unit });
  const label = selected
    ? t(copy.tier(tier) + " selected", copy.tier(tier) + " चुना है")
    : t("Choose " + copy.tier(tier), copy.tier(tier) + " चुनें");

  return <View style={[styles.card, plus && styles.plusCard, selected && (plus ? styles.plusSelected : styles.everydaySelected)]}>
    <View style={[styles.header, plus && styles.plusHeader]}>
      <View style={styles.titleRow}>
        <View style={styles.nameRow}>
          <Text accessible={false} style={[styles.emblem, plus && styles.plusEmblem]}>{plus ? "✦" : "✓"}</Text>
          <Text accessibilityRole="header" style={[styles.title, plus && styles.plusTitle]}>{copy.tier(tier)}</Text>
        </View>
        {plus && <Text style={styles.premiumLabel}>{t("WITH EXTRAS", "अतिरिक्त सेवाएँ")}</Text>}
      </View>
      <Text style={[styles.tagline, plus && styles.plusTagline]}>{plus
        ? t("More care in the details.", "बारीकियों पर और ध्यान।")
        : t("Care for the task at hand.", "आपके काम के लिए सही देखभाल।")}</Text>
    </View>
    <View style={styles.content}>
      <View style={styles.priceBlock}>
        <Text style={styles.price}>{copy.rate({ price, unit: profile.unit })}</Text>
        {profile.unit === "hourly" && <Text style={styles.minimum}>
          {t(copy.money(price * 2) + " minimum · 2 hours", "कम से कम " + copy.money(price * 2) + " · 2 घंटे")}
        </Text>}
        {plus && <Text style={styles.difference}>{t(delta + " more than Everyday", "एवरीडे से " + delta + " अतिरिक्त")}</Text>}
      </View>
      <View style={styles.benefit}>
        <Text accessible={false} style={styles.check}>✓</Text>
        <View style={styles.benefitCopy}>
          <Text style={styles.benefitTitle}>{plus ? t("Everyday service included", "एवरीडे की सेवा शामिल") : t("Your selected service", "आपकी चुनी हुई सेवा")}</Text>
          <Text style={styles.description}>{scope[profile.unit]}</Text>
        </View>
      </View>
      <View style={styles.benefit}>
        <Text accessible={false} style={styles.check}>✓</Text>
        <Text style={styles.sharedBenefit}>{t("In-app chat & booking updates", "ऐप में चैट और बुकिंग की जानकारी")}</Text>
      </View>
      {plus && <PlusBenefits includes={plus.includes} includesHi={plus.includesHi} />}
      {onChange && <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }}
        accessibilityLabel={label} onPress={() => onChange(tier)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onHoverIn={() => setFocused(true)} onHoverOut={() => setFocused(false)}
        style={({ pressed }) => [styles.choose, plus && styles.plusChoose, selected && (plus ? styles.plusChosen : styles.chosen),
          focused && styles.focused, pressed && { opacity: 0.8 }]}>
        <View accessible={false} style={[styles.radio, plus && styles.plusRadio, selected && styles.radioSelected]}>
          {selected && <Text style={[styles.radioCheck, plus && styles.plusRadioCheck]}>✓</Text>}
        </View>
        <Text style={[styles.chooseText, plus && styles.plusChooseText]}>{label}</Text>
      </Pressable>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "stretch" },
  card: { flexBasis: 280, flexGrow: 1, flexShrink: 1, minWidth: 0, borderWidth: 2, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.white, overflow: "hidden" },
  plusCard: { backgroundColor: premium.paper, borderColor: premium.border },
  everydaySelected: { borderColor: colors.accent },
  plusSelected: { borderColor: premium.text },
  header: { padding: 18, gap: 9, backgroundColor: "#EFF4ED" },
  plusHeader: { backgroundColor: premium.ink },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  emblem: { color: colors.accent, fontSize: 18 },
  plusEmblem: { color: premium.gold, fontSize: 24 },
  title: { fontFamily, fontSize: 23, fontWeight: "700", lineHeight: 30, color: colors.ink, letterSpacing: -0.5 },
  plusTitle: { color: "#FFF6E5" },
  premiumLabel: { fontFamily, fontSize: 10, lineHeight: 16, letterSpacing: 1, fontWeight: "700", color: premium.gold,
    borderWidth: 1, borderColor: "#71816A", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagline: { fontFamily, color: colors.muted, fontSize: 14, lineHeight: 21 },
  plusTagline: { color: premium.muted },
  content: { padding: 18, gap: 15, flex: 1 },
  priceBlock: { gap: 5 },
  price: { fontFamily, fontSize: 21, lineHeight: 29, fontWeight: "700", letterSpacing: -0.4, color: colors.ink },
  minimum: { fontFamily, fontSize: 13, lineHeight: 19, color: colors.muted },
  difference: { fontFamily, fontSize: 13, lineHeight: 20, fontWeight: "600", color: premium.text },
  benefit: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  benefitCopy: { flex: 1, gap: 3 },
  benefitTitle: { fontFamily, fontSize: 14, lineHeight: 21, fontWeight: "600", color: colors.ink },
  description: { fontFamily, fontSize: 14, lineHeight: 21, color: colors.muted },
  sharedBenefit: { fontFamily, flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink },
  check: { fontSize: 15, lineHeight: 21, color: colors.accent },
  extras: { backgroundColor: "#F6EEDC", borderWidth: 1, borderColor: "#E5D4AF", borderRadius: 12, padding: 13, gap: 9 },
  extrasLabel: { fontFamily, fontSize: 10, lineHeight: 17, fontWeight: "700", letterSpacing: 1, color: premium.text },
  extraMark: { fontSize: 20, lineHeight: 23, color: premium.text },
  extraText: { fontFamily, flex: 1, fontSize: 14, lineHeight: 22, fontWeight: "500", color: "#503D21" },
  choose: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, padding: 13, minHeight: 50,
    borderWidth: 1, borderColor: colors.accent, borderRadius: 11, backgroundColor: "#EFF4ED", marginTop: "auto" },
  chosen: { backgroundColor: colors.panel },
  plusChoose: { backgroundColor: premium.ink, borderColor: premium.ink },
  plusChosen: { backgroundColor: "#153329", borderColor: premium.text },
  chooseText: { fontFamily, flexShrink: 1, textAlign: "center", fontSize: 15, lineHeight: 22, fontWeight: "600", color: colors.deep },
  plusChooseText: { color: "#FFF6E5" },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  plusRadio: { borderColor: premium.gold },
  radioSelected: { borderWidth: 0 },
  radioCheck: { fontSize: 17, fontWeight: "700", color: colors.accent },
  plusRadioCheck: { color: premium.gold },
  focused: { outlineColor: "#A96C14", outlineWidth: 3, outlineOffset: 3 },
});
