# HandyHive: survey-led improvement plan for Sol

Prepared 15 November 2026. Planning only; no product code changed or tests run for this plan.

## Recommended direction

Make HandyHive a place to find a suitable available worker, agree the job and price, and keep both sides informed through completion and payment. Build on the current Expo app and shared backend.

The first release should prioritize:

1. **Suitable workers with real appointment availability.** Show task specializations, service areas, experience, and available slots. Let customers choose price sorting rather than making cheapest-first the default.
2. **A shared job agreement.** Separate the diagnostic visit charge from repair charges, state who brings materials, and require approval for extra work or a changed price.
3. **Clear payment records for both sides.** Show the agreed bill, customer-reported payment, worker-confirmed receipt, and outstanding amounts without claiming the app has processed or guaranteed payment.
4. **Recoverable appointments.** Let either side propose a new time, let workers cancel before work starts with a reason, and provide a visible route to help when work goes wrong.
5. **Repeat relationships and reliable updates.** Make it easy to return to a known worker and get booking updates outside the app once delivery is tested.

Keep the MVP small: existing categories, one primary service per worker, scheduled bookings, text-based task details, quotes, and direct payments. Build in the sequence below; each slice should work end to end before the next. Supply onboarding and support operations are part of a useful pilot, because UI changes alone cannot create worker availability or guarantee regular earnings.

## Evidence and limits

Sources are the supplied PDF exports, not the linked live forms:

- **W:** `C:\Users\adity\Downloads\Home Service Workers Work Experience Survey.pdf`, 15 respondents, 7 pages.
- **C:** `C:\Users\adity\Downloads\Home Services – Customer Experience Survey.pdf`, 24 respondents, 8 pages. Customer question 7 has 23 responses.

The surveys are directional research, not a representative estimate of the Delhi market. Recruitment, demographics, device ownership, preferred language, and respondent-level cross-tabs are unavailable. Multiple-choice totals can exceed 100%; overlapping problem categories must not be added together as unique people. Open-ended answers vary in count and supply examples rather than prevalence estimates.

Several chart labels are truncated in the original PDFs. In particular, W Q6 contains two different “Disagreement about the…” rows; their subjects cannot be recovered and are not attributed to price or scope here. W Q9 says all 15 have never used an online platform, but its conditional Q10 has 2 answers. C Q10 has only 4 platform users, but its conditional Q11 has 12 answers. Exclude both conditional complaint questions from quantitative prioritization. The findings do not establish poor literacy or a preferred language; simpler onboarding is a design hypothesis to test.

| Evidence | Product implication | Existing capability and needed change |
| --- | --- | --- |
| C Q6, p3: unavailable workers 10/24; unsure about skill 8/24. C Q8, p3: skill/experience 9/24, trust 8/24, quality 7/24, low price 5/24. | Match the actual task and show a usable appointment before asking for a booking. Price is one choice criterion. | Coverage and slot validation exist. Add declared task specializations, early slot selection and comparison; replace unconditional ascending-price order. |
| C Q6, p3: higher-than-expected price 7/24; unclear price 6/24. W Q13–14, pp5–6: explicit requests for price agreement, clear expectations and materials preparation. | Make price and scope a shared, durable agreement. | Rate/unit/tier snapshots exist; itemized quotes, exclusions and approvals do not. |
| W Q7, p3: payment problems sometimes 11/15, often 2/15, rarely 2/15. W Q6, p3: delayed payment 8/15. W Q12, p5: better payment 13/15; faster payment 8/15. | Preserve the agreed amount and make pending payment visible. | Payments are arranged directly. Add an acknowledgement ledger and balance; processor integration is a later decision. |
| W Q4, p2: work sometimes available 7/15 and often irregular 2/15. W Q12, p5: more customers 10/15, nearby jobs 8/15, regular work 7/15. | Help suitable local workers be found and retained; avoid promises of guaranteed work. | Declared service areas and rebooking exist. Improve exposure, favorites and worker summaries. |
| C Q4, p2: local/known workers 17/24. C Q9, p4: recommendation option 12/24, previous experience 10/24, experience/qualifications 9/24; no reliable trust method 6/24. | Make previous experience and evidenced work visible. | Completed-booking stars exist. Add task skills and repeat-worker access; distinguish self-declared experience from verification. |
| C Q6, p3: late workers 6/24 and no-shows 6/24. C Q13–14, pp6–7: reliability and completion on time recur. W Q13, p5 describes interrupted/incomplete work. | Add rescheduling, interruption/help records and truthful updates. | Worker status updates exist; rescheduling and recovery paths are missing. |
| W Q14, p6: a respondent worries competitive pricing reduces earnings. W Q12, p5: fair commission 7/15. | Preserve worker-set rates and disclose any fee before agreement. | Workers set rates already. No reverse auction, forced discount, or invented commission policy. |
| C Q2, p1: electrical 19/24, plumbing 16/24, carpentry 12/24, AC/appliance 12/24. | Start with existing electrical/plumbing supply; validate carpentry and AC as the next categories. | Current backend has electrical, plumbing, cleaning and painting only. Category expansion needs real workers and complete catalog support. |

