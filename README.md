<div align="center">

# BuildEstate 🏢✨

### AI-Powered Real Estate Platform

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![Live Demo](https://img.shields.io/badge/Live_Demo-buildestate.vercel.app-4285F4?style=for-the-badge&logo=vercel&logoColor=white)](https://buildestate.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://real-estate-website-backend-zfu7.onrender.com)

[![Stars](https://img.shields.io/github/stars/AAYUSH412/Real-Estate-Website?style=for-the-badge&logo=github&color=yellow)](https://github.com/AAYUSH412/Real-Estate-Website)
[![Forks](https://img.shields.io/github/forks/AAYUSH412/Real-Estate-Website?style=for-the-badge&logo=github&color=blue)](https://github.com/AAYUSH412/Real-Estate-Website)
[![License](https://img.shields.io/github/license/AAYUSH412/Real-Estate-Website?style=for-the-badge&color=green)](LICENSE)

<br/>

_A full-stack real estate platform integrating seamless property browsing, intelligent AI analysis, and comprehensive management features._

<br/>

</div>

https://github.com/AAYUSH412/Real-Estate-Website/raw/main/videos/Homepage.mov

---

## ✨ Features Showcase

### 🤖 AI Property Hub

Experience intelligent real estate search. Powered by GPT-4.1, the AI Hub provides natural language search, market analysis, and location trend insights.
https://github.com/AAYUSH412/Real-Estate-Website/raw/main/videos/Ai-property-hub.mov

<br/>

### 🏡 Property Browsing & Appointment Booking

Browse properties with rich filters, view detailed galleries (up to 4 images via ImageKit), and easily schedule appointments as a guest or registered user.
https://github.com/AAYUSH412/Real-Estate-Website/raw/main/videos/Propertypage.mov

<br/>

### 📊 Comprehensive Admin Dashboard

Manage the entire platform from a sleek dashboard. Includes property CRUD operations, image uploads, appointment tracking, and platform analytics.
https://github.com/AAYUSH412/Real-Estate-Website/raw/main/videos/Admin-panel.mov

<br/>

### ⚙️ Robust Backend Architecture

A secure, scalable REST API built with Express, secured via JWT, with integrated Brevo SMTP email notifications and MongoDB Atlas data management.
https://github.com/AAYUSH412/Real-Estate-Website/raw/main/videos/Backend.mov

---

## 💻 Tech Stack

- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion, React Router v7
- **Admin Panel:** React 18, Vite 6, Tailwind CSS v3, Chart.js, Lucide React
- **Backend:** Node.js, Express.js, Mongoose, JWT, Multer, Nodemailer
- **Database:** MongoDB Atlas
- **AI Services:** GPT-4.1 (GitHub Models), Firecrawl (web scraping)
- **Storage & Deployment:** ImageKit CDN, Vercel (Frontend), Render (Backend + Admin)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm 8+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free account
- [ImageKit](https://imagekit.io/) free account
- [Brevo](https://www.brevo.com/) free account (for SMTP emails)

### 1. Clone the Repository

```bash
git clone https://github.com/AAYUSH412/Real-Estate-Website.git
cd Real-Estate-Website
```

<details>
<summary><strong>2. Set Up the Backend</strong></summary>

```bash
cd backend
npm install
cp .env.example .env.local
```

Edit `backend/.env.local`:

```env
PORT=4000
NODE_ENV=development

# MongoDB Atlas
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=your_jwt_secret_here

# Brevo SMTP
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_password
EMAIL=your_sender_email@gmail.com

# Admin credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_admin_password

# Frontend URL (for CORS + password reset emails)
WEBSITE_URL=http://localhost:5173

# ImageKit
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# AI Services — optional, only needed for AI Property Hub
FIRECRAWL_API_KEY=your_firecrawl_api_key
GITHUB_MODELS_API_KEY=your_github_pat_token
```

```bash
npm run dev   # starts at http://localhost:4000
```

</details>

<details>
<summary><strong>3. Set Up the Frontend</strong></summary>

```bash
cd ../frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_ENABLE_AI_HUB=true
```

```bash
npm run dev   # starts at http://localhost:5173
```

</details>

<details>
<summary><strong>4. Set Up the Admin Panel</strong></summary>

```bash
cd ../admin
npm install
cp .env.example .env.local
```

Edit `admin/.env.local`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

```bash
npm run dev   # starts at http://localhost:5174
```

</details>

---

## 🔌 API Endpoints

<details>
<summary><strong>Authentication & Users</strong></summary>

| Method | Endpoint                  | Description                     |
| ------ | ------------------------- | ------------------------------- |
| POST   | `/api/users/register`     | Register new user               |
| POST   | `/api/users/login`        | Login (returns JWT)             |
| POST   | `/api/users/admin`        | Admin login                     |
| GET    | `/api/users/me`           | Get current user (JWT required) |
| POST   | `/api/users/forgot`       | Send password reset email       |
| POST   | `/api/users/reset/:token` | Reset password                  |

</details>

<details>
<summary><strong>Properties</strong></summary>

| Method | Endpoint                   | Description                      |
| ------ | -------------------------- | -------------------------------- |
| GET    | `/api/products/list`       | List all properties              |
| GET    | `/api/products/single/:id` | Get property by ID               |
| POST   | `/api/products/add`        | Add property with images (admin) |
| POST   | `/api/products/update`     | Update property (admin)          |
| POST   | `/api/products/remove`     | Delete property (admin)          |

</details>

<details>
<summary><strong>Appointments</strong></summary>

| Method | Endpoint                           | Description               |
| ------ | ---------------------------------- | ------------------------- |
| POST   | `/api/appointments/schedule`       | Book viewing (guest)      |
| POST   | `/api/appointments/schedule/auth`  | Book viewing (logged in)  |
| GET    | `/api/appointments/user`           | Get appointments by email |
| PUT    | `/api/appointments/cancel/:id`     | Cancel appointment        |
| GET    | `/api/appointments/all`            | All appointments (admin)  |
| PUT    | `/api/appointments/status`         | Update status (admin)     |
| PUT    | `/api/appointments/update-meeting` | Add meeting link (admin)  |

</details>

<details>
<summary><strong>Other Services</strong></summary>

| Method | Endpoint                      | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| POST   | `/api/forms/submit`           | Contact form submission      |
| GET    | `/api/admin/stats`            | Dashboard statistics (admin) |
| POST   | `/api/ai/search`              | AI property search           |
| GET    | `/api/locations/:city/trends` | Location market trends       |

</details>

---

## 🤖 AI Property Hub details

The AI Property Hub uses **GPT-4.1** (GitHub Models) and **Firecrawl** to provide:

- Smart natural-language property search
- AI-powered analysis with best value picks
- Location trends — appreciation rates and rental yields
- Investment tips and recommendations

> **Note:** The AI Hub is **disabled on the live Vercel deployment** to conserve API credits.
> Visiting `/ai-hub` on the live site shows instructions to clone and run locally.
> To enable it, set `VITE_ENABLE_AI_HUB=true` in `frontend/.env.local` and add `FIRECRAWL_API_KEY` and `GITHUB_MODELS_API_KEY` to `backend/.env.local`.

---

## 🌐 Deployment Details

<details>
<summary><strong>Frontend on Vercel</strong></summary>

1. Import repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add env variable: `VITE_API_BASE_URL` = your Render backend URL
4. Do **not** set `VITE_ENABLE_AI_HUB` (AI Hub stays disabled in production)
5. Deploy
</details>

<details>
<summary><strong>Backend & Admin on Render</strong></summary>

**Backend:**

1. Create a **Web Service** on [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. Build Command: `npm install` — Start Command: `npm start`
4. Add all env variables from `backend/.env.example`
5. Set `NODE_ENV=production` and `WEBSITE_URL` to your Vercel URL

**Admin Panel:**
Same as backend, with **Root Directory** set to `admin` and env variable `VITE_BACKEND_URL` pointing to your Render backend URL.

</details>

---

## 📂 Repository Layout

<details>
<summary><strong>View Directory Structure</strong></summary>

```text
Real-Estate-Website/
├── frontend/          → User-facing website (React + TypeScript + Vite)
├── admin/             → Admin dashboard (React + Vite)
├── backend/           → REST API server (Node.js + Express)
├── videos/            → Embedded demo animations
└── .github/           → Issue templates, PR template, CODEOWNERS
```

**Frontend Breakdown (frontend/)**

```text
frontend/src/
├── components/
│   ├── ai-hub/            → AI Property Hub UI
│   ├── common/            → Navbar, Footer, SEO, PageTransition
│   ├── home/              → Homepage sections
│   ├── properties/        → Filter sidebar, property cards
│   ├── property-details/  → Gallery, amenities, booking form
│   ├── about/             → About page sections
│   └── contact/           → Contact page sections
├── contexts/              → AuthContext
├── hooks/                 → useSEO
├── pages/                 → All pages (lazy loaded)
├── services/              → api.ts (Axios client)
└── styles/
```

**Backend Breakdown (backend/)**

```text
backend/
├── config/         → MongoDB, ImageKit, Nodemailer, AI config
├── controller/     → Route handlers
├── middleware/     → Auth (JWT), Multer, stats tracking
├── models/         → Mongoose schemas
├── routes/         → Express route definitions
├── services/       → AI and Firecrawl services
├── uploads/        → Temp uploads (auto-created, gitignored)
├── server.js       → Entry point
└── email.js        → Branded email templates
```

**Admin Breakdown (admin/)**

```text
admin/src/
├── components/     → Login, Navbar
├── config/         → Constants (property types, amenities)
├── contexts/       → AdminContext
└── pages/          → Dashboard, Add, List, Update, Appointments
```

</details>

---

## 📜 Available Scripts

| Directory   | Script          | Description                      |
| ----------- | --------------- | -------------------------------- |
| `backend/`  | `npm run dev`   | Start with nodemon (auto-reload) |
| `backend/`  | `npm start`     | Start production server          |
| `frontend/` | `npm run dev`   | Start Vite dev server            |
| `frontend/` | `npm run build` | Production build                 |
| `admin/`    | `npm run dev`   | Start Vite dev server            |
| `admin/`    | `npm run build` | Production build                 |

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

See also: [Code of Conduct](CODE_OF_CONDUCT.md) · [Security Policy](SECURITY.md)

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Aayush Vaghela**

- GitHub: [@AAYUSH412](https://github.com/AAYUSH412)
- Portfolio: [aayush-vaghela.vercel.app](https://aayush-vaghela.vercel.app/)
- Email: aayushvaghela412@gmail.com

---

<div align="center">

If you find this project helpful, please give it a star! ⭐

[![Star](https://img.shields.io/github/stars/AAYUSH412/Real-Estate-Website?style=for-the-badge&logo=github&color=FFD700)](https://github.com/AAYUSH412/Real-Estate-Website)

</div>
