# Phase 1 — Authorization and destructive workflow containment

Implemented against the [original audit](../../PROJECT_AUDIT.md), 2 November 2026. Status: **implemented and verified locally**, with the staging checks and residual advisories below. No deployment or real-database migration was performed.

## Fix register

| Audit item | Implementation | Verification |
|---|---|---|
| S01: bans/suspensions ignored | Shared account policy on protected access, login, refresh, and verification auto-login. Single/bulk moderation increments a persisted session version and clears refresh credentials atomically with the status change. Expired suspensions are evaluated at request time. | Old access/refresh credentials rejected; ban→unban does not restore old access; new login after suspension expiry succeeds |
| S02: guest appointment IDOR | User cancellation/feedback requires an actual matching owner. Guest records are never implicitly owned by a signed-in caller. | Guest and another user's records return 403 and remain unchanged; owner cancellation succeeds |
| S03: password change/reset retains sessions | Password reset consumes its token atomically, increments session version, and clears refresh credentials. Profile password change compares the current password and updates/revokes atomically. UI signs out after a password change. | Existing access and refresh fail after reset/change; reset-token replay fails |
| B01: text-only edit deletes images | Shared listing service preserves images when no replacement is supplied and supports explicit retained URLs validated against that listing. At least one and at most four images are required. Optimistic document versions detect conflicting saves. | Multipart text-only edit, retain/remove/add, and reject-empty cases pass |
| B02: incorrect admin multipart header | Removed JSON defaults from API clients; browser/Axios can encode FormData correctly. Admin Update sends explicit retained-image selection and contiguous file fields. | Multipart HTTP tests persist expected images; API-client tests retain binary FormData |
| B05: records hidden beyond first page | Bounded server pagination and catalog filtering/sorting; authenticated all-status admin list/detail; working controls for public catalog, admin list, review queue, and owner listings. Dashboard uses server totals rather than a partial list's length. | Traverses 27 public, 45 admin, 18 pending and 45 owned records without duplication/omission; filter aliases and totals checked |
| F01: signed-in bookings become guests | API client chooses `/appointments/schedule/auth` when an access token exists; normal auth refresh applies. Guest route remains available without a token. | Client tests check selected endpoint/token; HTTP booking appears in its owner's dashboard API |
| F02: missing owner edit/resubmit | `/edit-property/:id` reuses the listing form, loads an owner-only detail endpoint, supports image retention/removal, and saves back to pending review. Ownership loads before multipart parsing. | Owner can load/edit a rejected listing; stranger cannot load/upload/edit; public rejected detail remains hidden |
| A01: LLM circuits never recover | `canAttempt()` separates eligibility to probe from reported health; one half-open probe runs at a time. Provider routing allows recovery attempts. | Open→half-open→closed recovery through actual provider/router classes; parallel probe rejected |
| A02: provider omitted on model creation | Admin model form and API preserve `provider`. Selected/default provider goes first; disabled/empty providers are not reintroduced through hardcoded fallbacks. Seeding is explicit. | Model CRUD preserves provider; HTTP searches use selected/default provider; disabling/deleting all models leaves them unavailable |
| Safe DTOs / S05 | Auth secrets are excluded by default on user/admin schemas. Login/profile/admin user responses use field allowlists; appointment populations omit secrets. | Profile, admin user list and appointment mutation responses contain no credential hashes |
| Token URLs / S10 | Metrics and request/error logging redact verification/reset path tokens and drop query strings. Health/root probes no longer generate per-request Stats writes. | Redaction tests pass; existing historical telemetry is not automatically modified |

Additional directly related containment: successful password-reset/resend email requests now count toward their intended quotas; user refresh-token rotation uses an atomic hash/version comparison; remembered lifetime survives refresh; user passwords share an 8-character/72-byte boundary; admin tokens are checked against a current Admin record; JWT verification restricts the accepted algorithm; public reads exclude listings already expired by time; approval renews a user listing's publication window and checks its owner's moderation state.

## Media behavior and limits

Uploads use bounded Multer memory storage (four files, five MiB each) rather than temporary disk files. Declared extension/MIME and file signatures are checked. Listing metadata is validated **before** ImageKit uploads. Partial upload failures and failed persistence trigger deletion of successfully uploaded assets. Successful replacement removes obsolete assets only after the listing saves; retained assets remain untouched. ImageKit IDs are now stored for new uploads.

Legacy listings have URLs but no ImageKit file IDs. Their images remain usable; do not guess IDs or delete legacy images by URL. Cleanup failures from an unavailable CDN are logged for operational follow-up. Durable cleanup retries, total process-wide upload concurrency, image decoding/re-encoding and pixel limits remain future hardening; this implementation does not guarantee deletion when the external service refuses it.

## Tests and release checks

| Check | Result | Evidence |
|---|---|---|
| Backend integration/regression suite | **21 passed** | [backend-tests.txt](evidence/backend-tests.txt) |
| Frontend API-client suite | **4 passed** | [frontend-tests.txt](evidence/frontend-tests.txt) |
| Frontend build including full TypeScript check | **Passed** | [frontend-build.txt](evidence/frontend-build.txt) |
| Admin production build | **Passed**, main chunk size warning remains | [admin-build.txt](evidence/admin-build.txt) |
| Admin lint | **0 errors**, 4 existing hook-dependency warnings | [admin-lint.txt](evidence/admin-lint.txt) |
| Backend JavaScript syntax | No syntax failures in the checked application/test files | `node --check` |
| Whitespace/conflict-marker diff check | Passed | `git diff --check` |

Backend tests run a disposable MongoDB database and actual Express routes over local test HTTP listeners. Email, CDN and AI calls are replaced with deterministic test adapters; production credentials/database are not used. The first run downloads a MongoDB test binary into the OS temporary cache. Tests require local ports and may need sandbox/network permission on first execution.

