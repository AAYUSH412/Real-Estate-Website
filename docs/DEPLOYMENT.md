# Deployment

## Vercel clients

Create independent projects from this repository with roots `frontend` and `admin`. Use the Vite preset, `npm ci`, `npm run build`, and output directory `dist`. Use a Node release satisfying each app's package engines (admin requires 22.12+). Include source files outside the root so the local `../shared/contracts` dependency is available.

Set frontend `VITE_API_BASE_URL` and admin `VITE_API_URL` to your HTTPS API origin, without a trailing `/api`. Client environment values are public and embedded at build time; redeploy after changes. Never expose server keys through `VITE_*` variables.

The admin's `vercel.json` supplies SPA fallback routing and security headers. Verify direct navigation/reload on `/dashboard`, `/users` and a test record detail.

### Existing admin project after rename

The canonical source is now `admin/`. Update the existing Vercel project's Root Directory from `admin_new` to `admin` before deploying this commit. Preserve its domain and production environment values. Record the currently working deployment before changing settings. Project/domain names need not match source folder names. The previous implementation remains in Git history, not a second application folder.

## Azure backend

The repository's `.github/workflows/deploy-backend.yml` tests the backend, builds the repository-root Docker context using `backend/Dockerfile`, publishes a SHA-tagged GHCR image and deploys to the configured App Service. Configure deployment secrets in your own GitHub repository and adapt the workflow resource names when forking.

Set database, JWT, administrator, ImageKit, Brevo and NVIDIA settings only in server configuration. Use a MongoDB replica set. Set `ADMIN_URL` to the exact admin HTTPS origin and `WEBSITE_URL` to the public website used in email links. Additional exact origins can be supplied through `EXTRA_ALLOWED_ORIGINS`. Do not use wildcard credentialed CORS.

## Release checks

1. Verify checks and compatible backend code before client rollout.
2. Record the prior deployment and source revision for rollback.
3. Deploy clients with correct build-time API origins and allowlisted server origins.
4. Test login, refresh/reload, logout, deep links, a test listing journey and a stale-version conflict in the intended browser. Cross-site cookie restrictions must be verified in that browser.
5. Verify public website compatibility and `/health` and `/health/ready` on the backend.

A refresh request without credentials should return a readable 401 with the allowed origin, not a CORS failure. Successful email API acceptance does not establish inbox delivery. Model migrations, quota-consuming tests and activation are explicit operations; do not run them as incidental deployment checks.
