<div align="center">

# BuildEstate — Backend API ⚙️

_The core REST API server driving the BuildEstate real estate platform._

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)

[![Live API](https://img.shields.io/badge/Live_API-On_Azure-0078D4?style=for-the-badge&logo=render&logoColor=white)](https://buildestate-api-prod.azurewebsites.net/)

</div>

---

## ✨ Features

- **JWT Authentication** — Hardened token-based user authentication using bcrypt password hashing.
- **Property Management (CRUD)** — Robust operations to add, query, update, and remove properties with multiplexed image management (up to 4 images).
- **Scalable Image Upload** — Multer memory-buffer integration piping seamlessly into ImageKit CDN pipelines.
- **Appointment Architecture** — Guest and authenticated bookings coupled with autonomous email dispatch routing.
- **AI Property Processing** — Live listing scraping via Firecrawl (user-supplied key) analyzed by an NVIDIA-only catalog with tested models and ordered fallback. Search results stream to the client over SSE.
- **Location Analytics** — Locality-level price trends, rental yields, and appreciation outlook for top Indian cities, with MongoDB response caching.
- **Administrative Utilities** — Dashboard analytics handling aggregate counts across properties, users, and transactions.
- **Infrastructure Security** — `express-rate-limit` DDoS prevention, deep Helmet.js header shielding, and integrated CORS validation.
- **Email Notifications** — Custom branded transactional payloads delivered through the Brevo REST API with a 10-second timeout.

---

## 💻 Tech Stack

| Domain                   | Technology               | Implementation Details                              |
| ------------------------ | ------------------------ | --------------------------------------------------- |
| **Runtime**              | Node.js 22+              | High-throughput asynchronous JS compilation         |
| **Application Layer**    | Express.js               | Granular endpoint definitions                       |
| **Database Systems**     | MongoDB Atlas            | Distributed NoSQL storage                           |
| **Object Modeling**      | Mongoose                 | Typed modeling and validation protocols             |
| **Authentication**       | JWT + Bcrypt             | Cryptographically verified tokens and keys          |
| **Storage Architecture** | Multer + ImageKit        | Multipart transmission yielding CDN delivery        |
| **Communications**       | Axios + Brevo REST       | Specialized template execution and delivery routing |
| **AI Inference**         | NVIDIA NIM     | Multi-model property ranking with automatic fallback |
| **Web Scraping**         | Firecrawl                | Live listing extraction (user-supplied API key)      |
| **Cybersecurity**        | Helmet, CORS, Rate-limit | Middleware-injected traffic policing                |

---

## 🚀 Quick Start

<details>
<summary><strong>1. Installation & Environment Loading</strong></summary>

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

</details>

<details>
<summary><strong>2. Adjust Configuration Params (.env.local)</strong></summary>

```env
PORT=4000
NODE_ENV=development

# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here

# Brevo REST API (verified sender required)
BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=your_verified_sender@example.com

# Admin credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_admin_password

# Frontend URL (for CORS validation + email deep-linking)
WEBSITE_URL=http://localhost:5173

# ImageKit Credentials (multipart proxying)
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# AI Services (optional — needed only for the AI Property Hub)
# Scraping key is supplied BY THE USER via the X-Firecrawl-Key header;
# these server-side keys power the AI analysis step only.
NVIDIA_API_KEY=your_nvidia_nim_api_key
```

</details>

<details>
<summary><strong>3. Boot Initialized Server</strong></summary>

```bash
# Start auto-reloading development node
npm run dev
```

Server initializes and binds to `http://localhost:4000`

</details>

---

## 🔌 API Endpoints Reference

<details>
<summary><strong>Authentication & User Routines (`/api/users`)</strong></summary>

| Request | Route Namespace | Restrictions       | Purpose                                    |
| ------- | --------------- | ------------------ | ------------------------------------------ |
| `POST`  | `/register`     | Public             | Instantiate fresh identity record          |
| `POST`  | `/login`        | Public             | Validate credentials and vend JWT          |
| `POST`  | `/admin`        | Public             | Specialized admin credential validation    |
| `GET`   | `/me`           | Valid JWT required | Recover authorized profile dataset         |
| `POST`  | `/forgot`       | Public             | Dispatch recovery lifecycle email          |
| `POST`  | `/reset/:token` | Public             | Validate token and overwrite password hash |

</details>

<details>
<summary><strong>Property Data Stores (`/api/products`)</strong></summary>

| Request | Route Namespace | Restrictions | Purpose                                            |
| ------- | --------------- | ------------ | -------------------------------------------------- |
| `GET`   | `/list`         | Public       | Aggregate extensive real estate catalogs           |
| `GET`   | `/single/:id`   | Public       | Target solitary property structure map             |
| `POST`  | `/add`          | Admin Only   | Ingest multipart property payload (up to 4 images) |
| `POST`  | `/update`       | Admin Only   | Mutate deployed property details / replace media   |
| `POST`  | `/remove`       | Admin Only   | Obliterate property mapping and linked data        |

</details>

<details>
<summary><strong>Appointment Logic Pipelines (`/api/appointments`)</strong></summary>

| Request | Route Namespace   | Restrictions       | Purpose                                             |
| ------- | ----------------- | ------------------ | --------------------------------------------------- |
| `POST`  | `/schedule`       | Public             | Standard generic guest-level appointment request    |
| `POST`  | `/schedule/auth`  | Valid JWT required | Bind viewing appointment directly to profile        |
| `GET`   | `/user`           | Public             | Validate bookings aligned to provided email keys    |
| `GET`   | `/upcoming`       | Public             | Identify chronological upcoming events              |
| `PUT`   | `/cancel/:id`     | Public             | Abort scheduled interaction lifecycle               |
| `PUT`   | `/feedback/:id`   | Public             | Log interaction metrics and reviews                 |
| `GET`   | `/all`            | Admin Only         | Full comprehensive event retrieval                  |
| `GET`   | `/stats`          | Admin Only         | Appointment aggregation counts and statistics       |
| `PUT`   | `/status`         | Admin Only         | Flip status identifiers (`pending`, `completed`)    |
| `PUT`   | `/update-meeting` | Admin Only         | Inject digital interaction URIs for remote viewings |

</details>

<details>
<summary><strong>Administrative Operations (`/api/admin`)</strong></summary>

| Request | Route Namespace        | Restrictions | Purpose                                          |
| ------- | ---------------------- | ------------ | ------------------------------------------------ |
| `GET`   | `/stats`               | Admin Only   | High-level macro analytics payload               |
| `GET`   | `/appointments`        | Admin Only   | Detailed cross-user interaction scheduling lists |
| `PUT`   | `/appointments/status` | Admin Only   | Toggle systemic verification structures          |

</details>

<details>
<summary><strong>Communication & Inference Routines</strong></summary>

| Request | Route Namespace               | Restrictions | Purpose                                              |
| ------- | ----------------------------- | ------------ | ---------------------------------------------------- |
| `POST`  | `/api/forms/submit`           | Public       | Parse generic contact payloads into storage          |
| `POST`  | `/api/ai/search`              | X-Firecrawl-Key header | Live AI property search (SSE stream; model selectable) |
| `GET`   | `/api/ai/models`              | Public       | List active AI models for the search form           |
| `GET`   | `/api/locations/:city/trends` | X-Firecrawl-Key header | Locality price trends + AI analysis (cached)  |

</details>

---

## 📂 Internal Directory Architecture

<details>
<summary><strong>View Component Map</strong></summary>

```text
backend/
├── config/                # Service Initializations (MongoDB, CDN, SMTP)
├── controller/            # API Route Controllers (The execution core)
├── middleware/            # Injection Rules (Auth locks, Upload configs, Rate-limiters)
├── models/                # Schema Rulesets (Mongoose structural definitions)
├── routes/                # Endpoint Declarations (Traffic directors)
├── services/              # Complex Implementations (AI bindings, Scraping ops)
├── uploads/               # Fast-cache swap directory for incoming CDNs
├── server.js              # Primary Execution Basepoint
├── email.js               # Branded Component Generation Engine
├── package.json           # Definitions / Scripts
└── vercel.json / render.yaml # Production deployment spec rules
```

</details>

---

## 🏗️ Multimedia Handling Workflow

To guarantee high scalability, image uploads follow a strict proxy lifecycle:

1. Operations manager (Admin) inputs high-res images to the frontend.
2. Multer bounds uploads in memory; Sharp verifies decoding and resource limits before any CDN upload.
3. The server uploads accepted buffers to ImageKit using its private server credentials.
4. Image URLs and asset IDs are saved transactionally in MongoDB.
5. Failed saves remove newly uploaded assets; retained images stay intact.

---

## Deployment and local runtime

The current API runs on Azure App Service using the repository's container deployment workflow. The Docker image uses Node.js 22; use Node.js 22 locally too. Both `npm start` and `npm run start:prod` run `server.js`. The latter does not set environment variables: configure `NODE_ENV=production` in the hosting environment.

MongoDB must support transactions: use Atlas or a local replica set, not standalone `mongod`. Keep `.env.local` private. Configure `WEBSITE_URL`, `ADMIN_URL` and allowed origins for the clients being used. `GET /health` is liveness; `GET /health/ready` checks database readiness.

Listing uploads retain the four-image and 5 MB per-file limits. Sharp validates full image decoding before uploading originals to ImageKit; maximum 16 megapixels, 8000px on either side and one frame. ImageKit remains responsible for URL-based delivery resizing and optimization. Retained images are not reuploaded. See [Sharp constructor limits](https://sharp.pixelplumbing.com/api-constructor/) and [ImageKit resizing](https://imagekit.io/docs/image-resize-and-crop).

Email health reports configuration only, not verified delivery. Notifications are best-effort attempts after committed writes; there is no durable retry queue or delivery guarantee.

See [the Phase 1 contract notes](docs/admin-phase1-contracts.md) for dashboard definitions, detail endpoints, pagination aliases and compatible version checks. See [Phase 2 NVIDIA setup and migration](docs/admin-phase2-nvidia.md). NVIDIA is the only runtime inference provider.

## Replacement admin readiness

The local Phase 3 backend gate passed with 106 tests across the API and existing clients. Start with the [accepted API contract index](docs/admin-api-contracts.md) and [acceptance evidence and release limits](docs/admin-phase3-acceptance.md) before building `admin`. Production migration/deployment and the original operations Phase 4 remain separate.

Local email setup: [environment load order, sender diagnosis and manual retest](docs/local-email-configuration.md). `EMAIL_USER` must be configured; API acceptance does not prove delivery.
