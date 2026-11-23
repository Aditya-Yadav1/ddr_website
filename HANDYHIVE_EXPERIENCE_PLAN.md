# HandyHive experience plan

Prepared 14 November 2026. Implementation status updated below.

## Implemented in the local preview

The redesigned home, persistent location control, bilingual task and worker search, grouped task catalogue, task details, task-to-worker handoff, guest discovery, return to selection after sign-in, compact worker offers, Plus discovery, promise block, collections, repeat booking, saved Home/Work addresses, and completed-booking star ratings are implemented. Popularity aggregates use a 90-day window, ten-booking minimum, and exclude demo accounts; the preview uses curated home essentials until eligible data exists. Guest reads exclude personal bookings and addresses. Integration tests cover guest privacy, saved-address isolation, rating eligibility, duplicate ratings and the popularity threshold.

The catalogue currently groups the existing sixteen supported tasks, with general scope guidance. Worker pricing and Plus extras remain profile-wide. Task-specific offers, structured variants and detailed per-task scope, written reviews/moderation, combined visits, recorded extra-work quotes, verification/support operations and guarantees remain roadmap work. The existing single-task booking and scheduling rules continue to apply.

## Direction

Make HandyHive a welcoming place to understand and book a specific home service, with a clear local worker choice. Our identity: **Local hands. Clear choices. A home well cared for.**

Use warm ivory, forest green, restrained peach accents, original service photography or illustrations, and clear English/Hindi language. Keep champagne detailing for Plus. Everyday should feel complete and dependable; Plus buys explicitly listed additional work. Both receive the same platform safeguards and support standards as those capabilities become available.

## Reference observations

Urban Company's [Delhi NCR homepage](https://www.urbancompany.com/delhi-ncr) foregrounds location, category discovery, featured collections and most-booked service cards. Its [plumbing catalogue](https://www.urbancompany.com/delhi-ncr-plumbers) groups specific jobs by fixture or problem. The [cleaning catalogue](https://www.urbancompany.com/delhi-ncr-professional-cleaning-services) explains scope, exclusions and variants. The [electrician page](https://www.urbancompany.com/delhi-ncr-electrician-density) combines subcategories, individual services, a cart, customer reviews and a promise block.

These are patterns observed in the accessible page content, not an end-to-end checkout audit. Prices and availability are location-dependent. The plan below is our proposed design, not a claim about Urban Company's internal systems. Develop our own copy, images and layouts.

## Current starting point

- Four categories: plumbing, electrical, cleaning and painting, with flat task-name arrays.
- Home shows an introductory banner, location field, category cards, problem search and an active booking card.
- Choosing a category currently opens workers and rates; task selection happens inside the worker booking screen.
- Location suggestions, worker coverage checks, scheduling, chat, booking history and English/Hindi already exist.
- Everyday and Plus comparison cards now show shared benefits, provider-written extras and the price difference.
- Rates and Plus extras currently belong to a worker profile, rather than individual task offers.
- Browsing currently requires sign-in. Verified customer reviews, robust popularity aggregates, saved address management, formal worker verification and structured extra-charge approval require additional work.
- Payment is arranged directly with the worker. A diagnostic visit price is not a guaranteed total repair price.

## Proposed home screen, in order

| Position | Section | Behavior and HandyHive character |
| --- | --- | --- |
| 1 | Location header | Brand, selected locality and change control, language switch and account access. Keep locality visible during browsing; full address belongs in visit details. |
| 2 | Problem search | “What needs a hand?” Search tasks, categories and workers, including common English, Hindi and Hinglish aliases. Show results grouped by type. |
| 3 | Active booking | Compact status and next action for returning customers; absent when there is no active visit. |
| 4 | Short welcome feature | One calm image and useful message. Keep search and category choices reachable on the first screen of a typical phone. |
| 5 | Service categories | Four strong image tiles initially. Expand only when workers and task definitions are ready. |
| 6 | Most booked near you | Real eligible local services ranked by completed bookings. Use “Explore home essentials” with curated choices while there is insufficient data. |
| 7 | HandyHive promises | Three concise commitments, with a details link explaining exactly what each covers. |
| 8 | Useful collections | For example “Small fixes around home”, “Freshen up your space” and seasonal maintenance. Only show services available for the selected area. |
| 9 | A little more with Plus | A compact example of Everyday plus concrete extra work, leading to eligible services. Full comparison belongs later in the booking journey. |
| 10 | Book again | A previous worker and task when available. Recheck current coverage, offer and price before booking. |
| 11 | Reviews and help | Verified completed-booking reviews once implemented; useful FAQs and a real support route. |

