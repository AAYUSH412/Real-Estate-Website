<div align="center">

# BuildEstate — Admin Panel 📊

_Comprehensive administrative dashboard for overseeing the BuildEstate real estate ecosystem._

[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![Live Demo](https://img.shields.io/badge/Live_Dashboard-Visit_Panel-EA4335?style=for-the-badge&logo=render)](https://real-estate-website-admin.onrender.com/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Aayush_Vaghela-000000?style=for-the-badge)](https://aayush-vaghela.vercel.app/)

</div>

---

## ✨ Key Features

- **Dashboard Analytics** — Real-time performance chart tracking utilizing `Chart.js` for properties, systemic users, and overall lifecycle interactions.
- **Property Management** — Complete administrative catalog adjustments including add, update, and deletion protocols integrated securely.
- **Appointment Management** — High-level lifecycle overview for pending engagements; deploy approvals, cancellations, or digitally bridge meeting structures.
- **User Overview** — Transparent readout of authenticated entities traversing the platform.
- **Multiplex Image Upload** — High-speed transmission of up to 4 high-res representations per standard property passing to ImageKit globally.

---

## 💻 Tech Stack

| Domain                         | Technology Implementation |
| ------------------------------ | ------------------------- |
| **Framework Ecosystem**        | React 18 + Vite 6         |
| **User Interface Composition** | Tailwind CSS v3           |
| **Statistical Visualization**  | Chart.js                  |
| **Vector Elements**            | Lucide React              |
| **Notification Operations**    | Sonner                    |
| **Network Requests**           | Axios                     |

---

## 🚀 Quick Start Setup

<details>
<summary><strong>1. Environment Initialization</strong></summary>

```bash
cd admin
npm install
cp .env.example .env.local
```

</details>

<details>
<summary><strong>2. Defining Network Mapping</strong></summary>

Update `admin/.env.local` to point explicitly toward your operational backend URI:

```env
VITE_BACKEND_URL=http://localhost:4000
```

</details>

<details>
<summary><strong>3. Execute Local UI Interface</strong></summary>

```bash
npm run dev
```

Admin workspace is provisioned at **http://localhost:5174**

</details>

---

## 🗺️ Interface Architecture

| Panel View          | Routing Interface | Core Purpose                                                   |
| ------------------- | ----------------- | -------------------------------------------------------------- |
| Auth Gate           | `/`               | Highly structured administrative login protocol                |
| Command Center      | `/dashboard`      | Systemic overviews powered dynamically by interaction counters |
| Enlist Catalog      | `/add`            | Injection module initializing distinct properties/assets       |
| Management Hub      | `/list`           | Aggregation matrix handling mass adjustments and evaluations   |
| Modulator           | `/update/:id`     | Precision granular manipulation of singular assets             |
| Engagement Calendar | `/appointments`   | Lifecycle oversight for external viewing and communication     |

---

## 📂 Component Layout

<details>
<summary><strong>Explore the Working Tree</strong></summary>

```text
admin/src/
├── components/  # Layout elements handling the login modal and central navigation matrices
├── config/      # Operational constants aligning structural expectations across the backend bridge
├── contexts/    # Secure state preservation validating Admin identities
├── pages/
│   ├── Dashboard.jsx
│   ├── Add.jsx
│   ├── List.jsx
│   ├── Update.jsx
│   └── Appointments.jsx
└── App.jsx      # Architectural index orchestrating the DOM routing layer
```

</details>

---

## 🌐 System Deployment

**Render Static Deployments:**

1. Stage finalized logic to the master repository line.
2. Initialize **Static Site Service** on Render mapping root architecture.
3. Validate **Root Directory** specifically inside `admin`.
4. Trigger build via: `npm install && npm run build`.
5. Define distribution as `dist` routing payload.
6. Verify deployment by linking `VITE_BACKEND_URL` strictly to operational Express servers.

Currently resolving at: **https://real-estate-website-admin.onrender.com**

---

<div align="center">

**Associated Applications**

[Frontend README](../frontend/README.md) • [Backend README](../backend/README.md) • [Root Interface](../README.md)

_Maintained by [Aayush Vaghela](https://aayush-vaghela.vercel.app/)_

</div>