## Current code baseline

The Git repository is the nested `C:\Users\adity\OneDrive\Desktop\ddr_website\ddr_website` folder. No applicable `AGENTS.md` was found in the repository or checked ancestors. Existing modified and untracked files are part of the working baseline; preserve them. Earlier planning files are historical context, not proof of current functionality. This plan supersedes earlier product priorities only where they conflict with these research findings.

| Area | Current source and behavior |
| --- | --- |
| Native app | `mobile/app/` uses Expo Router and React Native. One account supports customer and worker experiences; English/Hindi are already available. |
| Domain/backend | `marketplace.js` owns booking transitions, IST schedules, travel buffers, blocked time, coverage, expiry and offer snapshots. `server.js` serves both legacy `/api/` and native `/api/v1/`. SQLite stores accounts and auxiliary tables; profiles and bookings live in a shared JSON record. |
| Sessions and retry | `mobile/src/session.tsx`, `api.ts`, `booking-action.ts`, `booking-chat.tsx` provide sessions, foreground polling, revisions and operation-ID retries. Server transactions persist successful booking commands and their operation IDs together. |
| Discovery | `mobile/app/services/[id].tsx`, `tasks/[id].tsx`, `src/discovery*.tsx`, `src/catalog.ts`, `src/location.tsx` support public browsing, tasks, coverage, budget filters and tiers. Worker results currently sort by starting price. Profile `service` is singular; task specializations are absent. |
| Booking | `mobile/app/request/[id].tsx` checks slots and captures a tier/rate/unit plus name, address and notes. `bookings/[id].tsx` handles progress, chat, customer cancellation, worker duration estimates, rating and rebooking. “Estimate” currently means duration, not a financial quote. |
| Privacy | `server.js:bookingForAccount()` hides name/address/landmark/notes from workers until acceptance. Preserve this boundary while introducing a separate limited task brief. Do not move all existing private notes into public or pre-acceptance data. |
| Worker tools | `worker.tsx` lists incoming/current/past jobs. `worker-profile.tsx` edits a single service, rates, optional Plus, hours, blocks and immediate availability. It is a long form. No earnings/payment summary exists. |
| Reviews/updates | Completed-booking numeric reviews and saved addresses exist. `booking-updates.js` records selected status changes and optional SMS delivery. Server expiry already runs independently of SMS. Native push, support cases, genuine worker verification and payment processing are absent. |

Retain the existing architecture for the pilot. Do not bundle a framework rewrite, a new database server, or a separate worker app into this work.

## Implementation sequence

### Slice 0 — Preserve the baseline and define extension contracts

**Purpose:** make the new behavior compatible with existing accounts and bookings.

- Read `git status` and the current diff before editing. Do not reset, overwrite or commit unrelated changes. Review the existing Node tests and mobile README; establish the current test/typecheck result when implementation begins.
- Add a versioned database migration runner, e.g. `migrations/` plus `db-migrations.js`, invoked by `server.js`. Back up the pilot database before a migration; test on a copy. Add fields with explicit legacy defaults rather than rewriting historical agreements.
- Give newly created bookings an `agreementVersion: 1`; old bookings remain legacy bookings with their existing rate snapshot and behavior. Never invent a historically approved quote or payment for them.
- Keep booking-domain changes in `marketplace.js` or focused new domain modules called from the same transaction. Add typed contracts in `mobile/src/api.ts` and shared validation per command.
- Preserve native and legacy authorization. A legacy API request must not bypass an approval rule on a version-1 booking. Legacy pages need either compatible display/action support or a clear app-only handoff for those bookings; server enforcement is mandatory in both cases.

