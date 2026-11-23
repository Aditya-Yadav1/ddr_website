# HandyHive: phone connectivity, worker trust and launch

## What caused the installed APK failure

The old APK build verifier at `C:/hhapk/verify-apk.ps1` required the bundle to contain `http://127.0.0.1:4174/api/v1`. On a physical phone this means the phone itself, not the developer computer. The old API also listened only on computer loopback and accepted only loopback/emulator Host headers. WhatsApp distribution does not host the API.

The replacement pilot is explicitly a same-network test build. It connects to `http://10.184.63.213:4175/api/v1`, permits cleartext only to that one address through Android network security configuration, and shows a pilot banner. Use synthetic accounts and addresses only. Keep the computer awake and run `scripts/start-pilot.ps1`. Changing the computer's IP requires rebuilding the APK. Campus/guest Wi-Fi may isolate devices; an endpoint responding on the computer does not prove the phone can reach it. Open the endpoint's `/health` URL in the phone browser first. A private router or hotspot with peer connectivity may be necessary. Do not disable Windows Firewall.

Public releases must use a permanent HTTPS API. There is no public backend or SMS provider configured in this workspace. Production deployment and on-device networking cannot be claimed complete until those are provided and tested.

## Implemented controls

- Production startup requires an explicit HTTPS origin, a persistent database path and Twilio phone authentication. Preview codes cannot be enabled in production. The host is configurable while Host/Origin checks remain enforced; no wildcard cross-origin permission was added.
- Endpoint validation rejects loopback and emulator release endpoints, credentials, incorrect API paths and insecure public URLs. The build preflight probes health and checks production authentication/verification mode. Production EAS builds refuse pilot mode. The Android plugin denies cleartext except the single private pilot address and disables app backup.
- Verification records are server controlled. A worker can consent and request checks, but cannot mark checks complete through profile editing or any public API. A trusted operator records separately reviewed evidence using a local CLI. Public responses expose check status, dates and checked name, never evidence references, reviewers, documents or ID numbers.
- Identity, background and service skills have separate expiry dates. Profile name changes invalidate checks, service changes invalidate skill checks, and preview phone accounts never get a phone-verified badge. Production discovery and booking eligibility require every check plus a real SMS-verified phone. Suspension blocks new requests and pre-work transitions. Existing bookings and customer issue reporting remain accessible.
- New app bookings require the customer to confirm the worker in person after arrival before the worker can start or close a diagnostic visit. A name change or new identity-check decision invalidates a pre-work confirmation and requires another customer confirmation. Production enforces this on all newly created bookings, including older clients. Existing historical bookings are not silently rewritten. This is an explicit customer attestation, not biometric verification or an OTP protocol.
- Safety reports are visible only to the reporter and local operators. They support idempotent retries, survive restart, and have a private operator resolution workflow. They do not dispatch assistance, automatically suspend someone, or promise staffed monitoring. The existing shared booking-help feature remains a separate channel for ordinary work disputes.
- Existing hashed sessions, seven-day expiry, participant authorisation, quote acceptance, booking conflict detection, private addresses, confirmed payment records and completed-booking ratings remain in place.

## Research and recommended operational process

Reviewed official sources on 18 November 2026:

