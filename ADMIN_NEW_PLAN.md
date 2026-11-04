# BuildEstate — Backend readiness and `admin_new` redesign plan

Prepared: 3 November 2026
Status: **Phase 7 accepted for continuation by owner; Phase 8 release preparation next**
Repository baseline: `9b7d946` (Phase 3 release documentation)
Scope update: 4 November 2026 — essential demo features; replacement admin is desktop-only. Browser testing stays manual.

## 1. Decisions captured from your requests

1. Create this Markdown document first so you can read and approve the work.
2. Review the backend before starting the new admin application.
3. Finish the backend work required by the approved admin journeys, then begin the redesign.
4. Build the replacement from scratch in a future **`admin_new/`** directory. Keep the current `admin/` available during development and acceptance.
5. Use a modern, professional design based on **shadcn/ui and Radix primitives**.
6. Use **NVIDIA NIM as the only AI inference service**. Remove GitHub Models from active backend routing, configuration, catalog setup and admin choices.
7. Make adding, testing, enabling, disabling, removing and selecting AI models possible through the admin interface.
8. Build the replacement admin for desktop only; phone/tablet layouts and mobile acceptance are out of scope.
9. Keep the original audit's **Phase 4 — Make operations dependable** deferred at your request. Its unresolved items remain documented, rather than marked completed.

**Phase 3 baseline:** Phase 3 backend acceptance passed locally with **106 tests (86 backend, 11 admin, 9 frontend)**, admin lint, both client builds and backend syntax checks. Connected workflows verify session outage recovery/logout, shared CORS/cookie policy, retained-image revisions, booking history during mail failure, inquiry resolution and newsletter consent. A fresh-stream provenance gap found by acceptance was fixed: fresh/cached/late-coalesced SSE now receive the complete final result. No project database mutation, model migration apply, production deployment or project server stop occurred. `admin_new/` now contains the Phase 4 foundation; see section 10.5 for current validation and manual acceptance.

**Current:** Phase 4 foundation is accepted on `feat/admin-new-phase4-foundation`, based on Phase 3. The owner confirmed the remaining desktop foundation checks and local reset-email receipt on 4 November, and authorized Phase 5. Browser testing remains manual; mobile checks are out of scope. The owner reviewed the desktop screens, confirmed create/edit/archive after rotating ImageKit keys locally and in Azure, and authorized Phase 6. Its six management modules are now implemented locally; remaining full-panel/manual checks continue in Phase 7. See [local setup/manual checklist](admin_new/README.md). Production and model migration remain separate release steps.

## 2. Recommendation

The backend already supports most core management work. Rewriting it from zero would discard useful validation, transactions, ownership checks, audit records and tests.

My recommendation is to retain Express, MongoDB/Mongoose and the existing domain services, close the specific gaps in section 5, verify the resulting contracts, and then build `admin_new` against those contracts.

“Backend ready” will mean that every approved first-release screen has a documented, tested API with real data and defined failure behavior. The first release preserves the existing management modules and adds only the three practical improvements selected in section 11. The wider feature ideas in this document are a deferred reference backlog, not required implementation tasks.

## 3. Review method and evidence limits

The original assessment below was a read-only source review of the backend's route map, routed controllers, authentication/session services, listing and booking domain services, engagement/newsletter handling, AI routing/providers/cache, models/index definitions, email construction, middleware, migrations, runtime configuration and existing test coverage. Current admin API callers and shared contracts were compared with those backend routes.

Evidence is identified by file and function so proposed fixes can be verified before implementation. Findings marked **source-confirmed** follow from the current code. Missing endpoints/features were checked against the registered route files. Recommendations are identified separately from existing behavior.

This is a backend-readiness assessment, not a claim that every execution path is secure or that every source statement has been dynamically exercised. No live penetration test, dependency vulnerability refresh, paid model request, database inspection or test rerun was performed for this document. The previous release records **74 passing tests: 56 backend, 9 frontend and 9 admin**; that is historical release evidence, not a new result from this review.

**Implementation update (Phase 1):** sections 4–5 preserve the original findings as a baseline, rather than claiming those findings still describe every changed file. Section 10.2 and [Phase 1 contract notes](backend/docs/admin-phase1-contracts.md) record the implemented fixes, checks and compatibility limits. The original no-test-rerun statement above describes the planning review only.

Related records:

- [Original project audit](PROJECT_AUDIT.md)
- [Phase 2 implementation](docs/phase2/PHASE_2.md)
- [Phase 3 implementation](docs/phase3/PHASE_3.md)
- [Phase 3 production release](docs/phase3/RELEASE.md)

## 4. What is already connected

Route names below include their production mount prefixes. “Connected” means the route/controller exists and, where stated, the current client calls it. It does not mean the module has no remaining improvements.

| Module | Existing backend support | Current readiness for `admin_new` |
| --- | --- | --- |
| Admin login/session | `POST /api/users/admin`, `/admin/refresh`, `/admin/logout`; `GET /api/admin/session`; stored device sessions, rotating refresh credentials and audit events | Connected. Improve transient refresh failure handling; multi-admin management is not present. |
| Public/user authentication | Registration, verification, resend, login, refresh/logout, forgot/reset password, profile changes and user device session inventory/revocation under `/api/users` | Connected. Preserve these user journeys while changing admin and AI code. |
| Admin property catalog | `GET /api/admin/properties`, `GET /api/admin/properties/:id`; bounded paging, search/type/purpose/price filters, status selection and sort support | Connected to the current property list/edit pages. Owner information and typed contracts need improvement for the proposed richer table. |
| Admin property writes | `POST /api/products/add`, `/update`, `/remove`; up to four uploads, retained-image selection, domain validation and archival | Connected. Existing multipart field names must stay compatible. Removal archives rather than hard-deletes. |
| Owner listings | Authenticated create/list/detail/update/archive under `/api/user/properties`; ownership checks, pending review and resubmission | Connected. Protect the existing public frontend while replacing admin. |
| Listing review | Pending queue, versioned approve/reject, atomic bulk approval/rejection/archival under `/api/admin/properties` | Connected, including current bulk controls. Requires clearer owner eligibility and stable queue/detail data. |
| Users/moderation | Paged user list, user detail with separately paged listings/bookings, suspend/ban/reactivate/archive and bulk suspend/ban | Connected except account archival is not exposed by the current user UI. Session revocation and public listing hiding already exist. |
| Appointments | Guest/authenticated scheduling, owner list/cancellation/feedback, admin list/status/meeting update; state transitions, UTC instants, one active reservation per property/start time | Connected. A dedicated appointment-detail route and date-window query are missing for a richer detail/calendar journey. |
| Contact inquiries | Public `POST /api/forms/submit`; admin paged list and versioned status/note update under `/api/admin/leads` | Connected to the contact page and inbox. Assignment, reply sending and dedicated inquiry detail/history APIs are absent. |
| Newsletter | Signup, recipient confirmation, signed opt-out; admin subscriber list and suppression | Connected. Administrators cannot grant marketing consent. Campaign sending is not an implemented product workflow. |
| AI models | Admin list/create/update/delete at `/api/admin/ai-models`; public enabled-model picker at `/api/ai/models`; provider selection and default controls | CRUD is connected. Runtime currently supports GitHub Models and NVIDIA; it must become NVIDIA-only. There is no admin test-model endpoint. |
| AI property search | `/api/ai/search`, `/api/properties/search`, trends, locality suggestions and caller Firecrawl-key validation | Connected to public AI search. Some cache/configuration/provenance issues remain; see sections 5 and 6. |
| Audit log | Admin paged/filterable log list and independent streamed CSV export | Connected. Entity-specific history and actor filters needed by proposed detail screens are not implemented. |
| Diagnostics | `/health`, `/health/ready`, `/status`; protected circuit-breaker, rate-limit and cache statistics endpoints | Existing endpoints, not a complete operations console or verified provider-health system. |
| Maintenance | Listing-expiry and suspension reconciliation; transactional cancellation/audit behavior | Exists. Durable scheduling, retries and multi-instance coordination remain in deferred operations work. |

### Existing rules the redesign must preserve

- Listing lifecycle: pending, active, rejected, expired and archived.
- Listing purpose: sale or rent; market state: available, sold or rented.
- Booking lifecycle: pending → confirmed/cancelled; confirmed → completed/cancelled; terminal bookings cannot be reopened through ordinary status actions.
- Completion is allowed only after the scheduled viewing ends.
- Approval/rejection uses the displayed entity version; conflicts return 409.
- Property/account archival retains booking history; related open reservations are cancelled.
- Bulk review/moderation is atomic: the whole selected batch succeeds or no item changes.
- Existing booking timezone is Asia/Kolkata, with stored UTC start/end times. Existing slots are fixed; a working availability editor does not exist.
- No public or admin DTO should expose password hashes, refresh credentials, reset/verification secrets or provider API keys.

## 5. Backend work before `admin_new`

### B01 — Make dashboard figures match actual domain rules

**Source-confirmed:** `backend/controller/adminController.js` uses numerous `.catch(() => 0)`/empty-array fallbacks in `getAdminStats`, `getUserStats`, `getPropertyStats` and `getEnhancedOverview`. A failed query can therefore produce `success: true` with apparently valid zero data.

