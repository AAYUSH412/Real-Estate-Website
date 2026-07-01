# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**BuildEstate** is a full-stack real estate platform (monorepo) with three apps:
- `frontend/` — User-facing website (React 18 + TypeScript + Vite, port 5173)
- `admin/` — Admin dashboard (React + JavaScript + Vite, port 5174)
- `backend/` — REST API (Node.js + Express, port 4000)
- `shared/` — Shared utilities

## Development Commands

Each app is independent — run from its own directory:

```bash
# Backend
cd backend && npm run dev        # nodemon auto-reload on http://localhost:4000

# Frontend
cd frontend && npm run dev       # Vite dev server on http://localhost:5173
cd frontend && npm run build     # TypeScript compile + Vite production build

# Admin
cd admin && npm run dev          # Vite dev server on http://localhost:5174
cd admin && npm run build        # Production build
cd admin && npm run lint         # ESLint (only admin has lint script)
```

There is no root-level `npm install` — install dependencies inside each app directory.

## Environment Setup

Each app reads from `.env.local` (development) then `.env` (fallback). Copy from `.env.example`:

- `backend/.env.local` — requires `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`; optional `IMAGEKIT_*`, `SMTP_*`, `BREVO_API_KEY`
- `frontend/.env.local` — `VITE_API_BASE_URL=http://localhost:4000`
- `admin/.env.local` — `VITE_BACKEND_URL=http://localhost:4000`

AI features (`/api/ai/search`, `/api/locations/:city/trends`) require **user-supplied** API keys sent as `X-Github-Key` and `X-Firecrawl-Key` headers — the backend never uses server-side keys as fallback for these endpoints.

## Architecture

### Request Flow (AI Property Hub — headline feature)

```
Browser (localStorage: buildestate_github_key, buildestate_firecrawl_key)
  → POST /api/ai/search with X-Github-Key + X-Firecrawl-Key headers
  → backend/services/firecrawlService.js builds 3 parallel Firecrawl search queries
    (site:99acres.com, site:magicbricks.com, site:housing.com)
  → per-URL parallel scraping via firecrawl.scrapeUrl()
  → backend/services/aiService.js sends clean properties to GPT-4.1 (GitHub Models)
  → MongoDB cache (searchCacheModel.js) stores results keyed by search params
  → response with ranked properties + source badges
```

### Auth Flow

- JWT stored in `localStorage` as `buildestate_token`
- Frontend attaches token via Axios request interceptor (`frontend/src/services/api.ts`)
- Auto-logout on 401 response
- Admin login via `POST /api/users/admin` (separate from user login)
- Email verification required after registration (5-layer fake email protection)

### Backend Structure

```
backend/
├── server.js              — Entry: Helmet, CORS, rate limiter, route mounting
├── routes/                — Express routers (productRoutes, userRoutes, appointmentRoutes, adminRoutes, propertyRoutes, aiRoutes)
├── controller/            — Route handler logic
├── models/                — Mongoose schemas (Property, User, Appointment, Stats, SearchCache, AdminActivityLog)
├── services/
│   ├── firecrawlService.js — Multi-source scraping with exponential backoff retry
│   └── aiService.js        — GPT-4.1 property ranking + location trends
├── middleware/            — authMiddleware, multer, rateLimitMiddleware, statsMiddleware, requestIdMiddleware
├── config/                — mongodb.js, imagekit.js, nodemailer.js
└── utils/                 — logger.js (Winston), expireListings.js, autoUnsuspend.js, AI response validator
```

### Frontend Component Organization

```
frontend/src/
├── components/
│   ├── ai-hub/          — AIHeroSection, AISearchResults, AISearchForm
│   ├── common/          — Navbar, Footer, SEO, PageTransition
│   ├── properties/      — Filter sidebar, property cards
│   └── property-details/— Gallery, amenities, booking form
├── contexts/            — AuthContext (JWT state)
├── pages/               — All pages, lazy-loaded via React.lazy()
└── services/api.ts      — Single Axios client; all API calls go through here
```

### Key Architectural Decisions

- **User-owned API keys**: Firecrawl + GitHub Models keys live in `localStorage` only, forwarded as request headers. The backend creates per-request service instances from these headers.
- **Search caching**: MongoDB `SearchCache` model deduplicates identical AI searches (saves ~25s and API credits). Cache key is built from all search params.
- **Image storage**: ImageKit CDN. Images uploaded via `multer` to backend then pushed to ImageKit.
- **Frontend is TypeScript, admin is JavaScript** — don't add TypeScript to the admin app.
- **Structured logging**: Winston logger with request correlation IDs (`X-Request-ID` header). Log format is JSON in production.
- **Health checks**: `GET /health` (liveness) and `GET /health/ready` (readiness with DB connectivity check).

## Deployment

- **Frontend + Admin** → Vercel (root directory set to `frontend` or `admin`)
- **Backend** → Render (root directory `backend`, start: `npm start`)
- Production backend CORS is controlled by `WEBSITE_URL`, `FRONTEND_URL`, `ADMIN_URL` env vars
- `backend/render.yaml` defines the Render service configuration
