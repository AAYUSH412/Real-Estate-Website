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
