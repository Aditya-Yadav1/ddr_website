# HandyHive mobile app plan

HandyHive’s final product is an installable mobile app for Delhi home services. The existing website is the working prototype and a reference for the booking flow. The next implementation phase is the mobile foundation. The real SMS pilot can resume when a test phone is available.

## Session handoff

- **Built.** The Expo SDK 58 app lives in `mobile/`. It has test-account sign-in with SecureStore, a directory and appointment review, customer booking details, and a separate worker workspace that accepts the same booking. The shared API supplies the service catalog and enforces booking access and availability. The local seed script creates the two demo accounts below.
- **Verified.** TypeScript, Expo dependency compatibility, the Android JavaScript bundle, and all seven Node tests passed. Android API 36 booted on the Windows emulator and reached the isolated API at port 4186. The C++ build passed after moving the build copy out of OneDrive and shortening the CMake object paths.
- **Pending.** The bundled test APK reached release lint. Lint required `includeSubdomains="false"` on the emulator-only network configuration. That was corrected in the generated build copy and a packaging retry was queued. At handoff, the APK and the customer-to-worker UI flow were still unverified. Automatic installation and UI testing were stopped.
- **Resume the existing build.** The local build copy is `C:\Users\soura\hh-android`, CMake staging is `C:\hh-cxx`, and the expected APK is `android\app\build\outputs\apk\release\app-release.apk` inside the build copy. Check for the APK first. If needed, rerun `gradlew.bat :app:assembleRelease -PreactNativeArchitectures=x86_64` from its `android/` directory with the SDK and JDK set as shown below and `EXPO_PUBLIC_HANDYHIVE_API_URL=http://10.0.2.2:4186/api/v1`. The command runner blocked the Metro launch with “blocked by policy,” so this local test uses a bundled APK.
- **Resume the emulator test.** The AVD is `HandyHive_API_36` and its booted snapshot is `handyhive-ready`. Use emulator port 5580, install the APK, and run the customer request, worker acceptance, and app relaunch checks below. A local ADB smoke script is available at `%LOCALAPPDATA%\HandyHive\android-tools\booking-smoke.py`. The isolated preview uses port 4186 and the seeded database `%LOCALAPPDATA%\HandyHive\mobile-smoke-59a89625-1d1f-4d7f-8316-f23e5014c9a2.sqlite`. Reuse that database if the preview process needs to be restarted.

## Product and platform decisions

