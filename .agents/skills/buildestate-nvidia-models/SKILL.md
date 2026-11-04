---
name: buildestate-nvidia-models
description: Extend BuildEstate NVIDIA-only model profiles, catalog lifecycle, exact-model tests, fallback, AI provenance or migration preparation. Use for this project’s AI model management; not unrelated GitHub hosting or general AI UI.
---

# BuildEstate NVIDIA inference and catalog management

Read `backend/docs/admin-phase2-nvidia.md` for command payloads and migration details, and the public SSE section of `backend/docs/admin-api-contracts.md` for delivery behavior. Inspect current implementation before using recorded limits or readiness evidence.

## Implementation map

- `backend/services/llm/modelProfiles.js`: parameter profiles, bounds, configuration fingerprint and disabled seeds.
- `backend/services/llm/NvidiaNimProvider.js`: fixed NVIDIA endpoint, request allowlist, exact-model call, bounded fallback and safe result metadata.
- `backend/models/aiModelModel.js`: model configuration/evidence and catalog transaction fence.
- `backend/controller/aiModelController.js`: protected CRUD/test/reorder, eligibility and safe DTOs.
- `backend/controller/propertyController.js`, `backend/services/aiService.js`: search/cache/provenance and application-result validation.
- `shared/contracts/`: current shared model command/DTO declarations.
- `admin/src/pages/AIModels.jsx`, `admin/src/services/aiModelsAPI.js`: existing functional model controls; check whether replacement controls have since been implemented.

## Provider and profile rules

NVIDIA NIM is the only inference provider, at the fixed server-side chat-completions endpoint. GitHub hosting/CLI/Actions remain legitimate; removing GitHub inference never means removing repository tooling. Firecrawl discovery still uses the caller's key. Never expose the private NVIDIA key or accept arbitrary upstream URLs, headers or payload fragments from admin/public requests.

A model ID being NVIDIA-hosted does not establish parameter compatibility. Inspect the relevant NVIDIA primary documentation before adding/changing a profile. Reuse text-basic for conservative ordinary text parameters when appropriate; a new advanced format requires an explicit validated profile/adapter change. Do not send generic reasoning flags, JSON mode, tools, vision inputs or streaming options to every model.

Current inference is upstream nonstreaming text with bounded sizes. A usable answer requires final content; reasoning_content is never a substitute. Reject truncated output and invalid application JSON. Saved limits cap effective limits; prompts cannot raise them. Fallback currently has at most three actual attempts within a shared 120-second deadline; recheck constants before editing.

## Model lifecycle

Create disabled → save configuration → exact-model application test → enable → choose default/order. A connection-only test does not grant eligibility. Application evidence must match the saved configuration fingerprint. Disable before changing serving parameters; such changes invalidate evidence and require retest. A failed latest application test can make a saved model ineligible.

Tests use a fixed synthetic input, one exact model, no fallback, finite time/token budgets and a protected rate-limited route. Store only bounded pass/fail/code/latency/configuration metadata, not raw prompts, answers, reasoning or keys. Keep ordinary automated checks mocked. Live calls consume quota and are not implied by a code review.

Use versioned catalog commands and their transaction fence. Changing/removing a default requires a tested eligible replacement/version or explicit all-AI-off. Reorder supplies the full catalog IDs and version map. Do not bypass these commands with direct document updates or restore an old unique boolean-default index that obstructs atomic replacement.

## Availability, cache and SSE

An empty/all-disabled/missing-key catalog is unavailable; never silently seed or hardcode a serving fallback. Read eligible configuration from MongoDB and include the catalog fingerprint plus relevant selected model/limit in cache keys so edits invalidate results across instances.

Display requested versus actual model, fallback, generatedAt, effective limits and partial/unavailable coverage honestly. Preserve original provenance on cached answers. Failed analyses are not successful cache entries; model estimates are not certified live market data.

Successful fresh, cached and coalesced public streams all end with a complete `result`, then `done`. A late subscriber cannot rely on earlier progress events. Guard closed responses and clean subscriptions on response close, not incoming request-body close. Do not claim reconnect/replay, backpressure or durable job guarantees that are not implemented.

## Migrations and evidence

Read current plan/release status before assuming a migration was applied. The migration script is read-only by default; rehearsal runs on a model-only snapshot in isolated MongoDB. Apply/seed/restore are separate data-changing release actions, not part of editing model UI. Use the documented private backup, source comparison and idempotency rules when such actions are authorized; preserve unrelated user/property/booking/audit data.

Historical November 2026 checks found Bolt application compatibility, with bounded Mistral/MiniMax timeouts. This is neither current availability proof nor permission to enable a model: test the exact saved configuration when activation is requested. Verify changed profiles/lifecycle/cache behavior with the isolated backend suite and relevant client checks; report mocked and live evidence separately.