**Exit:** a database fixture with old profiles, bookings, reviews and sessions opens after migration; existing appointments still work; a version-1 booking cannot bypass approval through the legacy endpoint.

### Slice 1 — Find a worker who fits the task and appointment

**Evidence:** customer skill/availability findings; worker demand for customers and nearby jobs.

- Add optional `specializations` as validated task IDs within the worker's existing primary service. Keep descriptions and years of experience, but label them as supplied by the worker. Existing workers with no selections display “Task skills not yet specified”; do not silently claim every task in their trade.
- Let the customer choose locality, task and desired day/time before the worker list. Reuse the server's slot logic to return availability for the chosen task/time; recheck at booking creation and acceptance. A profile's `immediate` flag alone must not mean “available now.”
- Show task fit, service area, years of experience, completed-booking rating/count, billing unit, minimum charge, and the selected or next checked slot together. Do not imply exact distance from locality coverage; there are no live worker coordinates.
- Default ordering: eligible task matches with a checked slot first, then a stable neutral order. Keep “Starting price: low to high” as an explicit option. Do not exclude new workers for lacking ratings or use unmeasured reliability scores.
- When nobody is available, offer another time, a related task or another area with an explicit customer choice. Do not silently broaden coverage or book a substitute.
- Split worker onboarding into short sections: service and task skills; areas/hours; rates; review/publish. Retain English/Hindi, clear errors and drafts without treating survey non-use of platforms as a literacy finding.

**Files:** `marketplace.js`, `server.js` profile validation/catalog/availability handlers; `mobile/src/api.ts`, `catalog.ts`, `discovery-ui.tsx`, `language.tsx`; `mobile/app/services/[id].tsx`, `tasks/[id].tsx`, `worker-profile.tsx`, `request/[id].tsx`.

**Exit:** selecting a plumbing task and a booked time cannot show that worker as available; changing hours or another acceptance invalidates a stale selection cleanly; customers can select price sorting; workers without ratings remain discoverable; unselected/unknown specializations are presented honestly. Keep one primary service for this slice.

### Slice 2 — Agree scope, materials and price before chargeable work

**Evidence:** explicit worker requests for agreement/materials readiness; customer price and quality uncertainty.

**Customer flow:** select task → provide a short structured brief → review visit/package terms → send request → review any worker quote → approve or reject → follow the agreed work.

**Worker flow:** read task/area/time/charge before acceptance → confirm or clarify scope → inspect if needed → send an itemized quote → see the customer's approval → start the agreed repair/work.

- Add a task brief with problem description, quantity when relevant, materials responsibility (`customer`, `worker`, `decide_after_inspection`), readiness (`ready`, `not_ready`, `unknown`) and an optional preparation checklist. Mark the brief as shared with the selected worker before acceptance; warn inline against putting address/phone details there. Keep exact address and private access instructions in the existing protected details field. No photos or uploads required for MVP.
- Show a shared agreement card with task, exclusions, agreed appointment, duration, visit/base fee, unit/minimum, materials responsibility, fee treatment and payment timing. Material responsibility can remain undecided for an inspection, but must be resolved in the repair quote before repair work starts.
- Preserve the current tier/rate snapshot. For diagnostic services, approval of the request covers only the stated diagnostic visit. Worker arrival permits inspection; repair `start` requires a separately accepted quote. Declining repairs leaves only the previously disclosed diagnostic charge, subject to any explicit agreed credit.
- Add an explicit diagnostic-only completion action after inspection when repairs are declined or unnecessary. It closes the visit with a diagnostic-only outcome and a bill for only the originally disclosed visit charge; it must not fabricate repair approval or force a repair `start` transition merely to reach `completed`. Both participants see the outcome and can raise a disagreement.
- For fixed packages, freeze inclusions and the total in the initial accepted agreement. For hourly work, record planned quantity and an approved spending cap; preserve the existing two-hour minimum. Extra time/quantity cannot silently increase the approved amount.
- Worker quotes use bounded line items, exclusions, expected duration, materials, and any visit-fee credit. The server calculates totals in integer paise. Quotes are immutable versions: draft → sent → accepted/rejected/superseded. Record actor/time and the exact version accepted. Use a new command name for quotes; do not overload the duration `estimate` endpoint.
- A revised quote must clearly show the difference. Keep the previously accepted agreement authoritative while a revision is pending. Work already approved may continue; the unapproved extra work may not. Start/completion/billing guards must use the approved scope and cap, not just the newest draft.
- Separate scheduling duration from billable hours. Approval of a longer job also checks schedule conflicts in the same transaction; a worker cannot overwrite the agreed duration unilaterally through the old estimate route.
- The final bill references the accepted quote, cannot exceed its approved cap, and credits any diagnostic fee exactly once. Disagreement opens a help case; completion alone is not proof of payment.