Desktop: wider category grid and readable multi-column service cards. Phone: compact header, two-column categories, short horizontal collections with visible “See all” controls, and bottom navigation. Avoid a long stack of promotional banners. Images load progressively and have reserved dimensions to prevent layout jumps.

Location selection opens a sheet on phones and a dialog on desktop. Support manual search first, optional device location after an explicit tap, and saved Home/Work addresses later. Changing location rechecks coverage, offers and slots. Preserve the user's draft and explain any choices that became unavailable. Allow general catalogue browsing before location is chosen, clearly asking for an area before presenting local availability.

## Service structure and journey

Proposed hierarchy: **Category → Subcategory → Task → Variant, where needed → Worker offer → Everyday/Plus → Appointment → Review → Request.**

Skip unnecessary screens: a single-variant task can proceed directly to matching workers. A search result or most-booked card should deep-link to that task. Keep the existing worker-first route as an alternative for customers who already know whom they want.

| Category | Proposed subcategories | Example tasks |
| --- | --- | --- |
| Plumbing | Taps and fittings; drains and sinks; toilets; leak diagnosis | Leaking tap assessment, tap replacement, sink blockage, flush repair |
| Electrical | Fans; lights; switches and sockets; fault diagnosis | Fan installation, light fitting, socket repair, wiring inspection |
| Cleaning | Kitchen; bathroom; rooms; whole home later | Kitchen clean, bathroom clean, room clean, agreed hourly cleaning |
| Painting | Touch-ups; room painting; wall preparation; assessment | Wall touch-up, room assessment, damp-patch assessment |

These are proposed catalogue entries, subject to worker capability and scope validation. For example, an assessment of dampness must not imply that the booking fixes its underlying cause.

Task cards show an original image, task name, one-line scope, price type and minimum payable amount, and an indicative duration only when supported. Local “from” prices come from eligible published offers. Ratings appear only when genuine reviews exist; new offers receive neutral “New here” treatment.

Task details show inclusions, exclusions, preparation instructions, materials policy, pricing basis, relevant FAQs and a prominent “See local workers” action. Variants should reflect meaningful scope changes such as room size or fixture type. Keep optional extras distinct from the base service.

Worker comparison shows task eligibility, experience, languages, actual offer price and upcoming bookable slots. “Works in Saket” is appropriate when coverage is declared; distance and arrival-time claims need real location and availability data.

Start with one task/worker per booking. Add compatible tasks to the same visit only after combined duration, travel buffers, discounts, cancellations and worker acceptance work correctly. Cross-worker jobs remain separate appointments even if a later interface groups them.

## Everyday and Plus

Preserve the recent visual direction. On discovery cards use a compact price and extras teaser; show the complete comparison once the task and worker are known. This prevents every catalogue result becoming a large pricing table.

- Everyday: clearly state the selected service and included work in a confident ivory/sage card.
- Plus: retain the forest-green header, champagne accents and a scannable list of actual additional work.
- Show the upgrade amount in the same billing unit and display hourly minimums as amounts.
- Use task-specific extras. A worker's general Plus description must not imply irrelevant work is included in every task.
- Default to Everyday unless the customer explicitly selected Plus earlier. Preserve their choice through navigation and login.
- Confirm the exact chosen scope and extras in review and the saved booking.

Example using the current demo plumber: Everyday is a ₹449 diagnostic visit; Plus is ₹749 and adds checking nearby fittings and a written repair/parts estimate. Both remain diagnostic visits with repair and materials charges agreed separately. These are demo offers, not proposed production price points.

## Our promises

Use the title **“The HandyHive way”** and communicate commitments that the product and operations support.

| Commitment | Initial wording and supporting behavior |
| --- | --- |
| Clear scope and starting price | “Know what your visit includes.” Show inclusions, exclusions, billing unit and minimum before requesting; preserve reviewed terms. |
| Your choice of local help | “Choose who comes to your home.” Show eligible worker profiles and the customer's chosen worker in review. |
| Stay in the loop | “Your booking and conversation, in one place.” Provide chat and status updates; explain that a request becomes confirmed after worker acceptance. |

Later, add “Extra work with your approval” when there is a recorded quote/approval flow. Add verification badges with precisely defined checks only after checks have been performed. Any workmanship guarantee needs eligibility, duration, claim handling and an operational owner. Support-response promises need an actual staffed service. The same standards apply to Everyday and Plus.

## Popularity, reviews and repeat use

