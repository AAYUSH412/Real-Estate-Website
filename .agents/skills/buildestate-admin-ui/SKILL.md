---
name: buildestate-admin-ui
description: Build or extend BuildEstate admin screens using its established shadcn/Radix design system, authenticated API client and shared interaction patterns. Use for replacement-admin UI work; not the public frontend.
---

# BuildEstate replacement admin

## Start with the current implementation

Resolve paths from the repository root. Read `admin/README.md` and `docs/ARCHITECTURE.md`. Check current code before treating a planned screen as implemented. Consult the current router for the available screens. The canonical TypeScript app now occupies `admin/`; the retired implementation is retained in Git history.

Read only the files needed for the task:

| Work | Existing source |
| --- | --- |
| Colors, typography, spacing, reduced motion | `admin/src/styles/globals.css` |
| Desktop shell, sidebar and account menu | `admin/src/components/layout/shell.tsx` |
| Routing and boundaries | `admin/src/app/router.tsx` |
| Authentication and transport | `admin/src/features/auth/session.tsx`, `admin/src/lib/api.ts` |
| Query defaults and keys | `admin/src/app/query-client.ts` |
| Controlled server table | `admin/src/components/data-table/data-table.tsx` |
| Loading, errors, empty, statuses, confirmations | `admin/src/components/feedback/` |
| Labeled validated form example | `admin/src/features/auth/login.tsx` |
| Installed primitive inventory and aliases | `admin/src/components/ui/`, `admin/components.json` |

## Maintain the approved visual language

Use Geist Sans, tabular figures, Lucide icons, a neutral canvas and bordered surfaces with restrained blue primary actions. The initial light palette is canvas `#F7F8FA`, surface white, text `#18181B`, border `#E4E4E7`, primary `#2563EB`; actual semantic variables in CSS are authoritative. Muted text was darkened for readability. Use existing semantic color classes so the explicit dark tokens apply automatically.

Keep a compact header, readable page headings, 4/8px spacing rhythm, 8–12px corners, and short reduced-motion-aware transitions. Dense operational screens can use more width than the welcome screen. Property photography, location and pricing should create the real-estate identity; do not add financial/revenue decoration without real data. Avoid replacing the visual system on each new screen.

Reuse installed shadcn/Radix components before introducing custom controls. Inspect `components.json` and component APIs, and use the shadcn skill when available for registry additions. Preserve local source customizations: primitives import `cn` from `@/lib/utils`, and Sonner uses the app theme context. Do not overwrite these blindly with registry defaults. Use labeled Field controls, composed Card parts, accessible titled Sheet/Dialog, grouped menu items and Button links via `asChild`.

## Wire a complete screen

1. Inspect the accepted route and DTO in `backend/docs/admin-api-contracts.md` and `shared/contracts/`. Trace the actual handler if a capability is unclear. Do not invent fields or endpoints to fit a mockup.
2. Put the screen in its feature directory and lazy-load it through the existing router. Add navigation only once the destination performs its intended job. No fake badges, account settings, notifications, saves or metrics.
3. Call the shared `api` through TanStack Query. Include filters in list keys, forward the query AbortSignal, and invalidate affected lists/details/counts after a successful mutation. Reuse the session provider rather than adding another token store or refresh interceptor.
4. Use server paging and sorting. Translate zero-based table pages to one-based API pages. Use stable record IDs, restrict selection to the current page, and clear selection when page/filter/sort changes. Never sort one fetched page as if it were the whole collection.
5. Use React Hook Form and shared runtime validators/enums where applicable. Keep field errors connected to inputs. Supply displayed entity versions, preserve unsaved input after failed saves, and explain 409 with refresh/review; never silently retry destructive writes.
6. Distinguish loading, empty, denied, failed and stale states. Show actual model provenance and notification-attempt outcomes; neither a successful HTTP call nor a provider message ID proves email delivery.

Preserve memory-only access tokens, httpOnly cookie restoration, refresh deduplication, stale-response guards and private-cache clearing on identity changes. Temporary 5xx/network failures must not become credential invalidation. Logout failure must not be presented as successful revocation.

## Local setup and acceptance

Run the app from `admin/` on localhost:5175; existing backend defaults to port 4000. Blank local `VITE_API_URL` uses the Vite development proxy. That localhost-only proxy strips upstream Origin; it is not a production hosting arrangement. Do not broaden backend production CORS or replace the existing alias to make a preview work.

For changed UI code run the relevant tests, lint and build from `admin/`; scale checks to the change. The owner explicitly prefers manual browser testing: do not add or run Playwright unless that preference is changed. Provide a short task-specific checklist for the actual screen (themes, desktop widths, long content, keyboard/focus/Escape, failed saves and reload/deep links as relevant). Record only checks actually completed by the agent or reported by the owner. Desktop-only is the owner-approved scope. Do not add phone/tablet layouts or mobile acceptance tasks. Desktop screenshots alone do not prove keyboard behavior.
