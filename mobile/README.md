# HandyHive mobile app

HandyHive is an Expo and React Native app for home services in the Delhi region. One account can book services and publish a worker profile. The website and native app use the same screens in this folder, Node API and SQLite booking store. English is the default and the app remembers the Hindi preference across launches and sign-out. Use `npm run dev` from the repository root to develop the shared screens in a browser; see [the project README](../README.md).

## What the app covers

- **Explore.** Enter the six-digit PIN code of the visit address to see workers who serve it. Choose a service, search by worker or task, and compare rates before requesting a visit.
- **Everyday and Plus.** Every worker sets an Everyday rate. Workers can add Plus at a higher rate and list the extra work included, with optional Hindi copy. Both tiers use the same billing unit. Hourly rates show the two-hour minimum upfront. The server checks the reviewed price, unit and inclusions when the request is sent and keeps those terms with the booking. Payment is arranged directly with the worker.
- **Book and coordinate.** Compare task skills and checked appointments in Delhi time. Include a short task and materials brief before sending a request. Workers receive the visit address, customer name and private access notes after accepting. Both participants can propose a new appointment and track changes in the app. Workers can report an arrival estimate or cancel before work starts with a reason.
- **Agree work and record payment.** Standard app bookings save the agreed charge. After arrival, workers can send an itemized quote for repair or extra work. A diagnostic visit can close with its original fee. Customers can report direct payments and workers can acknowledge or dispute them. The worker workspace separates bills, confirmed receipts and outstanding balances. Booking help records issues and their resolution for both participants.
- **Book a known worker again.** Save workers privately and check their current coverage, rates and schedule from Account. Customers can submit a star rating after the completed booking is paid in full.
- **Manage work.** Workers set the PIN codes they serve, publish or pause their profile, edit rates, set working hours and travel buffers, block time, and opt into immediate requests. Immediate requests have a three-minute response window.
- **Sign in.** The mobile flow uses Indian phone numbers and a six-digit code. The local preview displays the code in the app. The Twilio configuration uses carrier SMS and disables username/password preview accounts. Native sessions use SecureStore and expire after seven days. The local web preview keeps its session in browser session storage.

## Run the local app preview

Use Node.js 24. These examples are for PowerShell. Run them from the repository root unless noted.

1. Install the mobile dependencies and export the Expo web app.

   ```powershell
   Set-Location mobile
   npm ci
   npm run export:web
   Set-Location ..
   ```

2. Start the app and API together in one terminal. The preview binds to Windows loopback. The server serves the Expo website by default.

   ```powershell
   $env:HANDYHIVE_DB = Join-Path $env:LOCALAPPDATA 'HandyHive/mobile-preview.sqlite'
   $env:HANDYHIVE_PHONE_MODE = 'preview'
   node server.js
   ```

3. Open [the local app](http://127.0.0.1:4174) and sign in or create a preview account. Choose **Try demo PIN · 110075**. Request a visit with a demo worker and use **Demo visit** to simulate acceptance, arrival, and completion. Then open the final bill, run the test checkout, and leave a rating. Use fictional visit details throughout.

To exercise the worker workspace directly, sign in as `worker-demo`, `electric-demo`, `cleaning-demo` or `painting-demo` with `HandyHive-local-demo`.

Set the same `HANDYHIVE_PORT` for the server and seed script to use a different port. Re-run the web export to pick up app source changes, or use `npm run dev` at the repository root to rebuild automatically after saving. Set `HANDYHIVE_APP_PREVIEW=0` explicitly to serve the original prototype.

Coverage and booking eligibility use exact matches against workers’ declared PIN codes. Locality names are optional address labels. The web preview loads DM Sans through Google Fonts.

## Run on Android

### Standalone offline demo

Install `HandyHive-0.3.0-offline-demo.apk` and open **HandyHive Offline Demo**. This separate Android build can launch and run in airplane mode. It uses fictional profiles, a sample booking, and an app-local store. It has no Internet permission and does not need the Wi-Fi launcher, the USB launcher, or a hosted backend.

1. On **Explore**, choose **Customer** and open the sample booking.
2. Return to **Explore** and choose **Plumber**, then open the booking from **Work**. Accept it and mark arrival.
3. Switch back to **Customer** to confirm arrival. Switch between the accounts to try quotes, completion, and a simulated payment record.
4. Close and reopen the app to check that the booking remains. You can also use the saved fictional address to create a new visit. Android's Clear storage action for **HandyHive Offline Demo** resets the demo.

The demo exercises the UI and local workflow. It does not exchange data between phones, send messages or SMS outside the demo, check real identities, or transfer money.

To rebuild with the existing Windows Android toolchain, run `.\scripts\build-android.ps1 -Offline` from the project folder. The build checks the embedded demo and confirms that the APK excludes the Internet permission.

**Physical phones need a reachable backend.** The earlier preview APK embedded computer loopback, which points to the phone itself after installation. See [security and launch setup](../SECURITY_AND_LAUNCH.md) for the corrected same-Wi-Fi pilot, operator verification workflow, permanent HTTPS deployment and remaining live-service requirements. Production builds must pass `node scripts/check-api.js` from the repository root before distribution.

Run the same API with a local preview database. With an Android emulator running and the SDK and Java configured, run `npm run android` from `mobile/`. The debug Android app defaults to `http://10.0.2.2:4174/api/v1`. For another local port or an HTTPS test deployment, set `EXPO_PUBLIC_HANDYHIVE_API_URL` before building. Release builds require that URL explicitly. The Android SDK and signing setup are required for an installable APK.

If a Windows CMake build fails on long OneDrive paths, copy `mobile/` to a short local build path before installing dependencies and generating the Android project. Use `HANDYHIVE_ANDROID_CMAKE_DIR` to specify a short writable CMake staging directory.

## Verify changes

- Run `node --test` from the repository root for booking transitions, scheduling, privacy, offer consistency and retry behavior.
- Run `npm run typecheck` and `npm run export:web` from `mobile/` for TypeScript and the web preview bundle.
- Run `npx expo export --platform android` with the Android API URL configured to verify the Android JavaScript bundle.
- For an on-device pilot, install an Android build and run a booking across two accounts. Confirm session restore, Hindi persistence, chat, loss of connection and reconnection, schedule conflicts, and screen-reader and large-text behavior.

## Before a live pilot

Deploy an HTTPS API with persistent storage, backups and operational monitoring. Test migrations on a database copy. Validate Twilio SMS using real test phones and verify signed builds on physical devices. The local survey flow uses scheduled visits. Test a background notification path before offering immediate jobs to real customers. Arrange a staffed support contact and responsibility for unresolved issues before a live pilot. Payments are direct between the participants. Worker skills and travel estimates are self-reported.
