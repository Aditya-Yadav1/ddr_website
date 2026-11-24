import { useEffect, useState } from "react";
import { api, type PricingLimit, type WorkerTrust } from "../src/api";
import { useCopy } from "../src/language";
import { useSession } from "../src/session";
import { Body, Button, Feedback, Field, Heading, Page, Panel, Row, Section, Tag } from "../src/ui";

const checkKinds = ["identity", "background", "skills"] as const;
type AdminOverview = {
  metrics: { accounts: number; professionals: number; openSupport: number; activeBookings: number; completedBookings: number };
  pilotPricing?: { bookings: number; completed: number; plusFulfilled: number; plusCompleted: number; shadowFees: number };
  pricingLimits?: PricingLimit[];
  professionals: { id: string; name: string; service: string; published: boolean; pricingBlocked?: boolean; trust: WorkerTrust }[];
  verification: { worker: string; requested: number }[];
  support: { id: string; owner: string; job: string; category: string; message: string; created: number }[];
  reports: { id: string; worker: string; job: string; message: string; created: number }[];
  deletionRequests: { owner: string; requested: number }[];
  audit: { actor: string; action: string; subject: string; reason: string; created: number }[];
};
export default function Admin() {
  const { token, snapshot } = useSession();
  const { t, dateTime, money, service } = useCopy();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [response, setResponse] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [expiry, setExpiry] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPricing, setShowPricing] = useState(false);
  const [pricingDraft, setPricingDraft] = useState({ minimum: "", maximum: "", quoteMaximum: "" });
  useEffect(() => {
    if (!token || !snapshot?.state.isAdmin) return;
    let active = true;
    void api<AdminOverview>("admin-overview", token).then((next) => { if (active) { setData(next); setError(null); } })
      .catch((failure) => { if (active) setError(failure); });
    return () => { active = false; };
  }, [token, snapshot?.state.isAdmin, refresh]);
  async function act(action: string, body: Record<string, string | number | boolean>) {
    if (!token || busy) return;
    setBusy(true); setError(null);
    try { await api(action, token, body); setConfirm(""); setResponse(""); setReason(""); setReference(""); setExpiry(""); setRefresh((value) => value + 1); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  if (!snapshot?.state.isAdmin) return <Page><Heading>{t("Operations access required", "संचालन की अनुमति चाहिए")}</Heading>
    <Body>{t("This workspace is for accounts granted access by an operator.", "यह जगह उन खातों के लिए है जिन्हें ऑपरेटर ने अनुमति दी है।")}</Body></Page>;
  const workerName = (id: string) => data?.professionals.find((item) => item.id === id)?.name || id;
  const checkNames = {
    identity: t("Identity", "पहचान"),
    background: t("Background", "पृष्ठभूमि"),
    skills: t("Skills", "कौशल"),
  };
  const checkStatuses: Record<string, string> = {
    verified: t("Approved", "मंज़ूर"),
    expired: t("Expired", "समय सीमा समाप्त"),
    changed: t("Review again", "फिर से जाँचें"),
    rejected: t("Rejected", "अस्वीकृत"),
    revoked: t("Revoked", "रद्द"),
    not_checked: t("Pending", "लंबित"),
  };
  const unitNames = { visit: t("Diagnostic visit", "जाँच की विज़िट"), hourly: t("Per hour", "प्रति घंटा"), fixed: t("Package", "पैकेज") };
  return <Page><Section><Heading>{t("Marketplace operations", "बाज़ार संचालन")}</Heading>
    <Body>{t("Live records from the marketplace. Review each action before applying it.", "बाज़ार के वास्तविक रिकॉर्ड। हर कार्रवाई पहले जाँचें।")}</Body></Section>
    <Feedback error={error} />{!data && <Button secondary label={t("Load operations", "संचालन जानकारी लोड करें")} onPress={() => setRefresh((value) => value + 1)} />}
    {data && <>
      <Row>{Object.entries(data.metrics).map(([key, value]) => <Panel key={key}><Body small>{key.replace(/([A-Z])/g, " $1")}</Body><Heading size="medium">{value}</Heading></Panel>)}</Row>
      {data.pilotPricing && <Panel>
        <Heading size="small">{t("Dwarka pricing pilot", "द्वारका मूल्य परीक्षण")}</Heading>
        <Body>{data.pilotPricing.completed} / {data.pilotPricing.bookings} {t("bookings completed", "बुकिंग पूरी हुईं")}</Body>
        <Body>{data.pilotPricing.plusFulfilled} / {data.pilotPricing.plusCompleted} {t("completed Plus bookings delivered both fittings", "पूरी प्लस बुकिंग में दोनों नल लगे")}</Body>
        <Body strong>{t("Simulated fees on confirmed labour", "पक्के श्रम भुगतान पर परीक्षण शुल्क")} · {money(data.pilotPricing.shadowFees / 100)}</Body>
      </Panel>}
      <Panel>
        <Heading size="small">{t("Pricing limits", "मूल्य सीमाएँ")}</Heading>
        <Body>{t("Set the range workers can advertise and the maximum quote per booking, including materials. New limits apply to new requests.", "काम करने वालों की दर सीमा और सामान सहित हर बुकिंग की अधिकतम कीमत तय करें। नई सीमाएँ नए अनुरोधों पर लागू होंगी।")}</Body>
        <Button secondary label={showPricing ? t("Hide pricing limits", "मूल्य सीमाएँ छिपाएँ") : t("Manage pricing limits", "मूल्य सीमाएँ तय करें")}
          onPress={() => setShowPricing(!showPricing)} />
        {showPricing && data.pricingLimits?.map((limit) => {
          const key = "price:" + limit.service + ":" + limit.unit;
          return <Section key={key}>
            <Heading size="small">{service(limit.service, limit.service)} · {unitNames[limit.unit]}</Heading>
            <Body>{t("Advertised range", "दिखाई जाने वाली दर")} · {money(limit.minimum)}–{money(limit.maximum)}</Body>
            <Body>{t("Maximum booking total", "बुकिंग की अधिकतम कीमत")} · {money(limit.quoteMaximum)}</Body>
            {confirm === key ? <>
              <Field label={t("Minimum advertised rate (₹)", "न्यूनतम दर (₹)")} value={pricingDraft.minimum} keyboardType="number-pad" maxLength={6}
                onChangeText={(minimum) => setPricingDraft({ ...pricingDraft, minimum: minimum.replace(/\D/g, "") })} />
              <Field label={t("Maximum advertised rate (₹)", "अधिकतम दर (₹)")} value={pricingDraft.maximum} keyboardType="number-pad" maxLength={6}
                onChangeText={(maximum) => setPricingDraft({ ...pricingDraft, maximum: maximum.replace(/\D/g, "") })} />
              <Field label={t("Maximum total per booking (₹)", "प्रति बुकिंग अधिकतम कीमत (₹)")} value={pricingDraft.quoteMaximum} keyboardType="number-pad" maxLength={6}
                onChangeText={(quoteMaximum) => setPricingDraft({ ...pricingDraft, quoteMaximum: quoteMaximum.replace(/\D/g, "") })} />
              <Field label={t("Reason or pricing benchmark", "कारण या तुलना की कीमत")} value={reason} onChangeText={setReason} maxLength={220} />
              <Row>
                <Button label={t("Publish limits", "सीमाएँ लागू करें")} disabled={busy || reason.trim().length < 3 || !Object.values(pricingDraft).every(Boolean)}
                  onPress={() => void act("admin-price-limit", { service: limit.service, unit: limit.unit,
                    minimum: Number(pricingDraft.minimum), maximum: Number(pricingDraft.maximum), quoteMaximum: Number(pricingDraft.quoteMaximum), reason })} />
                <Button secondary disabled={busy} label={t("Cancel", "रद्द करें")} onPress={() => setConfirm("")} />
              </Row>
            </> : <Button secondary compact label={t("Edit limits", "सीमाएँ बदलें")} onPress={() => {
              setPricingDraft({ minimum: String(limit.minimum), maximum: String(limit.maximum), quoteMaximum: String(limit.quoteMaximum) });
              setReason(""); setConfirm(key);
            }} />}
          </Section>;
        })}
      </Panel>
      <Section><Heading size="medium">{t("Verification requests", "जाँच के अनुरोध")}</Heading>
        <Body>{t("Approve identity, background and skills before the worker can appear in customer search.", "ग्राहक खोज में प्रोफ़ाइल दिखाने से पहले पहचान, पृष्ठभूमि और कौशल की जाँच मंज़ूर करें।")}</Body>
        {!data.verification.length && <Body>{t("No requests waiting", "कोई अनुरोध बाकी नहीं")}</Body>}
        {data.verification.map((item) => {
          const person = data.professionals.find(({ id }) => id === item.worker);
          if (!person) return null;
          const approved = checkKinds.filter((kind) => person.trust.checks[kind]?.status === "verified").length;
          return <Panel key={item.worker}>
            <Heading size="small">{person.name}</Heading>
            <Body small>{service(person.service, person.service)} · {dateTime(item.requested)}</Body>
            <Tag tone={approved === checkKinds.length ? "success" : "warning"}>
              {approved}/{checkKinds.length} {t("checks approved", "जाँचें मंज़ूर")}
            </Tag>
            {checkKinds.map((kind) => {
              const status = person.trust.checks[kind]?.status ?? "not_checked";
              return <Section key={kind}>
                <Row>
                  <Body strong>{checkNames[kind]} · {checkStatuses[status]}</Body>
                  <Button compact secondary label={t("Review ", "जाँचें ") + checkNames[kind]}
                    onPress={() => { setReference(""); setExpiry(""); setConfirm("review:" + item.worker + ":" + kind); }} />
                </Row>
                {confirm === "review:" + item.worker + ":" + kind && <>
                  <Body small>{t("Review the evidence before recording this check.", "यह जाँच दर्ज करने से पहले प्रमाण देखें।")}</Body>
                  <Field label={t("Private evidence reference", "निजी प्रमाण संदर्भ")} value={reference} onChangeText={setReference} maxLength={160} />
                  <Field label={t("Expiry date (YYYY-MM-DD)", "समाप्ति तारीख (YYYY-MM-DD)")} value={expiry} onChangeText={setExpiry} />
                  <Row><Button disabled={busy || reference.trim().length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)} label={t("Approve check", "जाँच मंज़ूर करें")}
                    onPress={() => void act("admin-worker-review", { worker: item.worker, kind, status: "verified", reference, expiresAt: Date.parse(expiry + "T23:59:59+05:30") })} />
                    <Button secondary danger disabled={busy || reference.trim().length < 3} label={t("Reject check", "जाँच अस्वीकार करें")}
                      onPress={() => void act("admin-worker-review", { worker: item.worker, kind, status: "rejected", reference })} />
                    <Button secondary label={t("Cancel", "रद्द करें")} onPress={() => setConfirm("")} /></Row>
                </>}
              </Section>;
            })}
          </Panel>;
        })}
      </Section>
      <Section><Heading size="medium">{t("Open support requests", "खुले सहायता अनुरोध")}</Heading>
        {!data.support.length && <Body>{t("No open support requests", "कोई खुला सहायता अनुरोध नहीं")}</Body>}
        {data.support.map((ticket) => <Panel key={ticket.id}><Body strong>{ticket.category} · {ticket.job}</Body><Body>{ticket.message}</Body><Body small>{dateTime(ticket.created)}</Body>
          {confirm === "support:" + ticket.id ? <><Field label={t("Reply to customer", "ग्राहक को जवाब")} value={response} onChangeText={setResponse} multiline maxLength={1000} />
            <Row><Button disabled={busy || response.trim().length < 3} label={t("Send reply and close", "जवाब भेजें और बंद करें")}
              onPress={() => void act("admin-support-resolve", { id: ticket.id, owner: ticket.owner, response })} />
              <Button secondary label={t("Cancel", "रद्द करें")} onPress={() => setConfirm("")} /></Row></>
            : <Button secondary label={t("Reply", "जवाब दें")} onPress={() => setConfirm("support:" + ticket.id)} />}</Panel>)}</Section>
      <Section><Heading size="medium">{t("Safety reports", "सुरक्षा रिपोर्ट")}</Heading>
        {!data.reports.length && <Body>{t("No open reports", "कोई खुली रिपोर्ट नहीं")}</Body>}
        {data.reports.map((report) => <Panel key={report.id}><Body strong>{workerName(report.worker)} · {report.job}</Body><Body>{report.message}</Body>
          {confirm === "report:" + report.id ? <><Field label={t("Reporter-safe resolution", "रिपोर्ट करने वाले के लिए समाधान")} value={reason} onChangeText={setReason} multiline maxLength={1000} />
            <Row><Button disabled={busy || reason.trim().length < 10} label={t("Resolve report", "रिपोर्ट का समाधान दर्ज करें")}
              onPress={() => void act("admin-report-resolve", { id: report.id, reason })} /><Button secondary label={t("Cancel", "रद्द करें")} onPress={() => setConfirm("")} /></Row></>
            : <Button secondary label={t("Record resolution", "समाधान दर्ज करें")} onPress={() => setConfirm("report:" + report.id)} />}</Panel>)}</Section>
      <Section><Heading size="medium">{t("Professionals", "काम करने वाले")}</Heading>
        {data.professionals.map((person) => <Panel key={person.id}><Heading size="small">{person.name}</Heading><Body small>{service(person.service, person.service)} · {person.trust.suspended ? t("Suspended", "निलंबित") : !person.published ? t("Paused", "रुका हुआ")
          : person.pricingBlocked ? t("Rates outside ASAAN limits", "दरें आसान की सीमा से बाहर हैं")
          : snapshot.state.requireVerification && !person.trust.eligible ? t("Verification required", "जाँच ज़रूरी") : t("Published", "प्रकाशित")}</Body>
          {confirm === "suspend:" + person.id ? <><Field label={t("Reason for action", "कार्रवाई का कारण")} value={reason} onChangeText={setReason} multiline maxLength={300} />
            <Row><Button danger disabled={busy || reason.trim().length < 10} label={person.trust.suspended ? t("Confirm reinstatement", "बहाली की पुष्टि करें") : t("Confirm suspension", "निलंबन की पुष्टि करें")}
              onPress={() => void act("admin-worker-suspend", { worker: person.id, suspended: !person.trust.suspended, reason })} />
              <Button secondary label={t("Cancel", "रद्द करें")} onPress={() => setConfirm("")} /></Row></>
            : <Button secondary danger label={person.trust.suspended ? t("Reinstate", "बहाल करें") : t("Suspend", "निलंबित करें")} onPress={() => setConfirm("suspend:" + person.id)} />}</Panel>)}</Section>
      <Section><Heading size="medium">{t("Account deletion requests", "खाता हटाने के अनुरोध")}</Heading>
        {!data.deletionRequests.length && <Body>{t("No requests", "कोई अनुरोध नहीं")}</Body>}
        {data.deletionRequests.map((item) => <Panel key={item.owner}><Body>{item.owner}</Body><Body small>{dateTime(item.requested)}</Body>
          <Body small>{t("Handle this request through the approved account deletion process. This dashboard does not delete records.", "इस अनुरोध को स्वीकृत खाता हटाने की प्रक्रिया से सँभालें। यह डैशबोर्ड रिकॉर्ड नहीं हटाता।")}</Body></Panel>)}</Section>
      <Section><Heading size="medium">{t("Recent audit", "हाल की कार्रवाई")}</Heading>
        {data.audit.map((entry, index) => <Body key={entry.created + ":" + index} small>{dateTime(entry.created)} · {entry.action} · {entry.subject}</Body>)}</Section>
    </>}
  </Page>;
}
