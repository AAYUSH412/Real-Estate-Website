# Phase 3 — Complete admin and user journeys

Release tracking: [RELEASE.md](RELEASE.md).

Implementation date: 2026-11-02. Status: implemented locally; production release and staging browser acceptance remain pending. This document updates the historical findings in `PROJECT_AUDIT.md`; it does not claim a production deployment or a complete accessibility certification.

## Implemented journeys

| Area | Result |
| --- | --- |
| User moderation | Selected accounts now open reason/duration confirmation dialogs and call the existing transactional bulk endpoints. A failed batch retains selection and displays the server error. Successful batches refresh totals and clear selection. Bans are described accurately as administratively reversible access restrictions. |
| Property moderation | All-properties and review-queue pages provide selection for the current page, approval/rejection with displayed versions, and confirmation. Only pending selections can be reviewed. The all-properties page additionally archives selected nonarchived listings, preserving history and cancelling open appointments. Batches remain atomic. |
| Contact inbox | Admin-only paged inbox, state filters, full message/contact details, internal notes, `new → in_progress → resolved` handling (reopening allowed), optimistic edit conflicts and transactional audit records. Public form submission remains separate. |
| Subscribers | Admin-only paged status lists and suppression. Administrators cannot mark an address confirmed. Existing addresses without consent evidence are pending. Token fields are not returned by management endpoints. |
| Newsletter | Footer and contact forms use the API. Subscription email contains purpose-bound confirmation and opt-out links. Confirmation expires after 24 hours; opt-out links expire after 365 days. Browser pages require an explicit button action so email scanners do not mutate subscription state on GET. Suppression revokes outstanding confirmations; repeated opt-out is idempotent. Email-only opt-out is rejected. Dispatch failures return a retryable 503 and never grant consent. |
| Verification recovery | Sign-in, expired-link and post-registration screens expose explicit resend. Registration reports whether initial dispatch succeeded; failed resend returns 503. Verification uses centralized React session establishment and deduplicates the request across repeated mounts; redirect timers are cleaned up. |
| Authentication | User bootstrap verifies `/users/me`; cross-tab changes revalidate and logout synchronizes. A network failure offers session retry. A bad login no longer redirects away from its error. Admin bootstrap verifies the new protected `/admin/session` endpoint; protected routes show loading/retry states and login/logout update context. |
| Requests/cache | Both clients use a shared bounded in-memory cache primitive: 100 entries, 15-second TTL, in-flight GET deduplication, caller-specific cancellation, no failed-response caching. Admin keys include credentials; mutations and storage changes invalidate the cache. Adopted by public catalog/detail and admin catalog/review/user/engagement reads. Specialized dashboard/activity/booking requests retain their own fetch lifecycles. |
| Performance | Admin pages are lazy-loaded behind Suspense. Dashboard charts are emitted separately from the initial application bundle. |
| Accessibility/recovery | Native modal dialogs provide focus containment, Escape and focus restoration; dialogs cannot close during moderation writes. Account menu uses Radix DropdownMenu, property filters use Radix Popover, and auth/contact/booking controls have associated labels. Public rendering failures have a reload/contact fallback. Catalog/review failures display retry states instead of successful empty states. Activity log requests ignore stale responses; dashboard refresh uses a ref and reports partial request failures. |
| Accuracy | Activity log totals use `totalLogs`. Phase 2's amenity parser already preserves ordinary arrays. Removed the fake notification count, hardcoded admin login numbers, unsaved favorite toggle, generic social destinations and dead footer links. Added factual demo/data-use pages for previously broken registration links. Removed builder “Verified” badges based solely on name matching and a fixed three-portal search claim. |
| Sitemap | Reads `property`, follows canonical pagination, validates IDs, escapes XML, uses configured site/API origins, and returns uncached 503 if the catalog cannot be read completely. |

## API additions and changes

All `/api/admin/*` endpoints require the existing live admin session policy.

- `GET /api/admin/session`: current safe admin identity.
- `GET /api/admin/leads?page=1&limit=20&status=all`: paged inbox; optional bounded email search.
- `PUT /api/admin/leads/:id`: `{ status, adminNote, expectedVersion }`; rejects unknown fields and stale versions; audit failure rolls back the edit.
- `GET /api/admin/subscribers?page=1&limit=20&status=all`: paged pending/confirmed/unsubscribed records; optional bounded email search.
- `PUT /api/admin/subscribers/:id/suppress`: empty body, suppression plus transactional audit. No admin confirmation endpoint.
- `POST /api/news/newsdata`: existing `{ email }` contract, now requests a confirmation email; rate-limited.
- `POST /api/news/confirm`: `{ token }`, purpose and version checked.
- `POST /api/news/unsubscribe`: `{ token }`; the insecure `{ email }` contract is intentionally removed.

