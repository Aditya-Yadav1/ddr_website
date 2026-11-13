# HandyHive mobile app

HandyHive is an Expo and React Native app for home services in the Delhi region. One account can book services and publish a worker profile. The mobile app and the existing website use the same Node API and SQLite booking store. English is the default and the app remembers the Hindi preference across launches and sign-out.

## What the app covers

- **Explore.** Choose a service to open its workers and prices directly. Type two or more letters of a locality to see place suggestions, then select a location to check worker coverage. Search by worker or service, filter by starting charge or immediate requests, and compare rates before requesting a visit.
- **Everyday and Plus.** Every worker sets an Everyday rate. Workers can add Plus at a higher rate and list the extra work included, with optional Hindi copy. Both tiers use the same billing unit. Hourly rates show the two-hour minimum upfront. The server checks the reviewed price, unit and inclusions when the request is sent and keeps those terms with the booking. Payment is arranged directly with the worker.
- **Book and coordinate.** Check appointment availability in Delhi time, review the visit details, and send a request. Customers can follow progress, cancel before work starts, view history and request another visit. Workers can accept or decline, mark travel and arrival, start and complete work, and update the estimated duration before starting. Both sides can use booking chat. A worker receives the address, customer name and visit notes after accepting.
- **Manage work.** Workers can publish or pause a profile, edit rates, set working hours and travel buffers, block time, and opt into immediate requests. Immediate requests have a three-minute response window.
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

2. Start the app and API together in one terminal. The preview binds to Windows loopback. The preview flag serves the Expo export in place of the legacy website on this server process.

   ```powershell
   $env:HANDYHIVE_DB = Join-Path $env:LOCALAPPDATA 'HandyHive/mobile-preview.sqlite'
   $env:HANDYHIVE_PHONE_MODE = 'preview'
   $env:HANDYHIVE_APP_PREVIEW = '1'
   node server.js
   ```

3. Seed the local test accounts from a second terminal.

   ```powershell
   node mobile/seed-preview.mjs
   ```

4. Open [the local app](http://127.0.0.1:4174). Choose **Use a preview account**. Sign in as `customer-demo` and request a visit with Delhi Plumbing Demo. In another browser context, sign in as `worker-demo` and open **Work** to accept and complete the booking. Both accounts use `HandyHive-local-demo`. Additional sample accounts are `electric-demo`, `cleaning-demo` and `painting-demo`. Demo workers are labelled in the directory.

Set the same `HANDYHIVE_PORT` for the server and seed script to use a different port. Re-run the web export to pick up app source changes. Clear the app preview flag to serve the original website.

Place suggestions use Photon’s public OpenStreetMap search, biased toward Delhi and restricted to India. The server caches lookups and retains suggestions from published worker service areas when the external lookup is unavailable. Customers can also enter a full locality manually. Coverage and booking eligibility use workers’ declared areas. Set `HANDYHIVE_GEOCODER_URL` to the `/api/` URL of a Photon instance to use another server. The web preview loads DM Sans through Google Fonts.

## Run on Android

Run the same API with a local preview database. With an Android emulator running and the SDK and Java configured, run `npm run android` from `mobile/`. The debug Android app defaults to `http://10.0.2.2:4174/api/v1`. For another local port or an HTTPS test deployment, set `EXPO_PUBLIC_HANDYHIVE_API_URL` before building. Release builds require that URL explicitly. The Android SDK and signing setup are required for an installable APK.

If a Windows CMake build fails on long OneDrive paths, copy `mobile/` to a short local build path before installing dependencies and generating the Android project. Use `HANDYHIVE_ANDROID_CMAKE_DIR` to specify a short writable CMake staging directory.

## Verify changes

- Run `node --test` from the repository root for booking transitions, scheduling, privacy, offer consistency and retry behavior.
- Run `npm run typecheck` and `npm run export:web` from `mobile/` for TypeScript and the web preview bundle.
- Run `npx expo export --platform android` with the Android API URL configured to verify the Android JavaScript bundle.
- For an on-device pilot, install an Android build and run a booking across two accounts. Confirm session restore, Hindi persistence, chat, loss of connection and reconnection, schedule conflicts, and screen-reader and large-text behavior.

## Before a live pilot

Deploy an HTTPS API with persistent storage, backups and operational monitoring. Validate Twilio SMS using real test phones, and verify signed builds on physical devices. Immediate requests need reliable delivery when workers leave the app, so add and test native push before offering immediate jobs to real customers. Travel progress currently comes from worker status updates. Live location, in-app payment, verification of workers, customer support and dispute handling still need implementation or operational setup. Confirm iOS support with a signed build before any iOS pilot.
