# BuildEstate admin — desktop workspace

Canonical React 19/TypeScript admin using Vite, shadcn/Radix, Tailwind, TanStack Query/Table and React Hook Form. Modules: dashboard, properties, reviews, users, appointments, contact inbox, subscribers, NVIDIA models and activity logs. Owner-reported local/full-panel and hosted acceptance was recorded on 4 November 2026. Desktop-only; browser testing is manual.

## Run locally

Requires Node 22.12+ and the existing backend on port 4000.

```sh
cd admin
npm ci
npm run dev
```

Open http://localhost:5175. Use your existing configured administrator credentials. If the backend is stopped, start it in a separate terminal with `cd backend` then `npm run dev`.

Leave `VITE_API_URL` empty locally. Vite proxies `/api` to `DEV_API_TARGET` (default `http://localhost:4000`). The localhost-only development proxy removes the browser Origin header upstream because the browser talks to its own origin; the backend's CORS policy is unchanged. No production proxy/alias is configured. A separately hosted client must set its HTTPS API origin and be explicitly allowlisted, with browser cookie acceptance checked during release.

Access tokens stay in memory; an httpOnly cookie restores the session on reload. Refresh calls are deduplicated within the tab and serialized with Web Locks across replacement-admin tabs where available. Logout/account changes clear private query caches. Temporary failures preserve credentials and offer retry; 401/403 invalidation returns to sign-in. Other localhost admin ports can share the backend cookie because cookies are not port-scoped.

## Validation

```sh
npm test
npm run lint
npm run build
```

Thirty-two current client tests (session, property/media and management command/component regressions) cover refresh deduplication/recovery, invalid sessions, conflict handling, logout failure, late responses and cancellation. GitHub verification includes `admin`. Playwright was removed at the owner's request; browser testing is manual.

## Manual acceptance checklist

User screenshots on 4 November show the real authenticated workspace in light/dark themes, the login in both themes and logout returning to login. These screenshots do not establish mobile, keyboard or reload behavior.

- [x] Authenticated desktop workspace renders at localhost:5175.
- [x] Desktop login/workspace light and dark themes render.
- [x] Logout returns to login with signed-out feedback.
- [x] Owner reported remaining desktop foundation checks complete on 4 November; this is manual evidence, not automated browser coverage.
- [x] Reload while signed in: session restores using the cookie.
- [x] Reload after logout or open `/workspace` signed out: login remains required.
- [x] Empty/invalid form, wrong password, password visibility and pending state.
- [x] Collapse/reopen sidebar; account menu opens/closes normally.
- [x] Tab/Shift+Tab focus is visible; skip link works; Escape closes menus.
- Phone/tablet acceptance removed from scope by owner request.
- [x] Theme preference survives reload; reduced-motion setting is respected.
- [x] Temporarily unavailable backend: retry state appears and recovery succeeds.

For new Phase 5 acceptance, use [the desktop workflow checklist](PHASE_5_ACCEPTANCE.md). The owner’s earlier foundation confirmation does not establish acceptance of these new screens.

Phase 6 module routes and manual checks: [management acceptance checklist](PHASE_6_ACCEPTANCE.md). All new sidebar destinations are implemented; tests use mocked commands/provider calls and do not consume NVIDIA quota.

## Shared implementation patterns

`lib/api.ts`: credentialed requests, safe errors, one refresh lifecycle and AbortSignal support. `app/query-client.ts`: keys with filters/detail IDs, conservative query retry and no automatic mutation retry. `components/data-table/data-table.tsx`: server pagination/sorting and controlled current-page selection; screens must reset selection when page/filters change. `components/feedback/`: loading/error/empty states, shared status labels/icons and controlled confirmations. Login demonstrates shared-contract email validation with labeled Field/Input controls. Future mutations must supply displayed versions, map field errors and invalidate affected queries after successful commits.

## Dependency audit

On 4 November 2026, runtime `npm audit --omit=dev` reports **zero vulnerabilities**. Full audit reports **12 moderate development-tool findings**, all arising from the lint toolchain's minimatch advisory GHSA-g3hv-75wg-m249. No high/critical findings remain. A forced cross-major minimatch override was not applied to older ESLint APIs. Recheck supported upstream fixes rather than declaring the full development tree clean.

No deployment, canonical alias switch or model migration is part of the local Phase 4/5 work.

## Status colors

All operational pills use `StateBadge` in `src/components/feedback/status-badge.tsx`; listing `StatusBadge` delegates to it while displaying active listings as “Published”. Keep meanings consistent: amber = attention (pending/new/unverified), blue = underway (confirmed/in progress), green = successful/available (active/published/completed/verified/resolved), red = stopped (cancelled/rejected/banned), purple = temporarily restricted (suspended), gray = inactive/history (archived/expired/disabled/unsubscribed). Unknown states remain neutral. Labels and decorative icons accompany every status; color is never the only cue.

The badge primitive owns the six color variants, with pale fills and dark text in light mode and muted fills with light text in dark mode. Use these variants instead of page-specific `data-tone` CSS overrides. Email verification, property availability/owner eligibility, and model enabled/test states share the same component.

Validation for the status-color update: 32 client tests, lint and production build passed. Manual visual check remains: inspect Users, Appointments, Properties, Review queue, dashboard and NVIDIA models in both themes; confirm pale fills, readable labels/icons, and unchanged filters/actions.

## Deployment after folder rename

Set Vercel Root Directory to `admin` before deploying this revision. Enable access to `shared/contracts` outside the root. Build: `npm run build`; output: `dist`; Node: 22.12+. Set `VITE_API_URL` to the HTTPS backend origin without `/api`. Allowlist the exact admin origin in backend `ADMIN_URL` or `EXTRA_ALLOWED_ORIGINS`. Verify login, reload and deep links. Existing browser storage identifiers remain unchanged for continuity.