- Start with one Expo and React Native app in TypeScript, using Expo Router for separate customer and worker navigation. One account can use both experiences. A worker publishes a profile through onboarding, and the server checks booking participation regardless of which workspace is open.
- Use Android as the first development and pilot target. That is a working assumption based on the Windows workspace and the ability to test with an emulator. Keep the codebase iOS-capable and validate it with an iOS build before committing to an iOS release date. Expo can produce an installable APK for internal Android testing. [Expo Router](https://docs.expo.dev/router/introduction/) · [Android APK builds](https://docs.expo.dev/build-reference/apk/)
- Use the native components and navigation of React Native. Preserve the functional content and visual preferences from the prototype. Defer the walkthrough and broader visual polish until the core app flow works.
- Keep the app in a `mobile/` directory in this repository initially, with its own dependencies and lockfile. Keep the Node API, existing browser regression path, and a single booking database. Use a dedicated test database for emulator and staging runs.

## What carries over

| Existing code | Mobile migration |
| --- | --- |
| `marketplace.js` | Keep the booking state machine, IST appointment handling, duration, travel buffers, and expiry on the server. Run the existing Node regression tests and add contract tests where the mobile API exposes new behavior. |
| `server.js` and SQLite | Keep account, profile, booking, chat, and scheduling persistence. Add a small versioned API for the app and reuse the existing authorization and transaction paths. Keep SQLite for the single-instance pilot. Measure lock time and polling load before changing the storage model. |
| `booking-updates.js` and `twilio.js` | Reuse booking events for the in-app inbox. Add native push in a later slice. The existing phone OTP and booking SMS integration remains available for a separate carrier test. |
| `index.html`, `script.js`, `styles.css`, and browser helpers | Rebuild screens with native components. Reuse applicable assets, service copy, appearance tokens, worker translations, and interaction decisions. Replace browser routes, forms, and local storage with app equivalents. |

The first app API should cover session, directory, booking details, request creation, worker actions, and chat only as each screen needs them. Use stable IDs and structured error codes for expiry, scheduling conflicts, and access denial. Keep the booking deadline authoritative on the server. Show the server’s latest booking state after a conflict or reconnect, and reuse the same request intent after an uncertain submission. Keep a failed chat message as a draft until there is an explicit retry or a server acknowledgement.

Use revocable, expiring native sessions over HTTPS for staging. Store the native session credential in SecureStore, keep a hash on the server, and revoke it on sign-out. Preserve the existing browser cookie path. Clear account-scoped app state on sign-out or account switch and test expired sessions. React Native documents limitations with cookie-based authentication. [React Native networking](https://reactnative.dev/docs/network) · [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

## Implementation order and exit criteria

### Architecture review decisions

The reviewed direction is one Expo/React Native app, separate customer and worker navigation, and one authoritative Node backend. Android remains the assumed first target. The implementation order below addresses gaps found in the current code.

1. Define the API and session boundary before building the first screens. Extract request handlers and session helpers only as needed so the existing browser endpoints and `/api/v1` use the same booking transactions and authorization. Use opaque random bearer tokens for native sessions, with server-side hashes, expiry, and revocation. The first version can require sign-in again after expiry. Return native credentials only through the explicit native sign-in response and keep them out of snapshots and logs. Reuse the existing preview/verified database separation.
2. Add repeatable API integration tests using isolated databases. Cover the native sign-in and sign-out path, account isolation, simultaneous acceptance, server restart, and existing browser cookie authentication. The current committed regression tests exercise the domain model. Previous HTTP and browser checks were run with temporary scripts and should become reproducible where they protect the new API.
3. Give booking writes a defined retry contract. Request creation already has an intent key. For mobile booking actions and chat, persist a client operation ID with the successful change in the same transaction. Scope it to the signed-in actor, reject reuse for a different operation or payload, and return the existing result on a retry. In particular, `contact()` currently appends a fresh message for every call, so retrying after a lost response can duplicate a message. On an uncertain response, reconcile with the server before presenting success.
4. Return server time and a monotonic state revision from the app API. Ignore responses from a previous account session and older revisions. Let the server decide whether a deadline has passed. Refresh after foregrounding, reconnect, and notification taps. Keep one active foreground polling loop and stop it while the app is in the background.
5. Before push testing, run expiry maintenance independently of SMS configuration and client requests. The current background loop is enabled only when Twilio booking SMS is configured. With SMS off and every client closed, expiry is applied at the next request. Run a bounded server sweep and a startup reconciliation, committing expiry and notification events together. Test this with all clients disconnected.
6. Before the physical-device pilot, bound directory, booking-history, and chat responses. The current snapshot contains the whole public directory and every participating booking with its message history. The marketplace JSON record also makes each snapshot read acquire a write transaction and scan all bookings. Keep a single server instance with persistent SQLite for the early pilot, measure representative data sizes, and use explicit schema migrations for any storage changes. Establish a backup/restore test and a load budget before expanding the pilot.

Build the mobile screens around an API client, an account/session provider, and feature modules for discovery, bookings, worker jobs, scheduling, and chat. Keep server data in an account-scoped query cache and form edits in local component state. Use secure storage for the session credential and separate local preferences for theme/language. The mobile UI sends commands and renders the server's response. The server owns acceptance, conflicts, expiry, and access checks.

Keep push delivery as a separate consumer of committed booking events. Add per-device delivery records and bind device registrations to the authenticated account, updating them on sign-out or account changes. Notification payloads carry a booking reference and minimal wording. Opening a notification fetches the current authorized booking. Phone permissions and background delivery require physical-device checks before real immediate requests.

The native session/API foundation is implemented. The next end-to-end milestone is an Android emulator booking between two test accounts. Device push, carrier SMS, and real location sharing each have their own later validation milestone.

### Local app API

Run `node server.js`. The Android emulator can reach the native API at `http://10.0.2.2:4174/api/v1/`. The listener stays on Windows loopback. Use the emulator address in the development build and an HTTPS URL for staging. Set `HANDYHIVE_DB` to a dedicated SQLite path for app development.

| Method and path under `/api/v1` | Contract |
| --- | --- |
| `POST /register`, `POST /login` | Preview credentials are `handle` and `password`. A successful response includes `session.token`, `session.expiresAt`, and a state snapshot. |
| `POST /phone-start`, `POST /phone-verify` | Start with `phone`. Verify with `challenge` and `code`. Successful verification issues the same native session. Preview mode returns a local test code. |
| `GET /state` | Send the session as `Authorization: Bearer <token>`. The response includes `state`, a persistent marketplace `revision`, and `serverTime` in epoch milliseconds. Optional `area`, `appointment`, and `timing` query parameters filter availability matches. |
| `POST /profile` | Publish or update the authenticated worker profile using the existing profile rules. Use this to seed the worker for the first app booking. |
| `POST /request`, `POST /transition`, `POST /message` | Send a unique `operationId` and reuse it with the same payload after an uncertain response. A successful response includes `jobId` and the current state snapshot. Request creation also uses an `intent` ID. Transition and message take a `job` ID and `role` of `customer` or `pro`. |
| `POST /logout` | Send the bearer token and an empty JSON object. The server revokes the token and returns `signedOut`. |

Send JSON with `Content-Type: application/json`. Error responses include `code` and `error`. Use `jobId` to locate the booking in `state.requests`. Discard snapshots from previous accounts and older revisions for the same view. Availability query results can differ at the same revision. Use `node --test` to run the local integration and scheduling checks.

### 1. Android foundation and first booking

- Set up Android Studio, the SDK, and an emulator on Windows. The Android SDK and emulator were absent from their standard locations when checked. Create a minimal Expo development build and connect it to a local Node instance with a fresh database. Verify emulator-to-host access with the server’s host validation in place. Keep local HTTP configuration limited to development. [Expo Android setup](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build) · [Android emulator networking](https://developer.android.com/studio/run/emulator-networking-address)
- Add the app session path with local test accounts, the customer and worker route groups, and the first vertical slice. The customer can open a seeded worker’s profile and request an appointment. The worker can open Jobs and accept it. Both roles see the same confirmation after reopening the app. Seed the worker profile for this slice so worker onboarding can follow independently.
- Exit when the Android development build installs and runs, the booking persists across app and server restarts, an unrelated account cannot open it, and the existing browser booking tests still pass. No handset or real SMS is needed for this emulator milestone.

#### Run the first booking flow

1. Start the Node server from the repository root. In PowerShell set `$env:HANDYHIVE_DB = Join-Path $env:LOCALAPPDATA 'HandyHive\mobile-preview.sqlite'` before running `node server.js` to keep app test data separate. If another preview is using port 4174, set `HANDYHIVE_PORT` to a free port for both the server and the seed script, and use that port in the app API URL.
2. Run `node mobile/seed-preview.mjs` from the repository root. It creates `customer-demo` and `worker-demo` in the local preview. Both use the test password `HandyHive-local-demo`.
3. With an Android emulator running and the SDK and Java configured, run `npm ci` and `npm run android` from `mobile/`. The development build defaults to `http://10.0.2.2:4174/api/v1`. Set `EXPO_PUBLIC_HANDYHIVE_API_URL` before starting Metro to use another endpoint.
4. Sign in as the customer, open Delhi Plumbing Demo, choose the work, neighbourhood, date and time, then send the appointment request. Sign out and sign in as the worker, open the worker workspace, and accept the job. Sign in as the customer again and open the confirmed booking. Relaunch the app to check that the session and booking are restored.

On Windows, use a short local build path if CMake or Ninja reports an error creating directories under `node_modules`. Copy the contents of `mobile/` excluding generated folders such as `node_modules/` and `android/`. Set `HANDYHIVE_ANDROID_CMAKE_DIR` to a short writable path such as `C:\hh-cxx` for the app’s CMake build files. Install and generate the Android project in that short copy. Keep the source repository as the place to make changes.

On this workstation, the Android SDK and JDK 17 are installed in the user profile. Point the build shell at them before running the Android command.

```powershell
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$jdkFolder = Join-Path $env:LOCALAPPDATA 'HandyHive\android-tools\java'
$env:JAVA_HOME = (Get-ChildItem -Directory -LiteralPath $jdkFolder | Select-Object -First 1).FullName
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

### 2. Complete the booking experience

- Customer flow. Service search, timing and neighbourhood filters, profile comparison, request review, booking history and status, cancellation, retry, and shared chat.
- Worker flow. Profile onboarding, Today and Jobs, accept or decline, availability and blocked time, job estimate, travel, arrival, completion, and chat. Carry forward English and Hindi for the worker flow.
- App behavior. Refresh on foreground and reconnect, keep polling bounded to relevant active screens, and show stale or offline state. Verify large text, screen reader labels, the Android back button, keyboard behavior, and both roles on a small display.
- Exit when two accounts finish one booking and the regression scenarios pass in the app. Cover simultaneous acceptance, expiry during review, blocked time and travel buffers, cancellation during travel, background and foreground transitions, and reconnect with a chat draft.

### 3. Private APK pilot and push

- Prepare a restricted HTTPS staging backend with a persistent SQLite volume, a backup and restore check, and basic server and app error reporting. Use test accounts and test booking details. Keep the local OTP emulator out of any publicly accessible environment.
- Distribute a private Android APK and test the booking end to end on two physical devices. Add native push for booking changes with account-scoped device registrations. A notification opens the right role and booking after the app checks access. Test notification permission denied, sign-out, expired requests, and taps from a closed app. Push delivery and the server’s booking state remain separate.
- Keep immediate requests limited to test use until we measure background delivery and decide what happens when a worker cannot be reached inside the three-minute window. Do the deferred live phone OTP test before relying on phone ownership for real accounts. [Expo development builds](https://docs.expo.dev/develop/development-builds/faq/) · [Expo push notifications](https://docs.expo.dev/push-notifications/overview/)

### 4. Pilot with real jobs

- Define who can publish a worker profile, who handles cancellation or disputes, how to reach support, and what customer details a worker needs after acceptance. Publish live Terms and Privacy, and settle retention and account deletion before onboarding real users.
- Validate the actual devices and OS versions in the pilot. If iOS is in scope, run the complete flow and push checks on an iPhone before releasing to iOS testers.
- Decide from the pilot whether masked calls, real location sharing, quotes, or payments are needed next. The first app build can show booking progress through worker actions and use chat for coordination.

## Decisions to revisit

- Confirm whether the first testers have Android devices. If they need iPhones, bring the iOS build and signing work forward.
- Decide whether to keep one app for both roles after observing how customers and workers switch workspaces. A second app would use the same API and booking records.
- Choose the staging host and store accounts when distribution is in scope. Keep release configuration and credentials outside the repository.
