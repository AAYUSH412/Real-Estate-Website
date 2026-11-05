---
name: buildestate-backend-contracts
description: Implement or review BuildEstate Express/MongoDB API changes for admin and user workflows, including versions, transactions, media, sessions and local email configuration. Use for repository backend work; not generic infrastructure redesign.
---

# BuildEstate backend contracts and domain behavior

## Locate the real contract

Read `backend/docs/admin-api-contracts.md`, then the relevant shared validators/types in `shared/contracts/index.js` and `index.d.ts`. `backend/routes/mountApiRoutes.js` registers actual production prefixes; read the route middleware and domain service before changing a controller. Historical findings in `docs/history/` are a baseline, not proof a fixed issue still exists.

Express/Mongoose and a MongoDB replica set support the current application. Keep public `frontend/` and legacy `admin/` callers compatible while `admin/` grows. Preserve documented response aliases and multipart names; make additive contract changes where practical. No standalone transaction fallback exists.

## Domain invariants

| Area | Rules to preserve |
| --- | --- |
| Catalog | Public visibility also depends on expiry and owner moderation; raw active status alone is insufficient. Preserve honest inventory versus public-count definitions. |
| Listing writes | Owner corrections return to review. Admin multipart uses image1–image4; explicit retained images must belong to that listing. Reuse listingService validation/compensation. |
| Images | Current limits are 1–4 retained/new images, 5 MB/upload, 16 MP, 8000px side and one frame. Sharp validates bytes/resources; ImageKit stores and transforms delivery images. Recheck constants before changing limits. |
| Review/moderation | Use displayed versions. Stale commands return 409. Keep atomic current-page bulk actions and their per-record version maps; no misleading partial-success UI. |
| Archival/history | Archive rather than purge. Preserve guest/contact/property snapshots and booking history; cancel affected open reservations through the existing domain cascade. |
| Bookings | Existing fixed slots use Asia/Kolkata and stored UTC instants. pending → confirmed/cancelled; confirmed → completed/cancelled. Completion requires the scheduled end to have passed. Preserve slot-reservation uniqueness. |
| Consent | Recipients confirm newsletter consent; admins may suppress, not grant consent. No campaign/CRM API is implied by low-level email helpers. |

Reuse `services/domain/transaction.js`: domain writes and audit commit together. Register notification work through `afterCommit(session, fn)` so aborted/retried callbacks do not emit duplicate effects. Best-effort email failure does not roll back a committed domain command; no durable outbox or guaranteed delivery is implemented.

## Sessions and errors

Distinguish `/api/users/me` public-user authentication from `/api/admin/session`. The configured ADMIN_EMAIL identity is supported; a generic role field does not imply multi-admin management. Keep server-side session validation, revocation and refresh rotation.

Expected expired/invalid/revoked credentials return safe 401/403. Temporary session-store failures return retryable service errors without clearing refresh cookies. Do not extend token lifetime or silence authorization checks to make old browser sessions work. Use `utils/httpErrors.js` and safe DTOs; never return raw Mongoose secrets, provider errors, tokens or keys.

Lists use bounded one-based pages and deterministic tie-breakers, with canonical pagination totals. Check whether counts are filtered or global. Respect route ordering for static paths such as `/properties/pending` before ID routes. CSV is capped and exposes truncation headers; do not label an export complete when the cap was reached.

## Local configuration and email investigations

Read `backend/docs/local-email-configuration.md` when startup warnings differ from runtime/production behavior. Import `config/environment.js` before eager config readers: host variables win, then non-production backend-relative `.env.local`, then `.env` defaults. Automatic file loading is skipped for NODE_ENV=test. Loading dotenv only in server.js's body is too late for imported singletons.

Read `services/emailService.js` and `config/nodemailer.js` together. EMAIL_USER is resolved at send time; missing sender is an explicit error, not permission to use an unverified fallback. A Brevo API message ID means acceptance, not delivery. Inspect the corresponding provider delivery event when available. Check configuration presence without printing secret values; do not diagnose an API-key problem solely from an early warning or infer a sender/IP error without evidence.

## Verify without project-data side effects

Use the production route registrar with isolated test fixtures. `backend/tests/phase1.test.js` owns a temporary HTTP server and MongoMemoryReplSet; `environment.test.js` uses temporary env fixtures and mocked Brevo HTTP. Do not import server.js into tests: it connects the configured database, starts jobs and listens on the app port. Keep test credentials synthetic and external services mocked unless live work is actually requested.

Run relevant backend tests from `backend/`; include affected client contract/build checks when shared types or payloads change. Use the normal full suite for domain/session changes. Report current results rather than copying historical totals. Do not start/stop a user's running server or apply project migrations as a side effect of verification.