1. [Android emulator networking](https://developer.android.com/studio/run/emulator-networking-address): emulator networking differs from a real device. Never ship a desktop loopback API in an APK meant for another device.
2. [Expo environment variables](https://docs.expo.dev/guides/environment-variables/): `EXPO_PUBLIC_*` values are embedded in the bundle and visible to users. Put only the API URL and non-secret build flags there; keep SMS/provider credentials on the server.
3. [UIDAI offline verification FAQ](https://www.uidai.gov.in/images/FAQ_OVSE.pdf) and [consolidated regulations dated 30 December 2025](https://www.uidai.gov.in/images/The_Aadhaar_Authentication_and_Offline_Verifications_Regulations_2021-_Clean_copy-30122025.pdf): an Aadhaar number or photograph of a card alone is not proof. Use an appropriately authorised verification process that validates issuer signatures and matches the presenter, with informed consent and viable alternative identity documents. Confirm the applicable requirements with the provider before launch. No Aadhaar scanner, biometric processing or raw-ID upload is implemented here.
4. [Delhi Police citizen charter](https://www.delhipolice.gov.in/doc/Citizen_Charter.pdf): domestic-help verification is an established local process. Determine the applicable check for each service and address, obtain consent and retain a private reference to the actual result. A submission receipt alone must not be marked as a completed background check.
5. [OWASP API Security Top 10](https://owasp.github.io/blog/2023/07/03/owasp-api-top10-2023.html): enforce object-level authorisation on every booking/report and property-level restrictions on verification fields. Tests exercise unrelated-user access, worker self-confirmation, privacy and retry behaviour.

Use layered evidence: SMS possession; issuer-validated identity and in-person/photo match; a documented background result; two checked references where appropriate; a practical service skill assessment; customer confirmation at arrival; and reviewable incident handling. A verified identity does not establish competence or guarantee future conduct. Avoid an unqualified “safe worker” badge.

The current implementation is a **manual operator workflow**. Choose a verification provider and secure evidence portal before collecting real documents. Store evidence outside the booking database with access controls, encryption, retention/deletion policy and access logs. Store only opaque evidence references here. Do not paste documents, Aadhaar numbers or selfies into booking chat or CLI reference fields. Establish an appeal/recheck process, consent withdrawal, incident severity rules and a staffed support channel. Any automated provider integration needs authenticated, replay-protected callbacks mapped to the correct worker and case; none is claimed connected yet.

## Operator workflow

Set `HANDYHIVE_DB` to the existing server database and the actual `HANDYHIVE_PHONE_MODE`. Restrict shell/database access to trusted operators. There is intentionally no public admin endpoint.

```powershell
node scripts/trust-admin.js queue
node scripts/trust-admin.js review review.json
node scripts/trust-admin.js suspend suspension.json
node scripts/trust-admin.js reinstate reinstatement.json
node scripts/trust-admin.js resolve resolution.json
node scripts/trust-admin.js withdraw withdrawal.json
```

Review JSON, after the worker has consented and the operator actually checked evidence:

```json
{
  "worker": "account-uuid",
  "kind": "identity",
  "status": "verified",
  "reviewer": "named-operator-id",
  "reference": "opaque-secure-evidence-case-id",
  "expiresAt": "2027-05-18T00:00:00Z"
}
```

Kinds are `identity`, `background`, `skills`; decisions are `verified`, `rejected`, `revoked`. Repeat only for checks actually completed. Verification expiry is limited to at most 366 days, but operators should use the appropriate shorter validity. Suspension/reinstatement/withdrawal JSON needs `worker`, `reviewer`, `reason`. Resolution JSON needs `worker`, `reviewer`, `report` and a reporter-safe `resolution`. Withdrawal removes the active consent and checks and suspends bookings; evidence held elsewhere must also be handled under the retention policy. Audit rows are append-only through application commands, not tamper-proof against a database administrator.

## Permanent hosting

The Docker deployment contains the API, a persistent SQLite volume and a Caddy HTTPS reverse proxy. The raw API is not published externally. This is a single-instance deployment; do not run multiple API replicas against the SQLite file.

Caddy replaces the forwarded client-IP header; the API trusts it only with `HANDYHIVE_TRUST_PROXY=1`. Keep the raw API port private, and do not enable that option when clients can reach the API directly. This prevents all phone sign-in limits from accidentally being grouped under the proxy's IP. The proxy setup follows [Caddy's reverse-proxy guidance](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) and [automatic HTTPS requirements](https://caddyserver.com/docs/automatic-https).

1. Provision a Linux server with Docker Compose and a domain pointing to it. Allow inbound 80/443 and restrict administrative access.
2. Copy `deploy/.env.example` to `deploy/.env`; configure the domain and server-only Twilio Verify credentials. Configure the account's India SMS delivery/registration requirements with Twilio and test delivery to actual phones.
3. Run `docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build`. Check certificate issuance and `https://YOUR-DOMAIN/api/v1/health` from another network.
4. Keep this fresh production database separate from demo accounts. Enrol actual workers with SMS and complete evidence checks through the trusted operator workflow. Empty production discovery until workers are approved is intentional.
5. Export `EXPO_PUBLIC_HANDYHIVE_API_URL=https://YOUR-DOMAIN/api/v1`, unset `EXPO_PUBLIC_HANDYHIVE_PILOT`, and run `node scripts/check-api.js` before building. Set the same URL in the EAS production environment. Use a protected production signing key; the local pilot uses development signing and is not a Play Store release.
6. Build using the `production` EAS profile, or regenerate Android with `HANDYHIVE_BUILD_CHANNEL=production` and use a secured signing configuration. Re-run endpoint preflight and verify the final APK's signature, embedded URL, version and denial of cleartext.
7. Install on two physical devices on different networks and test SMS, restore/revoke sessions, full booking/quote/payment-record lifecycle, arrival confirmation, worker suspension/expiry, incident review, restarts and loss of connection.

Before public operations: configure an operator alerting queue and support response targets, uptime monitoring, encrypted backups and tested restores, retention/deletion procedures, edge rate limits and SMS spend limits. Copying a live SQLite database alone can omit WAL data: use SQLite's backup facility or stop the server before backing up the entire data volume. The bundled API does not process payments, provide masked voice calling, deliver mobile push notifications, or automatically query a background-check provider. Those need separate selected services and integration tests. Immediate jobs should remain disabled until a reliable notification path is verified.

## Validation

`node --test` covers existing booking flows plus endpoint guards, worker-check expiry/identity binding, private safety reports, customer-only arrival confirmation, suspension and restart/retry behaviour. Typecheck with `node mobile/node_modules/typescript/bin/tsc --noEmit -p mobile/tsconfig.json`. Export web and Android through Expo. Record physical-device, SMS/provider and deployment checks separately; a passing local test suite does not prove them.
