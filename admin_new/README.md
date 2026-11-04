# BuildEstate replacement admin — Phase 4 foundation

React/TypeScript/Vite, official shadcn/Radix components, Geist, semantic light/dark themes, TanStack Query/Table and React Hook Form. Phase 4 implements the login and protected workspace shell. Dashboard/property workflows are Phase 5; other management modules are Phase 6. Only implemented destinations appear in navigation. The original `admin/` remains available.

## Run locally

Requires Node 22.12+ and the existing backend on port 4000.

```sh
cd admin_new
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

Seven transport regression tests cover refresh deduplication/recovery, invalid sessions, conflict handling, logout failure, late responses and cancellation. GitHub verification includes `admin_new`. Playwright was removed at the owner's request; browser testing is manual.

## Manual acceptance checklist

User screenshots on 4 November show the real authenticated workspace in light/dark themes, the login in both themes and logout returning to login. These screenshots do not establish mobile, keyboard or reload behavior.

- [x] Authenticated desktop workspace renders at localhost:5175.
- [x] Desktop login/workspace light and dark themes render.
- [x] Logout returns to login with signed-out feedback.
- [ ] Reload while signed in: session restores using the cookie.
- [ ] Reload after logout or open `/workspace` signed out: login remains required.
- [ ] Empty/invalid form, wrong password, password visibility and pending state.
- [ ] Collapse/reopen sidebar; account menu opens/closes normally.
- [ ] Tab/Shift+Tab focus is visible; skip link works; Escape closes menus/drawer.
- [ ] Phone/tablet viewport: drawer navigation and account menu usable; no horizontal overflow.
- [ ] Theme preference survives reload; reduced-motion setting is respected.
- [ ] Temporarily unavailable backend: retry state appears and recovery succeeds.

## Shared implementation patterns

`lib/api.ts`: credentialed requests, safe errors, one refresh lifecycle and AbortSignal support. `app/query-client.ts`: keys with filters/detail IDs, conservative query retry and no automatic mutation retry. `components/data-table/data-table.tsx`: server pagination/sorting and controlled current-page selection; screens must reset selection when page/filters change. `components/feedback/`: loading/error/empty states, shared status labels/icons and controlled confirmations. Login demonstrates shared-contract email validation with labeled Field/Input controls. Future mutations must supply displayed versions, map field errors and invalidate affected queries after successful commits.

## Dependency audit

On 4 November 2026, runtime `npm audit --omit=dev` reports **zero vulnerabilities**. Full audit reports **12 moderate development-tool findings**, all arising from the lint toolchain's minimatch advisory GHSA-g3hv-75wg-m249. No high/critical findings remain. A forced cross-major minimatch override was not applied to older ESLint APIs. Recheck supported upstream fixes rather than declaring the full development tree clean.

No deployment, canonical alias switch or model migration is part of Phase 4.
