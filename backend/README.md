<div align="center">

# BuildEstate — Backend API ⚙️

_The core REST API server driving the BuildEstate real estate platform._

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)

[![Live API](https://img.shields.io/badge/Live_API-On_Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://real-estate-website-backend-zfu7.onrender.com/)

</div>

---

## ✨ Features

- **JWT Authentication** — Hardened token-based user authentication using bcrypt password hashing.
- **Property Management (CRUD)** — Robust operations to add, query, update, and remove properties with multiplexed image management (up to 4 images).
- **Scalable Image Upload** — Multer temp-file integration piping seamlessly into ImageKit CDN pipelines.
- **Appointment Architecture** — Guest and authenticated bookings coupled with autonomous email dispatch routing.
- **AI Property Processing** — Interfacing with GPT-4.1 (GitHub Models) and Firecrawl web scraping for deep market analysis.
- **Location Analytics** — Specialized localized data scraping tracking market trends for top Indian hubs.
- **Administrative Utilities** — Dashboard analytics handling aggregate counts across properties, users, and transactions.
- **Infrastructure Security** — `express-rate-limit` DDoS prevention, deep Helmet.js header shielding, and integrated CORS validation.
- **Email Notifications** — Custom branded transactional payloads delivered utilizing Brevo SMTP.

---

## 💻 Tech Stack

| Domain                   | Technology               | Implementation Details                              |
| ------------------------ | ------------------------ | --------------------------------------------------- |
| **Runtime**              | Node.js 18+              | High-throughput asynchronous JS compilation         |
| **Application Layer**    | Express.js               | Granular endpoint definitions                       |
| **Database Systems**     | MongoDB Atlas            | Distributed NoSQL storage                           |
| **Object Modeling**      | Mongoose                 | Typed modeling and validation protocols             |
| **Authentication**       | JWT + Bcrypt             | Cryptographically verified tokens and keys          |
| **Storage Architecture** | Multer + ImageKit        | Multipart transmission yielding CDN delivery        |
| **Communications**       | Nodemailer + Brevo       | Specialized template execution and delivery routing |
| **AI Inference**         | GPT-4.1 + Firecrawl      | NLP search indexing and organic data acquisition    |
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

# Brevo SMTP
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_password
EMAIL=your_sender_email@gmail.com

# Admin credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_admin_password

# Frontend URL (for CORS validation + email deep-linking)
WEBSITE_URL=http://localhost:5173

# ImageKit Credentials (multipart proxying)
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# AI Service Flags (optional — needed only for local AI Property Hub testing)
FIRECRAWL_API_KEY=your_firecrawl_api_key
GITHUB_MODELS_API_KEY=your_github_pat_token
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
| `POST`  | `/api/ai/search`              | Public       | Feed user queries to GPT-4.1 NLP engine              |
| `POST`  | `/api/properties/search`      | Public       | Basic non-AI parameterized search protocol           |
| `GET`   | `/api/locations/:city/trends` | Public       | Execute localized scraping behavior for macro trends |

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
2. The endpoint passes elements heavily shielded by **Multer** into deep-cache `uploads/`.
3. The server immediately proxies payloads securely to the **ImageKit CDN** using dedicated SDK tokens.
4. CDN access URIs are returned and definitively saved within MongoDB Atlas structure nodes.
5. Temp `uploads/` files are wiped utilizing strict cleanup events.

---

## 🌐 Deployment Mechanics (Render Instance)

1. Provision a raw **Web Service** on [Render](https://render.com).
2. Authorize standard GitHub injection.
3. Configure **Root Directory** pointing strictly to `backend`.
4. Command structures: Build: `npm install` | Run: `npm start`.
5. Mirror `.env.local` accurately inside Render Environment Variables GUI.
6. Verify `NODE_ENV=production` is assigned while pointing `WEBSITE_URL` properly to standard frontend Vercel mapping.

Active Node endpoint: **https://real-estate-website-backend-zfu7.onrender.com**

---

<div align="center">

**Associated Applications**

[Frontend README](../frontend/README.md) • [Admin Panel README](../admin/README.md) • [Root Interface](../README.md)

_Engineered by [Aayush Vaghela](https://aayush-vaghela.vercel.app/)_

</div>
