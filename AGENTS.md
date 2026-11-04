# BuildEstate project guidance

Use this file to find project context and skills. Current user instructions take precedence; these files do not authorize external actions or expand the requested phase.

## Start here

- Read the current position and requested task in [ADMIN_NEW_PLAN.md](ADMIN_NEW_PLAN.md). It is the active replacement-admin plan. [PROJECT_AUDIT.md](PROJECT_AUDIT.md) retains historical findings; its original operations Phase 4 is deferred and is distinct from the new-admin foundation phase.
- Inspect the working tree and current branch before editing. Preserve unrelated local work. Read actual source and current scripts before treating dated completion notes as current state.
- `admin_new/` is the replacement admin; `admin/` is the existing admin; `frontend/` is the public app; `backend/` is Express/Mongoose; `shared/contracts/` holds shared validators and types. Keep existing clients compatible while the replacement is developed.

## Project skills

Read only skills relevant to the requested work. They live in the repository so other contributors and future sessions can use the same guidance. They may also be invoked by name when available in the agent's skill catalog.

| Skill | Use it for |
| --- | --- |
| [buildestate-admin-ui](.agents/skills/buildestate-admin-ui/SKILL.md) | Extending the approved design system, shell, screens, forms, tables and authenticated UI patterns in `admin_new`. |
| [buildestate-backend-contracts](.agents/skills/buildestate-backend-contracts/SKILL.md) | API compatibility, domain rules, versioned commands, sessions, media, transactions and local email configuration. |
| [buildestate-nvidia-models](.agents/skills/buildestate-nvidia-models/SKILL.md) | NVIDIA-only profiles, catalog testing/activation, fallback, cache provenance, SSE and model migration preparation. |
| [buildestate-phase-delivery](.agents/skills/buildestate-phase-delivery/SKILL.md) | Continuing tracked phases, recording evidence and preparing reviewable branch/PR handoffs. |

## Working preferences and boundaries

- Browser testing is manual at the owner's request. Do not add or run Playwright unless that preference changes. Provide a short checklist and distinguish owner-reported evidence from automated checks.
- Keep the original admin available until an accepted cutover. Expose navigation only for implemented destinations; use real backend data and honest unavailable/error states.
- Do not stop running project servers for routine development or tests. Tests should own their temporary servers/databases. Do not import backend/server.js as an isolated test fixture.
- Keep secrets, private snapshots and production personal data out of outputs/commits. Stage specific intended paths; `.agents/` already contains unrelated local skill packages.
- Local acceptance does not imply a production deployment, model migration, alias switch or permission to send real email. Follow the authorization in the current session.

## Useful references

- [Admin setup and manual checklist](admin_new/README.md)
- [Accepted admin API contract index](backend/docs/admin-api-contracts.md)
- [NVIDIA lifecycle and migration notes](backend/docs/admin-phase2-nvidia.md)
- [Local email load-order diagnosis](backend/docs/local-email-configuration.md)

For skill/documentation-only changes, validate metadata, references and the diff; application tests need not be rerun unless application behavior changes.
