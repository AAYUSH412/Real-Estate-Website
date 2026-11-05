# Setup guide

This guide assumes you have never run the project before. If you just want the short version, see the [quick start](../README.md#quick-start).

## 1. Install the tools

You need two programs.

**Node.js 22.12 or newer.** Download the LTS version from [nodejs.org](https://nodejs.org). Then check it in a terminal:

```sh
node --version
```

If it prints `v22.12.0` or higher, you are ready. If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm install` in the project folder and it reads the version from `.nvmrc`.

**Git.** Download it from [git-scm.com](https://git-scm.com/downloads) and check it:

```sh
git --version
```

On Windows, use PowerShell or Git Bash. On macOS, use Terminal. npm comes with Node.js.

## 2. Download the project

```sh
git clone https://github.com/AAYUSH412/Real-Estate-Website.git
cd Real-Estate-Website
```

If you plan to contribute, fork the repository first and clone your fork.

## 3. Install and configure

```sh
npm run setup
```

This does four things:

1. Checks your Node.js version.
2. Creates `backend/.env.local`, `frontend/.env.local` and `admin/.env.local` from the example files.
3. Generates a private `JWT_SECRET` and `ADMIN_PASSWORD` for you.
4. Installs the dependencies of all three apps.

Running it again is safe. It never overwrites a `.env.local` file that already exists.

> `.env.local` files hold your private settings. Git ignores them. Never commit them or share them.

## 4. Add sample data

```sh
npm run seed
```

This starts a local MongoDB and adds:

- 7 sample listings
- A verified demo user: `demo@example.com` / `Demo12345!`
- An admin account using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env.local`
- Disabled AI model entries, which you can activate later

The first run downloads MongoDB, which is about 80 MB. Your data is saved in `backend/.local-db/`.

The seed script protects real data. It refuses to run in production, refuses remote databases unless you pass `--allow-remote`, and changes nothing if the database already has listings or users.

## 5. Start everything

```sh
npm run dev
```

Wait until you see output from `api`, `website` and `admin`, then open:

| App | Address |
| --- | --- |
| Website | http://localhost:5173 |
| Admin panel | http://localhost:5175 |
| API health check | http://localhost:4000/health/ready |

Press `Ctrl+C` to stop everything.

Confused by something? Run `npm run doctor`. It lists what is ready and what needs fixing, and it never prints secret values.

## Optional services

The project runs without any of these. Add the keys to `backend/.env.local` and restart `npm run dev`.

### Photo uploads with ImageKit

1. Create an account at [imagekit.io](https://imagekit.io).
2. Open the developer options in the dashboard and copy your keys.
3. Add them:

```env
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

### Email with Brevo

1. Create an account at [brevo.com](https://www.brevo.com).
2. Add and verify a sender email address.
3. Create an API key under SMTP & API settings.
4. Add them:

```env
BREVO_API_KEY=your_api_key
EMAIL_USER=your_verified_sender@example.com
```

Without Brevo, new accounts still work. Look in the terminal for the line starting with `[no email service]` and open the link printed below it. More detail is in the [email configuration notes](../backend/docs/local-email-configuration.md).

### AI search with NVIDIA and Firecrawl

AI search needs three things.

**1. An NVIDIA key.** Create one at [build.nvidia.com](https://build.nvidia.com) and add it, then restart:

```env
NVIDIA_API_KEY=your_nvidia_key
```

**2. An active model.** Models start disabled so nothing uses your quota by accident.

1. Open the admin panel and go to **NVIDIA models**.
2. Open a model and run **Test application JSON**. This uses a small amount of NVIDIA quota.
3. When the test passes, enable the model.

The [NVIDIA model guide](../backend/docs/admin-phase2-nvidia.md) explains the full process.

**3. A Firecrawl key.** Create one at [firecrawl.dev](https://www.firecrawl.dev). Do not put this in `.env.local`. Each user enters their own key on the AI Hub page of the website.

## Using MongoDB Atlas instead of the local database

Use Atlas if you want the same data on several computers or plan to deploy.

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com). Atlas clusters are replica sets, so transactions work.
2. Under **Database Access**, create a user and password.
3. Under **Network Access**, allow your IP address.
4. Click **Connect**, choose **Drivers** and copy the connection string.
5. Replace `MONGO_URI` in `backend/.env.local`, with your password and a database name:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/buildestate?retryWrites=true&w=majority
```

6. Add sample data. Check this is your own empty database first:

```sh
npm run seed -- --allow-remote
```

## Running each app separately

The root commands are optional. To run the apps by hand, use a separate terminal for each. `MONGO_URI` must point to a running replica set, such as Atlas.

```sh
cd backend
npm ci
npm run dev
```

```sh
cd frontend
npm ci
npm run dev
```

```sh
cd admin
npm ci
npm run dev
```

Keep the folder layout as it is, because all three apps use `shared/contracts` as a local package.

## Settings reference

### `backend/.env.local`

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Yes | API port, normally `4000` |
| `NODE_ENV` | Yes | `development` locally |
| `BACKEND_URL` | Yes | Public address of the API |
| `MONGO_URI` | Yes | Database connection |
| `JWT_SECRET` | Yes | Signs login tokens. Keep it private. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Yes | The admin account |
| `WEBSITE_URL` | Yes | Website address, used for CORS and email links |
| `ADMIN_URL` | For hosting | Admin panel address, used for CORS |
| `EXTRA_ALLOWED_ORIGINS` | No | More allowed addresses, comma-separated |
| `IMAGEKIT_*` | No | Photo uploads. Required in production. |
| `BREVO_API_KEY`, `EMAIL_USER` | No | Sending email |
| `NVIDIA_API_KEY` | No | AI analysis |

### `frontend/.env.local`

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API address, without `/api` |
| `VITE_ENABLE_AI_HUB` | Set to `true` to show the full AI Hub |

### `admin/.env.local`

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Leave empty locally. Set it to the API address when hosting. |
| `DEV_API_TARGET` | Where the local proxy sends `/api`. Defaults to `http://localhost:4000`. |

`VITE_` values are built into browser code and anyone can read them. Never put secrets in them.

## Next steps

- Having problems? See [Troubleshooting](TROUBLESHOOTING.md).
- Want to understand the code? Read the [architecture guide](ARCHITECTURE.md).
- Ready to publish? Follow the [deployment guide](DEPLOYMENT.md).