**Files:** `marketplace.js`; proposed `job-agreements.js`; `server.js`; `mobile/src/api.ts`, `booking-action.ts`, `session.tsx`; `mobile/app/request/[id].tsx`, `bookings/[id].tsx`; proposed `mobile/src/job-agreement.tsx` and `job-quote.tsx`.

**Exit:** a ₹300 diagnostic visit plus ₹800 repair with a ₹300 visit credit displays a ₹800 total, never ₹1,100 or ₹500. Test the equivalent no-credit case. Changing the worker's profile rate does not change an existing agreement. A stale quote approval returns a conflict; a retry creates one approval; a worker cannot start an unapproved diagnostic repair or add unapproved charges. Both roles see materials responsibilities before departure.

### Slice 3 — Track bills, payment acknowledgement and unresolved work

**Evidence:** better/faster payment is a major worker priority; customers need recourse for poor or incomplete work.

- Keep payment outside the app for this release. Display “Pay the worker directly” and the agreed method/timing. Do not add a payment button that implies processor integration, escrow or guaranteed payout.
- Add a payment record against a specific bill: amount, method (`cash`, `upi`, `other`), time and reporter. Customer “I paid” produces **payment reported**, not **paid**. Worker acknowledgement produces **receipt confirmed**. A worker can record money received directly, labeled as a worker declaration. Preserve event history; corrections use reversal/replacement records, not deletion.
- Allow partial payments and calculate the remaining balance server-side. Prevent duplicate acknowledgements, over-allocation, negative amounts and client-supplied totals. A rejected claim remains visible as disputed; it does not reduce the confirmed outstanding amount. Do not store full payment credentials or collect banking details for this ledger.
- In `worker.tsx`, show upcoming agreed work value, completed billed value, confirmed receipts and outstanding balance separately. Avoid calling booked or quoted value “earned” and never calculate actual earnings from the starting profile rate.
- Add booking-linked help for late/no-show, scope/price disagreement, payment and incomplete work, accessible to either participant. Minimum record: reporter, category, message, state, timestamps and resolution history. Keep it private to participants and authorized support; no public customer blacklist.
- Acknowledge receipt of a help request honestly. Before a live pilot, configure a real support contact and an operator queue with access control; a preview must say support is not staffed. No invented response-time, refund or workmanship guarantee.
- For interrupted work, record the reason and agreed next step in the help flow. The MVP must not falsely mark incomplete work completed. Multi-day pause/resume scheduling is a later slice; a follow-up visit needs a new mutually agreed slot and preserved link to the original job.
- Opening an interruption/help case must not silently free the worker's reservation. Keep it occupied until an explicit mutually agreed reschedule/cancellation or authorized, recorded resolution changes it. Because the present scheduler represents active work using a duration interval, ensure unresolved interrupted work also blocks conflicting new work rather than becoming available merely when that interval elapses. Show this to the worker and route resolution through the staffed pilot process; do not use a false completion to clear the calendar.

**Files:** proposed `payment-records.js`, `support-cases.js`, migrations; `server.js`; `mobile/src/api.ts`, `session.tsx`; `mobile/app/worker.tsx`, `bookings/[id].tsx`, `account.tsx`; proposed `mobile/src/booking-payment.tsx`, `booking-help.tsx`. Use a minimal local/operator interface before building a full admin dashboard.

**Exit:** reporting payment never marks funds received; one confirmed partial payment changes the balance once across retries/restarts; an unrelated account cannot read or modify a bill/case; a worker can find outstanding payments; both roles can report incomplete work after a booking is closed. No real support promise appears without configured operations.

### Slice 4 — Reschedule, cancel and deliver truthful updates

**Evidence:** availability, lateness and no-shows; worker scheduling and interruption concerns.

