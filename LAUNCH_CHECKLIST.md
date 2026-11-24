# ASAAN launch checklist

The connected Expo website and Node API are the intended production deployment. The GitHub Pages export is an offline demonstration with fictional accounts, professionals, and payments.

## Engineering checks

- Run `npm --prefix mobile ci`, `npm run typecheck`, `npm test`, `npm run build:web`, and `npm run build:pages` before deployment.
- Deploy the website and API at one HTTPS origin. Set `HANDYHIVE_PUBLIC_ORIGIN`, persistent `HANDYHIVE_DB`, production phone verification variables, and the ASAAN Firebase public web config. See `.env.example` and `FIREBASE_SETUP.md`.
- Keep preview accounts, OTPs, sample workers, and test payments on a separate database and deployment. Confirm the production server rejects preview mode.
- Configure an operations administrator with `scripts/admin-access.js` after creating the intended real account. Verify support and worker review audit records.
- Configure backups for the persistent SQLite database and test restoration on an isolated environment.

## Business and external prerequisites

- Approve the draft terms, privacy, cancellation, payment, and accessibility text with the actual business identity and support process. Public policy pages currently identify themselves as drafts.
- Confirm rights for every existing local photograph listed in `ASSET_LICENSES.md`; replace any unverified asset before commercial launch. Add distinct relevant photos as the catalog expands.
- Complete genuine professional onboarding, service area coverage, specialties, prices, and availability before advertising a service. The production API must not display fictional demo workers.
- Add the deployed website domain to the ASAAN Firebase authorized domains. Local real Google sign-in and refresh were verified on 24 November 2026; repeat sign-in, sign-out, and explicit account linking on the deployed origin.
- Configure a production phone verification provider and validate its cost and abuse controls. Phone numbers are needed for operational visits.
- Configure any live payment provider only after the merchant account, settlement, refunds, tax handling, and support process are approved. The existing test checkout does not establish live payment readiness.
- Run end-to-end customer, professional, and administrator journeys with real test accounts. Review responsive layouts, accessibility, network failures, and browser console errors before opening to the public.

## Current limits

The published catalog still covers four service families. Newer task specializations require an explicitly configured professional; no booking is offered for an unavailable skill. Native Google OAuth, a full image library, and deeper SEO and accessibility work are not yet implemented. These are release gaps, not completed features.
