# ASAAN Google sign-in setup

Use a Firebase project dedicated to ASAAN. The KinArc Firebase project is a separate application and must not be reused for this marketplace.

The dedicated project `asaan-a6c97` and `ASAAN Website` web app have been created. Google is enabled with the owner-approved support email; `localhost` and `127.0.0.1` are authorized for local testing. The public web config is in the ignored local `.env` and in `render.yaml`. A real Google sign-in on the local connected website created and restored an ASAAN account on 24 November 2026. Add the final production hostname to authorized domains when it is known.

1. In the ASAAN Firebase project, register a **Web app**. Copy its public `apiKey`, `authDomain`, `projectId`, `appId`, and optional `messagingSenderId` into the corresponding `HANDYHIVE_FIREBASE_*` server environment variables in [.env.example](.env.example). The server returns only these public web values from `/api/v1/config`.
2. In **Authentication → Sign-in method**, enable Google. Configure a project support email. In **Authentication → Settings → Authorized domains**, add the exact production website host and any staging host. Add localhost for local testing if it is not already present.
3. The Admin SDK verifies token signatures, audience, issuer, and expiration using Google's public keys when the project ID is configured. For revocation checks as well, provision a server credential through your host's secret manager as `HANDYHIVE_FIREBASE_SERVICE_ACCOUNT_JSON` or configure Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`. Never put a service account file or private key in `mobile/`, Git, browser env variables, or a public build.
4. Deploy the website and API together at `HANDYHIVE_PUBLIC_ORIGIN` over HTTPS. The current web app uses a same-origin API; the offline GitHub Pages build is only a fictional demo and does not use Google sign-in.
5. Test a fresh Google account, a returning account after refresh and browser restart, sign-out, popup fallback, and linking from an existing phone account. The existing account must be signed in before linking. Google email or name alone never merges accounts.

The API verifies each Google Firebase ID token with Firebase Admin, maps the Firebase UID to a unique local account, and issues the existing seven-day marketplace session. Token revocation is also checked when server Admin credentials are present. Firebase credentials never authorize a worker verification or admin role. Phone sign-in remains available. Native Android and iOS builds still use their phone flow until native Google OAuth configuration is added.

If any of the four required public Firebase values are absent, the server omits Google sign-in from the UI. It returns a service-unavailable error for attempts to call the Google endpoint. A deployment must set all values before advertising Google login.
