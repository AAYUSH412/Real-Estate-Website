# Repository guidance

Read [AGENTS.md](AGENTS.md) for project boundaries and repository skills. Current owner instructions take precedence.

- `frontend/`: public React/TypeScript website, port 5173.
- `admin/`: canonical React 19/TypeScript desktop admin, port 5175. The legacy JavaScript app is retired.
- `backend/`: Express/Mongoose API, port 4000.
- `shared/contracts/`: shared validation and types.

Install and run commands inside each application directory. Use Node 22.12+. See [README.md](README.md), [admin setup](admin/README.md) and [deployment](docs/DEPLOYMENT.md).

Admin access tokens stay in memory with httpOnly refresh cookies. Preserve versioned writes, transactions, audit records, snapshot history and suppression-only subscriber management. NVIDIA is the sole inference provider; the browser supplies Firecrawl discovery keys. Do not reintroduce GitHub inference or store admin bearer tokens in localStorage.

Browser testing is manual and admin is desktop-only. Do not stop existing development servers, invoke live providers, mutate production data or deploy as a side effect of tests. Isolated backend tests own their temporary servers/databases.
