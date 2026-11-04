---
name: buildestate-phase-delivery
description: Continue a tracked BuildEstate ADMIN_NEW_PLAN.md phase, record acceptance evidence, or prepare a branch/PR handoff. Use for phase implementation and delivery records; not as authorization to merge, migrate or deploy.
---

# BuildEstate phase delivery and future-session handoff

## Recover the active work

Read `git status --short`, the current branch, and `ADMIN_NEW_PLAN.md` current-position/task sections. Read only the requested phase and its dependencies before widening scope. Distinguish this plan's admin Phase 4 from PROJECT_AUDIT.md's original operations Phase 4, which the owner deferred. The project is a demonstration: implement the approved important features rather than expanding every optional idea into required work.

The plan governs approved work; actual code and current tests establish implementation state. Historical test totals, PR numbers, live model results and migration inventories are dated evidence, not perpetual facts. Retain unresolved limitations and update stale handoff text when the implementation changes.

## Keep work reviewable

Inspect existing modifications before editing. Preserve unrelated untracked skill packages, proposal files, private snapshots and local planning files. Stage only intended paths; never add the entire pre-existing `.agents/` tree when only a few project skills changed. Keep `.env*`, keys, database snapshots and production personal data out of commits; a safe `.env.example` is the exception already supported by gitignore.

Use a focused branch/PR when continuing the owner's backup workflow. Inspect existing upstream/PR bases rather than assuming main contains predecessor phases. A stacked phase PR should target its actual predecessor and explain the dependency. Do not merge or retarget blindly: inspect the resulting diff and repeat affected checks after predecessor changes.

A skill does not grant permission to push, merge, deploy, send messages or modify database/provider settings. Follow the current session's authorization; reuse authorization already given instead of asking repeatedly. If publishing a PR is authorized, make the local result and checks concrete first. GitHub pushes may trigger connected Vercel previews; distinguish them from a production cutover.

## Validate proportionally

| Changed area | Appropriate checks |
| --- | --- |
| `admin` code | Relevant session/component tests, lint and TypeScript/production build from that folder |
| Backend domain/session/config | Isolated backend suite; affected compatibility checks if shared contracts changed |
| Shared contracts | Relevant backend tests plus affected existing/new client tests/builds |
| Skills/docs only | Skill frontmatter/links/metadata validation and diff review; no need to start app servers or rerun domain tests |

Read current package scripts before running commands. The owner prefers manual browser testing: do not install/use Playwright unless later instructions change that preference. Provide a concise checklist tied to the implemented screen and let the owner report results. Mark screenshots as visual/workflow evidence for what they actually show; do not extrapolate screenshots to keyboard/reload/outage acceptance. The owner-approved admin scope is desktop-only; mobile/tablet acceptance is not required.

Do not stop project servers for routine checks. Tests should own their listeners and ephemeral databases. No production deployment, model migration apply, seed, Azure configuration change or alias switch follows automatically from a passing local gate. If those actions are requested, read the current release notes and applicable deployment skill rather than deriving commands from an old handoff.

## Update the record

Tick only tasks whose work and required checks are complete. Separate implemented code from pending manual acceptance; a phase may have an implemented shell and an open browser-verification task. Record:

- Concrete behavior and affected modules.
- Commands actually run and current outcomes, including failures/limits.
- Owner-reported checks with their evidence/date.
- Branch/commit/PR when available, and local/preview/production scope.
- Remaining blockers or manual checks and the next task.

Update the current position/master table and relevant phase completion notes together. Keep PROJECT_AUDIT.md's historical findings intact while linking the active plan. Maintain one authoritative explanation of a recurring issue and link it, rather than copying full diagnostics into several documents.

End with a useful handoff: what changed, how it was checked, what is still pending, and any concrete manual steps. Never describe a production migration or successful delivery as completed solely because code exists or a provider accepted a request.
