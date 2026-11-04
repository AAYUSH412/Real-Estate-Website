# New admin — Phase 3 backend acceptance gate

Date: 3 November 2026. Baseline: Phase 2 commit `37228c7`. Result: **PASS for local replacement-admin development**, with the release boundaries below. This is Phase 3 of `ADMIN_NEW_PLAN.md`, not the earlier project-audit Phase 3 release from 2 November.

## Scope and evidence

Tests exercise the real mounted Express routers, real shared validators/DTOs, authentication/session logic and actual MongoDB replica-set transactions. HTTP tests use temporary local ports. Mail, ImageKit, Firecrawl and NVIDIA calls are replaced with isolated test doubles; representative failures are intentional. The server bootstrap, project database and live providers are not invoked by the regression suite. No real user records or credentials are committed.

The CORS options were extracted unchanged into `config/corsPolicy.js` and are now shared by `server.js` and acceptance tests. This avoids proving a separate test-only allowlist. The full production bootstrap, deployment networking and browser cookie policies are still outside these HTTP checks.

| Task | Acceptance evidence | Outcome |
| --- | --- | --- |
| P3-01 | Backend `npm test`: **86/86**. Admin tests **11/11**, lint, production build. Frontend tests **9/9**, TypeScript/production build. **106 tests total.** Diff and backend syntax checks passed. | Pass |
| P3-02 | New connected admin login → server session → simulated refresh-store outage → same-cookie retry → rotated access → logout → revoked access/refresh. Shared CORS policy checks production allowlist, preflight, credentials, exposed CSV headers, disallowed localhost and non-browser calls. Production refresh cookie Secure/SameSite=None checked; local HttpOnly/SameSite=Lax checked. Existing client tests cover parallel refresh, retry and local credential preservation. | Pass |
| P3-03 | Real multipart owner submission → review → publication → retained-image correction → public disappearance → stale review conflict → rereview/publication. Retained URLs match, no extra CDN upload/cleanup occurs. Existing tests cover unauthorized ownership, image decode/resource bounds, concurrent reviews and save/upload compensation. | Pass |
| P3-04 | Guest and authenticated booking → admin confirmation → property archive/cascaded cancellation during mail failures. Domain commits persist; notifications observe committed status; property/contact snapshots and owner booking visibility remain. Existing tests cover manual admin/user cancellations, past/future completion, slot uniqueness and forbidden guest/unrelated account access. | Pass |
| P3-05 | Actual public contact route → admin list/detail → in-progress/resolved notes with versions. Newsletter test follows the confirmation link dispatched by the handler, checks confirmed listing/suppression and rejects the revoked old confirmation. Existing tests cover token substitution, dispatch retry, suppression boundaries and audit rollback. | Pass |
| P3-06 | Fresh suite includes NVIDIA-only CRUD/testing/enable/default/replacement/all-off/delete/reorder, stale evidence, concurrent catalog writes, safe fields, model-specific payloads, saved limits, bounded fallback, invalid JSON, reasoning-only output, cache fingerprints/limits and migration rehearsal. New SSE tests assert complete final provenance for fresh, cached and late coalesced clients. | Pass, with inherited live candidate limits |
| P3-07 | [Final API contract index](admin-api-contracts.md); Phase 1/2 contract notes and migration/rollback guide; active plan linked from `PROJECT_AUDIT.md`; original operations Phase 4 explicitly deferred. | Complete |

## Defect found and fixed

The new SSE acceptance test initially failed because a fresh search emitted phased `properties`/`analysis` events and `done`, but deliberately omitted `result`. Cached requests emitted `result`. Phase 2's public provenance display reads final result metadata, so fresh streams silently missed that metadata; a late coalesced client could also miss earlier property events.

The controller now always sends a complete final `result` before `done`, retaining the existing progress events. Subscription cleanup uses the response `close` event; the incoming request's `close` event is not an SSE-response lifecycle signal. Response-write guards skip closed responses and avoid subscribing after a disconnect during cache lookup. Regression coverage verifies fresh, cached and late-joining shared requests, with one source lookup/inference for the shared request.

## Reproducing the gate

Run from each application directory with Node.js 22 and installed lockfile dependencies:

```sh
# backend/
npm test

# admin/
npm test
npm run lint
npm run build

# frontend/
npm test
npm run build
```

The backend suite owns temporary HTTP listeners and an ephemeral MongoDB replica set. It needs permission to bind local ports and may download a MongoDB test binary on first use; it must not be redirected to the project database. For focused acceptance debugging, `node --test --test-name-pattern='acceptance P3-' tests/phase1.test.js` runs the new connected scenarios. The full gate uses all tests, not only that subset.

The existing frontend warning about a shared static/dynamic API import remains non-blocking. It is not a failing TypeScript/build check.

## Remaining limits and release conditions

- **Production is unchanged.** No model migration apply, production data edits, server stop, `main` merge or production deployment took place in this gate. Model migration is prepared/rehearsed and must be reviewed/re-run at release time. New AI writes require displayed versions; release the compatible backend before dependent clients. See [migration/rollback steps](admin-phase2-nvidia.md).
- **Live model evidence is inherited, not rerun:** Phase 2's bounded demo checks passed Nemotron Bolt, while Mistral application JSON and both MiniMax checks reached 30 seconds. Keep those candidates disabled until the exact saved configuration passes. No full ranking-quality benchmark or vendor availability guarantee is claimed.
- **Browser and host verification remains:** actual Vercel/Azure origins, credentialed browser login/refresh/logout (including third-party-cookie restrictions), responsive/accessibility behavior, external provider delivery and production smoke/rollback are release/whole-panel checks. HTTP CORS and cookie assertions do not certify browser policy or cloud configuration.
- **Notifications remain best effort:** no durable outbox, delivery confirmation or crash-proof retries. Persisted history/transaction boundaries are verified; recipient delivery is not.
- **Legacy compatibility has limits:** some pre-existing unversioned commands cannot detect an older screen's staleness. The new client should always send displayed versions. User last-activity tracking, calendars/rescheduling, subscriber campaigns, RBAC/MFA and optional product features remain outside the approved release scope.
- **Original operations Phase 4 remains deferred:** shared atomic quotas, worker/outbox lifecycle, centralized bootstrap, telemetry retention, alerts, full recovery/restore and dependency-wide advisory remediation are not marked complete. Earlier narrow fixes and this CORS extraction do not reopen that workstream. No new CVE scan or vulnerability-free claim is made.

## Decision

The implemented contracts and verified failure states are sufficient to start **Phase 4 — `admin` foundation** against a verified local/test backend. Use a configured allowed origin for its local port, real protected APIs and shared types. Do not introduce mocked product counters or pretend the unavailable AI candidates are enabled. The original admin stays available throughout development; production cutover still waits for later acceptance and release work.