Several totals use raw `status: 'active'`, while public visibility also depends on expiry and moderation. User totals include archived accounts in some endpoints, while the user list excludes them. `getRecentActivity` filters out guest appointments because it requires both a populated user and property. “Property Views” are recorded API requests, not unique human visitors; failed/detail requests and bots are not distinguished by that label. Current charts also have a fixed date window.

**Required:** define published, bookable, pending, expired, archived and account totals; reuse catalog/account policies; return explicit unavailable/error information; include new inquiries and upcoming appointments; use snapshots for guest/history rows. Name request metrics honestly. Support validated date ranges/timezone if the new dashboard exposes date controls.

**Done when:** dashboard numbers reconcile with filtered lists; a failed dependency never appears as a successful zero; guest activity is represented; every chart has a defined range and meaning.

### B02 — Preserve refresh cookies during temporary backend failures

**Source-confirmed:** the shared refresh handler in `backend/controller/userController.js` clears its cookie in every catch branch, including a temporary database/session-service failure. The admin client now retains stored credentials on a temporary proactive-refresh failure, but the backend can still remove the cookie needed for the retry.

**Required:** clear credentials for invalid, expired, replayed or revoked sessions; preserve the refresh cookie for transient failures and return a retryable service error. Verify both user and admin behavior, including concurrent refresh and replay protection. Verify the future `admin_new` origin and cookie behavior in a browser.

**Done when:** an injected temporary DB failure followed by recovery permits a refresh without another password login, while invalid/replayed credentials remain rejected.

### B03 — Finish safe, accurate notification construction

**Source-confirmed:** `sendAppointmentNotificationToAdmin` in `backend/services/emailService.js` interpolates contact details, title and notes into HTML without the escaping used by `backend/email.js`. Appointment subjects/templates also directly access `appointment.propertyId.title`, even though preserved history can have only a snapshot. The meeting template labels the booking confirmed regardless of its actual current status. The reactivation email points to `/login`, whereas the public app uses `/signin`.

`cancelOpenBookings` in `services/domain/archival.js` saves cancellations/audit records but does not dispatch the affected appointment emails. `notifyModeration` handles suspend/ban but does not call the existing reactivation email method for unban. Sending is best-effort; API success does not prove inbox delivery. The Brevo HTTP adapter also needs a finite request timeout.

**Required:** escape user-controlled email fields, use snapshot-safe rendering, correct status/link wording, dispatch appropriate notifications after committed cascade actions, and report notification failure separately from successful domain changes. Return only bounded/safe delivery-attempt information, not raw provider responses or recipient data belonging to other users.

**Done when:** tests cover hostile HTML, missing populated records, pending meeting-link updates, archive/moderation cancellations, reactivation and provider timeout/failure. No email is sent for a rolled-back write.

This is bounded correctness work. Guaranteed delivery, durable retries, provider webhooks and an outbox remain deferred Phase 4 work. The new UI must not display “Delivered” without evidence.

### B04 — Complete upload validation beyond file headers

**Source-confirmed:** `middleware/multer.js` bounds file size/count and checks extension/MIME; `services/listingService.js::validateImage` checks magic bytes. It does not decode the image or enforce dimensions/pixel/frame limits.

**Required:** validate decodability and resource bounds before CDN upload. Preserve successful text-only edits, retained-image semantics and compensation on partial upload failure. Decide the accepted animated-image policy explicitly.

**Done when:** corrupt and oversized-dimension images fail without uploads; permitted images still save; concurrency and cleanup tests continue to pass. A durable media-cleanup worker remains deferred.

### B05 — Publish consistent admin query and response contracts

**Source-confirmed:** catalog reads use `property`, owner reads use `properties`, and pagination totals use several aliases. Pending queue/user list pagination lacks the canonical `total` supplied elsewhere. Model and inquiry writes can return raw Mongoose fields, while other modules expose normalized versions.

`PropertyDTO.postedBy` is typed as an optional string in `shared/contracts/index.d.ts`, but pending reviews can return a populated owner object and admin-created listings have no owner. General admin catalog/detail queries do not populate owner names/emails. Blank user search is rejected even though blank catalog search is now accepted. Some sorts lack an `_id` tie-breaker. `lastActive` exists in the schema and sorting API, but current normal request/login handling does not keep it updated.

**Required:** define typed page/entity responses and query schemas for every approved screen; distinguish owner ID from safe owner summary; normalize versions; make optional blank filters consistent; define stable sorts and whether counts are global or filtered. Either define/update a meaningful last-active field or omit that display/sort from the new UI.

Keep existing response aliases and multipart routes working during the transition. Do not rename public API fields in a way that breaks `frontend/` or the existing `admin/`.

**Done when:** the new client needs no guessing between response shapes, owner data is correct, and both old clients pass compatibility tests.

### B06 — Add only the read APIs required by approved detail screens

**Missing from registered routes:** individual admin appointment, inquiry and subscriber GET endpoints; appointment date-window filtering; an entity audit-history query using `targetId`.

**Proposed:** `GET /api/admin/appointments/:id`, `/leads/:id`, `/subscribers/:id`; validated `from`/`to` appointment filters and stable start-time sort; `targetType` + `targetId` audit filters. Preserve the existing static `/properties/pending` route ordering when adding routes.

These endpoints are required if the first release includes direct-linkable drawers/detail pages or an agenda date window. Existing lists can support a simpler screen, but a detail page must not depend on finding a record in the currently loaded page.

**Done when:** deep links, refresh, missing/archived related records, malformed IDs and unauthorized requests have tested outcomes.

### B07 — Make stale actions and bulk selection predictable

**Source-confirmed:** review versions are required, but versions are optional for several other writes. Bulk user moderation accepts IDs/reason/days without a per-record version map. Archive commands do not accept an expected displayed version. Current bulk endpoints already provide atomic transactions; preserve that behavior.

**Required:** document a version policy for new-client edits/moderation/archive commands, add compatible guards where needed, and return useful conflict information. Selection is initially restricted to the current page; “select every result” must not silently act on unloaded records.

**Done when:** another admin tab changing a selected record produces a clear conflict rather than an unexpected overwrite; no partial batch is implied by the UI.

### B08 — Complete NVIDIA-only model management

**Required scope change:** remove GitHub Models runtime support and implement the model-management rules in section 6. This includes model-specific request options, exact-model tests, safe default changes and cache/configuration invalidation.

**Source-confirmed:** `aiModelModel.js`, `aiModelController.js`, `propertyController.js`, `aiService.js`, `GitHubModelsProvider.js`, environment examples and seed/migration scripts currently contain GitHub inference support. Merely hiding the provider dropdown would leave that behavior active.

**Done when:** no active inference route calls GitHub Models, ordinary catalog edits need no code deployment, and the selected/default/fallback model used for a result is identifiable.

### B09 — Make AI result freshness and model settings truthful

**Source-confirmed:** search cache keys use the requested slug or the literal `default`; they do not encode the resolved model configuration. Trends cache keys contain only the city, omitting selected model/limit. Model-list invalidation is process-local. Changing a default/configuration can therefore leave cached analyses representing an older choice.

The provider returns final text without recording the actual model used after fallback. Analysis calls override some model token/timeout settings. AI preparation/repair paths limit analyses to eight properties even when more listings are returned. Benchmark prompts can describe cached data as live/current; generated claims are not independently verified facts.

**Required:** define effective parameter precedence; identify actual model and fallback; version cache keys using the resolved configuration and relevant search dimensions; expose retrieval/analysis timestamps and partial-analysis state. Validate ranking identifiers and score bounds. Preserve uncertainty for estimated prices and source-reported registration numbers. Never equate a pattern-matched registration string with independent verification.

For the initial new admin, either show these factual capabilities or omit the corresponding health/freshness controls. Persistent cost accounting is not currently available.

**Done when:** a model/default change cannot silently serve an old analysis as a new-model result; missing analyses and estimated/source-reported fields remain distinguishable.

### B10 — Make audit details/export match the new interface

**Source-confirmed:** `auditController.js` filters action/admin email/target type/dates, but not `targetId` or actor type. Audit events also include user/system actors despite the historical `adminEmail` name. CSV output stops at 10,000 records without an explicit truncation indication. It already neutralizes spreadsheet formula prefixes and streams independent exports.

**Required:** expose the fields needed for a truthful actor/entity timeline, add bounded entity filtering, and clearly signal export limits. Record useful changed-field/version metadata without copying secrets or unnecessary personal data into logs. Lead-note changes currently do not provide a full note-version history; do not draw a historical note timeline from data that is not stored.

**Done when:** filters and exports agree, system/user/admin events are labeled correctly, and exported row limits are visible.

### B11 — Extend tests to actual application mounts and new failure cases

**Source-confirmed:** `backend/tests/phase1.test.js` constructs a separate Express app and mounts the contact router at `/api/form`; production `server.js` and the public client use `/api/forms`. Existing tests cover useful domain behavior, but that test setup does not prove the production mount, CORS or cookie-origin integration.

**Required:** test the registered production route map using isolated dependencies, cover old/new clients, refresh outages, dashboard failures, upload bounds, cascade notification attempts and NVIDIA-only selection/default removal. A shared route-registration fixture can close the mount gap without undertaking the deferred whole-bootstrap rewrite.

**Done when:** API integration plus browser acceptance exercise the paths the deployed applications actually use. Provider calls are mocked in routine tests; separately authorized test-model requests verify real NVIDIA compatibility.

### B12 — Correct small setup and API diagnostics inconsistencies

