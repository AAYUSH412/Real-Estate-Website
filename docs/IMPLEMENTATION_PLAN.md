# BuildEstate Implementation Plan

## 1. Objective

Implement the next architecture iteration with minimal risk and maximum production stability.

Scope decided:

1. Implement shared admin apiClient refactor across admin pages: Yes
2. Move backend CORS to env-driven allowlist: Yes
3. Add deployment matrix table in README: No (deferred)

Additional focus:

- AI Property Hub architecture hardening roadmap (no immediate breaking redesign)
- Smooth path for admin migration from Render to Vercel

## 2. Principles

- Ship in small reversible steps.
- Keep behavior identical unless explicitly improving error handling or reliability.
- Validate each phase with smoke tests before moving to the next.
- Prefer configuration-driven deployment behavior over hard-coded values.

## 3. Milestones and Timeline

## Milestone A: Admin API Layer Unification
Duration: 1-2 days
Risk: Low

Tasks:

1. Create one admin API client module with:
   - base URL from VITE_BACKEND_URL
   - token injection from localStorage
   - common error normalization
2. Replace direct fetch and scattered axios calls in admin pages with shared client.
3. Ensure activity logs, dashboard, users, appointments, and review flows all use the shared client.

Acceptance criteria:

- No admin page uses direct fetch for backend calls.
- All API calls route to one base URL source.
- Existing admin flows continue to work without UI regressions.

## Milestone B: Backend CORS Environment Contract
Duration: 0.5-1 day
Risk: Medium

Tasks:

1. Replace hard-coded CORS origins with environment-driven allowlist.
2. Add support for:
   - FRONTEND_URL
   - ADMIN_URL
   - LOCAL_URLS (comma-separated optional list)
   - EXTRA_ALLOWED_ORIGINS (comma-separated optional list)
3. Preserve localhost support in development.
4. Add startup log line showing parsed allowed origins (non-secret values only).

Acceptance criteria:

- CORS works for frontend and admin production domains.
- CORS works for local development.
- Adding a new allowed origin requires env update only, no code change.

## Milestone C: Admin Deployment Move to Vercel
Duration: 0.5-1 day
Risk: Medium

Tasks:

1. Deploy admin as Vercel project with root directory admin.
2. Keep SPA rewrites enabled via admin vercel config.
3. Set VITE_BACKEND_URL to backend Render domain.
4. Update backend ADMIN_URL env for CORS.
5. Run route refresh tests on deep links.

Acceptance criteria:

- Refreshing /dashboard, /users, /activity-logs does not return 404.
- Admin API calls succeed with auth token.
- No CORS errors in browser console.

## Milestone D: AI Property Hub Operational Hardening (Plan-only for now)
Duration: 2-4 days (next iteration)
Risk: Medium

Tasks:

1. Add request correlation IDs through AI search lifecycle.
2. Introduce structured logs for:
   - key validation
   - firecrawl search phases
   - AI ranking step
3. Move cache and distributed limiter storage to Redis (when scaling beyond single instance).
4. Add integration tests for key AI endpoints.

Acceptance criteria:

- AI errors can be traced from UI action to backend logs quickly.
- Multi-instance behavior remains consistent.
- Regression risk is reduced with baseline test coverage.

## 4. Execution Order

Recommended order:

1. Milestone A (admin apiClient unification)
2. Milestone B (env-driven CORS)
3. Milestone C (admin to Vercel deployment)
4. Milestone D (AI Hub hardening next cycle)

Reasoning:

- Admin API unification and env-driven CORS reduce migration risk before platform move.
- Deployment move should come only after API and CORS behavior is deterministic.

## 5. Environment Variables Contract

Backend required:

- NODE_ENV=production
- FRONTEND_URL=https://buildestate.vercel.app
- ADMIN_URL=https://your-admin.vercel.app
- LOCAL_URLS=http://localhost:5173,http://localhost:5174
- EXTRA_ALLOWED_ORIGINS=optional,comma,separated,origins

Admin required:

- VITE_BACKEND_URL=https://real-estate-website-backend-zfu7.onrender.com

Frontend required:

- VITE_API_BASE_URL=https://real-estate-website-backend-zfu7.onrender.com

## 6. Validation Checklist

After Milestone A:

- Dashboard loads and refresh works.
- Users list, suspend/ban actions work.
- Activity logs page loads and export works.

After Milestone B:

- No browser CORS failures from frontend/admin production domains.
- Local development works without changing code.

After Milestone C:

- Admin deep-link refresh works for protected and non-protected routes.
- Login persists and API requests include auth token.

After Milestone D:

- AI key validation and search failures are diagnosable from logs quickly.
- Test suite covers core AI path and key error mapping.

## 7. Risks and Mitigations

Risk: CORS lockout after env migration
Mitigation:

- Keep temporary fallback local origins during rollout.
- Deploy in off-peak window and validate immediately.

Risk: Admin auth regression during apiClient refactor
Mitigation:

- Keep old token key contract unchanged.
- Page-by-page replacement with quick smoke tests.

Risk: Vercel migration misconfiguration
Mitigation:

- Verify root directory, build output, and rewrite config before cutover.
- Keep Render admin live until Vercel passes full smoke checklist.

## 8. Rollback Plan

If Milestone A fails:

- Revert apiClient migration commit and redeploy admin.

If Milestone B fails:

- Revert CORS env-parser commit and restore previous origin list.

If Milestone C fails:

- Keep Render admin as active URL and disable Vercel domain until fixed.

## 9. Deliverables

1. Unified admin API client layer
2. Env-driven backend CORS allowlist
3. Admin deployment on Vercel with route refresh stability
4. Follow-up technical brief for AI Hub hardening (Milestone D)

## 10. Immediate Next Action

Start Milestone A first, then execute Milestone B in the same release branch before admin migration cutover.