Newsletter tokens use the existing JWT secret with an isolated audience, purpose and subscriber ID. They contain no email address. Confirming requires the current consent version. Existing opt-out tokens remain usable after a later opt-out/resubscription; they can only suppress. No bulk marketing sender or campaign UI was added.

## Data preparation before deployment

This phase did not connect to or modify production MongoDB. User accounts, properties and appointments are untouched by its migration.

1. Back up the newsletter/contact collections and indexes, and rehearse restoration and migration against a disposable database.
2. With the intended connection supplied privately as `MONGODB_URI`, run:

   ```sh
   node backend/scripts/phase3-migration.js
   ```

   This is read-only and does not load `.env` files. Invalid addresses, normalized duplicates, unsupported states or confirmed records lacking consent evidence block apply. Reports identify record IDs without printing email addresses. Reconcile duplicates explicitly, preserving suppression and any valid consent history; do not silently pick a winner.
3. Stop writes to these endpoints and rerun preflight, then:

   ```sh
   node backend/scripts/phase3-migration.js --apply
   ```

   This normalizes newsletter addresses, fills missing consent version/state, marks legacy subscriptions pending, initializes missing contact state, and creates the unique address/status indexes. It never converts legacy subscriptions into confirmed consent. Subscriber updates use compare-and-set guards; reruns are idempotent. Keep traffic stopped until the new API is running, because the old API accepts email-only unsubscribe.
4. Release backend and both clients together. Configure `JWT_SECRET`, `WEBSITE_URL`, mail transport and public API origins; use the established Azure/Vercel release path. Verify link origins in a test inbox. Existing email-only opt-out links need a newly requested email from the subscription form.
5. Run the staging checklist below before promoting. Do not announce Phase 3 fully accepted until that evidence exists.

## Verification

Automated API integration tests run against an isolated MongoDB replica set and mocked mail/image delivery, with no live user data or outbound mail:

- Complete registration → captured verification link → verification → login → multipart listing submission → admin approval → public detail → owner update → pending/nonpublic → second approval.
- Guest and authenticated viewing request → admin confirmation → notification invocation → admin/owner cancellation → cancellation notification invocation.
- Newsletter pending/confirmation, purpose mismatch, email-only opt-out rejection, repeated opt-out, revoked confirmation, explicit reconfirmation, dispatch failure/retry and suppression.
- Inbox authorization, bounded paging, edit conflict and audit rollback; subscriber management and legacy-state behavior.
- Migration duplicate blockers, preservation of suppression, pending legacy state and repeatability.
- Client API contract tests, failed-login navigation behavior, full sitemap pagination/dependency failure and query-cache cancellation/deduplication/retry.

The API journey tests verify notification invocation, not SMTP delivery. These tests do not substitute for browser interaction or a deployed staging run. Final results: **74 tests passed** (56 backend, 9 frontend, 9 admin), both production builds passed, and admin lint passed with zero warnings. Command evidence is recorded in `verification.txt`.

## Staging acceptance still required

- Run the two full owner/booking journeys above through both browser applications and a test inbox; include rejected-listing correction and stale review conflicts.
- Exercise bulk selection, mixed invalid states, failure retention, refresh and pagination on small/mobile screens.
- Verify native dialog focus trapping/return, Escape, Tab, filter popovers, account menu arrow keys and visible focus.
- Test expired verification/confirmation links, throttled resend, simulated mail failure, opt-out and reconfirmation.
- Test logout across tabs, revoked/expired sessions, offline bootstrap/retry and temporary dependency failures.
- Verify sitemap contents and canonical origins against the staging catalog.
- Record deployment IDs/commits, migration report and test-inbox delivery evidence before production promotion.

## Follow-up scope

Phase 4 still owns durable email/outbox retries, shared multi-instance quotas, backend metrics that do not turn dependency failures into zero, delivery monitoring, retention and deployment/rollback exercises. Contact assignment, campaign sending, bounce/complaint processing, persisted favorites, guest self-service cancellation credentials, RBAC/MFA and rescheduling are separate product/operations work; this phase does not advertise them as completed. Policies are factual project information, not an independently reviewed legal/compliance certification.