Most-booked ranking must be computed on the server across eligible completed bookings, not inferred from one customer's history. Proposed starting rule: trailing 90 days, minimum 10 completed non-demo bookings per eligible task in the named area; tune after pilot data. Exclude tests, cancellations, duplicates and suspicious activity. Filter out currently unavailable offers. Where local volume is too low, use a clearly labelled broader area or curated essentials. Never present a curated collection as a popularity ranking.

Reviews: one review per completed booking from its customer, rating plus optional text, private complaint route, moderation and reporting. Display review counts and avoid exposing home addresses or private booking notes. Label the basis of verification precisely: a verified booking is distinct from worker identity verification.

Book again pre-fills a previous task and worker but always checks the current offer. Useful seasonal collections are editorial suggestions rather than fabricated trending claims.

## Engineering plan

1. Introduce stable IDs for categories, subcategories, tasks and variants. Store bilingual labels, aliases, image references, inclusions, exclusions and price mode as structured data. Map old task strings and retain readable legacy bookings.
2. Extend worker onboarding to select supported tasks and publish task-specific offers with price, billing unit, minimum, duration, extras and an offer version. Require explicit confirmation of new fixed-price packages. Existing profile rates remain diagnostic/hourly/general offers until migrated deliberately.
3. Add a safe public catalogue/directory read path for browsing before login. Expose only public offer/profile fields; keep bookings, chat and addresses authenticated. Preserve draft selections across sign-in, then revalidate the offer.
4. Add area-aware task search and server aggregates. Paginate directory/review results. Keep personal account snapshots separate from public discovery data.
5. Extend the booking snapshot with task/variant IDs, quantity, selected offer version, scope, exclusions, tier, minimum and expected duration. Server validation owns pricing, quantity, eligibility, scheduling and stale-offer rejection. Preserve operation IDs and existing retry behavior.
6. Recalculate slot occupancy using the chosen task and extras. Add-on durations must participate in conflict checks before combined visits launch.
7. Implement saved addresses, completed-booking reviews and later extra-work quotes as separate features with account authorization and retention rules.

Primary source touchpoints: `mobile/app/index.tsx`, `mobile/app/_layout.tsx`, `mobile/src/location.tsx`, `mobile/app/services/[id].tsx`, new task-detail screens, `mobile/src/service-options.tsx`, `mobile/app/request/[id].tsx`, `mobile/app/worker-profile.tsx`, `mobile/src/api.ts`, `marketplace.js` and `server.js`.

## Delivery sequence and acceptance

| Phase | Deliverable | Ready when |
| --- | --- | --- |
| 1 — Clear discovery | Shared location header, prominent search, compact home, existing tasks grouped into subcategories, curated essentials, truthful promise block and retained Plus design | A customer can find an existing task by category or search, see its scope, carry it into worker selection, and change locality without stale results. English/Hindi and small screens work. |
| 2 — Detailed service booking | Structured task catalogue, task detail pages, per-task worker offers, guest browsing, scope-aware durations and booking review | One plumbing and one cleaning journey work from discovery through completion; migrated bookings remain readable; changed prices and unavailable slots require a fresh review. |
| 3 — Evidence and retention | Most-booked aggregation with fallback, verified completed-booking reviews, saved addresses and book-again improvements | Rankings exclude demo data, reviews require eligible bookings, addresses stay private, and repeat bookings use current terms. |
| 4 — Operational depth | Recorded extra-work approval, compatible same-worker task bundles, support and verification workflows; later guarantees if supported | Customer, worker and support can handle amendments, disputes and partial cancellations; availability and totals remain correct. |

Each phase includes customer and worker checks. Verify keyboard/screen-reader access, 320–430 px phones, desktop layouts, Hindi and long text, slow/offline recovery, location changes, zero results, unpublished offers, price updates and sign-in return. Keep current privacy, conflict and idempotency tests passing.

Track search-to-task opens, task-to-worker selection, request submission, worker acceptance and completion; also no-result searches, location failures, price-dispute frequency, repeat bookings and whether customers understand Plus extras. Establish a pilot baseline before setting improvement targets. Measure Plus satisfaction and delivery of its promised work alongside conversion.

## First implementation milestone

Build Phase 1 and one complete plumbing task journey as the reviewable first slice. Use existing real capabilities and clearly labelled demo content in preview. Validate the new hierarchy and Everyday/Plus understanding before expanding every category. Confirm task scope and pricing with workers before public release. Finalise estimates after agreeing the task catalogue and visual prototype.
