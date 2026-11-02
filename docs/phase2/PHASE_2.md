# Phase 2 — Reliable contracts and domain rules

Date: 2 November 2026. This is the pre-release implementation record; see [RELEASE.md](RELEASE.md) for release preparation and rollout evidence. Scope: the Phase 2 acceptance criteria in `PROJECT_AUDIT.md`. Changes are local; no production database migration, deployment, commit or push was performed for this phase.

## Implementation

| Area | Result | Main implementation |
|---|---|---|
| Shared contracts | A local ESM package supplies enums, input validators, DTOs, pagination metadata, booking slots/time zone, transition rules and versioned review commands. Both clients depend on it. | `shared/contracts/` |
| Request boundaries | IDs, bounded paging, listing fields, auth fields, contact/newsletter payloads, AI search shapes, numeric ranges, URLs and review versions reject malformed input with 400. Unknown write fields are rejected in these contracts. Conflicting state/version actions return 409. | `backend/middleware/contracts.js`, `backend/utils/httpErrors.js` |
| Properties | Canonical property types and sale/rent purpose; market state is a separate available/sold/rented field. Owner changes resubmit for review. Review requires pending state, an eligible verified owner and the exact displayed version. Publication starts the 45-day user-listing lifetime. | `backend/services/listingService.js`, `backend/services/domain/review.js` |
| Bookings | One-hour reservations use fixed slots in Asia/Kolkata, a validated future date within one year, UTC instants, immutable property/contact snapshots, a database reservation index and transactions. Cancellation releases the slot. Nonpublic, expired, archived, sold or rented properties cannot receive bookings. | `backend/services/domain/bookings.js`, `backend/models/appointmentModel.js` |
| Booking transitions | Pending → confirmed/cancelled; confirmed → completed/cancelled. Completion requires the scheduled end to have passed. Terminal states cannot be reopened. Feedback requires a completed appointment and is accepted once. Meeting links require HTTPS and an open appointment. | Shared transitions and booking domain service |
| Sessions | Each login creates a separate device session. JWTs identify subject kind and session. Refresh rotates an opaque hashed credential atomically; replay revokes that family, including its newest access token. Logout revokes one family; password changes/reset and moderation revoke all account sessions. Expiry is checked on reads. User-owned session list/revoke endpoints are available. | `backend/services/sessionService.js`, `backend/models/authSessionModel.js` |
| Auditing | Listing writes/reviews/archive, booking writes, moderation, credential changes, device session events, AI model changes and maintenance transitions persist audit records in the same transaction. Audit failure aborts the mutation. External notifications run after commit. | `backend/services/domain/audit.js` and domain services |
| Archival | Property removal archives the row, retains media/history and cancels open appointments. User removal archives the account and its listings, revokes sessions and cancels related open appointments. No irreversible purge is introduced. | `backend/services/domain/archival.js` |
| Bulk operations | Existing bulk API endpoints use all-or-nothing transactions, validate selection sizes, and return per-record results after commit. One stale review rolls back the complete selection. Frontend bulk controls remain Phase 3 work. | `backend/controller/domainAdminController.js` |
| Query bounds | Booking/admin/owner lists have bounded pagination and stable ordering. User detail has independent property/appointment pages and full counts. Search text and sort fields are bounded/allowlisted; compound indexes support common list paths. CSV export streams at most 10,000 rows without shared temporary files and escapes spreadsheet formulas. | Controllers, schemas, `backend/controller/auditController.js` |
| Time policies | Public reads and booking writes exclude expired listings immediately; owner DTOs/counts and admin active/expired filters use effective expiry. Search/trends cache reads and locality suggestions enforce the configured TTL before eventual database cleanup. Suspension visibility deadlines apply on public reads before workers run; restoration changes account and property visibility together and is idempotent. Maintenance transitions are audited. | Catalog queries, property controller, domain maintenance |
| Clients/packaging | Shared form enums, review versions, edit versions, appointment paging/totals and lifecycle controls are wired into clients. Admin amenities updates can explicitly clear the selection; admin edit can change market state; property detail suppresses viewing forms for sold/rented properties. Container builds now include the shared package from repository-root context. CI tests both clients and backend. | `frontend/`, `admin/`, Dockerfile and workflows |

## API changes

- List requests default to a bounded page; `page` is a positive integer and `limit` is 1–100. Invalid values return 400 instead of silently clamping. Use returned `total`, `totalPages`, `currentPage` and `limit`. Legacy collection keys and `totalProperties` are retained where existing clients use them.
- Property responses include `version`, canonical `type`, `purpose`, compatibility `availability` equal to purpose, and `marketStatus`. Admin create/edit returns the same property DTO shape as reads.
- Approve/reject requests require `{ expectedVersion }`; rejection also requires `reason`. Bulk review requires `propertyIds` and an `expectedVersions` map keyed by property ID. A changed/nonpending record returns 409.
- Listing/appointment edits can supply `expectedVersion`; both shipped clients supply it where wired. The server also uses transaction/current-state checks. User moderation and AI model edits support version checks without making them mandatory for existing callers.
- Booking times are exactly `09:00`, `10:00`, `11:00`, `14:00`, `15:00`, `16:00` in **Asia/Kolkata**. Legacy AM/PM input is supported by migration, not by new booking writes. `startsAt`/`endsAt` are UTC instants.
- Appointment lists return `pagination`, global `statusCounts` for the permitted account scope, and `upcomingCount` independent of the current page. Admin user detail accepts `propertyPage` and `appointmentPage` and returns separate pagination metadata.
- `DELETE /api/user/properties/:id`, admin property removal and admin user deletion now archive. Existing appointment references and snapshots remain readable.
- `GET /api/users/sessions` returns up to 100 active device sessions with bounded metadata; `DELETE /api/users/sessions/:id` revokes only a session owned by that user. No refresh digests are returned.
- Refresh sessions have an absolute 7-day or remembered/admin 30-day lifetime. Rotation preserves the original expiry. Reuse of a consumed credential revokes the family; concurrent refreshes of the same cookie are therefore treated as replay. Clients deduplicate refreshes within a tab; coordination between separate tabs is future work.

