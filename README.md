# HandyHive website and app

The website and Android/iOS app use the same Expo and React Native screens in `mobile/`. Make and review changes in the browser first; those source changes are included the next time you build the native app.

## Open HandyHive on your phone

### Connect production hosting

[Deploy HandyHive to Render](https://render.com/deploy?repo=https://github.com/Aditya-Yadav1/ddr_website). Review the paid Starter service and its 1 GB persistent disk before approving. Enter your Twilio API key SID, API secret and Verify service SID in the three secret fields. The Docker build serves the website and API at one HTTPS origin. SQLite stores accounts and bookings in the attached disk.

After deployment, open the Render URL on your phone. Choose **Customer** or **Worker** and sign in by SMS. Workers must complete the existing verification process and publish their service PINs before customers can book them. See the [operator guide](SECURITY_AND_LAUNCH.md). To check a deployment, set `EXPO_PUBLIC_HANDYHIVE_API_URL` to its HTTPS origin followed by `/api/v1` and run `node scripts/check-api.js`.

### GitHub Pages browser demo

The [Pages deployment workflow](.github/workflows/pages.yml) publishes the browser demo. In the GitHub repository, set **Settings → Pages → Source** to **GitHub Actions**, then run **Publish HandyHive browser demo** from **Actions**. Later pushes to `main` that change the app will publish automatically. Open the deployment URL from the workflow run on your phone.

Choose **Customer**, sign in to the preview, and select a locality or PIN. Bookings contains the sample visit. Use the HandyHive home link to choose **Worker** and see the visit from the other side. The preview stores fictional activity in the current browser.

### Connected preview on the same Wi-Fi

1. Connect your computer and phone to the same Wi-Fi. On Windows, double-click `START_HANDYHIVE_WEB.cmd`. You can also run `npm run start:phone` or `node scripts/start-web.js --phone` from the project folder. The first setup requires Node.js 24 and `npm --prefix mobile ci`.
2. Wait for **HandyHive connected preview**. Open the printed `http://` address on your phone and keep the server running. You can use your browser’s **Add to Home Screen** option to open HandyHive again from a shortcut.
3. Choose **Try demo location** to browse sample workers. Create a preview account with fictional details to try booking, chat and test checkout. The phone preview saves its own data in `handyhive-phone-web.sqlite`.

If there are multiple network adapters, set `HANDYHIVE_HOST` to the computer’s IPv4 address on the phone’s network and run the launcher again. If the phone can’t load the page, check that the address is current and try a private Wi-Fi network or a hotspot that allows connected devices to reach each other. Use locality search or enter a PIN code for this HTTP preview. A permanent HTTPS setup is described in [SECURITY_AND_LAUNCH.md](SECURITY_AND_LAUNCH.md#permanent-hosting).

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
