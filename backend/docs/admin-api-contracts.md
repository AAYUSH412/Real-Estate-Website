# Admin API contract index — accepted local baseline

Accepted on 3 November 2026 for `admin` development. Implemented routes are shared through `routes/mountApiRoutes.js`. Payload declarations live in `shared/contracts/index.d.ts`; validators/DTOs live in `shared/contracts/index.js`. The isolated HTTP regression suite verifies actual handlers and MongoDB transactions. This is a contract index, not a claim of a complete OpenAPI specification or production certification.

## Authentication and transport

Send access credentials as `Authorization: Bearer <token>`. Administrator identity is verified by `GET /api/admin/session`; do not infer admin access from browser storage. The configured `ADMIN_EMAIL` account is the supported admin, not a multi-admin/team service. Send `withCredentials: true` for login/refresh/logout. Preserve valid local credentials on temporary refresh 5xx errors; clear invalid sessions on 401/403. Logout revokes the matching device session and its access token.

| Method | Path | Result / command |
| --- | --- | --- |
| POST | `/api/users/admin` | `{ email, password }` → access `token`, path-scoped httpOnly refresh cookie |
| GET | `/api/admin/session` | `{ success, user: { id, email, role } }` |
| POST | `/api/users/admin/refresh` | Rotating refresh cookie → new access token and refresh cookie |
| POST | `/api/users/admin/logout` | Revokes session and clears refresh cookie |

Local cookies use SameSite=Lax; production cookies use SameSite=None and Secure. Admin cookie path is `/api/users/admin`. The shared `config/corsPolicy.js` accepts configured `FRONTEND_URL`, `ADMIN_URL`, `WEBSITE_URL`, comma-separated `LOCAL_URLS` and `EXTRA_ALLOWED_ORIGINS`. Development also permits localhost ports 4000/5173/5174; production does not automatically permit localhost. Set an explicit allowed origin if `admin` uses a different local port. Origin checks and cookie attributes were exercised over HTTP; actual browser third-party-cookie behavior and deployed host configuration remain release checks.

## Queries, pages and errors

Lists use bounded one-based `page`/`limit`, deterministic sort ties and `pagination.total`, `currentPage`, `limit`, `totalPages`, `hasNextPage`, `hasPreviousPage`. Existing total aliases remain. Catalog returns both `properties` and legacy `property`; the owner list uses `properties`. Search is plain escaped text. Catalog/pending/users accept blank search. Do not invent configurable appointment calendars, subscriber detail routes or global search.

Use entity `version` as the displayed concurrency version. Model writes, inquiry edits and listing review require their documented expected version. Other legacy commands remain compatible with omitted versions, but the new client should always supply them. Bulk selection is current-page selection, at most 100 records for property/user commands. Read the actual returned page after mutation; do not assume every selected record committed when a bulk command failed.

Use HTTP status and safe `message`; `code` and `fields` are available on normalized errors but can be absent on legacy responses. Relevant statuses include 400 input, 401 expired/invalid session, 403 authorization, 404 absent record, 409 stale/illegal transition, 429 quota and 5xx temporary/unavailable dependencies. Failed dashboards do not return invented zero totals. A successful model-test HTTP response can still contain `result.passed: false`: the request ran, but the candidate failed its check.

## Module routes

All `/api/admin/*` routes below require the configured admin.

