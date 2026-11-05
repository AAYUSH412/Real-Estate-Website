# Troubleshooting

Start here: run this from the repository root. It checks your setup and says what to fix.

```sh
npm run doctor
```

## Setup problems

### `Node.js 22.12 or newer is required`

Install the current LTS version from [nodejs.org](https://nodejs.org), close the terminal, open a new one and check `node --version`.

### `npm` or `node` is not recognized

Node.js is not installed or the terminal has not picked it up. Install it, then open a new terminal.

### `npm run setup` fails during install

Your connection may have dropped. Run it again. If it keeps failing, delete the `node_modules` folder in the app that failed and retry.

### `Missing script: "setup"`

You are in the wrong folder. Run `cd Real-Estate-Website` so you are at the repository root. You should see `package.json`, `frontend` and `backend` when you list the files.

## Database problems

### The first `npm run seed` looks stuck

It is downloading MongoDB, which is about 80 MB. Watch the `database` lines for the percentage.

### `The local database did not start`

- Your computer may be blocking the download. Try another network.
- Your operating system may not be supported by the MongoDB download. Use [MongoDB Atlas](SETUP.md#using-mongodb-atlas-instead-of-the-local-database) instead.
- Another program may be using port 27018. Stop it and try again.

### `Refusing to seed: MONGO_URI is not a local database`

This protects real data. If the database is your own and empty, run:

```sh
npm run seed -- --allow-remote
```

### `This database already has data, so nothing was changed`

The script found existing listings or users. To start again with the local database, stop `npm run dev`, delete the `backend/.local-db` folder and run `npm run seed`.

This deletes all your local BuildEstate data.

### Transaction errors such as `Transaction numbers are only allowed on a replica set member`

`MONGO_URI` points to a plain MongoDB server, which does not support transactions. Use the default local database or Atlas.

### Atlas connection times out

Add your IP address in Atlas under **Network Access**, and check that the password in `MONGO_URI` is correct. If the password has special characters, they must be [URL-encoded](https://www.mongodb.com/docs/manual/reference/connection-string/).

## Running the apps

### `Already in use: API port 4000`

Another program, or an earlier `npm run dev`, is using that port. Close it, or find it with:

```sh
# macOS and Linux
lsof -i :4000

# Windows
netstat -ano | findstr :4000
```

### The website loads but shows no listings

Check these in order:

1. Is the API running? Open http://localhost:4000/health/ready.
2. Did you run `npm run seed`?
3. Does `frontend/.env.local` have `VITE_API_BASE_URL=http://localhost:4000`? Restart `npm run dev` after changing it.

### CORS error in the browser console

The API only accepts addresses it knows. Open the site at exactly `http://localhost:5173`, not `127.0.0.1`. For other addresses, add them to `EXTRA_ALLOWED_ORIGINS` in `backend/.env.local` and restart.

## Signing in

### Admin login says `Invalid credentials`

- Use the exact `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env.local`.
- Make sure you ran `npm run seed`, which creates the admin account.
- Changing `ADMIN_PASSWORD` later does not change an existing account. For the local database, delete `backend/.local-db` and run `npm run seed` again.

### New account says to verify the email, but no email arrives

Without Brevo, no email is sent. Look in the `npm run dev` terminal for the line starting with `[no email service]`, and open the link below it. Password reset works the same way.

### `Temporary or disposable email addresses are not allowed` when signing up

Sign-up blocks test and temporary email domains, including `example.com`. Use a real-looking address. The seeded `demo@example.com` account was created directly and can still sign in.

## Features

### Uploading a photo says `Photo uploads need ImageKit keys`

This is expected without ImageKit. Follow the [ImageKit steps](SETUP.md#photo-uploads-with-imagekit), or keep testing without new photos.

### AI Hub has no models, or says it is unavailable

Check all of these:

1. `NVIDIA_API_KEY` is set in `backend/.env.local`, and you restarted.
2. A model has passed its test and is enabled in **Admin panel → NVIDIA models**.
3. `VITE_ENABLE_AI_HUB=true` is in `frontend/.env.local`.
4. You entered a Firecrawl key on the AI Hub page.

The [setup guide](SETUP.md#ai-search-with-nvidia-and-firecrawl) has the full steps.

### AI search returns few results or an error

It depends on third-party sites, your Firecrawl quota and NVIDIA availability. Try another city or try again later.

### Email says it was accepted but never arrives

Acceptance by Brevo does not guarantee delivery. Check that the sender is verified in Brevo and check your spam folder. See the [email notes](../backend/docs/local-email-configuration.md).

## Still stuck?

[Open an issue](https://github.com/AAYUSH412/Real-Estate-Website/issues/new/choose) with your operating system, Node.js version, the command you ran, the full error and the output of `npm run doctor`. Please remove any private values first.
