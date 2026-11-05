# BuildEstate API

The server behind [BuildEstate](../README.md). It stores data, applies the business rules, handles login and connects to the optional email, photo and AI services.

## Run it

The easiest way is from the repository root, which starts everything, including a local database:

```sh
npm run setup
npm run seed
npm run dev
```

The API runs at http://localhost:4000. To check it, open http://localhost:4000/health/ready.

To run only the API, with `MONGO_URI` pointing to a running replica set:

```sh
cd backend
npm ci
npm run dev
```

## Settings

`npm run setup` creates `backend/.env.local` from [`.env.example`](.env.example). The [setup guide](../docs/SETUP.md#settings-reference) explains every value. These are required: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `WEBSITE_URL`.

Settings load in this order: shell or host variables first, then `.env.local` (outside production), then `.env`. See the [email configuration notes](docs/local-email-configuration.md) for an example.

### Differences between development and production

| Situation | Development | Production |
| --- | --- | --- |
| ImageKit keys missing | API runs and uploads show a clear error | API refuses to start |
| Brevo key missing | Account links print in the terminal | Email attempts fail and are logged |

## Tech stack

Node.js 22, Express 4, Mongoose 8, JWT, bcrypt, Multer, Sharp, Helmet, express-rate-limit, Winston and node-cron.

## Folder guide

```text
backend/
├── config/        Database, CORS, environment, ImageKit and email setup
├── routes/        URLs. mountApiRoutes.js lists every prefix.
├── controller/    Request handling
├── middleware/    Login checks, validation, uploads and rate limits
├── services/      Business rules, AI, scraping and email sending
├── models/        Database structure
├── utils/         Logging, errors and helpers
├── scripts/       Seed data and maintenance tools (see scripts/README.md)
├── tests/         Automated tests
├── docs/          API contracts, AI model and email notes
├── email.js       Email designs
├── server.js      Starting point
└── Dockerfile     Production image. Build it from the repository root.
```

## API

See the [API reference](../docs/API.md) for every endpoint, and the [admin API contracts](docs/admin-api-contracts.md) for request details.

`GET /health` checks that the server is running. `GET /health/ready` also checks the database.

## Important rules

- **MongoDB must be a replica set**, because the API uses transactions. Plain `mongod` will not work.
- **Photos:** up to 4 per listing and 5 MB each. Sharp checks each one before it goes to ImageKit, with limits of 16 megapixels, 8000 pixels on a side and one frame. If a save fails, new uploads are removed.
- **Email:** sent after data is saved, on a best-effort basis, with no retry queue. Brevo accepting a message does not prove delivery.
- **AI:** NVIDIA is the only AI provider, and models start disabled. See the [NVIDIA model guide](docs/admin-phase2-nvidia.md).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API and restarts on changes |
| `npm start` | Starts the API without restarting |
| `npm run seed` | Adds sample data to an empty local database |
| `npm test` | Runs the 94 tests |

Tests start their own temporary database and use mocked services, so they never touch your data or use API credits. The first run downloads MongoDB.

## Deployment

The live API runs on Azure App Service from a Docker image. See the [deployment guide](../docs/DEPLOYMENT.md).
