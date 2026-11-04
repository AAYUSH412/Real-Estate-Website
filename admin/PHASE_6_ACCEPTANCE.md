# Phase 6 — existing management modules, desktop acceptance

Implemented locally on 4 November 2026. Browser acceptance is owner-run; no Playwright or automatic live-service tests. Use synthetic/test-owned accounts and bookings when trying moderation, consent and model actions. Successful domain saves may trigger real best-effort email attempts through your configured backend.

Start the existing backend normally and `npm run dev` in `admin/`, then open http://localhost:5175. No production alias or deployment changes are part of this phase.

## Routes and actual capabilities

| Screen | Path | Connected workflow |
| --- | --- | --- |
| Users | `/users`, `/users/:id` | Email/name search, state and supported sort, server paging, separately paged property/viewing history; suspend/ban/reactivate/archive; atomic current-page bulk suspend/ban. |
| Appointments | `/appointments`, `/appointments/:id` | Status/search paging, snapshot-safe details/contact, versioned meeting link and legal confirm/complete/cancel actions. Completion requires a known scheduled end in the past. |
| Contact inbox | `/leads`, `/leads/:id` | Email search/status paging, full message/contact, one internal note and resolution state with version protection and unsaved-draft warning. |
| Subscribers | `/subscribers` | Consent-state/email search, confirmation/opt-out dates and suppression. No admin consent grant or campaign sending. |
| NVIDIA models | `/ai-models` | Disabled-first add/configuration, explicit exact-model tests, verified enable/default, full-catalog reorder and replacement/all-off handling for default disable/removal. |
| Activity logs | `/activity` | Actor/action/entity/date filters, full event metadata, supported target-record links, protected bounded CSV download with export limit/total/truncation disclosure. |

Navigation groups are Overview, Property management, People and Administration. The chart and management routes remain lazy-loaded. Filter/paging state is URL-backed; user bulk selection resets when that view changes. Modal commands capture the displayed records/versions. Shared transport/query/mutation patterns preserve session handling and avoid automatic mutation retries.

## Manual desktop checklist

### Users

- [ ] Search by account name/email, filter each state, sort name/joined date in both directions, change pages and refresh a deep link.
- [ ] Open a test account and independently page its property and appointment histories, including archived/history references.
- [ ] Suspend with a valid reason/1–365 days; ban; reactivate. Verify current account/listing/booking consequences and refresh after changes. Reactivation does not reopen cancelled bookings or grant email verification.
- [ ] Select current-page active users for bulk suspend; active/suspended for bulk ban. Changing filters/page clears selection; mixed ineligible batches cannot be launched from the UI. A stale batch must fail atomically.
- [ ] Archive a test account only: verify history retained and sessions/open bookings handled by the existing backend. No permanent-purge or restore control exists.

### Appointments

- [ ] Test guest and authenticated details with missing historical live references; snapshot contact/property data should remain readable.
- [ ] Pending offers Confirm/Cancel; confirmed offers Complete/Cancel. Confirmed must not offer another Confirm. Terminal records have no reopen or meeting-edit action.
- [ ] Future/missing-end viewing completion stays disabled; refresh after the scheduled end and test completion on a test booking. Server time/state remains authoritative.
- [ ] Save a valid meeting URL, cancel with a reason and test stale versions from two tabs. Check history and actual provider notification outcome separately.

### Contact inbox and subscribers

- [ ] Filter inquiries, open/refresh a deep link, update resolution/note and verify version/failed-save behavior. A background refetch must not replace a draft or silently upgrade its version.
- [ ] Leave a changed note and cancel/confirm the unsaved-changes prompt. Test a 409 in another tab; the draft remains available for review.
- [ ] Filter pending/confirmed/unsubscribed addresses. Suppress only a test address; it becomes ineligible without granting consent. Already opted-out rows cannot be suppressed again through the UI. No campaign or consent-override button appears.

### NVIDIA models

- [ ] If migration-required is reported, verify the warning and blocked catalog actions. Do not apply a migration or seed from this UI; use the reviewed release procedure when authorized.
- [ ] Add a disabled demo configuration with exact NVIDIA ID/profile and supported parameters. Clear/invalid basic settings must not silently become an enabled model.
- [ ] Connection/application tests are explicit quota-consuming actions. Only test when ready to consume your NVIDIA quota. Check pass/fail/code/latency/time against the saved configuration. A failed HTTP-200 test result must not appear successful or grant eligibility.
- [ ] Enable only after application evidence matches the current configuration. Disable before editing; serving edits invalidate evidence and require retest. Unsupported profile fields remain rejected by the server.
- [ ] Change default, reorder, disable and remove. Current-default disable/removal requires an eligible replacement/version or explicit all-AI-off. Check stale catalog conflicts; no invisible fallback seed should appear.
- [ ] Historical Mistral/MiniMax timeouts are not current compatibility proof. Keep unverified candidates disabled. A passed small JSON test is not a ranking-quality guarantee.

### Activity, themes and failures

- [ ] Filter exact actor email/type, action, date range (UTC) and targetType + targetId. Inspect actor/metadata and open supported linked records. Event timestamps display in IST.
- [ ] Download a small filtered CSV and inspect headers/content; a large export must disclose truncation at the backend cap. If headers are absent, the client must not claim completeness.
- [ ] Check all six modules in light/dark themes and agreed laptop/desktop widths, long content, visible keyboard focus, Escape/focus return for dialogs and retry/empty/denied states. Mobile/tablet layouts remain out of scope.
- [ ] Confirm logout/identity change clears private data and delayed responses do not repopulate another session. Refresh/deep links should remain protected.

## Automated evidence and boundaries

Current client checks: **32 tests**, lint and TypeScript/production build. Twelve new management regressions cover selected-page version maps, guarded account archival, no retry on conflict, booking transitions/end-time rules, model test fingerprints/default replacement/reorder, CSV refresh/blob/truncation, a failed application test returning HTTP 200, stale inquiry draft preservation and suppression-only controls. Existing property/session tests remain in the suite.

No backend code, schema, migration, private environment file or deployment changed in this phase. Existing backend test evidence remains historical; it was not rerun merely for new client screens. Model tests, emails, moderation and exports were mocked or not invoked during automated checks. New manual workflows remain pending owner acceptance; Phase 7 is the full-panel verification stage.

## Owner follow-up acceptance — 4 November 2026

Owner confirmed all current checks and requested GitHub push. This is owner-reported desktop acceptance; individual checklist items above remain the detailed testing guide rather than agent-observed browser evidence. Status colors passed 32 client tests, lint and build. Authorized appointment maintenance and NVIDIA catalog migration were verified separately; see ADMIN_NEW_PLAN.md follow-up record. Model application tests/activation and production deployment are not implied by this acceptance.
