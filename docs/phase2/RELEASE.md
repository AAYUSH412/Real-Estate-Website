# Phase 2 release preparation — 2 November 2026

The owner confirmed that property content is demo data and authorized repair, backup, migration, push and deployment. Existing users must be retained.

## Verified before release

- Confirmed the running Azure App Service's `MONGO_URI` matches the configured project database. Credentials were used only in memory and were not printed or committed.
- MongoDB supports replica-set transactions.
- Created a private snapshot backup outside the repository of users, admins, properties, appointments, model configuration, sessions, refresh credentials and audit logs. Files are permission restricted and include checksums and BSON Extended JSON type information.
- Restored all eight backup collections into an isolated temporary MongoDB replica set. Rehearsed demo repair and the full Phase 2 migration on that restored copy.
- Rehearsal retained all 390 user identities/password hashes and all 128 appointments. Expected email case/whitespace normalization was allowed in the preservation comparison.
- Archived one invalid demo listing, retained 94 appointments with unavailable-property/account markers, and cancelled 91 open appointments whose original resources no longer exist. Original references remain; no appointments were deleted or linked to unrelated properties/accounts.
- Preserved historical half-hour booking slots. Fixed-slot validation continues to apply to new requests.
- The restored-copy migration planned and applied 538 records with zero blockers. Re-running the demo repair produced zero changes.
- Backend regression suite: 45 passing tests, including opt-in repair, preservation/idempotency, legacy slot handling and prior Phase 2 domain checks.

Production rollout and final deployment links will be recorded after deployment. The appointment button rendering fix is intentionally a separate follow-up change after the initial Phase 2 release.

## Production rollout completed

- Release commit: `59687d0385066098dd78e2d3ec31ff9b9843dee2` (Phase 2, before the separate appointment button fix).
- [GitHub verification](https://github.com/AAYUSH412/Real-Estate-Website/actions/runs/41418366235): backend, frontend and admin jobs passed.
- [Azure deployment](https://github.com/AAYUSH412/Real-Estate-Website/actions/runs/41418366304): succeeded. The existing App Service was briefly stopped for a fresh snapshot backup and migration, then restarted after deployment.
- Final live migration applied 539 records with zero blockers; all 390 user identities/password hashes and the administrator identity/password hash passed preservation checks. All 129 appointments in the final backup remain (one was created after the earlier rehearsal).
- Demo repair archived one invalid listing, retained 94 appointments with unavailable-resource markers, and cancelled 91 open appointments. No user/admin account or appointment was deleted.
- Verified the unique active-slot reservation index is installed.
- [Frontend](https://buildestate.vercel.app): Phase 2 deployment `dpl_Cfg7WNxJHFxbAYfR9kkezodLhVsj` promoted successfully.
- [Admin](https://real-estate-website-admin-sage.vercel.app): Phase 2 deployment `dpl_4RMvzB3PJ57Mn9tAc3Q5CNj7ZVYN` promoted successfully.
- [Backend](https://buildestate-api-prod.azurewebsites.net/health/ready): healthy database connection after restart.
- Production smoke checks: malformed pagination returns 400; public catalog returns 200; administrator login creates a session-backed JWT; admin appointment query returns 129 records with paging and UTC timestamps; both public client domains return 200.
- Private backups and their checksums remain outside Git; no credentials, password hashes, user records or raw backup contents are included in this report.

## Separate appointment action follow-up

After the Phase 2 release was deployed and smoke-tested, the admin appointment action rendering was corrected:

- Confirm appears only for pending appointments; confirmed rows no longer display a redundant Confirm button.
- Confirmed future viewings show a clearly disabled Complete action with an explanation. Missing/invalid end times also disable completion. Completion becomes available after the viewing ends, with a shared page clock refreshing every 30 seconds.
- Completed/cancelled appointments have no mutation actions. Busy rows prevent duplicate clicks, and stale-state server errors refresh the list.
- Unavailable-account history uses retained contact snapshots in the client display.
- Seven admin tests pass, including rendering the actual JSX component for pending, past/future confirmed, missing end, terminal and busy states. Admin production build passes; lint has zero errors and the same three existing warnings.

The backend completion guard remains in force; UI checks do not replace server enforcement.
