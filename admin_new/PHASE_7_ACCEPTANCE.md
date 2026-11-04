# Phase 7 — full-panel acceptance

Started 4 November 2026. Status: accepted for release preparation by the owner; automated gate passed.

## Fresh automated evidence

| Check | Result |
| --- | --- |
| Replacement-admin Vitest | 32 tests across 7 files passed |
| ESLint | Passed |
| TypeScript and Vite production build | Passed |
| Isolated backend suite | 89 passed; no skipped/cancelled tests |
| Bundle inspection | Route chunks are separate; Recharts lives in the lazy dashboard chart chunk |

The first sandboxed backend attempt failed to open its temporary localhost listener (EPERM). The permitted rerun passed using the suite-owned ephemeral replica set and mocked providers. No configured application database was changed or live email/inference invoked.

Build sizes: entry 450.61 kB / 144.62 kB gzip; chart 368.61 kB / 107.70 kB gzip. The HTML loads the entry and CSS; source routing dynamically imports screens and the dashboard dynamically imports the chart. These sizes are evidence, not a browser performance score.

Source review confirms visible-focus styles, Radix confirmation primitives, reduced-motion CSS, disabled chart animation, shared status labels/icons, and explicit request/empty states. The owner subsequently reported checking the entire admin and authorized continuation. Individual browser/version/viewport results were not supplied; this remains owner-reported acceptance, not agent-observed browser evidence. Hosted-origin cookies remain a Phase 8 gate.

## Owner-run desktop gate

Use synthetic/test-owned records. Keep the existing servers running. Browser automation is not used. Proposed widths: 1280 and 1440 CSS pixels, plus the supported minimum 1100; test both sidebar states and themes.

- [ ] Session: sign in, refresh a protected deep link, open a second tab, log out and verify private content disappears from both tabs. Test retry after a temporary API outage. Repeat actual cookie acceptance at the intended hosted origin during Phase 8.
- [ ] Navigation/layout: open dashboard, properties/detail/edit/create, review queue, users/detail, appointments/detail, inbox/detail, subscribers, models and activity. Check long names/emails/locations, large prices and missing historical references.
- [ ] Keyboard/theme: Tab/Shift+Tab through filters, menus, photo controls and dialogs; confirm focus is visible, dialog focus stays contained and returns to its trigger, and Escape works where appropriate. Check status text/icons and pale fills in both themes; enable reduced motion.
- [ ] Properties/review: complete remaining photo-retention, owner submission, approval/rejection, owner eligibility and bulk-selection cases in PHASE_5_ACCEPTANCE.md. An empty queue alone does not verify decisions.
- [ ] Management: complete account moderation, appointment transitions, inquiry draft protection, subscriber suppression and filtered CSV cases in PHASE_6_ACCEPTANCE.md using test-owned data.
- [ ] Failure handling: simulate offline then reconnect; fail a save and preserve input; edit the same test record in two tabs and verify the stale save returns a conflict without overwriting the newer version. Confirm disabled actions explain their prerequisites.
- [ ] NVIDIA: verify the current catalog is readable and unavailable AI is honest. Live connection/application tests consume quota and are separate explicit actions; keep unverified configurations disabled. Previous migration success is not model compatibility proof.

Record browser/version, viewport, route, result and any issue for each group. Earlier owner-reported checks remain valid historical evidence; this checklist does not relabel them as agent-observed full-panel tests.

## Open limitations and release boundary

The owner accepted the entire admin for continuation on 4 November 2026. The unchecked detailed cases above remain a regression guide and do not claim individually observed results. All existing appointments were previously completed by an authorized maintenance override, so transition testing requires suitable test bookings rather than reopening terminal records. Model activation and provider quality are not established by mock tests.

Release preparation now includes admin_new/vercel.json with the existing admin’s SPA fallback and security headers. Phase 8 must verify hosted deep links, Vercel access to shared/contracts, Node 22.12+, API origin/CORS/cookie acceptance, compatible deployed backend code and an old-deployment rollback reference. The existing Vercel project/domain can be reused after acceptance; no production settings, aliases or deployments were changed here. Retain admin/ during cutover.