- Either participant may propose a new time/duration before work starts. Store proposer, version, requested slot, reason and expiry. The current appointment stays confirmed until the other participant accepts. Revalidate the candidate slot atomically on acceptance and release the old reservation only after successful replacement. A proposal does not reserve a second slot.
- Allow worker cancellation with a reason in accepted/en-route/arrived states, symmetrically with existing customer cancellation before work starts. Do not add unilateral cancellation of in-progress work; route that through help. Record actor/reason/time and tell the affected participant.
- Retain a simple disclosed MVP cancellation policy with no automatic fines or cancellation charge. Do not introduce charges from survey findings alone. Any future policy must be separately agreed and shown before booking.
- Show worker-reported delay/arrival estimates with timestamp and source; never label them live GPS. If an estimate is stale, show that. Offer another time or a fresh search after decline/cancellation/expiry; never automatically submit requests to multiple workers.
- Extend booking events to quote decisions, reschedules, payment claims and help updates. Current `booking_updates` uses `(owner, job, status)` and cannot represent repeated revisions of the same event. Add unique event IDs, event kinds and entity versions plus separate delivery records. Record the state change and event in the same transaction.
- Add native device registration/push only as a separately tested delivery consumer; notification taps fetch current authorized booking state. Bind tokens to accounts/devices, revoke on sign-out, avoid personal details in payloads, and handle denied permissions and expired tokens. Reuse SMS only when configured and opted in. Neither push nor SMS is proof a person has seen an update.
- Keep immediate jobs disabled for a real pilot until background delivery and the existing three-minute response window work on physical devices. Scheduled-only testing may proceed first with staffed/manual coordination; a self-service pilot needs a demonstrated external delivery path.

**Files:** `marketplace.js`, `server.js`, `booking-updates.js`, `twilio.js` as needed; proposed `booking-events.js`/delivery module; `mobile/src/api.ts`, `session.tsx`, `appointments.ts`; `mobile/app/bookings/[id].tsx`, `worker.tsx`, `account.tsx`, `_layout.tsx`; device configuration/dependencies only after selecting the notification mechanism.

**Exit:** two simultaneous reschedule approvals cannot double-book; rejecting/expiring a proposal preserves the old time; worker cancellation notifies the customer; delayed notification taps never resurrect cancelled bookings. Test closed app, permission denial, sign-out/account switch, delayed delivery and restart before enabling immediate requests.

### Slice 5 — Retain known workers and validate the pilot

- Add private saved workers and a “Book again” entry point for previous completed jobs. Reuse existing rebooking behavior; fetch current rates, publication, areas and slots. Do not copy a past price or mark a paused worker available.
- Keep completed-job reviews tied to real bookings. Add a few optional structured quality/on-time/price-as-agreed prompts if participants find them useful; show response counts and avoid public reliability percentages from a handful of jobs. Free-text public reviews and moderation can wait.
- Offer an optional shareable public profile link through the device share action after the user initiates it. Do not auto-message contacts or publish personal phone numbers. Reputation should come from actual records; phone OTP and self-entered `credential` text are not skill/background verification.
- Run a small moderated pilot, suggested 5 workers and 5 customers across electrical/plumbing in a limited service area. This is a proposed usability sample, not a statistically representative target. Recruit from actual available supply, confirm quoted prices and task definitions, and observe an entire booking on real devices.
- Include a customer who changes scope, a worker who brings materials, a failed connection, a late arrival, a reschedule, a partial payment and a return booking. Check English/Hindi and small-screen/large-text use. Device/platform needs must be confirmed rather than inferred from survey answers.

**Files:** migration for `saved_workers`; `server.js`; `mobile/src/api.ts`, `session.tsx`; `mobile/app/account.tsx`, `services/[id].tsx`, `bookings/[id].tsx`, `worker.tsx`; a short operator/pilot runbook.

**Exit:** a customer finds and books a previous worker using current terms; a paused worker stays unavailable; pilot participants can explain the visit charge, repair total, materials responsibility and payment status without prompting. Address recurring misunderstandings before adding more services.

## Data/API implementation notes

These are proposed contracts, not existing endpoints. Sol should finalize small types and validation before each slice, retaining the current `/api/v1/<action>` convention.