From each application directory:

```sh
# backend/
npm ci --ignore-scripts
npm test

# frontend/
npm ci --ignore-scripts
npm test
npm run build

# admin/
npm ci --ignore-scripts
npm run lint
npm run build
```

Frontend `build` now runs `tsc --noEmit` before Vite. The previously undeclared dependencies imported by existing UI primitives are declared; the old missing-module type failures are resolved. Admin lint cleanup removes unused imports/unreachable handlers and corrects configuration globals and JSX escaping. Bulk moderation buttons are still a later-phase UI task; lint cleanup does not implement those dialogs.

`.github/workflows/verify.yml` runs backend tests, frontend tests/typechecked build, and admin lint/build on pull requests/main. The backend deployment workflow now runs its tests before publishing an image. These workflow changes were reviewed locally but have not been executed on GitHub. CI security-advisory policy, branch protection, staging approvals and cloud readiness checks remain separate operational work.

## Dependency remediation

Updated compatible dependency ranges/lockfiles and explicitly upgraded Multer to 2.5.0, Vite to 6.4.5, and React Router to 7.18.5. Backend now resolves Express 4.22.3, Axios 1.21.0 and Mongoose 8.24.7. Removed unused native bcrypt, legacy mail/transport, direct body-parser and Azure inference packages. Existing code uses bcryptjs, Express's parser, Brevo REST, and the current provider adapters. Nodemon is development-only.

| App | Original entries | Current entries | Current critical | Current high | Current moderate |
|---|---:|---:|---:|---:|---:|
| Backend | 25 | 7 | 0 | 3 | 4 |
| Admin | 27 | 7 | 0 | 0 | 7 |
| Frontend | 16 | 0 | 0 | 0 | 0 |

These are all-dependency package entries, including tooling, not independent exploitable vulnerabilities. Snapshots: [backend](evidence/npm-audit-backend.json), [admin](evidence/npm-audit-admin.json), [frontend](evidence/npm-audit-frontend.json). Counts are time-sensitive.

Remaining review:

- **Firecrawl → Zod:** three high package entries correspond to the Firecrawl SDK/wrapper and its Zod dependency. The [Zod constrained-collection advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) requires a patched major version outside the SDK's declared Zod 3 range. The current scraping code supplies fixed plain JSON schemas and no caller-provided Zod schemas; no reachable oversized Zod-validation path was demonstrated. This is an exposure assessment, not proof of safety. Track upstream compatibility or replace the SDK with a separately tested REST adapter. An untested major override was deliberately avoided.
- **ImageKit → uuid:** the [remaining advisory concerns v3/v5/v6 output buffers](https://github.com/advisories/GHSA-w5hq-g745-h8pq). The installed ImageKit signature helper uses v4 without caller-provided output buffers; the application's own UUID package is patched. Keep tracking an upstream dependency update rather than downgrading ImageKit.
- **Nodemon/minimatch:** two backend moderate entries are in the development watcher chain; it is excluded from production dependencies.
- **Admin ESLint/minimatch:** seven moderate entries are in development lint tooling. npm reports no compatible fix for some ancestors. No automatic forced downgrade was applied.

The current scan has **zero critical entries across all applications**, but the backend's remaining high advisory matches must remain visible in the backlog. No `npm audit fix --force` or blanket incompatible dependency override was used.

## Deployment notes and compatibility

1. Deploy API and both clients together after staging verification; the clients now use new admin/owner listing detail/query endpoints.
2. User JWTs gain an `sv` claim. Existing JWTs lacking it are treated as version zero for compatibility, until reset/password change/moderation increments the persisted value. Existing user documents need no bulk migration for the new default fields. In-flight requests already authorized before revocation are not retroactively undone.
3. Revoked access credentials remain invalid after an account is reactivated. The user must sign in again. A profile password change intentionally signs out the browser.
4. The current refresh model still stores one refresh credential per account; multi-device session families and replay history remain Phase 2 work.
5. Existing property URLs remain supported; new media metadata populates only when assets are uploaded. Full property/user deletion with linked bookings and legacy media cleanup is not solved in this phase.
6. Model seeding no longer occurs during a public request. Existing configured models remain in place. For a fresh database, create models in the admin panel or explicitly run `node scripts/seedAIModels.js` from `backend/` with the intended database environment. That command was **not** run against your database.
7. Historical Stats documents and previously exported logs may still contain raw token paths. Plan a controlled redaction/purge with backups and retention requirements; no historical production data was modified here.
8. MongoDB/cron startup/config loading, filesystem AI quotas, durable jobs, full booking state/slot rules, analytics accuracy, complete audit events, user bulk dialogs and email delivery reliability remain in later phases.

## Staging checks before release

- Register/verify/sign in; confirm the React session and refresh cookie work on the actual frontend/API domains.
- Submit a listing, review it, edit/resubmit it, and test retaining/removing/replacing photos from both user and admin screens.
- Traverse more than one page in each listing/review view; search and change filters while requests are pending.
- Make guest and signed-in bookings; confirm dashboard visibility and administrator notification/meeting flows.
- Exercise ban, suspension, reactivation, password reset/change and old credentials in separate browsers/devices.
- Test the actual Firecrawl, GitHub and NVIDIA accounts, current model IDs, selected/default behavior, failure recovery and quota responses. Local tests do not establish provider/network compatibility.
- Verify production upload memory limits, CDN deletion failure alerts, CORS/cookie behavior and rollback procedures.

The original historical reproducer under `docs/audit/` describes defects before these changes and is intentionally no longer expected to pass. The regression suites above are the current verification commands.
