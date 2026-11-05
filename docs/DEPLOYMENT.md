# Deployment

How to host your own copy. The live project uses Vercel for the two browser apps and Azure App Service for the API, but any host with the same features works.

## Before you start

You need:

- A **MongoDB Atlas** cluster, or another replica set. See the [setup guide](SETUP.md#using-mongodb-atlas-instead-of-the-local-database).
- An **ImageKit** account. In production, the API refuses to start without it.
- A **Brevo** account with a verified sender, so users can verify their email.
- Optional: an **NVIDIA** key for AI search.

Deploy the API first, because both browser apps need its address.

## 1. Deploy the API

### Azure App Service with GitHub Actions (how this repository works)

`.github/workflows/deploy-backend.yml` runs when `backend/` or `shared/` changes on `main`, except for Markdown-only changes. It tests the backend, builds a Docker image, publishes it to GitHub Container Registry and deploys it.

For your fork:

1. Create an Azure App Service using a Linux container.
2. Download its publish profile and add it to your repository secrets as `AZURE_WEBAPP_PUBLISH_PROFILE`.
3. In the workflow file, change `IMAGE` and `AZURE_WEBAPP_NAME` to your own values.
4. Add the settings below under the App Service's environment variables.

### Any other host that runs Docker

Build from the **repository root**, because the image needs `shared/contracts`:

```sh
docker build -f backend/Dockerfile -t buildestate-api .
```

To try the image locally with an Atlas `MONGO_URI` in `backend/.env.local`, run `docker compose up` in `backend/`. The compose file does not include a database, so the default local `MONGO_URI` will not work inside it.

### API settings

```env
NODE_ENV=production
PORT=4000
BACKEND_URL=https://your-api.example.com
MONGO_URI=mongodb+srv://...
JWT_SECRET=a_long_random_value
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a_strong_password
WEBSITE_URL=https://your-website.example.com
ADMIN_URL=https://your-admin.example.com
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=...
BREVO_API_KEY=...
EMAIL_USER=your_verified_sender@example.com
NVIDIA_API_KEY=...
```

On Azure, also set `WEBSITES_PORT=4000`.

`WEBSITE_URL` is used in email links, and it and `ADMIN_URL` must exactly match your browser addresses for CORS. Add other addresses with `EXTRA_ALLOWED_ORIGINS`. Do not use a wildcard, because the API sends credentials.

### Create the admin account

`npm run seed` is for local databases, so create the production admin with this script once. Run it with your production settings in `backend/.env.local`, then remove them:

```sh
cd backend
node scripts/createAdmin.js
```

It does nothing if that admin already exists.

### Check it

Open `https://your-api.example.com/health/ready`. It should report that the database is healthy.

## 2. Deploy the website and admin panel on Vercel

Create **two separate Vercel projects** from the same repository:

| Setting | Website | Admin panel |
| --- | --- | --- |
| Root Directory | `frontend` | `admin` |
| Framework Preset | Vite | Vite |
| Build Command | `npm run build` | `npm run build` |
| Output Directory | `dist` | `dist` |
| Node.js Version | 22.x | 22.x |
| Environment variable | `VITE_API_BASE_URL` | `VITE_API_URL` |

Set each variable to your API address, using HTTPS and without a trailing `/api`.

In each project, keep **Include files outside of the Root Directory** turned on, because both apps need `shared/contracts`.

`VITE_` values are public and built into the browser code. Never put secrets in them. Redeploy after changing one.

Leave `VITE_ENABLE_AI_HUB` unset on the public website if you want to avoid AI costs. Visitors then see an explanation page instead of the full search.

Each app's `vercel.json` handles page routing and security headers.

## 3. Check the release

1. Automated checks passed on the commit you deployed.
2. Note the current deployment, so you can roll back.
3. On the admin panel, test: sign in, reload while signed in, sign out, and open `/dashboard` directly.
4. On the website, test: browse listings, sign up and verify an email, then submit a test listing.
5. Approve that listing from the admin panel, then remove it.
6. Open `/health` and `/health/ready` on the API.

A refresh request without a cookie should return a readable 401, not a CORS error. A CORS error means `ADMIN_URL` or `WEBSITE_URL` does not match the browser address exactly.

Brevo accepting an email does not prove it was delivered, so check a real inbox.

## Updating an existing database

AI model migrations and tests are separate, deliberate steps because they can change data or use quota. Never run them as part of a routine deploy. See the [NVIDIA model guide](../backend/docs/admin-phase2-nvidia.md).

## Rolling back

- **Vercel:** promote the previous deployment in the project's Deployments page.
- **Azure:** run the deploy with the previous image tag. Images are tagged with their commit SHA.
- **Database:** take a backup before any migration, because rolling back code does not undo data changes.