| Module | Reads | Commands / key rules |
| --- | --- | --- |
| Dashboard | `GET /api/admin/stats`, `/stats/overview`, `/stats/users`, `/stats/properties` | Read-only; use response definitions. Inventory includes archived history; active/public counts enforce expiry/moderation. User totals exclude archived accounts. API request charts are not unique people. |
| Property catalog | `GET /api/admin/properties`, `/properties/:id`; `/properties/pending` | Catalog filters include search, status, type, availability, location, price and supported sort. Private DTOs include safe `owner`/`ownerId`; legacy `postedBy` remains. |
| Admin property media/write | Catalog detail supplies edit state | `POST /api/products/add`, `/update`, `/remove`. Add/update use multipart fields `image1`…`image4`. Update includes `id`, displayed `expectedVersion` and explicit `retainedImages` when selecting images. Remove archives and cancels open bookings; it does not purge history/media. |
| Listing review | Pending FIFO queue | `PUT /api/admin/properties/:id/approve` or `/reject`; require `expectedVersion`, plus `reason` for rejection. Bulk `POST /properties/bulk-approve`, `/bulk-reject`, `/bulk-delete` accepts `propertyIds`, version map and reason where relevant; atomic. |
| Users | `GET /api/admin/users`, `/users/:id` | `PUT /users/:id/suspend`, `/ban`, `/unban`; `DELETE /users/:id` archives. Suspension needs reason/days. Bulk POST `/users/bulk-suspend`, `/bulk-ban` accepts `userIds` and per-record versions. Moderation revokes access; archival preserves references. |
| Appointments | `GET /api/admin/appointments`, `/appointments/:id`; legacy `GET /api/appointments/all` | `PUT /api/admin/appointments/status` or `/api/appointments/status`: appointmentId/status/expectedVersion; cancellation reason when supplied. `PUT /api/appointments/update-meeting`: appointmentId/meetingLink/expectedVersion. No reschedule/calendar API is promised. |
| Contact inbox | `GET /api/admin/leads`, `/leads/:id` | `PUT /leads/:id`: status (`new`, `in_progress`, `resolved`), adminNote and required expectedVersion. No CRM assignment/reply workflow. |
| Subscribers | `GET /api/admin/subscribers` | `PUT /subscribers/:id/suppress` with empty body. Admin cannot grant consent. Public recipient POST `/api/news/confirm` and `/unsubscribe` use signed tokens; signup is POST `/api/news/newsdata`. No campaign module or subscriber detail endpoint. |
| NVIDIA models | `GET /api/admin/ai-models`; public `/api/ai/models` | Create disabled, exact-model tests, versioned enable/default/replacement/remove and full reorder. See the [complete Phase 2 command contracts](admin-phase2-nvidia.md). No GitHub inference routing. |
| Audit logs | `GET /api/admin/activity-logs`, `/activity-logs/export` | Bounded entity filter uses targetType + targetId. Actor type/email distinguishes admin/user/system. CSV caps at 10,000, neutralizes formulas and discloses limit/total/truncation in exposed response headers. |

Property images: one to four retained/new photos, 5 MB per upload, full decode validation, 16 MP maximum, 8000px per side, one frame. Retained URLs must come from the existing record. ImageKit handles storage and delivery resizing. Failed saves compensate new uploads; archive retains historical references.

Appointment states: pending → confirmed/cancelled; confirmed → completed/cancelled. Completion requires a scheduled end in the past. Guest bookings have no account-based self-service cancellation; admin cancellation is supported. Feedback does not confirm or complete a booking. Dates/slots use the existing Asia/Kolkata policy; the app does not offer arbitrary availability editing. Property/contact snapshots preserve history after listing/account changes.

Notifications are best-effort post-commit attempts. Failure does not roll back committed booking/domain changes and does not establish recipient delivery. There is no durable outbox/retry service in this scope.

## Public AI streaming contract

`POST /api/ai/search` keeps the frontend body alias and accepts `Accept: text/event-stream` plus the caller's `X-Firecrawl-Key`. The server uses its private NVIDIA key. Early validation errors are JSON; errors after SSE headers use an `error` event.

Fresh streams may emit `status`, `properties`, and `analysis` progress. **Every successful fresh/cached/coalesced stream ends with `result` containing the complete payload, then `done`.** A client joining a shared request must not rely on having received earlier progress events. `result` carries `properties`, `analysis`, `generatedAt`, `analysisMeta` and optional cache/coalescing indicators. The final payload supplies actual model/fallback/effective limits and partial/unavailable coverage; do not label the selected model as the actual one unless provenance agrees.

Subscription cleanup follows response closure, not the incoming request-body lifecycle. Work already shared with other clients may finish and populate the cache after one client disconnects; upstream cancellation and durable job coordination are not added here. Model fallback is bounded to three attempts and a shared 120-second budget. Search/trend estimates remain unverified data, not certified market/legal facts.

## Migration and release boundary

[Phase 1 contracts](admin-phase1-contracts.md) and [Phase 2 migration/rollback notes](admin-phase2-nvidia.md) provide detailed compatibility and rollout rules. Model migration is read-only by default, backed up before apply, rehearsed on an isolated snapshot and not applied to the project database in this gate. Re-run inventory at release time, preserve the private backup, coordinate catalog writes, retire the legacy default index and test the exact saved configuration before enabling. Mistral/MiniMax timeout limits remain recorded; keep unverified candidates disabled.

Use an accepted local/test backend for `admin` development. Release compatible backend and clients before preview/production users depend on new contracts. No `main` merge, production cutover, production database mutation or project server stop is part of this acceptance gate.
