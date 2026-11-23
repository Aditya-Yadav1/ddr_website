# HandyHive website and app

The website and Android/iOS app use the same Expo and React Native screens in `mobile/`. Make and review changes in the browser first; those source changes are included the next time you build the native app.

## Develop in the browser

Use Node.js 24. From this project folder:

```powershell
npm --prefix mobile ci
npm run dev
```

Open http://127.0.0.1:4174. The command builds the website, starts its API, and watches the shared source. After saving a change, wait for **Website updated**, then refresh the browser. Stop with Ctrl+C. Stop any other server on port 4174 before starting.

- Edit `mobile/app/` for screens and navigation.
- Edit `mobile/src/` for shared UI, styles, language, and app behavior.
- Edit `mobile/assets/` for images and `mobile/shared/` for shared marketplace rules.
- Edit `server.js` and its supporting modules for API behavior.

The website uses the API on the same origin. Android-specific offline demo and pilot settings do not carry into website builds. The local preview starts with bookable demo workers in all four service categories. Choose **Try demo PIN · 110075**, sign in with a preview account, and book any demo worker using fictional visit details. The booking’s **Demo visit** controls simulate the worker’s steps. Use **Open payment** to try test checkout and unlock **Leave a review**.

Customers enter the six-digit PIN code of the visit address. Workers add their exact service PIN codes in their profile. Coverage, appointments, and new bookings use these codes. Locality labels are optional. Existing profiles need service PIN codes before taking new bookings. Saved addresses from earlier versions can be updated under **Account → Saved places**.

Explore shows matching workers after the PIN is selected. Open a worker profile to see their rating, customer reviews, and work number if they publish one. The booking form carries the selected PIN forward and offers saved places with that PIN. Customers can leave a rating and optional public review after a completed visit is paid in full.

To try the worker workspace separately, sign in as `worker-demo`, `electric-demo`, `cleaning-demo`, or `painting-demo` with `HandyHive-local-demo`. The phone pilot also provides these workers. Set `HANDYHIVE_DEMO_WORKERS=0` before starting a local server when you need a directory with only your own profiles.

## Build or run

```powershell
npm run build:web  # Create mobile/dist without starting a server
npm start          # Build the website and run it with the API
npm run typecheck
npm test
```

`node server.js` serves the last website build by default. Docker builds the same shared website. The original HTML/JavaScript prototype is retained for reference; set `HANDYHIVE_APP_PREVIEW=0` only if you need to run it. Opening the old root `index.html` directly does not show the shared app.

See [mobile/README.md](mobile/README.md) for Android builds and app testing. Browser edits to shared files already apply to the app source; an installed APK needs a new build to display them. Check native behavior on a phone before release, especially navigation, permissions, storage, keyboard layout, and accessibility.

## Payments and provider safety

- Open a completed booking with an outstanding final bill to try checkout. The local preview simulates the payment and labels the receipt as a test. For Razorpay staging, set `HANDYHIVE_PUBLIC_ORIGIN` to the staging HTTPS URL and configure `RAZORPAY_KEY_ID` (test key), `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` on the API server. Subscribe to `payment_link.paid`, `payment_link.expired`, and `payment_link.cancelled` at `/api/payments/razorpay-webhook`. Live collection requires merchant approval, worker settlements, and refund handling. Direct cash and UPI receipts remain available.
- Customers can open payment from a completed booking and leave a rating once the full bill is confirmed. Provider profiles and bookings offer a Report menu. Account shows private report status and lets customers unblock providers.
- Reports go to the existing private operator queue. See [SECURITY_AND_LAUNCH.md](SECURITY_AND_LAUNCH.md) for verification, report review, and marketplace-wide suspension.
- Customer Support accepts private requests from Home, Account, and the booking Report menu. Operators with access to the server database can see them with `node scripts/trust-admin.js queue` and reply and close a ticket with `node scripts/trust-admin.js support-resolve input.json`. Set `HANDYHIVE_DB` to the server database and include `id`, `owner`, `reviewer`, and `response` in the input file. Customers see the reply on the Customer Support screen.