## Verification

The backend integration suite uses an ephemeral MongoDB **replica set**, real Express routers and actual transactions/indexes. Email, ImageKit, scraping and LLM transports are stubbed; no production database or provider calls are required.

Regression coverage includes existing Phase 1 authorization/media tests plus concurrent slot reservation, release/rebooking, invalid dates/IDs/types, unavailable listings, transition/version conflicts, duplicate feedback, competing reviews, audit rollback, atomic bulk review, retained archival history, independent devices, logout, replay-family revocation, session ownership, CSV concurrency/formula escaping, migration dry-run/collision handling/backfill, read-time expiry, idempotent maintenance, and cache freshness. Client tests execute the actual API modules with Axios adapters and verify request contracts.

Commands from the respective application directories:

```text
backend:  npm test
frontend: npm test
frontend: npm run build
admin:    npm test
admin:    npm run lint
admin:    npm run build
```

**Final local results:** 44 backend tests, five frontend tests and two admin contract tests pass; both production builds pass. Admin lint has zero errors and three existing hook warnings. See `verification.txt` for the recorded results. Browser/staging end-to-end checks, container startup and production migration have not been performed in this phase.

## Rollout and legacy data

1. Back up the database and prove a restore in staging. Confirm the deployed MongoDB supports transactions: a replica set or supported sharded cluster is required. Standalone MongoDB has no fallback path. Mongoose documents the transaction requirements and retry behavior in its [transaction guide](https://mongoosejs.com/docs/transactions.html).
2. Prepare a coordinated frontend/admin/backend release; approve/reject calls from older clients will fail without `expectedVersion`. Build the backend container from repository root (`docker build -f backend/Dockerfile .`). Independent app installs still run inside each app directory; retain the adjacent `shared/contracts` directory.
3. Stop writes during migration. Run the checked-in migration against a staging copy first. The command **does not load .env files**; supply a connection string through the environment without checking it in:

   ```sh
   cd backend
   node scripts/phase2-migration.js
   # Only after resolving all blockers and reviewing the dry-run report:
   node scripts/phase2-migration.js --apply
   ```

   Both commands require `MONGODB_URI` to be supplied explicitly. Default mode performs reads only and reports collection names, record IDs and reasons. Apply mode refuses all changes when preflight finds blockers. It checks normalized email collisions, invalid listing metadata, missing owners/references, unrecognized times, duplicate active slots and multiple default AI models. It never chooses a winner among duplicate bookings or merges accounts automatically.
4. Apply backfills canonical property fields, UTC booking instants, snapshots, active-reservation flags and account session defaults; each row uses a compare-and-set condition and a transaction with an audit event. The migration is resumable at row boundaries, **not one global all-database transaction**. An interrupted apply can leave a completed prefix; rerun preflight before retrying. Keep traffic stopped until it finishes and indexes are verified. Legacy data must be corrected before enabling the new runtime.
5. Verify the partial unique reservation index and unique default-model index. MongoDB documents that [unique indexes require compatible existing data](https://www.mongodb.com/docs/manual/core/index-unique/) and that [partial indexes constrain only matching documents](https://www.mongodb.com/docs/manual/core/index-partial/). Legacy bookings without `startsAt` need the backfill; the runtime compatibility collision check is additional protection, not a substitute for migration.
6. Existing JWTs/legacy single refresh hashes do not become device sessions. Users and admins must sign in again. Deploy both clients, run listing/booking/moderation smoke tests, then resume writes. Run expiry/suspension reconciliation after the maintenance window; read-time policy already excludes expired rows.
7. A rollback to the previous application cannot interpret every new state (especially archived/deleted). Coordinate code rollback with the database snapshot and pause writes; do not blindly redeploy old code against changed data.

## Remaining work and limits

This phase establishes domain contracts; it does not establish production readiness or a “perfect” architecture. Phase 3 still needs full browser journeys, bulk UI controls, lead/subscriber administration, recovery/opt-out UX, consistent client query handling and remaining analytics/UI fixes. Phase 4 still needs durable email/outbox and media-cleanup retries, central configuration, shared atomic quotas, worker ownership, redacted retention, alerts and exercised backup/rollback procedures.

Audit storage is atomic with supported domain mutations; it is not a tamper-proof external ledger. Existing analytics may still classify stored status differently from effective expiry; that dashboard cleanup remains visible Phase 3 work. Regex search and high-offset pages are bounded but are not a scalable search design; benchmark production query plans before adding indexes or changing pagination. Large account archives/bulk selections can exceed practical transaction limits and should move to a resumable archival job if real data requires it. Retained identities/media/session metadata need a deliberate retention/anonymization policy. Current notification delivery remains best effort after commit. AI cache key identity, provider cache invalidation across instances, extraction quality and caller-funded result-sharing policy remain separate audit findings.

## Explicit demo-data repair

`backend/scripts/phase2-demo-repair.js` is opt-in tooling authorized by the owner for demo properties. It requires `--demo-data-confirmed`; default execution is a dry run and `--apply` is separate. Invalid numeric demo listings are archived with explicit placeholder numbers, and original values are captured in the audit event. Appointment references to deleted properties/accounts are retained with unavailable snapshots; open appointments are cancelled. Existing user/admin accounts are never changed by the repair. Historical valid 24-hour and AM/PM slots are backfilled without forcing them into the new six-slot policy. New booking validation remains strict.
