# New admin — Phase 1 backend contract notes

These are additive changes for the current clients and the planned `admin_new` client. No production migration is required for this phase. The NVIDIA provider cleanup belongs to Phase 2.

## Dashboard definitions

- `totalProperties` includes archived history and reconciles with the unfiltered admin catalog.
- `activeListings` / `activeProperties` / compatibility alias `approvedCount` mean currently public listings: no archival, no current moderation block, no elapsed expiry. They reconcile with `GET /api/admin/properties?status=active` and the unfiltered public list. Pending/rejected/expired counts describe their own states; they do not partition total inventory because archived and moderated listings remain in inventory.
- `totalUsers` / user stats `Total` exclude deleted status and `deletedAt` accounts, matching the users list. Active/Suspended/Banned are stored management states; an expired suspension may remain in the Suspended bucket until automatic or login reconciliation. These are not counts of online users.
- Pending appointments include guest and overdue pending requests. History uses contact/property snapshots if linked records are absent.
- Charts cover exactly 30 UTC calendar days including today. Property request charts count successful recorded GETs for property-detail API paths. They do not measure unique people or verified browser page views.
- Platform value is a sum of currently public asking prices, not revenue. Average price uses the same public inventory. Approval rate counts published user submissions against published plus rejected, never-published user submissions; it is not lifetime review throughput.
- Database/query failures return a failed response with a safe message. No query failure is replaced with a successful zero or empty dataset. Empty collections still legitimately produce zero counts.
- Responses include additive `definitions` metadata. Separate HTTP requests are not an atomic reporting snapshot; concurrent writes can change counts between them.

## Queries, pages and owners

All paginated lists expose `pagination.total`. Existing aliases (`totalProperties`, `totalUsers`, `totalAppointments`, `totalLogs`) remain. Admin catalog returns both `property` and `properties`; owner lists keep `properties`. Page numbers, limits and query values retain existing validation and bounded limits. Empty search is accepted for catalog, pending queue and users. Sorts include `_id` as a deterministic tie breaker.

Private property DTOs include `ownerId` and a safe `owner: { _id, name, email } | null` summary when populated by admin catalog/detail/review queries. `postedBy` retains its existing string/populated-object/null shape for old clients; consumers should use the explicit new fields. Entity `version` is canonical; raw `__v` fields retained by existing engagement responses are compatibility data. User `lastActive` has no maintained runtime meaning; no new UI should claim it is last activity, and the current panel no longer offers that sort.

Shared TypeScript declarations describe property/user queries, pages, owners, inquiry/subscriber records, detail responses, audit filters and version commands. The current JS admin remains supported; the replacement client can consume these declarations directly.

## Detail and history reads

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/admin/appointments/:id` | `{ success, appointment }` using the same safe appointment DTO as lists |
| GET | `/api/admin/leads/:id` | `{ success, lead }` with normalized state and version |
| GET | `/api/admin/activity-logs?targetType=appointment&targetId=<id>` | Bounded paginated history for that entity |

These routes require the configured admin session. Malformed identifiers return 400; absent detail records return 404. An audit `targetId` requires `targetType`. Optional `actorType` and `actorEmail` describe admin/user/system events; `adminEmail` remains a filter alias. Responses add `actorEmail` while retaining the legacy field. Standard pagination caps entity history; subscribers stay list-based. No calendar, global search or user activity tracking was added.

## Writes and stale records

New and updated clients should send the displayed `expectedVersion` for edits, moderation and archives. Bulk moderation/archive can send `expectedVersions: { [selectedId]: displayedVersion }`; when supplied, every selected record needs a validated version. Review already requires versions. Bulk commands remain atomic, with a maximum of 100 selected identifiers, and the current admin clears selection on refreshed pages. A stale version returns 409 without committing partial changes.

For compatibility, existing endpoints that previously accepted unversioned commands still accept them. Those calls check transaction/current state and internal concurrency, but cannot detect changes since an older screen was loaded. Required versions on every legacy command would require a separately coordinated breaking release. Current admin moderation/archive and public owner archive now send displayed versions.

## Sessions, images and notifications

Refresh 401/403 responses clear invalid credentials; 5xx failures preserve cookies for retry. Both proactive and reactive admin refresh preserve local credentials on temporary errors.

Image signatures, file limits and full decoding are validated before upload: 5 MB/file, four images/listing, 16 megapixels/image, 8000px/side and a single frame. Originals are uploaded to ImageKit; Sharp is validation only. ImageKit remains the resizing/delivery service. Existing retained media and compensating cleanup behavior are preserved. Existing external image URLs are not rescanned.

HTML notification values are escaped; historical property snapshots survive missing links. Meeting emails show current status, and reactivation links use `/signin`. Cascaded cancellation attempts occur only after transaction commit, including expiry/moderation/archive/edit cancellation paths. Retried or rolled-back transaction attempts do not dispatch emails. Each Brevo request has a 10-second timeout; failures cannot roll back committed domain changes. A process crash can still lose an attempt; no durable queue, retry guarantee or recipient-delivery confirmation is claimed. Email diagnostics say configured rather than healthy/delivered.

## Export and runtime

CSV exports remain capped at 10,000 events, newest first, with formula neutralization. Headers `X-Export-Limit`, `X-Export-Total` and `X-Export-Truncated` disclose the cap; production CORS exposes them. Actor columns describe all event types. The current admin presents truncation before download. Totals describe the count at export start; writes during streaming may change the matching set.

Cache-stat errors now return failure. Generic middleware responses hide server messages and stack traces; 404 messages omit requested URLs. Production and isolated tests share `mountApiRoutes`, including the actual `/api/forms/submit` path. Tests do not import the server bootstrap, connect to the project database, send provider mail or verify production CORS deployment.

Use Node.js 22 and MongoDB Atlas or a local replica set. `npm run start:prod` now starts the existing `server.js`; the hosting environment must set `NODE_ENV=production`.
