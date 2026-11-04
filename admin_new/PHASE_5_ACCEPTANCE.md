# Phase 5 — desktop design and workflow review

Implementation: 4 November 2026. This checklist is for owner-run manual testing; no Playwright is installed or used. Use demonstration listings and test-owned bookings/accounts for actions that alter records or send notifications. Existing production aliases and the old admin remain unchanged.

## Open the new screens

Start the existing local backend normally, then run `npm run dev` in `admin_new/`. Open http://localhost:5175. Sign-in now opens `/dashboard`; old `/workspace` links redirect there.

- `/dashboard`: pending reviews, future pending/confirmed viewings, new inquiries and public listings; oldest pending submissions; latest submitted pending viewing requests; 30 UTC-day detail API request chart and accessible daily values.
- `/properties`: URL-backed filters, server paging/sort, column visibility, owner information and current-page selection.
- `/properties/new`, `/properties/:id`, `/properties/:id/edit`: create/detail/edit, gallery, owner eligibility check, contact/history, explicit photo retention and archival.
- `/reviews`, `/reviews/:id`: FIFO queue/search, direct-linked submission detail, owner check and versioned single/bulk decisions.

Bookings, users, inbox, subscribers, NVIDIA management and full activity-log navigation are Phase 6. Dashboard totals/previews for those modules are real reads, not completed management screens.

## Design checkpoint — P5-03

- [ ] Review dashboard, Properties and queue/detail in light and dark themes.
- [ ] Check the desktop sidebar/header, table density, photo size, action placement and readable long titles/locations/emails.
- [ ] Check ordinary laptop and larger desktop widths (desktop canvas minimum 1100px); sidebar expanded/collapsed. No mobile/tablet layout is required.
- [ ] Confirm the visual direction before applying it to Phase 6 modules.

## Property journey — P5-07

- [ ] Add a demo property with valid details and 1–4 photos. Verify the created detail and catalog entry.
- [ ] Change text only and save. Verify existing photos remain.
- [ ] Keep one existing photo, remove another and add a new upload. Save and verify the exact retained/new photos.
- [ ] Try zero/five photos, a file above 5 MB, invalid numbers/contact/Maps URL and a market state incompatible with the purpose. Check useful errors and preserved input. Server checks remain authoritative for image contents/decode limits.
- [ ] Change a field/photo, then follow a navigation link: cancel the leave prompt and verify input remains; repeat and confirm leaving. Check browser reload/close warning with unsaved changes.
- [ ] Submit a property as a test owner in the public app. Find it in the FIFO review queue; open a direct detail link and reload.
- [ ] Approve a valid pending record and verify public visibility; submit an owner correction, then rereview. Reject another pending record with a reason and verify that reason is visible.
- [ ] Verify an unavailable/suspended/banned/unverified test owner produces the real server denial rather than a fake approval.
- [ ] In two tabs, change a record after opening the edit form or decision dialog. The stale save/review must show 409; refresh/review the latest version before trying again. Unsaved form edits must not be silently replaced by background refetches.
- [ ] Select pending rows on one catalog/queue page; bulk approve/reject. Change page/filter and verify selection resets. Mixed pending/active selections cannot be bulk-reviewed. A failed bulk action must not imply partial success.
- [ ] Archive a demo listing with a test pending/confirmed booking. Verify the listing is no longer public, the booking is cancelled and its history retained. Archived detail remains viewable, with no edit/restore control. No cancellation count is invented before the command.
- [ ] Confirm refresh, not-found, empty, server-unavailable and retry states; check keyboard focus, menus, photo controls and confirmation dialogs.

## Evidence and limits

Automated client checks cover session handling, retained-image/version payloads, photo bounds, shared validation, malformed filters, single archive/bulk commands, conflict propagation, selection reset on page/filter changes and mixed-status bulk eligibility. Lint and production build include TypeScript. Record the actual current test outcome in ADMIN_NEW_PLAN.md.

No new backend handlers, database migration, deployment, automatic browser execution or live provider calls are part of this implementation. Existing backend domain acceptance is retained; new browser end-to-end acceptance remains pending until the owner reports it. Email API acceptance is not proof of inbox delivery.