| Area | Minimum data / proposed commands |
| --- | --- |
| Worker/task discovery | `Profile.specializations: taskId[]`, explicit catalog task IDs and public self-declared skill labels; extend `profile` and availability reads. Ensure UI catalog and server task validation stay consistent. |
| Task agreement | `agreementVersion`, limited shared brief, protected visit details, initial pricing/scope snapshot, materials owner/readiness. Extend `request` and its fingerprint; keep old request contracts readable. |
| Quotes | Immutable versions with currency, bounded line items in integer paise, total/cap, diagnostic credit, inclusions/exclusions, billable quantity, estimated minutes and acceptance actor/time. Commands `quote-send`, `quote-respond`; expected version required. |
| Billing/payment | Bill tied to approved agreement/version; immutable payment events with claim/receipt/rejection/reversal references. Commands `bill-finalize`, `payment-report`, `payment-confirm`, `payment-dispute`; actor permissions derived from session. |
| Scheduling | `reschedule` proposals/history and cancellation metadata. Commands `reschedule-propose`, `reschedule-respond`, and extended `transition`; expected booking/proposal version. |
| Support/repeats | `support_cases`, case history and account-owned `saved_workers`. Commands `help-create`, `help-message`, operator-only resolution, `save-worker`, `remove-worker`. |
| Updates | Transactional `booking_events`, recipient deliveries and optional device registrations. Bounded reads; events identified by unique ID and entity version, not status alone. |

For the bounded pilot, additive brief/quote/bill/reschedule fields may stay inside the existing booking JSON so domain changes remain atomic. Use relational tables for payment events, support cases, saved workers and delivery records where uniqueness/history are valuable. State clearly which record is authoritative; avoid independently mutable duplicate totals. A full normalization of all marketplace data is deferred.

Technical requirements across slices:

- **Operation IDs:** reuse `native_operations` for new booking commands. Its current field checks accept strings plus a few integer fields; structured briefs/line items require typed validation and deterministic canonical fingerprints. Include all meaning-changing fields; reject reuse with a different payload. Do not silently drop arrays/objects from the fingerprint. Generalize the stored result if a command returns a case/proposal ID as well as a booking ID.
- **Revisions:** current marketplace revision advances when the JSON store changes. Payment/support/favorite/review table changes must also advance the relevant snapshot revision in the same transaction. Old responses must not overwrite newer side-table state. Preserve account scoping and server time.
- **Authorization:** authorize from account ownership, never a caller-supplied role alone. Validate quote/payment/reschedule commands on the server. Public discovery exposes only allowlisted profile fields; personal details, payment history, support history and device tokens never belong in that response.
- **Privacy:** preserve post-acceptance address access and keep private notes distinct from the shared task brief. Show users what will be shared. Logs/analytics must exclude addresses, phone numbers, messages and payment notes.
- **Money:** use integer paise for new financial records and one explicit conversion from existing rupee profile rates. Server computes all totals, minimums, credits and balance. No floating point money or hidden fees. Keep any future fee policy explicit and versioned.
- **Compatibility:** do not block existing historical jobs on missing new fields. Do enforce version-1 agreement constraints regardless of whether the action comes from the app or legacy website. Feature flags should not remove access to agreements already created.
- **Offline behavior:** preserve current draft/retry protections. Quotes, acceptance and payment confirmations show pending/unknown until acknowledged by the server; never pretend a failed request succeeded. A retry must survive reopening the app without duplicate money or approvals.
- **Bounded growth:** cap brief/quote/message sizes and read history in bounded pages as these records grow. Keep the single-instance SQLite pilot, measure lock time and payload size, and revisit normalized booking storage only when observed load requires it.

## Verification and release checks for implementation

Run `node --test` in the repository root; run `npm run typecheck` and `npm run export:web` in `mobile/`. Build the Android JavaScript bundle and run an installed-device flow before a device pilot, following `mobile/README.md`. Run tests against an isolated database, never the user's active preview store. A baseline failure should be recorded separately from a regression caused by this work.

Extend `test/marketplace.test.js` for agreement/state/schedule invariants and `test/native-api.test.js` for access, migration, money, retries and cross-client consistency. Add focused tests for the new domain modules only where they cover real business rules. In particular:

1. Old database/old booking migration and unchanged offer snapshots.
2. Task/area/slot eligibility at display, request and acceptance; competing bookings and reschedules.
3. Quote version races, approval after a lost response, duration conflicts and server-enforced start guards through both APIs.
4. Diagnostic credits, hourly cap/minimum, partial payments, duplicate reports, reversals and restart persistence.
5. Unrelated-account denial, public/private payload separation, post-acceptance details and support access.
6. Event/outbox atomicity, repeated quote/reschedule events, stale responses and side-table revisions.
7. Existing chat retries, cancellation, expiry, English/Hindi persistence and completed-booking reviews remain functional.

Manually exercise both roles in two independent sessions, then physical devices. Check font scaling, keyboard, touch targets, screen reader labels, Android back behavior, offline drafts and account switching. Test server authority rather than only disabling buttons.

Pilot release gates are a successful two-person flow, migration/restore check, a real support owner, a tested notification/contact path, truthful pricing/payment copy, HTTPS with persistent storage, and real phone authentication when opening to real users. Existing README notes on device/SMS setup remain applicable; this planning pass does not certify them as complete.

## Measure whether this helps

Use privacy-minimized events and aggregated counts, with demo/test bookings excluded. Capture the first pilot baseline before setting numerical improvement targets.

| Question | Measure |
| --- | --- |
| Can customers find suitable help? | Searches yielding a task-and-slot match; time to accepted booking; unfilled requests by task/area. |
| Are price and scope clearer? | Quote acceptance/revision rate; price/scope help cases per completed or started job; participant comprehension in usability sessions. |
| Are payments clearer/faster? | Time from finalized bill to worker-confirmed receipt; outstanding balance; disputed claims. These are app-recorded declarations, not bank settlement data. |
| Is work more dependable? | Accepted jobs completed; cancellations by actor/reason; reschedules; reported late/no-show incidents. Separate worker-reported times from customer reports. |
| Do workers benefit? | Confirmed receipts per active worker, repeat bookings, booked working hours and workers with no suitable leads. Do not infer income gains from app signups. |
| Does communication work? | Delivery outcome by channel, stale notification opens, retry conflicts, and unresolved help cases. Delivery is not user acknowledgement. |

## Deferred scope and decisions to validate

- **Real payment collection, escrow, deposits, refunds and guarantees:** require a selected provider, money-flow design and operational policy. The MVP payment ledger does not solve payment default; validate whether records alone improve outcomes before this investment.
- **Identity/skill verification, document uploads and portfolio photos:** define who checks evidence and what any badge means first. MVP shows truthful self-declared skills and completed-booking evidence.
- **Carpentry and AC/appliance categories:** next candidates from the sample, after onboarding real supply and agreeing tasks/pricing. Keep cleaning/painting working. No category tiles implying available workers where there are none.
- **Multiple service listings per worker:** useful hypothesis given the worker service question allowed multiple selections. Validate need first; a later `serviceOffers[]` model must retain one shared worker calendar across trades and migrate existing profile IDs/rates safely.
- **Paused/multi-day projects, recurring schedules and automatic repeat bookings:** need explicit multi-visit reservations and agreement handling. Start with manual rebooking and linked follow-up visits.
- **Live GPS, exact-distance ranking, masked calls, voice notes, contact imports, subscriptions, bidding and paid ranking:** not required for the first survey-driven release. A directory request mentioning phone numbers does not authorize publishing workers' phone numbers.
- **New languages and iOS release timing:** confirm participant preferences/devices. Keep the existing English/Hindi implementation and cross-platform source; do not infer demand from the sample.
- **Worker commission, cancellation fees and support turnaround:** unresolved business choices. Current scope preserves direct worker-set prices and adds no automatic fee or promise.

## Copyable Sol starter prompt

> Implement `SURVEY_IMPROVEMENT_PLAN.md` in this repository, starting with Slice 0 and Slice 1 as the first reviewable milestone. Read the current working tree and preserve all pre-existing changes. Treat the existing Expo app, Node API and SQLite store as the baseline. Do not rewrite the app or implement deferred features. For each slice, implement the server rules, typed contracts and both customer/worker screens together, then run its acceptance checks and the relevant existing tests. Preserve legacy bookings, address privacy, English/Hindi, idempotent retries and current offer snapshots. Report the files changed, verification results and unresolved external setup. Once the first milestone passes, continue through the remaining MVP slices in dependency order within the authorized task; use real operational configuration only when available and never present unimplemented payments, verification, support or notification guarantees as working.
