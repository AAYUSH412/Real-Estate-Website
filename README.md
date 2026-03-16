<img src="https://capsule-render.vercel.app/api?type=waving&color=0:F97316,100:FB923C&height=220&section=header&text=BuildEstate&fontSize=80&fontColor=ffffff&fontAlignY=35&animation=fadeIn&desc=AI-Powered+Real+Estate+Platform&descAlignY=58&descSize=24" width="100%"/>

<div align="center">

  <img src="./frontend/Assets/Logo.svg" alt="BuildEstate Logo" height="80" />

<br/><br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=28&duration=3000&pause=1000&color=F97316&center=true&vCenter=true&width=700&lines=Find+Your+Dream+Home+%F0%9F%8F%A1;AI+Scrapes+99acres+in+Real-Time+%F0%9F%A4%96;Smart+Investment+Insights+%F0%9F%93%8A;30%2B+Indian+Cities+Covered+%F0%9F%87%AE%F0%9F%87%B3;Book+Appointments+Instantly+%F0%9F%93%85)](https://git.io/typing-svg)

<br/>

<p><strong>A full-stack real estate platform that scrapes live property data from 99acres.com using Firecrawl, analyzes it with GPT-4.1, and serves filtered results — all with user-owned API keys.</strong></p>

<br/>

[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![GPT-4.1](https://img.shields.io/badge/GPT--4.1-412991?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/marketplace/models)
[![Firecrawl](https://img.shields.io/badge/Firecrawl-FF6600?style=for-the-badge&logo=fire&logoColor=white)](https://firecrawl.dev)

<br/>

[![Live Demo](https://img.shields.io/badge/%F0%9F%9A%80_Live_Demo-buildestate.vercel.app-4285F4?style=for-the-badge)](https://buildestate.vercel.app)
[![Backend API](https://img.shields.io/badge/%E2%9A%99%EF%B8%8F_Backend_API-Render-46E3B7?style=for-the-badge)](https://real-estate-website-backend-zfu7.onrender.com)

<br/>

[![Stars](https://img.shields.io/github/stars/AAYUSH412/Real-Estate-Website?style=social)](https://github.com/AAYUSH412/Real-Estate-Website)
[![Forks](https://img.shields.io/github/forks/AAYUSH412/Real-Estate-Website?style=social)](https://github.com/AAYUSH412/Real-Estate-Website/fork)
[![License](https://img.shields.io/github/license/AAYUSH412/Real-Estate-Website?color=green)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/AAYUSH412/Real-Estate-Website?color=orange)](https://github.com/AAYUSH412/Real-Estate-Website/commits)
[![Issues](https://img.shields.io/github/issues/AAYUSH412/Real-Estate-Website)](https://github.com/AAYUSH412/Real-Estate-Website/issues)

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 📸 Platform Preview

<div align="center">
  <img src="./Image/Home.png" alt="BuildEstate Homepage" width="100%" />
</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 📋 Table of Contents

<div align="center">

|     | Section                                          |
| :-: | :----------------------------------------------- |
| 🧠  | [Why BuildEstate?](#-why-buildestate)            |
| 🤖  | [AI Property Hub](#-ai-property-hub)             |
| 🌟  | [Features](#-features)                           |
| 🏗️  | [Architecture](#%EF%B8%8F-architecture)          |
| 💻  | [Tech Stack](#-tech-stack)                       |
| 🚀  | [Getting Started](#-getting-started)             |
| 🔌  | [API Endpoints](#-api-endpoints)                 |
| 🌐  | [Deployment](#-deployment)                       |
| 📂  | [Project Structure](#-project-structure)         |
| 🤝  | [Contributing](#-contributing)                   |
| 👨‍💻 | [Author](#-author)                               |

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🧠 Why BuildEstate?

Most real-estate aggregators show you generic listings. BuildEstate is different:

| Problem | BuildEstate Solution |
|---|---|
| Generic search results with mixed content | **Multi-source search** — 99acres, MagicBricks, Housing.com results deduplicated & ranked |
| No AI intelligence in traditional portals | **GPT-4.1 analysis** — best-value picks, investment insights, red flag detection |
| API costs borne by the developer | **User-owned API keys** — users bring their own free GitHub Models + Firecrawl keys |
| Search-page bot protection ruins results | **Individual listing scraping** — firecrawl.search() → per-property URLs → clean data |
| Search breaks on proxy/rate errors | **Auto-retry with exponential backoff** — proxy → rate-limit → server errors all handled |

> **TL;DR** — This is not another property listing site. It's an AI-first platform that turns raw web data into actionable real estate insights.

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🤖 AI Property Hub

> **The headline feature.** Search any Indian city + property type + budget → get live scraped properties with AI analysis.

<div align="center">
  <img src="./Image/aihub-1.png" alt="AI Hub - Natural Language Search" width="48%"/>
  &nbsp;&nbsp;
  <img src="./Image/aihub-2.png" alt="AI Hub - Market Analysis" width="48%"/>
</div>

<br/>

<div align="center">
  <img src="./Image/aihub-3.png" alt="AI Hub - Location Trends" width="48%"/>
  &nbsp;&nbsp;
  <img src="./Image/aihub-4.png" alt="AI Hub - Investment Tips" width="48%"/>
</div>

<br/>

### How It Works

The new search pipeline uses **Google-indexed URLs** as the filter, scraping individual property pages in parallel:

```mermaid
sequenceDiagram
    participant User as User<br/>(Browser)
    participant Backend as Express<br/>Backend
    participant Firecrawl as Firecrawl API
    participant Sources as 99acres<br/>MagicBricks<br/>Housing.com
    participant AI as GitHub Models<br/>(GPT-4.1)
    
    User->>Backend: POST /api/ai/search<br/>(city, locality, bhk, budget, possession)
    Backend->>Backend: Build 3 search queries
    
    par Multi-Source Search
        Backend->>Firecrawl: Search: "2BHK flat for sale in Powai<br/>Mumbai under ₹2Cr site:99acres.com"
        Backend->>Firecrawl: Search: "...site:magicbricks.com"
        Backend->>Firecrawl: Search: "...site:housing.com"
    end
    
    Firecrawl->>Sources: Google API returns listing URLs
    Sources->>Firecrawl: Returns 8-10 URLs per source
    
    par Parallel Scraping
        Firecrawl->>Sources: Full browser render of each URL
        Firecrawl->>Sources: LLM extracts structured JSON
    end
    
    Backend->>Backend: Deduplicate by address + building name<br/>Code-side filter: reject rentals/PG
    
    Backend->>AI: Send clean properties for ranking
    AI->>Backend: Return ranked with insights
    
    Backend->>User: { properties, analysis, source_badges }
```

### Search Query Construction

The backend builds rich search queries that leverage Google's index as the filter:

```
User fills form:
  City: Mumbai
  Locality: Powai
  BHK: 2BHK
  Budget: ₹1.5 - ₹2.5 Cr
  Possession: Ready
                         ↓
Search query:
  "2BHK flat for sale in Powai Mumbai ready
   under 2.5 crore site:99acres.com"
                         ↓
firecrawl.search() → returns 10 individual property listing URLs
                         ↓
Scrape each URL in parallel (each = exactly ONE property)
                         ↓
Code-side filter: reject anything with "/month" or "rental"
```

**Why this works:**
- Individual listing pages have **light bot protection** (not heavily scraped)
- Google's index is the **filtering engine** — query says "ready" so only ready properties return
- One page = one property = **zero mixed-content problem**
- URL of the page you scraped **IS the property listing URL** — always correct

### Supported Coverage

| Category | Coverage |
|---|---|
| 🏙️ Cities | 30+ — Mumbai, Delhi, Bangalore, Pune, Chennai, Hyderabad, Ahmedabad, Kolkata, Jaipur, Lucknow, and more |
| 🏠 Property Types | Flat, House, Villa, Plot, Penthouse, Studio, Commercial |
| 💰 Budget Range | ₹5 Lakhs → ₹25+ Crores (user-defined min/max) |
| 📍 Multi-Source | **99acres.com**, **MagicBricks.com**, **Housing.com** searched in parallel |
| 🏷️ Deduplication | Same property across portals = shown once with source badges |
| 🔄 Retry Logic | Auto-retry on proxy failures, rate limits (429), and server errors (502/503) |
| 🔧 Advanced Filters | Locality, BHK (1/2/3/4/Any), Possession status (Ready/Under Const/Any) |

### Advanced Search Form Fields

The redesigned form captures buyer intent more precisely:

| Field | Type | Values | Impact |
|-------|------|--------|--------|
| **City** | Dropdown | 30+ Indian cities | Primary market |
| **Locality** ✨ | Text autocomplete | "Powai", "Andheri West", etc. | **Highest relevance gain** |
| **Property Type** | Pill buttons | Flat / House / Villa / Plot | Property category |
| **BHK Config** ✨ | Pill selector | 1BHK / 2BHK / 3BHK / 4BHK+ / Any | Unit size |
| **Budget** | Dual slider | ₹X Lakhs → ₹Y Crores | Price range |
| **Possession** ✨ | Radio group | Ready / Under Const / Any | Timeline preference |

> **Locality** is the biggest improvement — Indians buy in **neighborhoods**, not cities. "Powai" → 10x better results than just "Mumbai".

### 🔑 User-Owned API Keys

Users provide their **own free keys** in the browser. Keys are stored in localStorage only — never on the server.

```
User's browser (localStorage)
  buildestate_github_key   = "ghp_xxx"
  buildestate_firecrawl_key = "fc-xxx"
         │
         │  X-Github-Key / X-Firecrawl-Key headers
         ▼
  Backend creates per-request service instances
  (Server env keys are NEVER used as fallback)
```

**Get your free keys in ~2 minutes:**

| Service | Link | Free Tier |
|---|---|---|
| GitHub Models (GPT-4.1) | [github.com/marketplace/models](https://github.com/marketplace/models) | Free with any GitHub account |
| Firecrawl (web scraping) | [firecrawl.dev](https://firecrawl.dev) | 500 free credits/month |

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🌟 Features

### ✨ AI Property Hub (Redesigned)

> **Search across 3+ property portals in parallel, get deduplicated results ranked by AI insights.**

<div align="center">

| Feature | Description |
| :-----: | :--- |
| 🔍 | **Multi-source search** — 99acres, MagicBricks, Housing.com simultaneously |
| 🏷️ | **Source badges** — know which portal each listing comes from |
| 📍 | **Locality-first searching** — "Powai" not just "Mumbai" |
| 🎯 | **Advanced filters** — BHK, possession status, min/max budget |
| 🤖 | **Per-property AI insights** — specific not generic ("8% below area avg, metro in 800m") |
| ⚠️ | **Red flags detection** — no RERA, delayed builder, overpriced alerts |
| 🎨 | **Two-column layout** — results + AI analysis side-by-side |
| 💾 | **Compare tool** — select up to 3 properties, compare specs |

</div>

<br/>

### 🏡 Property Browsing & Booking

> Rich filters, detailed galleries (up to 4 images per property via ImageKit CDN), and instant appointment scheduling.

<div align="center">
  <img src="./Image/property.png" alt="Property Browsing Page" width="100%" />
</div>

<br/>

<div align="center">

| Feature | Description |
| :-----: | :--- |
| 🔎 | Advanced filter sidebar — price, type, location, area, amenities |
| 🖼️ | Multi-image gallery delivered via ImageKit CDN |
| 📅 | Appointment booking — works for both guest and authenticated users |
| 🔐 | JWT authentication with bcrypt hashing + email-based password reset |
| 🎨 | Fluid page transitions powered by Framer Motion |
| 🔍 | SEO-optimized — structured data, sitemap, robots.txt, per-page meta tags |

</div>

<br/>

### 📊 Admin Dashboard

> Full control — manage listings, track appointments, monitor analytics, and upload images with drag-and-drop.

<div align="center">

| Capability | Description |
| :--------: | :--- |
| ➕ | Add / Edit / Delete property listings with multi-image upload |
| 📅 | Appointment management with status updates & meeting link generation |
| 📈 | Real-time analytics dashboard with Chart.js visualizations |
| 👥 | User management and platform activity monitoring |

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🏗️ Architecture

**Multi-source AI Property Search Pipeline:**

```mermaid
graph TD
    A["React Frontend<br/>(TypeScript + Vite)"] -->|POST /api/ai/search| B["Express Backend<br/>(Node.js + Helmet + CORS)"]
    
    B -->|Build 3 parallel queries| C["Firecrawl API"]
    
    C -->|Query 1:<br/>site:99acres.com| D1["99acres"]  
    C -->|Query 2:<br/>site:magicbricks.com| D2["MagicBricks"]
    C -->|Query 3:<br/>site:housing.com| D3["Housing.com"]
    
    D1 -->|8-10 URLs| E["Parallel<br/>Scraping"]
    D2 -->|8-10 URLs| E
    D3 -->|8-10 URLs| E
    
    E -->|Full browser render<br/>per property| F["Firecrawl<br/>scrapeUrl"] 
    F -->|Structured JSON| G["Backend<br/>Processing"]
    
    G -->|Deduplicate<br/>by address| H["Code-side Filter<br/>Reject rentals/PG"]
    H -->|Clean properties| I["GitHub Models<br/>GPT-4.1"]
    
    I -->|Ranked + Insights| J["Response<br/>to Frontend"]
    
    J -->|Display with<br/>source badges| K["Rich Property<br/>Cards"]
    
    B --> L[("MongoDB<br/>Atlas")]
    C --> M["User API Keys<br/>(localStorage)"]
    F --> N["ImageKit CDN<br/>(Images)"]
    
    style B fill:#4A90E2
    style E fill:#FF6B6B
    style I fill:#7C3AED
    style K fill:#10B981
```

**Complete System Architecture:**

```mermaid
flowchart LR
    subgraph Client["CLIENT LAYER"]
        FE["Frontend<br/>React 18 + TS<br/>Vercel"]
        AD["Admin Panel<br/>React + JS<br/>Render"]
    end
    
    subgraph API["API LAYER (Render)"]
        BE["Express.js<br/>Helmet + CORS<br/>Rate Limiter"]
    end
    
    subgraph Data["DATA & SERVICES"]
        DB[("MongoDB Atlas<br/>Database")]
        IK["ImageKit CDN<br/>Images"]
        FC["Firecrawl API<br/>Web Scraping<br/>Multi-source"]
        AI["GitHub Models<br/>GPT-4.1<br/>AI Ranking"]
        EMAIL["Brevo SMTP<br/>Email Service"]
    end
    
    FE -->|Axios| BE
    AD -->|Axios| BE
    BE -->|JWT Auth| DB
    BE -->|Upload| IK
    BE -->|Scrape| FC
    BE -->|Rank Props| AI
    BE -->|Send Mail| EMAIL
    
    style Client fill:#E8F4F8
    style API fill:#F0E8FF
    style Data fill:#FFF4E8
```

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 💻 Tech Stack

<div align="center">

### Frontend
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-0EA5E9?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)
[![React Router](https://img.shields.io/badge/React_Router_v7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com)

### Backend
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Nodemailer](https://img.shields.io/badge/Nodemailer-0F9DCE?style=for-the-badge&logo=gmail&logoColor=white)](https://nodemailer.com)

### AI & Infrastructure
[![GPT-4.1](https://img.shields.io/badge/GPT--4.1-412991?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/marketplace/models)
[![Firecrawl](https://img.shields.io/badge/Firecrawl-FF6600?style=for-the-badge&logo=fire&logoColor=white)](https://firecrawl.dev)
[![ImageKit](https://img.shields.io/badge/ImageKit_CDN-FF6F00?style=for-the-badge&logoColor=white)](https://imagekit.io)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com)

</div>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm 8+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free account
- [ImageKit](https://imagekit.io/) free account
- [Brevo](https://www.brevo.com/) free SMTP account

### 1. Clone the Repository

```bash
git clone https://github.com/AAYUSH412/Real-Estate-Website.git
cd Real-Estate-Website
```

<details>
<summary><strong>⚙️ 2. Backend Setup</strong></summary>

<br/>

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
```

```bash
npm run dev   # http://localhost:4000
```

</details>

<details>
<summary><strong>🖥️ 3. Frontend Setup</strong></summary>

<br/>

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
npm run dev   # http://localhost:5173
```

</details>

<details>
<summary><strong>🛠️ 4. Admin Panel Setup</strong></summary>

<br/>

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
npm run dev   # http://localhost:5174
```

</details>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🔌 API Endpoints

<details>
<summary><strong>🔐 Authentication & Users</strong></summary>

<br/>

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/users/register | Register new user |
| POST | /api/users/login | Login (returns JWT) |
| POST | /api/users/admin | Admin login |
| GET | /api/users/me | Get current user (JWT required) |
| POST | /api/users/forgot | Send password reset email |
| POST | /api/users/reset/:token | Reset password |

</details>

<details>
<summary><strong>🏠 Properties</strong></summary>

<br/>

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/products/list | List all properties |
| GET | /api/products/single/:id | Get property by ID |
| POST | /api/products/add | Add property with images (admin) |
| POST | /api/products/update | Update property (admin) |
| POST | /api/products/remove | Delete property (admin) |

</details>

<details>
<summary><strong>📅 Appointments</strong></summary>

<br/>

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/appointments/schedule | Book viewing (guest) |
| POST | /api/appointments/schedule/auth | Book viewing (logged in) |
| GET | /api/appointments/user | Get appointments by email |
| PUT | /api/appointments/cancel/:id | Cancel appointment |
| GET | /api/appointments/all | All appointments (admin) |
| PUT | /api/appointments/status | Update status (admin) |
| PUT | /api/appointments/update-meeting | Add meeting link (admin) |

</details>

<details>
<summary><strong>🤖 AI & Other Services</strong></summary>

<br/>

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/ai/search | AI property search (requires user API keys) |
| GET | /api/locations/:city/trends | Location market trends (requires user API keys) |
| POST | /api/forms/submit | Contact form submission |
| GET | /api/admin/stats | Dashboard statistics (admin) |

</details>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🌐 Deployment

<details>
<summary><strong>▲ Frontend on Vercel</strong></summary>

<br/>

1. Import repo in [Vercel](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Add env vars:
   - `VITE_API_BASE_URL` = your Render backend URL
   - `VITE_ENABLE_AI_HUB=true`
4. Deploy

</details>

<details>
<summary><strong>🟢 Backend & Admin on Render</strong></summary>

<br/>

**Backend Web Service:**
1. Create a **Web Service** on [Render](https://render.com)
2. Set **Root Directory** → `backend`
3. Build: `npm install` | Start: `npm start`
4. Add all env vars from `backend/.env.example`
5. Set `NODE_ENV=production` and `WEBSITE_URL` to your Vercel frontend URL

**Admin Panel:**
Same steps with **Root Directory** → `admin` and `VITE_BACKEND_URL` = your Render backend URL.

</details>

<details>
<summary><strong>✅ Deployment Checklist</strong></summary>

<br/>

- [ ] MongoDB Atlas cluster created and connection string added
- [ ] ImageKit account created (for property images)
- [ ] Brevo SMTP credentials added (for email notifications)
- [ ] JWT_SECRET set to a random 32-byte hex string
- [ ] ADMIN_EMAIL and ADMIN_PASSWORD set
- [ ] WEBSITE_URL points to your Vercel frontend
- [ ] VITE_ENABLE_AI_HUB=true set in frontend env vars
- [ ] VITE_API_BASE_URL points to your Render backend

</details>

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 📂 Project Structure

<details>
<summary><strong>View Full Directory Tree</strong></summary>

<br/>

```text
Real-Estate-Website/
├── frontend/          → User-facing website (React + TypeScript + Vite)
├── admin/             → Admin dashboard (React + Vite)
├── backend/           → REST API server (Node.js + Express)
├── Image/             → README screenshots
└── .github/           → Issue templates, PR template, CODEOWNERS
```

**Frontend src/**

```text
├── components/
│   ├── ai-hub/            → AI Property Hub (search form, results, trends)
│   ├── common/            → Navbar, Footer, SEO, PageTransition
│   ├── home/              → Homepage sections
│   ├── properties/        → Filter sidebar, property cards
│   ├── property-details/  → Gallery, amenities, booking form
│   ├── about/             → About page sections
│   └── contact/           → Contact page sections
├── contexts/              → AuthContext (JWT state management)
├── hooks/                 → useSEO
├── pages/                 → All pages (lazy loaded via React.lazy)
└── services/              → api.ts (Axios client + API key injection)
```

**Backend**

```text
├── config/         → MongoDB, ImageKit, Nodemailer config
├── controller/     → Route handlers (property, appointment, AI search)
├── middleware/      → JWT auth, Multer uploads, stats tracking, request transform
├── models/         → Mongoose schemas (Property, User, Appointment, Stats)
├── routes/         → Express route definitions
├── services/
│   ├── firecrawlService.js  → Smart 99acres scraping (30+ cities, URL construction, retry logic)
│   └── aiService.js         → GPT-4.1 property analysis + location trends
├── utils/          → AI response validation & safe parsing
└── server.js       → Entry point (Helmet, CORS, rate limiting)
```

**Admin src/**

```text
├── components/     → Login, Navbar, ProtectedRoute
├── config/         → Property types, amenities constants
├── contexts/       → AuthContext (admin JWT state)
└── pages/          → Dashboard, Add, List, Update, Appointments
```

</details>

<br/>

### 📜 Available Scripts

| Directory | Command | Description |
|---|---|---|
| backend/ | npm run dev | Start with nodemon (auto-reload) |
| backend/ | npm start | Start production server |
| frontend/ | npm run dev | Start Vite dev server |
| frontend/ | npm run build | Production build |
| admin/ | npm run dev | Start Vite dev server |
| admin/ | npm run build | Production build |

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) first.

```bash
# 1. Fork the repository
# 2. Create your branch
git checkout -b feature/your-feature

# 3. Commit your changes
git commit -m "feat: add your feature"

# 4. Push and open a PR
git push origin feature/your-feature
```

See also: [Code of Conduct](CODE_OF_CONDUCT.md) · [Security Policy](SECURITY.md)

<br/>

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

<br/>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

## 👨‍💻 Author

<div align="center">

  <img src="https://avatars.githubusercontent.com/AAYUSH412" width="100" style="border-radius:50%"/>

### Aayush Vaghela

[![GitHub](https://img.shields.io/badge/@AAYUSH412-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AAYUSH412)
[![Portfolio](https://img.shields.io/badge/Portfolio-FF5722?style=for-the-badge&logo=firefox&logoColor=white)](https://aayush-vaghela.vercel.app/)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:aayushvaghela412@gmail.com)

<br/>

If this project helped you, please give it a ⭐

[![Star](https://img.shields.io/github/stars/AAYUSH412/Real-Estate-Website?style=for-the-badge&logo=github&color=FFD700)](https://github.com/AAYUSH412/Real-Estate-Website)

</div>

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:F97316,100:FB923C&height=120&section=footer" width="100%"/>