**Source-confirmed:** `package.json` points `start:prod` at a missing `server-production.js`; the working container starts `server.js`. Setup instructions still include older mail/AI configuration terminology. `getCacheStats` can return an error object which its route wraps in `success: true`. Email health helpers infer health from the presence of a key rather than a delivered request. The generic server error/404 paths expose raw error or requested-URL text differently from the shared safe error handler.

**Required:** document one accurate local start path, correct the broken script, use safe consistent API error responses, and distinguish “configured” from “tested/healthy.” This does not authorize changing cloud infrastructure or building an operations console.

**Done when:** a new developer can start the existing backend correctly and the new UI never renders a configuration-presence check as confirmed service health.

## 6. NVIDIA-only AI architecture and easy model management

### 6.1 The intended architecture

```text
Public AI search / admin Test model
                  |
        Validated model selection
                  |
       Enabled catalog in MongoDB
                  |
          NVIDIA NIM adapter
                  |
 https://integrate.api.nvidia.com/v1/chat/completions
                  |
       Validated result + provenance
```

NVIDIA is the serving provider. `mistralai/...` and `minimaxai/...` identify model developers/catalog entries; their names do not require separate Mistral or MiniMax API integrations when invoked through NVIDIA.

**Firecrawl remains:** it supplies property discovery/extraction and is not a competing LLM provider. Existing caller Firecrawl-key behavior remains unless separately changed. **GitHub source hosting, GitHub CLI and GitHub Actions deployments also remain:** removing GitHub Models must not remove repository/deployment integration.

### 6.2 Your three requested models

The IDs below were checked against NVIDIA's public catalog on 3 November 2026. Catalog presence and example requests do not prove access, quotas, task quality or every parameter combination for your account. No authenticated NVIDIA request was made in this document-only review.

