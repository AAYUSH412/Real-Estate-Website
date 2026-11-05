# Phase 3 release

Release preparation: 2026-11-02.

The release includes the Phase 3 journeys plus two admin fixes reported during local testing:

- An expired access token in browser storage is refreshed before protected requests. Concurrent requests share the refresh; temporary refresh failures retain credentials for retry. The server returns expected expiry as a structured 401 without a stack trace.
- The admin catalog's empty `search` value is accepted as no search filter, fixing the initial properties request returning 400.

Local release checks passed: 56 backend tests, 9 frontend tests, 9 admin tests (74 total); both production builds; admin lint with zero warnings/errors; clean whitespace check.

The live MongoDB preflight found zero subscriber blockers. A private, checksummed snapshot of all application collections was created outside the repository for migration rehearsal. No credentials or personal records are included in this document.

Deployment verification, migration outcome and commit/build identifiers will be recorded after rollout. The user connected both Vercel projects to GitHub; push to main is the intended frontend/admin deployment trigger. The existing GitHub Actions pipeline publishes the backend container to Azure.

Migration completed at 2026-11-02 14:39 UTC: zero blockers; subscriber consent states already canonical; contact defaults and indexes initialized. The final backup included 392 users, 1 admin, 19 properties, 129 appointments, 24 contact inquiries and 1 subscriber. Full record fingerprints verified users/admins/properties/appointments unchanged. The hosted API was restarted after migration; deployment proceeds through the existing pipeline.

## Production verification

Application commit: `1a2c9e5a1a7321db5467209fedfd1d44b47ac969`.

- [GitHub verification](https://github.com/AAYUSH412/Real-Estate-Website/actions/runs/41464128674): backend, frontend and admin passed.
- [Azure backend rollout](https://github.com/AAYUSH412/Real-Estate-Website/actions/runs/41464128560): succeeded. App Service image verified as `ghcr.io/aayush412/buildestate-api:1a2c9e5a1a7321db5467209fedfd1d44b47ac969`.
- [Frontend Vercel build](https://vercel.com/aayushvaghela12-gmailcoms-projects/real-estate-website/Gw71Xpbd1iGBsHghJayzkavNee8t): succeeded after the Git push.
- [Admin Vercel build](https://vercel.com/aayushvaghela12-gmailcoms-projects/real-estate-website-admin/HXKCzqzfZMjSpGoyZ47FfwBT1yrQ): succeeded after the Git push.

Live checks passed: API/database readiness, public catalog, admin login with revocable device session, admin session identity, empty-search all-properties query, appointments and UTC timestamps, contact inbox (24 inquiries), subscriber management (1 address), unauthorized inbox rejection, both public client origins and the paginated sitemap. Production admin JavaScript was fetched from the canonical alias and verified to include the new inbox and proactive session refresh implementation.

All 392 user accounts, the admin account, 19 properties and 129 appointments were preserved during migration. Production smoke checks read these resources and created a normal diagnostic admin login; they did not create listings/bookings, change contact/subscriber state, or send marketing email. Real browser keyboard/mobile acceptance and test-inbox delivery remain separate follow-up checks.

Production endpoints:

- https://buildestate.vercel.app
- https://real-estate-website-admin-sage.vercel.app
- https://buildestate-api-prod.azurewebsites.net
