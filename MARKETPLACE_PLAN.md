# HandyHive research, decisions and session handoff

Updated 11 November 2026. Use this file as the starting point in a new session. Phase 1, Phase 1B, and the Delhi appointment update are implemented locally. The next task should follow the user's latest request. The earlier preference was Astra for planning and Sol for implementation to reduce token usage.

**Latest implementation:** The connected preview adds local accounts, published worker profiles, shared bookings and chat. The existing browser demo still supports the bilingual worker setup and practice walkthrough. Read [Customer and worker experiences](#customer-and-worker-experiences) for the remaining plan.

## Direction and current state

The final HandyHive product is a mobile app. The website is the working prototype and browser reference. The next implementation phase is the Android-first mobile foundation, with a private app pilot after the core flow works. See the [mobile app migration plan](APP_MIGRATION_PLAN.md) for the stack, backend changes, and acceptance criteria. The live SMS pilot can resume when a test phone is available.

### Token-saving workflow preference (11 November 2026)

The user explicitly prioritizes saving tokens and wants model/effort recommendations before substantial work. Recommended default: Sol Medium for scoped implementation, UI changes, routine planning and handoff updates; Sol High for changes spanning booking state, routes and persistence, scheduling logic, and difficult debugging. Use Astra Medium for unresolved product/architecture tradeoffs; reserve Astra High for difficult architecture, concurrency/security review or problems still unresolved after focused diagnosis. These are project recommendations, not measured token savings or automatic model switches.

Use Sol Medium for scoped onboarding and accessibility edits. Use Sol High when coordinating bilingual copy and separate walkthroughs across routes, storage and keyboard interactions. Keep each task bounded with acceptance checks. Production still needs a decision about immediate versus scheduled request deadlines.

Current checkout inspected for this analysis: `C:/Users/soura/OneDrive - IIT Delhi/Desktop/ddr_website` (repository root). The older workspace path below is historical.

Keep HandyHive. The current demonstration covers Delhi only, with Lajpat Nagar, Dwarka, Rohini and Saket. The services are plumbing, electrical work, cleaning and painting. The journey is choose work → compare suitable professionals → review scope, price and timing → request one professional → receive their decision → track the booking.

The original brief was to replace an email lead workflow with a self-serve worker marketplace inspired by delivery and service apps. When inspected, the first code already displayed contractors, but notification text had no delivery behind it, profiles vanished on refresh, and matching could return irrelevant trades. The current prototype supports both customer and contractor roles, eight fictional professionals, local profiles and bookings, and a three-minute response deadline.

The user then approved a dimmed spotlight walkthrough, researched colour choices, dark mode, and delivery-style Call, Chat and Live Location. The latest instruction switched the demonstration to Delhi and requested calendar and clock controls for specific appointments. The user wants this research and implementation context available across sessions.

## Resume in a new session

- Original workspace: `C:/Users/adity/OneDrive/Desktop/ddr_website`. Its Git checkout and website are in the child folder `ddr_website`. The committed handoff is `MARKETPLACE_PLAN.md` at the repository root alongside `index.html`; an outer-workspace copy was retained for the current session. In a fresh clone, use the repository-root document as the source of truth.
- Open `index.html` from the repository root in a browser. The app runs directly from local files and can also be served by a static HTTP server. It uses plain HTML, CSS and JavaScript without a build step. Run `git status --short` from the repository root to inspect existing working-tree edits.
- For separate customer and worker accounts, run `node server.js` using Node 22.13.1 or a compatible version with `node:sqlite`, then visit `http://127.0.0.1:4174`. Create two test accounts in different browser profiles and publish a worker profile from Find work. The preview binds to loopback. The database defaults to `%LOCALAPPDATA%/HandyHive/preview.sqlite` on Windows. Set `HANDYHIVE_DB` and `HANDYHIVE_PORT` to run an isolated preview. The browser demo and server preview have separate data.
- `marketplace.js` owns the city, neighbourhoods, services, sample profiles, booking validation, persistence, journey states and simulated positions. `script.js` renders the screens and handles forms. `appearance.js`, `walkthrough.js`, `contact.js` and `tracking.js` handle their named UI features. `styles.css` contains the light and dark tokens. `assets/` contains the ImageGen hero photo, four service images and eight fictional contractor portraits.
- To demonstrate both sides, choose Plumbing → View profile → Request this pro → Review request → Send demo request. Choose View as worker (demo) → Accept job → On my way → Start demo tracking. Use View as customer (demo) to see the sample map and contact controls. Find work opens `#/workspace/today`. Use the Demo profile switcher to pick a sample worker.
- Current data is local to the browser and origin. Delhi uses `handyhive-marketplace-delhi-v1`. The earlier Bengaluru demo key is left intact and its data does not appear in Delhi. An old Bengaluru results link falls back to the Delhi default neighbourhood. Appearance has its own preference key. The local reset affects the current demo.
- The local demo now covers worker scheduling and onboarding. The next milestone is the separately scoped live foundation.

## Six screens

1. **Explore:** compact welcome, editable area, search suggestions and four service tiles. Selecting work opens its dedicated results route immediately. Browse freely; production phone OTP occurs at booking submission.
2. **Results:** relevant professionals, requested timing, filters and sorting for price/rating/experience. Photo-led cards show service, experience, rating plus review count, price unit and availability indication. Empty results offer changed timing/area or cleared filters; never substitute unrelated trades. Preserve filters/back navigation.
3. **Professional profile:** bio, exact services, languages, credential status, reviews, rates and slots. New profiles show “New · No reviews yet.” One prominent request action.
4. **Request and bookings:** review scope, timing, address, contact preference and price; submit once; then show response deadline, status and permitted actions. My bookings preserves pending/accepted/history views.
5. **Join as a pro:** contact → services/area → experience/bio/credentials → prices/availability → preview/publish. Save progress and support later editing/unpublishing.
6. **Pro workspace:** incoming requests, deadline, job details, accept/decline/contact, accepted jobs and availability controls. A labeled demo role switch demonstrates both sides.

Use static-host-friendly routes such as `#/services/plumbing`, `#/pros/ravi-kumar` and `#/bookings/demo-123`, with refresh/back support.

## Visual and interaction direction

Retain the wordmark, Manrope headings and DM Sans text. The warm ivory, ink and orange identity carries through both appearance modes. Green communicates status.

Desktop uses a compact header, approximately 1200px content width, filters beside professional cards and a sticky request summary. Mobile uses one-column cards, filter sheets, reachable primary actions and bottom tabs for Explore, Bookings and Account; pro tabs become Jobs, Availability and Profile. Keep joining accessible at every size.

Phase 1 replaced the large promotional hero, static phone mockup and decorative statistics with useful service discovery. Keep feedback tied to actual actions, status changes and loading. Check keyboard focus, dialogs, reduced motion, and mobile, tablet and desktop layouts when changing shared UI.

First visit offers “Show me / Skip.” Clicking Show me launches the spotlight tour specified below. Guidance remains optional and replayable through Help.

## Implemented design decisions

### Spotlight walkthrough

- Apply a black translucent overlay with approximately 60% opacity and 3–4px blur outside a rounded opening around the active control. Keep the target sharp, clickable and visually outlined. Tune overlay opacity in dark mode.
- Show one short tooltip with an arrow, step progress, Back and Skip. Escape exits. Only the active target and tour controls accept pointer/keyboard actions while the tour is open.
- Use three action-driven steps. Highlight a service card, then an available professional’s View profile control, then Request this pro. Clicking the real control advances the route and tour. The final click opens the request form and finishes onboarding. Submission remains an explicit booking action.
- Choose an available sample service/pro for a dependable demonstration. Explain missing results and allow the user to exit if a target disappears. Back restores the previous tour route and preserves search context.
- Recalculate the spotlight after route rendering, image/font layout changes, scrolling and resizing. Bring the target into view and place the tooltip within the viewport, above the mobile navigation and keyboard.
- Preserve the real element and its handlers. Ensure screen-reader access to the target and tooltip, constrain keyboard focus to them, then restore focus and normal page interaction on exit. Avoid making an ancestor of the target inert.
- Persist a versioned completion/skip flag. Reduced motion disables animated travel between targets. A solid dimmed backdrop is the fallback when blur is unavailable.
- `walkthrough.js` implements the spotlight with native DOM controls, a blurred scrim, and inert unrelated controls. Driver.js was a reference for its action-driven interaction and overlay behaviour.

### Light and dark colour system

Keep the warm HandyHive identity and use colour consistently for actions, emphasis and status. These project colours are informed by research and initial contrast calculations.

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#F7F6F2` | `#141916` |
| Card | `#FFFFFF` | `#202822` |
| Raised surface | `#FFFFFF` | `#2A342D` |
| Main text | `#17201D` | `#F1F3EE` |
| Secondary text | `#596661` | `#B5BEB4` |
| Primary action | `#F26B3A` | `#FF986D` |
| Text on primary action | `#17201D` | `#17201D` |
| Text links | `#A63C20` | `#FFB18D` |

Default to the device appearance and provide System, Light and Dark choices in Account with a compact header shortcut. Persist explicit choices and apply them before the first paint. System mode follows device changes.

The stylesheet uses semantic tokens for surfaces, text, borders, inputs, status, messages, hero and overlays. Lighter surfaces and visible boundaries give dark mode depth. Check photos, map labels, native controls, focus and feedback states in both appearances when making changes.

Initial text-on-button ratios are 5.50:1 in light mode and 7.90:1 in dark mode; secondary text on cards is 6.00:1 and 7.92:1. Validate every actual pairing during implementation. Aim for at least 4.5:1 for normal text and applicable 3:1 requirements for large text and essential control boundaries. Show labels/icons alongside semantic status colours.

### Interaction polish

Use restrained 150–200ms feedback for hover, press, selection and route/overlay transitions, with reduced-motion support. Keep visible filter selections, clear send feedback and readable booking updates. Animate new messages or status changes without interrupting text entry. Preserve drafts and scroll position when opening/closing chat. Loading indicators should reflect real loading.

### Call, Chat and Live Location

The user explicitly confirmed all three. The booking screen shows the professional’s name and photo, job status and Call and Chat controls. Desktop places the tracking panel beside the booking details. Mobile places it above the contact card.

Call opens a call sheet with the professional’s identity and explicit controls. The prototype uses a clearly labeled call simulation with user-triggered connecting, connected, unavailable and end-call states. Phase 2 connects calls through a chosen calling/number-masking service.

Chat opens a dedicated conversation sheet or panel. Include message history, timestamps, unread indication and useful quick messages such as “Please confirm the job details.” Use only delivery/read states supported by actual events. Both booking participants can initiate contact while a request is pending or active; contact does not accept the job or pause its deadline. Closed bookings retain history.

Add journey states `accepted → en_route → arrived → in_progress → completed`, controlled from the pro workspace. Allow an already-present pro to mark arrival directly from accepted. Customers see progress and contact controls. Preserve existing stored bookings and include the new active states in retry, cancellation and schedule-conflict handling.

The map shows the professional’s position, destination, journey status, estimated arrival and last update. Tracking starts when the professional chooses On my way and shares location for this job. End sharing when the journey ends or the job is cancelled. Offer recenter and distinguish live, paused, stale and unavailable locations. An ETA requires routing data; the prototype labels its ETA as a sample.

The implemented map uses a bundled, schematic sample route labeled Delhi and an explicit simulation control. It supports zoom, reset, moving marker, sample ETA, last sample update, pause, stale state, and replay. It works from the local files without a tile service. Leaflet and OSM tiles were evaluated for real maps. Production should choose a tile and routing provider, review terms and attribution, and handle unavailable tiles.

Phase 2 requires authenticated booking participants, authorised GPS updates, HTTPS and user permission, plus a routing/ETA provider. Keep precise locations out of public search. Background tracking reliability must be tested on actual mobile devices and addressed in the future app. If updates stop, display their age and retain Call/Chat access.

## Price and booking rules

Cards state units: “₹650 diagnostic visit,” “₹450/hour · 2-hour minimum,” or a fixed package. Review separates labor, visit/platform fees, applicable tax and materials. Explain exclusions; do not invent fees/tax rates. Variable repairs need customer approval of the subsequent quote. Changed scope/price requires renewed approval. Prototype prices are samples; payment is not implied.

Request states are `draft → pending → accepted / declined / expired / cancelled`. Accepted jobs continue through the journey states defined above. Maintain one active professional request per customer booking intent. After decline, expiry or cancellation, choosing another pro creates a new attempt while retaining the task details and any appointment that is still in the future.

The Delhi demo uses native IST calendar and clock inputs on the results filter and request form. **In 30 min** and **In 1 hour** fill both controls. **Flexible** clears them. **Request now** matches workers accepting immediate requests who have room for the estimated duration. Flexible jobs leave timing to the participants and reserve a time block when the worker begins the journey. Dated requests must fit working hours, blocked time, and the travel gap around confirmed jobs. Acceptance checks the slot again. Production still needs authoritative server reservations.

Default response window: **three minutes, configurable**. Store an absolute deadline so refresh/backgrounding cannot reset it. Contact is a separate event: it neither accepts the job nor pauses expiration. Availability indicators are estimates, not guarantees.

Production server state is authoritative. Atomic transitions resolve accept/cancel/expiry races; slot reservation prevents conflicting jobs; idempotency prevents duplicate submissions. Late acceptance fails clearly. Notification delivery and booking acceptance remain separate; reconnect retrieves current state.

## Pro publication and trust

Use structured service IDs, areas, price units and schedules. Keep public self-declared experience/credentials separate from private proof. Publication and verification are independent: eligible complete profiles may be discoverable with honest “Not verified” or “Verification pending” labels under the launch policy. Uploading proof never automatically grants a verified badge. Do not fabricate reviews or earnings.

Prototype uses sample credential metadata and avoids browser persistence of identity documents, real phone numbers or full addresses. Production adds authenticated ownership, private uploads and actual review before verification claims.

## Bounded implementation phases

**1. Interactive prototype — implemented:** plain HTML/CSS/JavaScript, central state, stable IDs, sample profiles and non-sensitive browser persistence. Continue using the existing routes, assets and service layer.

All six screens and the local pro inbox are implemented. Requests transition within the demo, with an explicit timeout scenario. Contact and notification simulations are labeled.

**1B. UI and booking experience — implemented:** theme tokens and appearance controls, spotlight walkthrough, contact panel, local chat, simulated calls, journey states and simulated map.

**Delhi and scheduling update — implemented:** Delhi-only areas, IST calendar/clock inputs and short scheduling presets, exact appointment across both roles, and isolation from older Bengaluru demo data.

**2. Live and mobile foundation:** authentication/OTP, database, private credentials, profile/search APIs, authoritative booking transitions and availability. Build the native app against the shared backend. Deliver in-app updates and add native push for the private pilot. An optional configured SMS channel can handle missed delivery. Contact requires an authorized channel and privacy controls.

**3. Launch readiness:** verification operations, support, cancellation rules, completed-job reviews and quote/payment integration as needed. Monitor conflicts, expiry and delivery failures. Verify the native app on the devices used in the pilot. Show a booking as submitted only after the server confirms it.

## Verification and remaining work

- Phase 1 browser checks covered category filtering, empty results, sort, booking review, contractor messages and acceptance, refresh persistence, profile publishing, and timeout/retry. Domain checks covered duplicate submission, expiry and scheduling conflicts.
- Phase 1B browser checks covered dark and light, theme persistence, spotlight target isolation, keyboard Back/Skip/Escape, chat drafts and unread counts, simulated call outcomes, map controls and booking completion. Responsive widths from 360px to 1440px were checked. Domain checks covered paused/stale tracking, cancellation and previously stored statuses.
- The Delhi update was checked on desktop, tablet and mobile. An old Bengaluru URL fell back to Lajpat Nagar. A 30-minute shortcut survived filtering and reached the contractor inbox at the same displayed IST time. Manual date and time selection, incomplete input handling and the Flexible reset were checked.
- Calls, messaging, profiles, bookings and location are prototype functions. Actual multi-user accounts, contractor notifications, masked calls, real-time shared messages and GPS tracking are Phase 2. Confirm operational requirements before choosing providers. Test server-side concurrency, background GPS and time zones when building the live version.

## Research notes and source links

- **Marketplace comparison.** Taskrabbit was the closest reference for showing available people with rates, review counts, experience, filters and a review step before confirmation. The user's Rapido, Uber and Urban Company references motivated quick discovery and clear status. HandyHive lets the customer choose one professional, and acceptance is a separate event.
- [Taskrabbit hiring flow](https://support.taskrabbit.com/hc/en-us/articles/46260422073755-How-Do-I-Hire-a-Tasker): profiles/rates, timing, review and confirmation; requests differ from bookings.
- [Taskrabbit rates and minimum hours](https://support.taskrabbit.com/hc/en-gb/articles/46260502667035-Tasker-Rates-Minimum-Hours-Policy): pricing units and minimums belong next to the listed rate. [Taskrabbit service-fee guidance](https://support.taskrabbit.com/hc/en-gb/articles/46260411872155-What-s-the-Taskrabbit-Service-Fee) reinforced showing fees before confirmation.
- [NN/G onboarding](https://www.nngroup.com/articles/onboarding-tutorials/) and [Reddit UX discussion](https://www.reddit.com/r/UXDesign/comments/1gs9e6x/): contextual, dismissible guidance; Reddit is qualitative context.
- [Reddit pricing account](https://www.reddit.com/r/mumbai/comments/18dgmmg/): anecdotal motivation for distinguishing booking charges, labor and materials.
- [Reddit identity and price account](https://www.reddit.com/r/mumbai/comments/1vld98r/what_the_hell_is_going_on_with_urban_company/) and [Reddit scheduling account](https://www.reddit.com/r/india/comments/1jxdxrw/): individual reports that reinforced clear professional identity, confirmation status, cost and fallback options. They do not establish how often these problems occur.
- [Sharetribe transaction documentation](https://github.com/sharetribe/dev-docs/blob/main/content/how-to/transaction-process/change-transaction-process-in-template/index.mdx): explicit states/role-dependent actions; conceptual reference, not a stack choice.
- [Sharetribe web template](https://github.com/sharetribe/web-template) and [Easy!Appointments setup](https://github.com/alextselegidis/easyappointments/blob/main/docs/installation-guide.md): reviewed as implementation references. Provider service lists and working plans are useful concepts for future availability. The prototype retains plain JavaScript.
- [Apple dark-mode guidance](https://developer.apple.com/design/human-interface-guidelines/dark-mode): adaptive colours, readable surfaces and elevated layers. Its native-app advice informs the website; the System/Light/Dark web control is our product choice.
- [NN/G review of light and dark appearance](https://www.nngroup.com/articles/dark-mode/) and [UX Collective dark-mode design notes](https://uxdesign.cc/designing-dark-mode-c7bd200eaa64): background choice, contrast, lighter raised surfaces and individual preference informed testing both appearances. The exact HandyHive palette is a product decision.
- [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): text contrast thresholds.
- [Reddit dark palette discussion](https://www.reddit.com/r/UXDesign/comments/oad5b5/), [dark-mode comfort discussion](https://www.reddit.com/r/UI_Design/comments/1txnoeh/dark_mode_too_much_dark/) and [colour critique](https://www.reddit.com/r/UXDesign/comments/1wapvkt/struggling_with_color/): qualitative feedback about contrast, visual hierarchy and preference. These discussions do not establish a universally best palette.
- [Driver.js configuration](https://driverjs.com/docs/configuration): spotlight controls, interaction and overlay options.
- [PatternFly tour guidance](https://www.patternfly.org/content-design/writing-guides/product-tours/) and [Driver.js overlay examples](https://driverjs.com/docs/styling-overlay): short instructions and a visible target. Keep the path to exit available.
- [Uber Eats contact pattern](https://help.uber.com/en-GB/ubereats/stores/article/contact-the-delivery-person?nodeId=84854032-f414-4250-aca5-791ecec9c2f1): booking-context identity with call/message actions.
- [Uber delivery-side contact](https://help.uber.com/en/driving-and-delivering/article/delivery-arrival-steps?nodeId=44ff6981-ef4e-4620-bc26-9efb3d18c959): the contractor side needs access to the same booking conversation. Number masking was considered for production. No call provider has been chosen.
- [Leaflet quick start](https://leafletjs.com/examples/quick-start/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) and [MDN Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API): map rendering, tile requirements and permission-based location access.

## Customer and worker experiences

Research reviewed 11 November 2026. **Steps 1–4 are implemented locally.** Customers use Explore, Bookings and Account. Find work opens HandyHive Work with Today, Jobs, Schedule and Profile. Today shows jobs in progress or due, pending requests, the next confirmed appointment and accepted jobs with flexible timing. Schedule shows an IST day agenda, recurring days with a shared daily opening/closing window, dated blocks, and a configurable travel gap. Turning immediate requests off preserves future hours and confirmed jobs. Workers can adjust provisional estimates before starting a job. Defaults are 60 minutes per job or 120 minutes for hourly work, with a 30-minute travel gap. Old profiles retain their prior availability until hours are saved, old bookings get duration defaults, and the `#/workspace/availability` route opens Schedule. The worker language setting covers navigation, setup, scheduling, job details and contact controls. Customer screens and demo policies use English.

### Recommendation and alternatives

Build **one HandyHive platform with two distinct experiences**: HandyHive for customers and HandyHive Work for individual workers. The latter is a working label to validate, not a separate brand launch. Give each its own home, navigation, onboarding and priorities, while sharing the booking, conversation, identity and service records.

| Approach | Advantages | Costs or limitations | Decision |
| --- | --- | --- | --- |
| One mixed interface with all actions visible | Small initial change | Customer discovery and worker operations compete for attention | Do not expand this pattern |
| One application with separate customer and worker sections | Clear workflows; shared data and design; economical to maintain | Requires deliberate route boundaries and permissions | Recommended now |
| Separate deployed frontends using the same backend | Independent releases and specialized apps | More deployment, authentication and testing work | Revisit when justified by usage |
| Two unrelated websites and databases | Maximum technical independence | Duplicate accounts and inconsistent bookings/chat become likely integration problems | Poor fit for this marketplace |

This is an architectural recommendation for this project, not a claim that every marketplace uses the same implementation. Competitor app separation demonstrates different user needs; it does not establish their backend architecture or require two domains here.

The current app already distinguishes customer and workspace navigation in `script.js`. Preserve `#/` and existing customer routes, and develop `#/workspace/*` into the worker experience. Add a worker Today route and preserve old links. Keep `#/join` as the direct worker onboarding entrance. Later hosting can expose `/work` or a worker subdomain without creating a second booking database. Hash routes remain appropriate for today's local-file demonstration.

### What the sources support

1. **Different tasks justify different screens.** [Taskrabbit explicitly distinguishes its Tasker and client apps](https://support.taskrabbit.com/hc/en-ca/articles/46260465702683-Downloading-the-Tasker-App). Its [customer booking guidance](https://support.taskrabbit.com/hc/en-us/articles/46260422073755-How-Do-I-Hire-a-Tasker) emphasizes selecting people, rates and times. Its [worker guidance](https://support.taskrabbit.com/hc/en-gb/articles/46260519260699-How-Do-I-Get-More-Tasks) emphasizes service areas, rates, calendars and same-day preferences. Apply this division of priorities, without copying all policies.
2. **A worker home should support the next action.** [Uber's Driver app guidance](https://help.uber.com/en/driving-and-delivering/article/5---learn-how-to-use-the-driver-app?nodeId=99b67d22-eca4-49c9-b839-02df030f56f1) covers going online, requests, navigation and earnings. Use an operational home for HandyHive workers. Home repairs differ from trips: duration, materials and scope may be uncertain, so do not copy automatic dispatch or arrival promises.
3. **Two roles need not mean two identities.** [Sharetribe's user-role documentation](https://www.sharetribe.com/help/en/articles/8510727-technical-terms-and-definitions) allows the same user to participate as customer or provider. Adopt this account concept for production, with separately authorized worker capabilities. This is not a decision to purchase Sharetribe or adopt its email-based authentication.
4. **Separate entry points can confuse people.** A [Reddit onboarding discussion](https://www.reddit.com/r/TaskRabbit/comments/1upy2xr/how_do_i_apply/) describes someone reaching the wrong app while trying to register as a worker. This is an individual report, not a prevalence estimate. Make “Book a service” and “Find work” unmistakable, with a clear route back to the other experience.
5. **Availability must be understandable.** [Calendar-save feedback](https://www.reddit.com/r/TaskRabbit/comments/1cvowz0/tasker_calendar_app_problem/) and [travel-time discussion](https://www.reddit.com/r/TaskRabbit/comments/1wsg3cs/tasker_availability_question/) suggest testing explicit save confirmation and visible buffers. Treat these as usability hypotheses; they do not verify Taskrabbit's current scheduling rules.
6. **Simple language and recognizable controls are grounded guidance.** [W3C cognitive accessibility guidance](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/) and [its icon guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p07-icons-used/) support consistent controls with familiar labels and useful icons. Hindi/English, larger controls and brief instructions are proposed for Delhi and should be tested with local users, not based on assumptions about workers' literacy.
7. **Shared implementation is viable, but no migration is needed.** The [Sharetribe web template on GitHub](https://github.com/sharetribe/web-template) is a marketplace frontend reference. Keep HandyHive's existing JavaScript and shared domain layer for this demo. Its existence is not evidence that its stack is the best fit here.
8. **A website is not a guarantee of continuous background operation.** [MDN's PWA background-operation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) describes event-driven background facilities and constraints. Later evaluate notification delivery and journey tracking on real phones. Installing a PWA alone does not demonstrate reliable background GPS or instant worker responses.

Urban Company's [professional signup entrance](https://partner.urbancompany.com/professional-sign-up) was also located, but its dynamic form was not readable through the research tool. Do not infer its exact onboarding steps from this inspection.

### Customer experience

Keep navigation focused on **Explore, Bookings, Account**. Put messages inside their related bookings initially so there is one obvious source of job context.

- Home: Delhi neighbourhood, “What do you need help with?”, service cards and a compact active-booking card when relevant. The secondary “Find work” entrance opens the worker experience without interrupting customers with a mandatory role-selection screen.
- Discovery: retain price units, review count, experience, service area and honest credential status. The customer chooses one suitable worker. Keep calendar/clock controls and In 30 min / In 1 hour / Flexible. A chosen time is a request until accepted; a shortcut must not imply guaranteed arrival.
- Booking review: scope, optional problem photos later, price basis and exclusions, appointment in IST, address and contact options. Separate a diagnostic visit from a fixed-price repair. Extra work requires customer approval.
- Active booking: make “Waiting for response” and “Confirmed” visibly distinct. Preserve Call, Chat and Live Location in context. On decline or expiry, allow selection of another worker with scope and valid appointment retained.
- History: completed-job details and a future rebook action. Reviews require a completed booking in the live product. Preserve unmistakable sample labels in the demo.

### Worker experience

Use **Today, Jobs, Schedule, Profile** as the proposed bottom navigation. Booking-related chat belongs within job details; unread indicators lead directly there. Earnings can start as a job-history summary when payment data exists, rather than occupying a primary tab with invented balances.

**Today:** first show an active job or incoming request that needs attention, then the next appointment. Place a clearly labelled “Available for requests now” control near the top. Show work area, last sync status in production, and any profile requirement preventing discovery. Avoid promotional hero sections, ranking pressure and meaningless charts.

**Request card:** job type, short scope, Delhi neighbourhood, requested date/time, estimated duration or “Duration to confirm,” price basis, and response deadline. Show the worker's expected amount and deductions only when the pricing policy provides them; otherwise explain that the amount is an estimate. Offer clear Accept and Decline actions with equal readability. Opening chat neither accepts a request nor extends its deadline. Approximate travel information is sufficient before acceptance; exact address access should be scoped to a confirmed job.

**Job detail:** accepted appointment, scope, approved price, Call/Chat, navigation and one main action appropriate to the state: On my way, Arrived, Start work or Complete. Location sharing is explicit and only for the relevant journey. Customers should never see workers' continuous off-duty locations. Keep demo call/map labels until genuine services exist.

**Schedule:** a day agenda first, calendar for changing date, working-hour controls and blocked time. Clearly separate “receive immediate requests now” from “accept appointments on future days.” Turning off immediate requests does not cancel bookings or erase future working hours. Show a saved confirmation. Account for estimated job duration and travel buffers, not just identical start times; unknown-duration jobs need a provisional time block that can be adjusted.

**Profile/onboarding:** choose language, trade, Delhi service areas, experience, service/rate units, availability and public bio. Support work photos and private credentials in the live version. Use small steps with saved progress, preview and honest verification status. The demonstration retains sample credentials; do not collect actual identity documents into localStorage. Do not require email for the main journey. Phone authentication belongs to the live foundation, not a simulated claim of verification.

Offer Hindi and English explicitly, with reviewed translations for navigation, job states, date/time and errors. Language preference must not be inferred from occupation. Use labelled icons, comfortably sized touch controls (aim around 48 CSS px), readable numbers and low page weight. Voice input or read-aloud instructions are later experiments, not next-slice requirements.

### Rules that must stay consistent across both experiences

- One account may book services and hold a worker profile. Worker entry routes an incomplete profile to onboarding and never automatically publishes a customer as a worker. Remember the last workspace for generic signed-in entry, while explicit customer/worker links take precedence. Switching UI context does not grant access to another person's jobs. Production authorization checks ownership and booking participation on the server.
- One booking record and one conversation serve both sides. Notification links open the relevant role and booking; switching roles must not duplicate messages or lose drafts. Prevent self-booking in the live product.
- Preserve the same warm ivory/charcoal/orange design tokens, System/Light/Dark controls and component language. Distinguish experiences through wording, layout and priorities rather than creating two arbitrary palettes. The worker screen should remain readable outdoors; dark mode stays optional.
- Keep separate optional walkthrough completion flags for customers and workers. Worker tour: availability control, sample request details, schedule. Use sample content for instruction and never auto-accept a real job as a tutorial step.
- Keep Delhi-only areas and IST throughout. The demo checks duration and a configurable travel gap in the browser. Before a live launch, validate duration overlap, travel feasibility and late requests on the server.
- Retain the three-minute timer as a labelled demonstration rule. For production, immediate requests should target workers actually ready to respond. Scheduled requests need a deliberate response policy; do not silently impose the same timer on an offline worker. Decide that policy before building real delivery and expiry behavior.
- Weak connectivity must show pending/sent/failed accurately. Never report a locally queued acceptance as confirmed. On reconnect, reconcile against authoritative state and reject expired/conflicting acceptance clearly.

### Bounded implementation order for the next session

1. **Role separation and naming:** develop existing route shells; customer/worker entrance links; clear current role; change visible contractor wording to worker/professional; keep sample-profile switching in an explicitly labelled demo control. Preserve old links and local data. Do not rename persistence identifiers solely for presentation.
2. **Worker Today and job experience:** incoming/active/next-job priorities, readable request details, accept/decline, contact and progress actions using the existing booking state machine. Give customer and worker independently useful home screens.
3. **Worker scheduling:** immediate-request setting separate from future schedule; duration/buffer model; explicit save feedback; retain customer IST calendar and shortcuts. Test matching and overlap behavior together.
4. **Onboarding and accessibility:** simplify worker steps, add language infrastructure and reviewed Hindi/English text, separate spotlight tour, responsive and keyboard checks in both themes.
5. **Live foundation:** The connected preview has SQLite persistence, local test accounts with hashed passwords, booking participant authorization, server-side scheduling checks, shared chat and polling for booking updates. Immediate requests expire after three minutes. Dated and flexible requests have up to 24 hours, capped at the appointment start for dated requests. Phone OTP, outbound notifications, genuine calls/GPS and production hosting remain future slices.

The next milestone is step 5. Defer contractor/agency features, bidding, automatic assignment, subscriptions, paid leads, wallets, incentives and expansion outside Delhi.

### Validation and handoff

Test that a customer can compare and request a worker without entering worker tools, and that a worker landing directly on their home can understand availability and respond without browsing consumer services. Confirm both views show the same time, scope, state and conversation after refresh and role changes. Preserve old customer/workspace deep links and local data. Test immediate availability off with a future appointment still active, expiry while a request is open, decline/retry, schedule overlap, and cancellation during travel. Use 360px mobile through desktop, both themes, keyboard navigation and the two tour contexts.

For later usability research, recruit a small exploratory group of Delhi workers and customers (for example five of each), with consent. Observe task completion, mistaken taps, time to understand a request, pricing comprehension, language preference and wrong-role entry. This is qualitative validation, not a statistically representative study. Use findings to tune screen structure before committing to two separately deployed apps.

**Planning review:** The existing Astra planner reviewed this direction and agreed with one shared platform and separate experiences. Its main concern was the mismatch between future calendar availability and a three-minute response promise; the proposal above records that open policy decision. It also emphasized worker-onboarding gates and complete translations for any bilingual flow.

**Next session:** Start the mobile foundation with the Android emulator and a shared-backend booking. The SMS pilot remains available when a test phone and provider account are ready. The current browser preview uses polling.

## Visual preferences recorded 11 November 2026

Use square corners, warm neutral surfaces, restrained colour, the existing Manrope/DM Sans typography and functional demonstrations. Avoid gradients, Lucide, pure-white surfaces, rainbow/neon/pastel palettes, shadows, glass effects, decorative card grids, fabricated testimonials or ratings, sparkle icons, emoji, checkmark lists, decorative animation and em dashes. Keep Terms and Privacy accessible. Images use neutral placeholders during loading. The existing call and location features remain explicitly simulated. Demo Terms and Privacy describe the current browser storage and Google Fonts requests. Live-service policies need the actual operator and providers.

## Phone sign-in slice

Implemented a local phone-code emulator alongside existing password accounts. Indian +91 test numbers receive an on-screen code, with a five-minute expiry, five-attempt limit, 60-second resend cooldown, per-phone and per-address request limits, and one-use consumption. Codes are hashed in SQLite; phone accounts and sessions persist. This does not verify phone ownership or deliver SMS. Phone-created accounts are separate from existing password accounts; linking is not implemented.

Updated preview for this slice: http://127.0.0.1:4175/ (same local database). Start with HANDYHIVE_PORT=4175 and node server.js. The earlier password server on 4174 must be restarted to serve these backend changes.

Validation: API checks covered sign-in, used-code rejection, resend cooldown and five-attempt lockout. Chrome checked the phone flow at 360px, no horizontal overflow, and session persistence after reload. JavaScript syntax and diff whitespace checks passed.

## Booking updates and SMS

The local preview at http://127.0.0.1:4176/#/account shows each account its latest 12 booking updates. Each update links to the corresponding booking or worker job. New requests and cancellations notify the worker. Acceptance, decline, expiry and completion notify the customer. Updates are written with the booking change, so replaying a request or restarting the server preserves a single copy.

The default `preview` mode uses the local code emulator and the existing `preview.sqlite` database. An optional Twilio mode uses a separate `verified.sqlite` database and server-checked SMS codes. Databases are bound to their authentication mode so test accounts and cookies cannot become verified accounts.

For a controlled SMS pilot, set these environment variables and run `node server.js`. The server still binds to loopback.

- `HANDYHIVE_PHONE_MODE=twilio`
- `TWILIO_API_KEY` and `TWILIO_API_SECRET` with permission to use Verify and, if configured, create messages.
- `TWILIO_VERIFY_SERVICE_SID` for a Verify service configured for six-digit codes and the India SMS route.
- To enable booking SMS, also set `TWILIO_ACCOUNT_SID` and `TWILIO_MESSAGING_SERVICE_SID`. Confirm the sender and the message bodies in `booking-updates.js` are approved for the chosen India route before enabling it. See [Twilio Verify](https://www.twilio.com/docs/verify/api), [Messages API](https://www.twilio.com/docs/messaging/api/message-resource) and [Twilio's India SMS guidance](https://www.twilio.com/en-us/guidelines/in/sms).

Booking SMS starts off for every account. After a user opts in, future updates are queued. The queue skips stale updates and cancels queued sends on opt-out. It retries explicit rate limits twice with backoff. Timeouts and uncertain submissions are held for review to avoid sending duplicates. A submitted message records the provider ID for lookup in Twilio. Carrier delivery receipts and inbound STOP handling still need pilot setup and validation.

### Controlled SMS pilot

1. Start with Verify only. Set the three Verify credentials in the shell that launches Node, select `HANDYHIVE_PHONE_MODE=twilio`, and leave `TWILIO_MESSAGING_SERVICE_SID` unset. Keep credentials outside the repository. Use a separate pilot database via `HANDYHIVE_DB` if an existing `verified.sqlite` must be preserved.
2. Open `http://127.0.0.1:4174/#/account` on the host machine. Request a code for a consenting tester’s Indian mobile number. Confirm it arrives on the handset, enter it, and refresh to confirm the session persists. Record the result and any Verify error code without saving the OTP or the full phone number.
3. For booking SMS, configure the Messaging Service and confirm the sender and templates for the selected India route. Confirm how the sender handles opt-out before testing. Use two consenting verified accounts in separate browser profiles. Publish a worker profile, opt in from its Account page, and send one sample request from the customer. Compare the message on the handset with the Twilio Console delivery status. Turn off booking SMS in Account and send a fresh request to verify that it produces only an in-app update. If the sender supports replies, also verify that STOP suppresses subsequent messages.

Local pilot rehearsal passed against simulated Twilio responses with a fresh SQLite database. It covered verified sign-in, rejection of wrong and reused codes, booking SMS defaulting to off, one submission for a replayed request after opt-in, and suppression after opt-out. Live delivery and the selected sender’s opt-out behavior remain unverified.
