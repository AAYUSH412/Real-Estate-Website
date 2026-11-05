# BuildEstate project guidance

Use this file to find project context and skills. Current user instructions take precedence; these files do not authorize external actions.

## Start here

- Read [README.md](README.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Records in [docs/history/](docs/history/README.md) describe past work and are not current instructions.
- Inspect the working tree and current branch before editing. Preserve unrelated local work. Read actual source and current scripts before treating dated notes as current state.
- `admin/` is the desktop admin, `frontend/` is the public app, `backend/` is Express/Mongoose, `shared/contracts/` holds shared validators and types, and `scripts/` holds the root commands.

## Project skills

Read only skills relevant to the requested work. They live in the repository so other contributors and future sessions can use the same guidance.

| Skill | Use it for |
| --- | --- |
| [buildestate-admin-ui](.agents/skills/buildestate-admin-ui/SKILL.md) | Extending the design system, shell, screens, forms, tables and authenticated UI patterns in `admin`. |
| [buildestate-backend-contracts](.agents/skills/buildestate-backend-contracts/SKILL.md) | API compatibility, domain rules, versioned commands, sessions, media, transactions and local email configuration. |
| [buildestate-nvidia-models](.agents/skills/buildestate-nvidia-models/SKILL.md) | NVIDIA-only profiles, catalog testing and activation, fallback, cache provenance, SSE and model migration. |

## Working preferences and boundaries

- The admin is desktop-only by owner decision. Do not add phone or tablet layouts unless the scope changes.
- Browser testing is manual. Do not add or run Playwright unless that preference changes. Provide a short checklist and distinguish owner-reported evidence from automated checks.
- Do not stop running project servers for routine development or tests. Tests own their temporary servers and databases. Do not import `backend/server.js` as an isolated test fixture.
- Keep secrets, private snapshots and production personal data out of outputs and commits. Stage specific intended paths.
- Do not invoke live providers, mutate production data or deploy as a side effect of tests. Merging API changes to `main` deploys the API.
- Keep `npm run setup`, `seed`, `dev` and `smoke` working, because CI runs the quick start on Windows, macOS and Linux.

## Useful references

- [Setup guide](docs/SETUP.md) and [troubleshooting](docs/TROUBLESHOOTING.md)
- [API reference](docs/API.md) and [admin API contracts](backend/docs/admin-api-contracts.md)
- [NVIDIA lifecycle and migration notes](backend/docs/admin-phase2-nvidia.md)
- [Local email load order](backend/docs/local-email-configuration.md)
- [Deployment](docs/DEPLOYMENT.md)

For documentation-only changes, run `npm run check:docs`. Application tests need not be rerun unless behavior changes.
