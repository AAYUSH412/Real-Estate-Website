# Phase 3 release

Release preparation: 2026-11-02.

The release includes the Phase 3 journeys plus two admin fixes reported during local testing:

- An expired access token in browser storage is refreshed before protected requests. Concurrent requests share the refresh; temporary refresh failures retain credentials for retry. The server returns expected expiry as a structured 401 without a stack trace.
- The admin catalog's empty `search` value is accepted as no search filter, fixing the initial properties request returning 400.

Local release checks passed: 56 backend tests, 9 frontend tests, 9 admin tests (74 total); both production builds; admin lint with zero warnings/errors; clean whitespace check.

The live MongoDB preflight found zero subscriber blockers. A private, checksummed snapshot of all application collections was created outside the repository for migration rehearsal. No credentials or personal records are included in this document.

Deployment verification, migration outcome and commit/build identifiers will be recorded after rollout. The user connected both Vercel projects to GitHub; push to main is the intended frontend/admin deployment trigger. The existing GitHub Actions pipeline publishes the backend container to Azure.

Migration completed at 2026-11-02 14:39 UTC: zero blockers; subscriber consent states already canonical; contact defaults and indexes initialized. The final backup included 392 users, 1 admin, 19 properties, 129 appointments, 24 contact inquiries and 1 subscriber. Full record fingerprints verified users/admins/properties/appointments unchanged. The hosted API was restarted after migration; deployment proceeds through the existing pipeline.