| Model | Exact NVIDIA model ID | Intended evaluation role | Official reference |
| --- | --- | --- | --- |
| Mistral Large 4 | `mistralai/mistral-large-4-1t-a52b` | Candidate for detailed property analysis; its example uses `reasoning_effort` and image input | [NVIDIA catalog/example](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b) |
| Nemotron 3.5 Bolt E4B | `nvidia/nemotron-3.5-bolt-e4b` | Candidate for the fast default after testing; example uses `chat_template_kwargs.enable_thinking` | [NVIDIA catalog/example](https://build.nvidia.com/nvidia/nemotron-3.5-bolt-e4b) |
| MiniMax M3.1 Flash | `minimaxai/minimax-m3.1-flash` | Additional text-analysis/fallback candidate; model card describes text and image inputs | [NVIDIA model card](https://build.nvidia.com/minimaxai/minimax-m3.1-flash/modelcard) |

The initial default/fallback order should be chosen using the same representative property datasets, JSON completeness and response-time checks. “Fast default” is a proposed role, not a measured benchmark result. Your sample token limits, seeds and streaming flags are examples, not automatically suitable settings for a larger property-analysis request.

### 6.3 The everyday admin flow

**Add:** AI models → Add model → enter name, exact model ID and description → choose a supported parameter profile → save disabled → run Test model → enable after it passes.

**Change default:** choose Make default on an enabled, tested model. The backend changes the old and new defaults atomically and records the action.

**Change fallback order:** use a clear ordered list or Move up/Move down controls. The backend validates uniqueness/order and saves it with a version check. Only enabled, supported models participate.

**Disable:** remove the model from public selection and future fallback attempts. Require a replacement if it is the default and AI search is meant to remain enabled.

**Remove:** confirm removal from the active catalog and retain the audit trail. A current default needs an atomic replacement or an explicit choice to turn off AI search. Do not silently re-add removed models through hardcoded defaults or public-request seeding. Distinguish disabled/removed records from historical model references.

**Routine model CRUD should not need a deployment.** A newly introduced API capability or incompatible NVIDIA request format may need an adapter update; entering a model ID cannot make unsupported parameters work automatically.

### 6.4 Proposed model fields and controls

| Group | Fields/behavior |
| --- | --- |
| Identity | Display name, unique internal slug, exact NVIDIA model ID, optional badge/description |
| Serving provider | Fixed server-controlled `nvidia`; no GitHub/provider-choice dropdown |
| Lifecycle | Enabled/disabled, default, fallback order, record/configuration version |
| Basic parameters | Maximum output tokens, finite request timeout, temperature and top-p within validated per-model bounds |
| Capability profile | Text, optional vision, supported JSON/structured-output mode, supported streaming mode, supported reasoning options |
| Advanced options | Only allowlisted options supported by the selected profile; examples include reasoning effort, thinking flag, seed and penalties where valid |
| Test evidence | Test result, latency, timestamp, tested configuration version, bounded/redacted error and structured-output result |
| Provenance | Actual model ID/configuration used by an analysis; whether fallback occurred |

Store the API key only as the server's `NVIDIA_API_KEY`. Never put it in a model record, API response, browser environment variable, public frontend, exported configuration or audit metadata. JavaScript does not expand the literal string `"Bearer $NVIDIA_API_KEY"`; the server must construct the header from the environment value.

The base endpoint is fixed on the server. Model forms must not accept arbitrary request URLs, authorization headers or unvalidated raw payload overrides.

### 6.5 Model-specific options need separate profiles

The pasted examples intentionally differ. The backend must not attach every parameter to every model.

- Send `reasoning_effort` only through a profile that supports its exact format/values.
- Send `chat_template_kwargs.enable_thinking` only where supported.
- Do not unconditionally send `reasoning_budget`, `response_format`, tool flags or image content.
- Use final answer content; do not substitute internal reasoning text for a missing final answer.
- The initial property-analysis feature can use nonstreaming upstream responses when supported. Existing browser SSE progress events are a separate interface; upstream model streaming requires its own tested parser if introduced.
- Vision support in a model does not automatically add image analysis to the product. It needs an explicit upload/input flow and separate acceptance tests.
- Make effective token/timeout limits visible: task-level overrides must not silently contradict the admin configuration.

### 6.6 Existing versus new AI endpoints

| Endpoint | Status and planned behavior |
| --- | --- |
| `GET /api/admin/ai-models` | Exists; return safe catalog rows with normalized versions and fixed NVIDIA provider |
| `POST /api/admin/ai-models` | Exists; create validated model configuration, initially disabled by default in the new workflow |
| `PUT /api/admin/ai-models/:id` | Exists; validate capabilities/configuration and stale versions; invalidate relevant caches |
| `DELETE /api/admin/ai-models/:id` | Exists; strengthen default/replacement and history behavior before exposing removal in the new UI |
| `GET /api/ai/models` | Exists; publish enabled supported models and the effective default, without keys/private configuration |
| `POST /api/admin/ai-models/:id/test` | **Proposed new endpoint**; test the exact saved model without falling back to another model |
| Atomic replacement/reorder command | **Proposed contract extension**; choose final route/body in the backend contract phase; do not expose an unimplemented action |

The Test model button should explain that it runs a small NVIDIA request. Test connectivity and the app's required JSON shape separately. A test passes only for the exact requested model/configuration; fallback success must not disguise failure. Add admin authentication, bounded input/output/timeouts and rate limits.

### 6.7 GitHub Models removal checklist

1. Inventory current model records, defaults and client-selected slugs with a read-only preflight.
2. Back up the affected model configuration and preserve audit history. No user/property/appointment deletion is involved.
3. Add NVIDIA-only resolution and remove GitHub inference branches from `propertyController.js` and `aiService.js`.
4. Remove `GitHubModelsProvider.js` and simplify provider routing to a NVIDIA model fallback chain. Remove dependencies used exclusively by that adapter after checking imports; the OpenAI SDK is currently used by that adapter.
5. Update the model schema/input validation, public DTOs, current admin form and future `admin_new` form so GitHub cannot be selected or written. Keep a compatible transition for the current admin while it remains deployed.
6. Replace seeds and retire the old `migrateAIModels.js` behavior that inserts GitHub models and makes GPT-4.1 the default. Public requests must never repopulate a removed catalog.
7. Remove GitHub-only runtime environment requirements and current setup instructions. Keep GitHub repository/Actions credentials and historical audit documentation.
8. Migrate GitHub catalog records out of the active catalog; choose a verified NVIDIA replacement/default. **Do not relabel a GitHub model ID as NVIDIA without checking the actual NVIDIA ID.**
9. Version/invalidate relevant AI caches and handle old client-selected slugs with an explicit unavailable-model response.
10. Replace GitHub-specific tests with NVIDIA-only default/explicit selection, same-provider fallback, disable/remove/reorder and unsupported-parameter tests.
11. Run compatibility and test-inbox/browser checks as applicable; accept the backend contracts before new-admin development, then release compatible backend changes before preview/production clients depend on them.

If all models are intentionally disabled, return a clear unavailable state and hide/disable public AI search. Do not invent a hardcoded enabled fallback.

## 7. Missing features versus optional product choices

The following are not currently complete backend features. They must either be implemented in an approved phase or omitted from the first-release navigation/actions.

| Capability | Current situation | Recommendation |
| --- | --- | --- |
| Admin profile/password/device management | Current identity/login/logout exist; user session-management endpoints are user-scoped. Admin profile/password/self-service session inventory routes do not exist. | Useful follow-up. Do not build a Settings screen with nonfunctional save controls. |
| Multi-admin roles/MFA | Authorization also checks configured `ADMIN_EMAIL`; this is not a multi-admin permission model. | Separate feature when multiple operators are required. |
| Appointment availability/rescheduling | Slots are fixed in shared contracts. No admin availability or atomic reschedule endpoint. | Add only after booking rules and user expectations are specified. |
| Guest self-service cancellation | Booking IDs alone do not authorize cancellation, correctly. No guest possession-token cancellation journey. | Valuable user improvement with a dedicated signed/opaque authorization design. |
| Lead assignment/replies | One status and one internal note exist. No agent assignment, threaded notes or message-send workflow. | Start with current inbox/status/note; add assignment when operator roles exist. |
| Newsletter campaigns | Consent/suppression exists; a low-level bulk-send helper is not a campaign product. | Defer campaigns/delivery guarantees with operations work. |
| Notification center | Audit records and contact messages exist, but no per-admin notification/read-state API. | Use actual pending-work links first. Do not show a fake notification badge. |
| Restore archived resources | Archive behavior exists; restore policy/API does not. | Separate domain feature, including owner eligibility and booking rules. |
| Saved searches/favorites/alerts | No persisted favorites/saved-search backend journey. | Good public-product additions after the admin replacement. Alerts depend on notification delivery work. |
| Provider usage/cost reports | Circuit statistics are process-local; no durable per-model billing ledger. | Basic measured request/latency data first. Do not label estimates as billed cost. |
| Global command search | Entity-specific list searches exist; no cross-entity search endpoint. | Initial command palette can navigate pages; global record search needs a bounded authorized API. |

## 8. `admin_new` architecture

### 8.1 Proposed stack

- React + TypeScript + Vite, continuing the existing client/server deployment model.
- shadcn/ui components using Radix primitives; semantic theme tokens for both themes.
- React Router for protected, lazy-loaded routes and direct links.
- TanStack Query for request lifecycle, cache invalidation, mutation state and cancellation.
- TanStack Table for controlled server pagination, filters, sorting, row selection and column visibility.
- React Hook Form with shared/runtime validation adapted from the backend contracts; avoid parallel, conflicting enum definitions.
- One icon library, Lucide; one chart library, loaded only on screens that use charts.
- Browser acceptance tests for critical workflows, alongside meaningful API/component tests.

Exact package versions and component APIs will be checked for compatibility when implementation begins. The design does not require a backend framework migration, microservices, a new database, or a Next.js rewrite. Sections 10–11 define the first-release scope; broader options in the architectural/design reference are deferred unless included there.

### 8.2 Future folder structure

```text
admin_new/
  src/
    app/                 # providers, router, shell, query client
    components/
      ui/                # installed shadcn primitives
      layout/            # sidebar, header, breadcrumbs
      data-table/        # reusable table/toolbar/pagination patterns
      feedback/          # loading, error, empty and confirmation states
    features/
      auth/
      dashboard/
      properties/
      reviews/
      users/
      appointments/
      leads/
      subscribers/
      ai-models/
      activity/
    lib/                 # API client, query keys, formatters, permissions
    styles/              # semantic colors, typography and spacing tokens
  tests/
  components.json
  package.json
```

This tree is a plan, not files created today. Reuse shared contracts and proven domain rules, rather than copying the old visual components wholesale.

### 8.3 API integration rules

- One API client, one credential/session lifecycle, centralized error normalization and query keys.
- Query keys include relevant filters; private caches are cleared on logout/account changes.
- Server-side paging/sorting/filtering; URL state preserves the current view where practical.
- Mutations invalidate affected detail/list/count queries after success.
- Show 409 conflicts with a refresh/review action; do not silently retry destructive writes.
- Keep real domain outcomes separate from notification attempts.
- Use shared enums and typed DTOs; never infer backend capabilities from a mock dashboard.
- Keep current `admin/` functional until the replacement passes acceptance and cutover is chosen.

## 9. Visual and interaction plan

References: [shadcn dashboard](https://ui.shadcn.com/examples/dashboard), [your dashboard demo reference](https://demos.shadcndashboard.dev). Use their component-based dashboard approach while adapting content to BuildEstate. The second demo was supplied as a visual preference, not independently evaluated in detail during this source review.

### 9.1 Design system

The working scene is an administrator reviewing properties, bookings and messages on a laptop during ordinary office use. Readability and efficient repeated actions lead the design.

| Role | Proposed treatment |
| --- | --- |
| Canvas | Neutral pale gray `#F7F8FA` |
| Main surfaces | White `#FFFFFF`, with subtle borders rather than decorative shadows |
| Primary text | Charcoal `#18181B` |
| Secondary text | Muted gray `#71717A` |
| Primary action/focus | Blue `#2563EB`, used selectively |
| Dividers | Neutral gray `#E4E4E7` |
| Typography | Geist Sans; readable 14px body controls, clear heading scale and tabular numbers |
| Corners/spacing | 8–12px component corners; consistent 4/8px spacing rhythm |
| Status | Semantic success/warning/error colors plus text/icons, never color alone |
| Dark theme | Explicit companion tokens with equivalent hierarchy/contrast; no theme-specific hardcoded page colors |
| Motion | Short menu/drawer/feedback transitions; respect reduced motion |

The real-estate identity comes from useful property photography, clear location/price information, and a focused review workspace. It does not depend on decorative gradients or generic financial metrics.

### 9.2 Application shell

Desktop collapsible sidebar, compact top header, breadcrumbs, real account menu and theme switch. Primary page actions occupy a consistent location. Phone/tablet adaptation is out of scope; inherited primitive drawer support is not a separate deliverable.

Navigation groups:

- **Overview:** Dashboard.
- **Property management:** Properties, Review queue, Appointments.
- **People:** Users, Contact inbox, Subscribers.
- **Administration:** AI models, Activity logs.

Do not include Settings, Notifications, Billing or Team pages until their backend workflows actually exist.

### 9.3 Screen-by-screen design

| Screen | Intended behavior |
| --- | --- |
| Login | Restrained branding, labeled fields, password visibility, real validation and retry/session recovery. No fabricated platform statistics. |
| Dashboard | Operational task queue first: pending reviews, upcoming viewings and new inquiries. A few reconciled counts and a meaningful dated chart. No revenue tile without a revenue system. |
| Properties | Thumbnail/title/location, price/purpose, listing state, market state and owner; search/filter toolbar, column visibility, selection and consistent row actions. |
| Property detail/edit | Organized details, location, pricing, amenities and media; existing images retained visibly; clear pending/saving/conflict states. |
| Review queue | Desktop queue-and-detail workspace with image gallery, owner eligibility, rejection history and explicit approve/reject actions. Desktop queue-and-detail flow. |
| Users | Account list and direct-linkable detail with separately paged listings/bookings; consistent moderation reasons, expiry and archive wording. |
| Appointments | Clear scheduled timezone/date, contact and property; existing status/search filters, record detail, meeting controls and legal actions. Date-window agenda, calendar and rescheduling are deferred. |
| Contact inbox | List/detail composition, readable message, contact identity, internal note and resolution controls. Assignment/reply actions appear only after those APIs exist. |
| Subscribers | Consent state, confirmation/opt-out dates and suppression controls; no admin “grant consent” action. |
| AI models | NVIDIA-only table with default/enabled/test state, fallback order, exact model ID and safe editing/testing controls. |
| Activity logs | Actor-aware events, useful filters, expandable metadata, entity links and explicit CSV limits. |

### 9.4 Shared quality rules

- Loading, empty results, failed requests and permission denial have distinct states and useful next actions.
- Long titles/emails, unavailable snapshots and large rupee amounts cannot break the layout.
- Dialogs/popovers have correct labels, focus handling, Escape behavior and keyboard access.
- Destructive confirmations describe archival, affected bookings and real consequences.
- Focus and disabled reasons remain visible. Future appointment completion explains when it becomes available.
- Forms show inline errors, server errors, unsaved edits and explicit save state.
- Table selection displays its scope and survives/rejects refresh according to a defined policy.
- Theme and column preferences can be local preferences initially; do not imply server synchronization. A separate density control is deferred.

## 10. Approved delivery sequence and progress tracker

**Execution sequence:** backend fixes, NVIDIA-only management and the backend acceptance gate precede the replacement admin. Phases 1–3 are now accepted locally; the next phase is the `admin_new` foundation. Treat the findings in section 5 as original evidence; this tracker and the linked acceptance records define current status.

The original audit's deferred Phase 4 is a separate workstream. “Phase 4” in the tracker below means the **new-admin foundation**, not reopening the operations project.

### 10.1 Master tracker

Status values: **Not started**, **In progress**, **Blocked** (with the specific reason), **Complete**. Mark a phase complete only after its acceptance checks pass. Do not count a placeholder screen, mocked response or unverified migration as completion.

| Phase | Deliverable | Status | Depends on | Completion evidence |
| --- | --- | --- | --- | --- |
| **0 — Plan and scope** | Backend review, design direction, NVIDIA-only requirement and demo-sized scope | **Complete** | Owner review on 3 November 2026 | This document; no implementation claimed |
| **1 — Essential backend fixes** | Correct and consistent APIs for the existing admin journeys | **Complete (local)** | Phase 0 | 84 tests; admin lint; both client builds; [contract notes](backend/docs/admin-phase1-contracts.md); no deployment |
| **2 — NVIDIA-only AI** | GitHub inference removed; safe model CRUD/testing/default/fallback behavior | **Complete (local; live limits recorded)** | Phase 1 | 100 tests; migration rehearsal; bounded live checks; [Phase 2 contract/release notes](backend/docs/admin-phase2-nvidia.md); no migration apply/deployment |
| **3 — Backend acceptance gate** | Backend verified before building its replacement client | **Complete (local gate passed)** | Phases 1–2 | 106 tests, client builds/lint, shared CORS checks, connected journeys and SSE fix; [acceptance report](backend/docs/admin-phase3-acceptance.md) |
| **4 — `admin_new` foundation** | New app folder, design system, shell and real authentication | Complete (desktop owner acceptance) | Phase 3 | Working local application and desktop/theme/session checks |
| **5 — Dashboard and property workflows** | Reviewable visual direction, then complete property/review journeys | Implemented; visual/manual acceptance pending | Phase 4 | Visual review plus create/edit/review/archive workflow checks |
| **6 — Remaining admin modules** | Users, appointments, contact inbox, subscribers, AI models and audit logs | Owner-reported desktop acceptance | Phase 5 design checkpoint | Each module works with actual backend contracts |
| **7 — Full-panel verification** | Consistent, accessible desktop replacement admin | Complete (automated checks; owner-reported acceptance) | Phases 5–6 | Browser/API acceptance results and production build |
| **8 — Preview and production cutover** | Accepted preview and controlled replacement of the current admin | Not started | Phase 7 | Deployment identifiers, smoke checks and rollback reference |

### 10.2 Phase 1 — Essential backend fixes

**Purpose:** prevent the new design from hiding existing correctness/security gaps. Retain the existing backend architecture and public API compatibility.

Tasks:

- [x] **P1-01:** Correct dashboard counts and error behavior (B01). Use expiry/moderation/account rules, include guest/history data where relevant, label request counts honestly, and show unavailable data rather than invented zero totals.
- [x] **P1-02:** Preserve refresh cookies on temporary backend failures while continuing to revoke invalid/replayed sessions (B02).
- [x] **P1-03:** Escape notification HTML; render historical snapshots safely; correct meeting status/reactivation links; handle committed cancellation notifications and bounded mail timeouts (B03). Keep delivery guarantees explicitly out of scope.
- [x] **P1-04:** Add image decoding/resource validation while preserving existing file limits, retained images and cleanup behavior (B04).
- [x] **P1-05:** Standardize the admin client's typed query/page/entity/version handling, owner summaries, blank filters and stable sorts (B05). Preserve existing field aliases for both old clients.
- [x] **P1-06:** Add only the missing reads needed by the chosen record detail screens: appointment/inquiry details and bounded entity audit filters (B06/B10). Subscribers stay list-based for this release. Keep existing appointment ordering/filters; a calendar, configurable availability and date-range agenda are deferred.
- [x] **P1-07:** Apply compatible stale-record/version checks to critical edits/moderation/archive commands and retain atomic bulk behavior (B07). Use current-page selection; do not implement “select every matching record.”
- [x] **P1-08:** Make CSV limits, safe error responses, diagnostics labels and local start instructions accurate (B10/B12). Do not build an operations console.
- [x] **P1-09:** Extend isolated regression tests for these fixes and the actual production route mounts (B11). Keep old admin/public frontend contracts working.

**Done when:** the affected API tests pass, required detail reads exist, dashboard numbers reconcile with lists, and no first-release screen needs to pretend a missing API exists. Advanced analytics, user last-activity tracking and custom dashboard date controls are omitted unless already supported by the finalized contracts.

**Completion evidence — 3 November 2026 (local implementation):**

| Task | Implemented changes / evidence |
| --- | --- |
| P1-01 | Dedicated `dashboardController.js`: failures propagate; public-listing rules reconcile with active catalog; archived accounts excluded; guest/snapshot history retained; successful API-request charts cover 30 UTC days. Definitions included in responses and contract notes. |
| P1-02 | Shared refresh handler preserves cookies for 5xx failures; invalid/replayed credentials still clear/revoke. Existing admin also preserves local credentials during proactive and reactive refresh outages. |
| P1-03 | Escaped admin notification fields; snapshot-safe subjects/templates; actual meeting status; `/signin` reactivation link; reactivation notification wired. Transaction effects dispatch cascaded cancellation attempts after commit and discard rollback/retry attempts. Brevo timeout: 10 seconds. |
| P1-04 | Sharp validates decoding before ImageKit upload: 5 MB, 16 MP, 8000px per side, one frame; sequential decoding bounds per-request memory. Existing four-image, retention and compensating cleanup checks pass. Sharp is validation only; ImageKit handles resizing/delivery. Existing stored images are not rescanned. |
| P1-05 | Canonical pagination totals plus old aliases, catalog array alias, deterministic sort ties, blank search validation, safe owner summaries/IDs, expanded shared TypeScript declarations. Removed unsupported last-active sort from current UI. |
| P1-06 | Admin appointment/inquiry GET detail endpoints; validated `targetType` + `targetId`, actor type/email filters and bounded entity history. No subscriber detail page/calendar added. |
| P1-07 | Optional compatible archive and per-record bulk moderation/archive version checks; complete version maps validated; stale bulk commands roll back. Existing admin moderation/archive and public owner archive send displayed versions. Legacy unversioned requests remain supported and have the limitation documented below. |
| P1-08 | CSV cap/total/truncation headers exposed through CORS and disclosed by old admin; actor labels corrected; safe generic/cache errors and URL-free 404; configuration-only mail diagnostics; working `start:prod`; accurate Node 22/replica-set/Brevo instructions. |
| P1-09 | Production and isolated tests share `routes/mountApiRoutes.js`, including `/api/forms/submit`. Regression coverage exercises count reconciliation/errors, session outages, details/auth/history, versions/rollback, image decoding/resource limits, template escaping, post-commit notification failure and mocked Brevo timeout. |

**Checks:** backend `npm test` **65/65**; admin `npm test` **10/10**, `npm run lint` and `npm run build`; frontend `npm test` **9/9**, `npm run build` and final `npm run typecheck`; `git diff --check`, backend JavaScript syntax and setup-shell syntax checks passed. The existing frontend build reports its shared static/dynamic API-import warning; output still builds successfully.

**Limits:** verification uses an isolated MongoDB replica set and mocked external providers, not the project database or live mail/ImageKit calls. There was no push/deployment, migration or full browser acceptance run. Existing unversioned legacy commands cannot detect screen-age staleness; supported clients now send versions. Expired suspensions remain stored as suspended until reconciliation, rather than claiming user activity. Notifications remain best-effort with no durable retry guarantee. Dependency installation reported seven backend advisories (four moderate, three high); dependency-wide remediation/CVE verification is not claimed by this phase. See [full contract and behavior notes](backend/docs/admin-phase1-contracts.md).

### 10.3 Phase 2 — NVIDIA-only AI and simple model management

**Purpose:** make NVIDIA the only inference service and let the admin manage supported models without routine code changes.

Tasks:

- [x] **P2-01:** Inventory current model records/configuration and prepare a read-only migration report; preserve existing users, listings, bookings and audit history.
- [x] **P2-02:** Remove GitHub Models runtime routing/provider code and GitHub-only dependencies/configuration/seeds after checking references. Preserve GitHub repository hosting, CLI and Actions.
- [x] **P2-03:** Restrict serving provider to NVIDIA in the backend and current admin during the transition; keep the server API key private.
- [x] **P2-04:** Add validated capability/parameter profiles for the three requested NVIDIA model IDs in section 6. Do not implement vision uploads, tool execution or upstream streaming as new product features.
- [x] **P2-05:** Add exact-model testing with safe result/latency/timestamp/configuration information and bounded requests. A test must not pass by silently falling back to another model.
- [x] **P2-06:** Implement safe enable/disable/default/replacement/removal rules and simple fallback ordering. All-disabled must return an honest unavailable state.
- [x] **P2-07:** Make actual-model/fallback information and cache configuration changes truthful (B09); ensure relevant results are invalidated/versioned after catalog changes.
- [x] **P2-08:** Update NVIDIA-only tests and old-client compatibility, rehearse the migration and record results. Verify account access/output compatibility separately from routine mocked tests.

**Done when:** GitHub inference cannot be selected or called; supported NVIDIA models can be added/tested/enabled/defaulted/disabled/removed using real APIs; stale writes, unsupported options and default removal are handled safely. A new model requiring an unsupported request capability may still need an adapter update.

**Completion evidence — 3 November 2026 (local implementation):**

| Task | Implemented changes / evidence |
| --- | --- |
| P2-01 | Read-only configured-database inventory: one NVIDIA model, zero GitHub records, zero migration blockers. Private model-only Extended JSON snapshot retained outside Git. No project data changed. |
| P2-02 | Removed GitHub inference adapter, OpenAI SDK dependency, provider routing, current env/setup requirements and old seed behavior. Retired migration command cannot reinsert GitHub models. GitHub repository/CLI/Actions are unchanged. |
| P2-03 | NVIDIA-only model schema/input/resolution and current admin controls; fixed upstream endpoint and server-only key; no arbitrary payload/header/URL overrides. Public requests never seed or restore deleted models. |
| P2-04 | Validated Bolt/Mistral/MiniMax profiles plus conservative text-basic profile for other NVIDIA-hosted IDs. Payload tests verify only supported reasoning/seed/penalty fields; no unconditional JSON mode, reasoning budget, tools, images or upstream streaming. Saved limits cap effective requests; fallback has a shared 120-second / three-attempt budget. |
| P2-05 | Admin-protected, rate-limited exact-model connection/application tests; fixed demo input; no fallback; bounded response, token/time limits; safe persisted result/configuration/latency/timestamp; stale in-flight tests rejected. Reasoning-only and truncated answers fail. |
| P2-06 | Disabled-first creation; application-test evidence required before activation; serialized default changes/replacements/removal/all-off/reorder with displayed versions; audit rollback and concurrent enable tests pass. Current admin exposes real controls and confirmations. |
| P2-07 | Cross-instance catalog re-read and configuration fingerprint in result keys; trend limit/model included; actual model/fallback/effective limits and generation timestamp returned; public availability/coverage/provenance displayed. Larger property sets no longer silently stop at eight; cached model estimates are labeled unverified. |
| P2-08 | NVIDIA-only regressions and client checks pass. Actual model snapshot rehearsed in isolated replica set: one normalized model plus three additions, all disabled; unrelated sentinels unchanged; repeat run preserves catalog. Synthetic tests cover GitHub retirement/private backup/audit preservation. Live account checks below are recorded separately from mocks. |

**Checks:** backend `npm test` **80/80**; admin `npm test` **11/11**, lint and production build; frontend `npm test` **9/9** and production build (includes TypeScript); diff and JavaScript syntax checks. The frontend's existing shared static/dynamic API-import warning remains non-blocking. [Contract, migration, rollback and verification notes](backend/docs/admin-phase2-nvidia.md).

**Live profile readiness:** Nemotron connection/application JSON passed (1052/3677 ms). Mistral connection passed (1029 ms), but its application JSON check did not complete within 30 seconds. MiniMax connection and JSON checks did not complete within 30 seconds. These are bounded observations, not throughput/quality guarantees. No saved model record was activated or granted test evidence by this standalone check; test the exact saved post-migration configuration in admin. Keep Mistral/MiniMax disabled until they pass.

**Release boundary:** migration is prepared and rehearsed, **not applied** to the configured database. Existing model configuration, users, listings, appointments and audit records are untouched. The coordinated release must apply the private-backup migration, retire the old default index and test/enable models. Current AI writes now require versions; update the old admin alongside the backend. Full browser acceptance and production migration/deployment remain later work. Phase 2 uses branch `feat/admin-new-phase2-nvidia`, based on the Phase 1 branch so PR #4 remains scoped to Phase 1.

### 10.4 Phase 3 — Backend acceptance gate

Tasks:

- [x] **P3-01:** Run backend tests and both existing client contract/build checks; record actual results rather than carrying forward the historical 74-test total.
- [x] **P3-02:** Verify admin login → current session → refresh → logout, including a transient refresh failure and recovery.
- [x] **P3-03:** Verify owner listing submission → admin review → publication → owner correction → rereview, retaining images and enforcing conflicts.
- [x] **P3-04:** Verify guest/authenticated booking → admin confirmation/cancellation, preserved history and notification-attempt outcomes.
- [x] **P3-05:** Verify contact status/note changes and newsletter confirmation/suppression without expanding into CRM or campaigns.
- [x] **P3-06:** Verify the NVIDIA model lifecycle, cache behavior, invalid/disabled model handling and removal of GitHub inference.
- [x] **P3-07:** Record the finalized API contracts, safe migration steps and unresolved deferred limitations. Link the active plan from `PROJECT_AUDIT.md` and mark the original operations Phase 4 deferred.

**Gate:** start `admin_new` only when required backend checks pass. Production deployment is not required merely to begin local client development; use a verified local/test backend initially. Deploy compatible backend changes before preview/production clients depend on them, as part of the release plan. No automatic server stop is part of this gate.

**Completion evidence — 3 November 2026 (local acceptance):**

| Task | Verification / result |
| --- | --- |
| P3-01 | Fresh backend run **86/86**, admin **11/11** plus lint/build, frontend **9/9** plus TypeScript/build; **106 total**. Diff and changed backend JavaScript syntax checks passed. |
| P3-02 | Connected admin login/session → temporary refresh-store 503 → same-cookie recovery → rotated token → logout → access/refresh rejection. Shared production CORS policy, credentialed preflight, CSV exposed headers and Secure/SameSite=None cookies verified through HTTP. Client credential preservation tests rerun. |
| P3-03 | Multipart owner submit/review/publish → explicit retained-image correction → public exclusion → stale review 409 → rereview/publication. No extra upload or retained-image deletion. Existing concurrent review/audit rollback checks pass. |
| P3-04 | Guest/auth booking → admin confirmation → listing archive/cascade cancellation with mocked mail failures. Notifications see committed states; snapshots/history and account booking visibility survive. Existing manual cancellation, slot and completion checks rerun. |
| P3-05 | Public contact submission → versioned in-progress/resolved admin notes/detail; dispatched recipient-confirmation link → confirmed subscriber list → admin suppression → old confirmation rejected. No CRM/campaign scope added. |
| P3-06 | Full NVIDIA lifecycle/cache/profile suite rerun. New fresh/cache/late-coalesced SSE checks found and fixed missing final `result` metadata; response-close cleanup and closed-response guards included. Shared requests make one source lookup/inference. No additional live quota consumed. |
| P3-07 | [Accepted API contract index](backend/docs/admin-api-contracts.md) and [gate report](backend/docs/admin-phase3-acceptance.md) record contracts, migration/release steps and remaining limits. `PROJECT_AUDIT.md` now links the active plan and explicitly marks its original operations Phase 4 deferred. |

**Gate decision: PASS for local `admin_new` development.** The new client can use the real protected routes and shared types; it must handle actual unavailable states. Production readiness is separate: apply/review the model migration during coordinated release, test exact saved configurations, verify browser/host origins/cookies and complete later panel/cutover checks. Mistral/MiniMax live timeouts, best-effort notification delivery, filesystem quota limits and deferred operations work are not marked resolved. The original admin remains available. Phase 3 uses branch `test/admin-new-phase3-acceptance` based on Phase 2; this work does not merge or deploy `main`.

### 10.5 Phase 4 — Create `admin_new` and its design system

Tasks:

- [x] **P4-01:** Create `admin_new/` with React, TypeScript and Vite; keep current `admin/` intact.
- [x] **P4-02:** Install compatible shadcn/Radix components and establish semantic theme, typography, spacing, status and focus tokens.
- [x] **P4-03:** Build the collapsible sidebar, compact header, breadcrumbs and mobile navigation drawer.
- [x] **P4-04:** Connect actual admin authentication, session validation, refresh/logout, protected routes and private cache clearing.
- [x] **P4-05:** Set up shared query/table/form/error/loading patterns and lazy-loaded routes.
- [x] **P4-06:** Verify desktop light/dark themes, keyboard access and the separate local origin without changing the production alias. Owner confirmed remaining desktop checks; mobile verification removed from scope.

**Done when:** the real login and shell work against the accepted backend. Navigation only exposes implemented screens; no dummy counters, fake account settings or placeholder saves.

**Implementation evidence — 4 November 2026:** React 19/TypeScript/Vite 7 app, official shadcn/Radix primitives, Geist and semantic light/dark/status/focus tokens; collapsible sidebar, breadcrumbs, mobile Sheet, verified account menu and theme switch. Real login/session/refresh/logout routes, memory-only access token, shared refresh promise/Web Locks, private-cache clearing and retry states are connected. Shared Query/Table/Form and feedback patterns plus lazy route chunks are installed. At the Phase 4 baseline, navigation exposed only its implemented workspace. Phase 5 adds the real dashboard, Properties and review queue. Seven session-transport tests, lint and TypeScript/production build pass; the backend follow-up regression run passes **89/89**. Runtime dependency audit is clean; 12 moderate lint-toolchain findings remain documented in the README.

**P4-06 desktop acceptance — 4 November 2026:** owner supplied desktop login/workspace light/dark and logout screenshots, then confirmed the remaining checks and authorized Phase 5. Treat this as owner-reported manual acceptance, not automated browser coverage. Mobile layouts/testing are out of scope by explicit request. No Playwright or production alias change.

**Local email follow-up:** user evidence exposed late `.env.local` loading and a frozen fallback sender. Shared early environment loading and send-time sender resolution fix the false key warning and unverified fallback; provider logs now say API acceptance, not verified delivery. Public-user expired tokens are handled quietly, with temporary store failures returning 503. See [root cause and retest instructions](backend/docs/local-email-configuration.md). No Azure settings or private env files changed.

### 10.6 Phase 5 — Dashboard, properties and review

Tasks:

- [x] **P5-01:** Build the pending-work dashboard with real review/viewing/inquiry counts and clear loading/error/empty states.
- [x] **P5-02:** Build one complete Properties screen with thumbnail/title/location, pricing, purpose, listing/market state, owner, filters and server pagination.
- [x] **P5-03:** **Design checkpoint:** review the shell/dashboard/Properties screen before applying the visual system to every module.
- [x] **P5-04:** Build property detail/add/edit forms and media retention/replacement controls with inline validation and unsaved-edit feedback.
- [x] **P5-05:** Build the review queue/detail workspace, image gallery, reasons and versioned approve/reject actions.
- [x] **P5-06:** Connect current-page bulk actions and archive confirmation; explain affected bookings accurately without inventing impact counts.
- [ ] **P5-07:** Verify the complete property journey, stale conflicts, long content and desktop layouts.

**Done when:** an admin can manage and review a property end to end using real data. The accepted design becomes the reference for the remaining modules.

**Implementation evidence — 4 November 2026 (local):**

| Area | Result |
| --- | --- |
| P5-01 | Real pending-review/upcoming-viewing/new-inquiry/public-listing totals, oldest review previews, latest submitted pending viewing requests, honest inventory/account counts and a dated 30-UTC-day request chart. Dependency failures show unavailable/error states, never fabricated zeroes. Chart code is separately lazy-loaded. |
| P5-02 | URL-backed search/state/type/purpose/price filters and server sorting/paging; photo/title/location, price/purpose, listing/market state, safe owner summary, date/actions, optional columns and current-page selection. |
| P5-04 | Deep-link detail and add/edit forms, shared validators, inline errors, explicit retained/new photos, object-URL cleanup, gallery, unsaved navigation/reload guards and displayed-version saves. Initial text/media/version are frozen together so background refetches cannot silently upgrade the save version. |
| P5-05 | Searchable FIFO queue with selected detail/direct links, owner account/email checks, rejection reason, latest linked activity and versioned approve/reject commands. The server is the final eligibility authority. |
| P5-06 | Pending-only bulk review, archive confirmations with honest booking/history consequences, atomic selected-row/version maps, no automatic mutation retry and clear conflict refresh/review. Archived records are read-only with no invented restore action. |
| Checks | **18/18 new-admin tests**, lint and TypeScript/production build. Tests include media/versions, filter normalization, exact selected-row commands, conflict propagation, selection resets, mixed-status eligibility and stale form background-refetch regression. No backend implementation changed; earlier backend acceptance is historical evidence, not a new test run. |

**Screenshot follow-up — 4 November 2026:** owner provided desktop dashboard/catalog/detail/edit/empty-queue images. Fixed catalog filters stacking because FieldGroup's flex utility outranked component-layer grid CSS; explicit grid utilities now control the layout. Added accessible unavailable-photo fallbacks without changing stored URLs, truthful missing-date labels, and one main queue empty state without redundant one-page pagination. **20 client tests**, lint and TypeScript/build pass. Owner follow-up screenshots at 12:37 confirm the filter grid, photo fallbacks and missing-date labels. The owner subsequently authorized Phase 6 after reviewing the desktop screens, accepting the direction for reuse. Complete manual mutation/stale-tab acceptance remains pending.

**Design checkpoint accepted for continuation:** the owner authorized Phase 6 after reviewing the desktop screenshots and confirming create/edit/archive. **Still pending:** P5-07 remaining complete manual journeys, including owner review/bulk/stale-tab cases. Follow [Phase 5 acceptance checklist](admin_new/PHASE_5_ACCEPTANCE.md). No Playwright, production cutover, project DB migration or new operational modules. The owner-approved desktop-only scope is reflected in AGENTS.md and project skills. Phase 5 uses `feat/admin-new-phase5-properties`, based on the Phase 4 branch; Phase 6 continuation was explicitly authorized after owner review.

### 10.7 Phase 6 — Complete existing management modules

Tasks:

- [x] **P6-01:** Users: searchable/paged list, existing account detail, suspend/ban/reactivate and current-page bulk moderation. Expose existing safe account archival with clear consequences; no permanent purge.
- [x] **P6-02:** Appointments: paged/filterable table, record detail, contact/property snapshots, meeting link and state-appropriate confirm/complete/cancel actions. Preserve the future-completion restriction.
- [x] **P6-03:** Contact inbox: list/detail, message, contact information, current note and resolution state. No assignment/reply/threading feature.
- [x] **P6-04:** Subscribers: existing consent states/dates and suppression. No campaign composer or admin consent override.
- [x] **P6-05:** NVIDIA models: Add → configure → Test → enable → set default/order; edit/disable/remove with version/conflict/error handling and measured test information.
- [x] **P6-06:** Activity log: actor-aware table, existing filters plus approved entity filter, detail display and clearly bounded CSV export.
- [x] **P6-07:** Reuse common interactions/styles and URL-backed filters across these screens. Every visible control calls its actual API or performs a truthful local UI action.

**Done when:** all modules listed above pass their success, denied, empty, failure and stale-data checks. Core existing capabilities are retained without adding speculative product modules.

**Implementation evidence — 4 November 2026 (local):**

| Task | Connected behavior / verification |
| --- | --- |
| P6-01 | User list/search/state/sort and direct-link detail with independent history pages; versioned suspend/ban/reactivate/archive and atomic current-page bulk controls. Consequences distinguish revocation/cancellation/history from permanent purge. |
| P6-02 | Snapshot-safe appointment list/detail, guarded meeting/status updates and state-dependent actions. Confirmed has no duplicate Confirm; completion requires a known past end. No calendar/reschedule workflow invented. |
| P6-03 | Email/status-filtered inbox and direct-link inquiry; one internal note/state, captured version, preserved draft on refetch/409 and unsaved-navigation warning. No CRM assignment/reply action. |
| P6-04 | Recipient consent states/dates and confirmed suppression; no consent grant, campaign or subscriber-detail endpoint invented. |
| P6-05 | NVIDIA-only disabled-first forms and supported profile options; explicit quota-confirmed exact-model tests, safe measured results, application-fingerprint eligibility, default/replacement/all-off/reorder/version controls. Failed HTTP-200 application checks remain failures. Migration warnings block catalog writes without applying data changes. |
| P6-06 | Actor/action/entity/UTC date filters, IST timestamps, safe metadata display, supported entity links and authenticated CSV through the shared refresh client. Export cap/total/truncation are disclosed; missing headers never imply completeness. |
| P6-07 | Grouped desktop navigation, lazy routes, URL-backed list state, shared native filter grid/table/status/confirmation/error/query patterns, version snapshots and private-cache invalidation. |
| Checks | **32/32 client tests**, lint and TypeScript/production build. Twelve new regressions cover moderation versions, booking time/state rules, NVIDIA lifecycle payloads/eligibility/failed test results, CSV auth/blob/limits, stale inquiry drafts and suppression-only UI. No new dependencies or backend implementation changes. |

**Acceptance boundary:** these checks establish local implementation, not full browser/production acceptance. Follow [Phase 6 desktop checklist](admin_new/PHASE_6_ACCEPTANCE.md) and carry forward unfinished Phase 5 manual cases into Phase 7. No Playwright, paid inference, outgoing email, live moderation, model migration apply, deployment or alias cutover was performed by this phase. Existing backend evidence was not rerun or relabeled as fresh. Work is on `feat/admin-new-phase6-modules`, based on Phase 5.

### 10.8 Phase 7 — Full-panel acceptance

Tasks:

- [ ] **P7-01:** Verify all agreed API/component/browser workflows with test data, including real refresh-cookie behavior in the intended browser/origin arrangement.
- [ ] **P7-02:** Check keyboard/focus/dialog/popover behavior, light/dark contrast and reduced motion.
- [ ] **P7-03:** Check desktop layouts at agreed viewport widths, long names/emails, large prices and missing historical references. Phone/tablet checks are out of scope.
- [ ] **P7-04:** Check offline/retry, failed saves, version conflicts, disabled reasons and cleanup after logout.
- [x] **P7-05:** Run type checks, relevant tests, lint and production build; inspect lazy-loaded bundles for accidental heavy initial imports.
- [ ] **P7-06:** Record known limitations and remove any unfinished action rather than presenting it as working.

**Done when:** the replacement is reviewable and usable across the agreed screens and devices, with the test results recorded. No “perfect system” or independent accessibility certification is implied.

**Phase 7 evidence — 4 November 2026:** Fresh checks passed: 32 replacement-admin tests, ESLint, TypeScript/production build and 89 isolated backend tests. The first sandboxed backend run could not open localhost (EPERM); the permitted rerun passed all 89. Route modules and the dashboard chart remain lazy-loaded; the build emits a separate 368.61 kB chart chunk (107.70 kB gzip), with a 450.61 kB entry chunk (144.62 kB gzip). Reduced-motion CSS and disabled chart animation are present. This is source/build evidence, not browser acceptance. See [Phase 7 acceptance record](admin_new/PHASE_7_ACCEPTANCE.md) for outstanding checks. No live provider tests, database maintenance, emails or deployment were performed.

**Owner acceptance:** On 4 November the owner reported checking the entire admin and authorized release preparation. Detailed browser/viewport outcomes were not supplied and are not claimed as agent-observed. Hosted-origin cookies and deployed workflows remain Phase 8 gates. Added `admin_new/vercel.json` with the existing admin’s SPA routing fallback and security headers; no deployment settings changed. Existing branches and `admin/` are retained.

### 10.9 Phase 8 — Preview, release and cutover

Tasks:

- [ ] **P8-01:** Create/configure a separate Vercel project or preview rooted at `admin_new`, with shared-contract access and the correct public API origin.
- [ ] **P8-02:** Allowlist the intended origin; deploy any accepted compatible backend changes and apply rehearsed migrations where required.
- [ ] **P8-03:** Verify login/refresh and the complete approved workflows in preview; let the owner review the replacement before switching the canonical admin alias.
- [ ] **P8-04:** Record the old deployment/alias as the rollback reference, then perform the accepted cutover.
- [ ] **P8-05:** Verify the new canonical admin URL and GitHub-triggered builds, update release/audit evidence and retain old `admin/` during the stability period.

**Done when:** the accepted replacement runs at the intended admin URL, the backend/public frontend remain compatible and rollback is documented. Do not delete the old admin as part of the initial cutover.

### 10.10 How progress will be recorded

After each implementation session:

1. Tick only tasks whose work and relevant checks are complete.
2. Update the master status and current position below.
3. Record the actual checks, evidence/commit if available, and any remaining issue.
4. A blocked task gets its reason and dependency; do not silently skip it or mark it complete.
5. Keep release/deployment outcomes separate from local implementation completion.

**Current position:** Phases 0–4 accepted locally; the owner accepted the Phase 5 desktop direction for continuation and demonstrated create/edit/archive after ImageKit credential rotation. Phase 6 code and client checks are complete locally. **Next: Phase 7 full-panel desktop/manual acceptance**, including remaining Phase 5 workflows. No production cutover or model migration apply has started.

| Date | Phase/task | Outcome | Validation/evidence | Next |
| --- | --- | --- | --- | --- |
| 2026-11-03 | Phase 0 | Owner reviewed the direction; essential demo scope and executable tracker recorded | Documentation update only; no tests rerun or deployment performed | Begin Phase 1 when implementation starts |
| 2026-11-03 | P1-01–P1-09 | Essential backend fixes and old-client compatibility implemented locally | 84 tests passed; admin lint; client builds and TypeScript; contract notes above; no push/deployment or project database changes | P2-01 inventory/report |
| 2026-11-03 | P2-01–P2-08 | NVIDIA-only inference, model lifecycle/testing, provenance/cache and current-client controls implemented | 100 tests; client builds/lint; actual-snapshot migration rehearsal; mixed live profile results documented; no project migration/deployment | Phase 3 acceptance gate |
| 2026-11-03 | P3-01–P3-07 | Local backend gate passed; connected acceptance journeys and complete final SSE results verified | 106 tests; client builds/lint; shared production CORS/cookie checks; accepted contract index and gate report; original operations Phase 4 deferred | Phase 4 `admin_new` foundation |

| 2026-11-04 | P4-01–P4-06 | Desktop foundation accepted by owner; local reset email received after config fix | Earlier seven client / 89 backend checks; desktop screenshots and owner confirmation; mobile scope removed | Phase 5 |
| 2026-11-04 | P5-01/P5-02/P5-04–P5-06 | Dashboard, catalog/detail/forms and review/archive workflows implemented locally | 18 client tests, lint, TypeScript/build; no backend changes; manual desktop checklist | Owner P5-03/P5-07 review before Phase 6 |

| 2026-11-04 | P6-01–P6-07 | All existing management modules implemented in the replacement admin | 32 client tests, lint/build; mock-only provider/command checks; Phase 6 manual checklist | Phase 7 owner-run full-panel verification |

## 11. Important features only — fixed first-release scope

The project is a demonstration project. Preserve its existing modules and add only these **three practical improvements**:

| Included improvement | Why it matters | Delivery phase |
| --- | --- | --- |
| **Pending-work dashboard** | Gives the admin useful next actions for reviews, bookings and inquiries | Backend definitions in Phase 1; UI in Phase 5 |
| **NVIDIA model testing and safe catalog controls** | Makes the user's requested add/remove/default workflow reliable without routine deployments | Backend in Phase 2; full new UI in Phase 6 |
| **Focused record details with contextual activity** | Lets the admin understand a property/appointment/inquiry and reach the right existing action | Required reads/filters in Phase 1; UI in Phases 5–6 |

Light/dark mode, responsive layout, readable tables, keyboard access, truthful failure states, current-page bulk controls, URL-backed filters and stale-edit recovery are part of completing a quality admin interface. They do not require new product modules.

**Deferred, not first-release tasks:** named saved views/device synchronization, command palette/global record search, density settings, exact archive-impact preview, favorites, saved searches, alerts, rescheduling, availability editor/calendar, guest self-service cancellation, lead assignment/threaded notes/reply sending, listing reports, restore/renewal, model billing/usage dashboards, admin account/device settings, multi-admin RBAC/MFA, bulk import, newsletter campaigns, vision uploads and payment/CRM systems.

Those remain useful reference ideas from sections 6–9, not commitments. Existing necessary security/domain behavior remains in scope even though the properties are demo data and the user accounts can be real. Expanding the first release requires an explicit scope change; it must not happen simply because a dashboard template includes another menu item.

## 12. Acceptance checklist before starting `admin_new`

- [x] First-release scope recorded after owner review: preserve existing modules and add only the three improvements in section 11; further additions require a scope change.
- [x] Dashboard definitions reconcile with actual catalog/account rules and failure tests.
- [x] Refresh outages preserve valid credentials; invalid/replayed sessions remain rejected.
- [x] Email HTML escaping, snapshot rendering, links and cascade notification attempts verified.
- [x] Image decode/resource limits and existing upload/edit behavior verified.
- [x] Typed entity/page/query contracts recorded and compatible with existing clients.
- [x] Required appointment/inquiry detail reads and bounded entity-history filters exist; no calendar/date-window agenda or subscriber detail page is promised.
- [x] Stale writes and atomic bulk outcomes are deterministic.
- [x] GitHub Models runtime/config/seed paths removed; NVIDIA-only catalog migration rehearsed.
- [x] Model test/default/removal/fallback/capability and cache-change behavior verified.
- [x] Actual route mounts, old admin and public frontend pass regression checks.
- [x] Required backend changes are verified locally and the contracts accepted before `admin_new` begins; production/preview deployment is tracked separately in Phase 8.

## 13. Deferred operations work and document updates

The original **Phase 4 — Make operations dependable** remains deferred. This plan does not automatically introduce Redis, durable queues/outbox, worker infrastructure, centralized bootstrap reconstruction, alerting, distributed quota guarantees, retention systems or infrastructure changes. Findings about filesystem quota races, SSE reconnect/replay/backpressure, startup/retry behavior and non-durable jobs remain relevant limitations, not completed work.

If a first-release screen depends on one of those capabilities, either narrow/omit that feature or explicitly revise scope. Finite API timeouts, truthful metrics and safe errors in section 5 are specific prerequisites for the proposed workflows; they are not a claim that Phase 4 has been completed.

The owner has approved the direction. Phase 3 applied the audit-status link/update in `PROJECT_AUDIT.md`:

> Phase 4 — Make operations dependable: Deferred at the owner's request. Active workstream: backend readiness for a NVIDIA-only AI service, followed by a replacement admin in `admin_new/`, governed by `ADMIN_NEW_PLAN.md`.

Keep historical audit findings and release evidence. Add links/status changes; do not erase unresolved findings or mark planned features as implemented.

## 14. Development and release boundaries

- Preserve real user accounts and their authentication/history data. Demo property content does not make user data disposable.
- Keep the public frontend and old admin compatible while the new admin is under development.
- Use isolated fixtures for destructive/concurrency tests; model tests consume real API quota only when intentionally invoked.
- Plan schema/default changes with dry-run reports, backups and restoration rehearsal where applicable.
- Prefer compatible online changes. Any genuinely necessary maintenance pause must be explained and planned; creating a design document or a new client does not itself require stopping the hosted API.
- Develop the new admin at a separate local origin/preview deployment and allowlist only intended origins.
- Account for cross-origin refresh-cookie behavior before alias cutover.
- Git push triggers the connected Vercel projects; the future `admin_new` project/root directory must be configured explicitly. Do not replace the existing production alias until acceptance.
- Do not commit secrets, private backups or production personal data.

## 15. Where to start now

The local backend gate, desktop foundation and design direction are accepted. Phase 6 management modules are implemented locally; continue with Phase 7 full-panel desktop verification and the recorded manual checklists. Keep the existing admin available, use a configured local/test origin and real authentication, and handle unavailable AI models honestly. Apply model migration only as a coordinated release step.

The plan is deliberately limited to existing management modules plus the three important additions in section 11. The larger operations Phase 4 and optional product ideas remain deferred.

**Implementation status:** Phases 1–3 have local completion evidence in sections 10.2–10.4; section 12 is accepted. No production deployment or project database mutation was made. Model migration remains a reviewed release step. `admin_new` foundation has owner-reported desktop acceptance; Phase 6 implementation is ready for full-panel manual acceptance.

### Owner acceptance and authorized maintenance — 4 November 2026

Owner reported all current checks complete and requested GitHub push. Follow-up status pills now share pale semantic colors, contrasting text and icons across both themes and management/property screens. Validation: 32 client tests, lint and production build passed; manual acceptance is owner-reported, not automated browser coverage.

Separately authorized configured-database actions were completed: 127 appointments updated, all 129 verified completed with no active reservations; per-record audit entries and a private backup were saved, without emails. This was an explicit maintenance override including cancelled/future bookings; ordinary application transition restrictions remain unchanged. The three requested NVIDIA entries were added disabled through validated catalog commands. Subsequently the owner authorized the existing NVIDIA migration: legacy configuration normalized, MiniMax added, five supported models verified, migrationRequired=false, all disabled pending application testing. Private snapshots remain outside the repository. These actions supersede earlier statements that no configured-database mutation/migration has occurred; they do not imply production code deployment, model activation or alias cutover.

Reusable maintenance scripts default to inventory-only; `--apply` is an explicit data-changing operation requiring session authorization. Existing release/deployment gates remain separate.
