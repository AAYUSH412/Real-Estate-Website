<div align="center">

# BuildEstate — Frontend 🌐

_User-facing React application for the BuildEstate platform._

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![Live Demo](https://img.shields.io/badge/Live_Demo-buildestate.vercel.app-2ea44f?style=for-the-badge&logo=vercel)](https://buildestate.vercel.app)
[![Portfolio](https://img.shields.io/badge/Portfolio-Aayush_Vaghela-000000?style=for-the-badge)](https://aayush-vaghela.vercel.app/)

</div>

---

## ✨ Features

- **Property Browsing** — Filter by type, price, availability, and amenities with interactive grid/list views.
- **Property Details** — Comprehensive image gallery, amenities list, and integrated appointment booking via ImageKit.
- **User Authentication** — Secure sign up, log in, and password recovery.
- **Appointment Booking** — Seamlessly schedule property viewings as a guest or authenticated user.
- **AI Property Hub** — In-browser GPT-4.1 powered search and holistic market analysis (requires local enablement).
- **SEO Optimized** — Built-in structured data generation, sitemap mapping, `robots.txt`, and per-page meta tags.
- **Page Transitions** — Fluid UI animations powered by Framer Motion.

---

## 💻 Tech Stack

| Category             | Technology                       |
| -------------------- | -------------------------------- |
| **Framework**        | React 18.3 + TypeScript + Vite 6 |
| **Styling**          | Tailwind CSS v4 + PostCSS        |
| **State Management** | React Context API                |
| **Routing**          | React Router v7                  |
| **HTTP Client**      | Axios                            |
| **Animations**       | Framer Motion                    |
| **Icons**            | Lucide React                     |

---

## 🚀 Quick Start

<details>
<summary><strong>1. Installation & Setup</strong></summary>

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit the `.env.local` file to include your connection parameters.

</details>

<details>
<summary><strong>2. Configure Environment Variables</strong></summary>

Create or edit `frontend/.env.local`:

```env
# Required — points to your backend API
VITE_API_BASE_URL=http://localhost:4000

# Optional — set to "true" to enable AI Property Hub locally
VITE_ENABLE_AI_HUB=true
```

> **Note:** Do not set `VITE_ENABLE_AI_HUB` on Vercel. Leaving it unset disables the aggressive AI Hub fetching on the live site (saving API credits) and presents a localized "run locally" modal instead.

</details>

<details>
<summary><strong>3. Run the Development Server</strong></summary>

```bash
npm run dev
```

Frontend runs at **http://localhost:5173**

</details>

---

## 🗺️ Page Routing

| Page            | Route              | Description                                              |
| --------------- | ------------------ | -------------------------------------------------------- |
| Home            | `/`                | Hero section, featured properties, about snippets        |
| Properties      | `/properties`      | Browse catalog with robust interactive filters           |
| Property Detail | `/properties/:id`  | Full multimedia details and booking capabilities         |
| AI Property Hub | `/ai-hub`          | Natural language GPT-4.1 search (local environment only) |
| About           | `/about`           | Team overview and company information                    |
| Contact         | `/contact`         | User contact form submission                             |
| Sign In         | `/signin`          | Authenticate user                                        |
| Sign Up         | `/signup`          | Register new user                                        |
| Forgot Password | `/forgot-password` | Password reset request pipeline                          |

---

## 📂 Project Structure

<details>
<summary><strong>Explore Directory Tree</strong></summary>

```text
frontend/src/
├── components/
│   ├── ai-hub/           → AI Property Hub functional components
│   ├── common/           → Universal elements (Navbar, Footer, SEO, PageTransition)
│   ├── home/             → Modular Homepage sections
│   ├── properties/       → Filter sidebar, property cards, catalog layouts
│   ├── property-details/ → Multimedia gallery, amenities parser, booking form
│   ├── about/            → About page subsections
│   └── contact/          → Contact interface
├── contexts/             → Global React Context (e.g., AuthContext)
├── hooks/                → Custom React utilities (e.g., useSEO)
├── pages/                → Complete route components (Lazy-loaded)
├── services/             → Centralized network interface (`api.ts` Axios wrapper)
└── styles/               → Global CSS and Tailwind configurations
```

</details>

---

## 📜 Available Scripts

| Script            | Action                                                     |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Launch Vite development server with hot module replacement |
| `npm run build`   | Compile robust production-ready bundle                     |
| `npm run preview` | Serve and preview the compiled production build locally    |
| `npm run lint`    | Execute ESLint for code formatting and standard reviews    |

---

## 🌐 Deployment Pipeline

**Vercel Production Deployments:**

1. Push your latest branch to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Inject environment variable: `VITE_API_BASE_URL` mapped to your Render backend URL.
5. **Critically:** Do not set `VITE_ENABLE_AI_HUB` in Vercel to preserve limits.
6. Trigger Deploy.

Currently live at: **https://buildestate.vercel.app**

---

<div align="center">

**Associated Applications**

[Backend README](../backend/README.md) • [Admin Panel README](../admin/README.md) • [Root Interface](../README.md)

_Built by [Aayush Vaghela](https://aayush-vaghela.vercel.app/)_

</div>
