# ASAAN operations access

The `/admin` workspace uses `/api/v1/admin-*` endpoints. Each request requires either the configured Google operator identity or an explicit admin grant, depending on the configuration.

To use a single Google operator, set `HANDYHIVE_OPERATOR_GOOGLE_EMAIL` to the authorised Gmail address and configure the ASAAN Firebase web app. The server checks the verified Google email for every operations request. This setting supersedes manual admin grants. Invited testing exposes operator sign-in only through `http://127.0.0.1:<port>/sign-in?role=operator` on the server computer. The public HTTPS tunnel continues to use invited accounts.

Bootstrap an operator account using a trusted shell with access to the deployment's private SQLite disk. First sign in normally on ASAAN, then find that account's UUID through a private database query. Grant access with:

```sh
HANDYHIVE_DB=/data/handyhive.sqlite node scripts/admin-access.js grant ACCOUNT_UUID 'Operator name'
```

The command checks that the account exists and records the change in `admin_access_audit`. To revoke it, use `revoke` in place of `grant`; the command refuses to revoke the last admin. Do not run this tool from a public web endpoint or commit a production database copy.

The dashboard shows counts from current database records, verification requests, open support tickets, safety reports, professionals, account deletion requests, and recent actions. It can record checks with a private evidence reference, suspend or reinstate professionals with a reason, resolve safety reports, and reply to support requests. Each mutation is checked server side and audited. Verification evidence must be reviewed through the approved operator process before a check is recorded. The dashboard does not expose identity documents.

Account deletion requests are queued for an operator. The dashboard does not automatically erase bookings or payment records. The business owner must approve a retention and deletion procedure before processing real requests. Until then, do not advertise automatic account deletion.
