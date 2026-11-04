# New admin — Phase 2 NVIDIA-only AI

Implementation date: 3 November 2026. This phase changes local application code and prepares migration; it does not apply changes to the configured project database or deploy production.

## What changed

NVIDIA NIM at `https://integrate.api.nvidia.com/v1/chat/completions` is the only inference service. The GitHub Models adapter, OpenAI SDK dependency, runtime routing, inference environment requirement and provider selector are removed. GitHub source hosting, CLI, Actions and deployments remain. Firecrawl discovery still uses the caller's Firecrawl key; the NVIDIA key remains server-only.

There are no hardcoded serving models or public-request seeds. Explicit setup adds disabled model configurations. A model must pass a saved-configuration application test before it can be enabled or selected as default. A missing key, empty catalog or all-disabled catalog produces honest unavailability. The public search form disables search when the model list is unavailable or empty.

## Supported profiles

| Profile | NVIDIA model ID | Allowlisted extras |
| --- | --- | --- |
| `nemotron-bolt` | `nvidia/nemotron-3.5-bolt-e4b` | `enableThinking`, `seed` |
| `mistral-large-4` | `mistralai/mistral-large-4-1t-a52b` | `reasoningEffort: high`, frequency/presence penalties |
| `minimax-flash` | `minimaxai/minimax-m3.1-flash` | `seed` |
| `text-basic` | Other exact `developer/model` IDs hosted by NVIDIA | Basic text parameters only; compatibility must be tested |

All profiles accept max output tokens, timeout, temperature and top-p. Application limits are intentionally conservative: 256–32768 tokens for basic/Bolt, up to 65536 for the other profiles, 1–120 seconds, temperature 0–2, top-p 0.01–1. These are application bounds, not promises about vendor limits. Parameter profiles are validated against known model IDs; a known model cannot be disguised as another profile. Advanced fields absent from the selected profile are rejected, including arbitrary payloads, URLs, credentials, tool flags and reasoning budgets.

Upstream requests are nonstreaming, with bounded request/response sizes. Browser SSE progress remains available. No image input, tool execution or upstream streaming interface was added. No `response_format` or generic thinking/reasoning field is automatically attached to every model. Final content is required; internal `reasoning_content` is never used as an answer. Truncated output fails instead of being reported as a complete answer.

Sources checked on implementation day: [NVIDIA Bolt example](https://build.nvidia.com/nvidia/nemotron-3.5-bolt-e4b), [Mistral example](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b), [MiniMax model card](https://build.nvidia.com/minimaxai/minimax-m3.1-flash/modelcard). The first release implements a subset of supported capabilities. A new request format still requires an adapter/profile change.

## Admin workflow

1. Add a name, unique slug, exact NVIDIA model ID and profile. Save disabled.
2. Optionally run **Test connection**. This alone does not enable the model.
3. Run **Test application JSON**. It sends a small fixed demo property and validates the returned structure and source fields without repairing a bad answer. It tests only that saved model, never a fallback.
4. Enable after a successful application test. The first enabled model becomes default. Choose **Make default** on another enabled, tested model to replace it atomically.
5. Use **Move up/down** to save the full fallback order with versions. The selected/default model runs first; other enabled models follow catalog order. New records append to the order.
6. Disable before changing serving parameters. Such edits invalidate application evidence and require a new test. Metadata changes do not invalidate the serving fingerprint.
7. Disabling/removing a default requires an enabled, tested replacement and its displayed version, or the explicit **Turn off all AI search models** option. Removal retains audit history.

Each test is limited to one request, 30 seconds and 1024 application-output tokens or 256 connection-output tokens, further capped by saved configuration. The endpoint limits each admin to six tests/minute using the existing filesystem rate limiter; its cross-instance behavior depends on shared storage. Results store pass/fail, timestamp, latency, safe error code, configuration fingerprint and effective limits; raw prompts, responses, reasoning and keys are not stored. Failed test attempts are not authorization grants. A failed latest application test removes that configuration from the eligible serving list until it passes again; this can make AI unavailable. Retest or explicitly select another eligible default.

Testing a small demo JSON shape establishes basic compatibility, not full property-ranking quality or future availability. Search uses saved token/timeout settings, with at most three actual model attempts and a shared 120-second request budget. Remaining budget can reduce a fallback timeout; it cannot increase saved limits. Open circuits are skipped. Explicit selection still tries that model first.

## API contracts

| Method | Route | Required body / behavior |
| --- | --- | --- |
| GET | `/api/admin/ai-models` | Models with `version`, `configuration`, profile, config and test evidence; profile catalog; unsupported legacy records flag migration need |
| POST | `/api/admin/ai-models` | Name, slug, modelId, profile/config; provider fixed NVIDIA; initially disabled |
| PUT | `/api/admin/ai-models/:id` | `expectedVersion` and allowed edits/lifecycle command |
| DELETE | `/api/admin/ai-models/:id` | JSON `expectedVersion`; default needs `replacementId` + `replacementVersion` or `turnOffAI: true` |
| POST | `/api/admin/ai-models/:id/test` | `expectedVersion`, optional `mode: application` or `connection` |
| POST | `/api/admin/ai-models/reorder` | Full unique `modelIds` array plus complete `expectedVersions` map |
| GET | `/api/ai/models` | Safe enabled/eligible model choices, availability and configuration fingerprint; no private configuration/key |

All writes and test-evidence saves use a catalog transaction fence. Stale changes return 409; invalid/unsupported options return 400. The unique slug index remains. The old unique boolean-default index is retired by migration because reusing that unique value inside a transaction can obstruct atomic replacement. Default consistency is enforced by serialized catalog commands; do not bypass these commands with manual database writes.

These AI mutations now require the displayed version. The updated current admin supplies it, including delete request bodies. Existing public search aliases and SSE result shapes remain; provenance fields are additive. Deploy the compatible backend before dependent clients. An older admin's unversioned AI writes are rejected safely, so refresh/update the admin during rollout.

## Cache and provenance

Active eligible models are read from MongoDB per request; there is no five-minute instance-local catalog cache. Search/trends keys include the full eligible catalog configuration and selected model, and trend keys include the effective locality limit. A model/default/order/enable/delete/configuration change makes prior result keys unreachable across API instances. Historical cache rows expire normally; migration does not purge source/user data.

Results add `generatedAt` and `analysisMeta`: requested model, actual NVIDIA model/slug/version/fingerprint, fallback flag, effective token/timeout limits, configuration, coverage and source caveat. Cached results preserve the original generation provenance. Fallback successes cannot masquerade as the requested model. Failed analyses are not persistently cached. The public property-results page displays unavailable/partial/cached/fallback information.

Property preparation no longer silently stops at eight when the API returns a larger set (maximum 20). Missing analyzed items are counted as partial coverage rather than assigned invented scores. Trend coverage is also labeled. Benchmark prompts call cached model estimates unverified/stale context, not live verified prices. This work does not certify scraped claims, RERA registration, investment forecasts or ranking quality.

## Read-only inventory and migration

The configured database inventory found **one NVIDIA model, zero GitHub records and zero blockers**. Its exact configuration remains in a private model-only snapshot outside Git. The plan preserves its ID, name and slug, normalizes its serving parameters/profile, adds the three requested candidates disabled, and disables all models until the saved configurations are tested. Unsupported legacy options are removed from active configuration but retained in the private backup. Existing records keep relative fallback order; additions append.

Commands run from `backend/` using Node.js 22:

```sh
# Read only; prints model configuration plan without applying it.
node scripts/nvidia-model-migration.js

# Optional private original snapshot for a rehearsal; use a new path each time.
node scripts/nvidia-model-migration.js --snapshot=/private/tmp/models-original.ejson

# Rehearse on ephemeral MongoDB; this command never uses MONGO_URI.
node scripts/rehearseNvidiaMigration.js --snapshot=/private/tmp/models-original.ejson

# Release step only: apply after review, with an exclusive private backup file.
node scripts/nvidia-model-migration.js --apply --backup=/private/tmp/models-before-nvidia.ejson

# Empty database setup only; refuses to overwrite/repopulate a nonempty catalog.
node scripts/seedAIModels.js
```

Do not apply migration and empty-catalog seeding together. The retired `migrateAIModels.js` exits with instructions and cannot reinsert GitHub models. Public requests cannot invoke either setup operation.

Apply makes an exclusive mode-0600 Extended JSON backup of original model documents and indexes, checks the source snapshot again in a transaction, retires GitHub records to `ai_model_retirements`, normalizes NVIDIA models, inserts missing candidates and records the migration marker. User/property/booking/audit collections are untouched. A changed source catalog or blocker aborts the operation; do not treat it as permission to discard intervening edits. Re-running after the marker preserves later activation/configuration/test evidence and finishes retiring the old default index if an earlier process stopped after commit.

Coordinate an AI-catalog edit pause during release. Migration deliberately leaves AI unavailable until testing/enabling is complete; it does not require stopping the project server or other modules. Keep the private backup with the release rollback record. If rollback is necessary, pause model writes, compare changes since migration, restore only model configuration and relevant indexes from the backup with the previous backend release, and preserve retirement/audit history. Do not restore user/property/appointment collections or overwrite post-release catalog edits blindly. The additive catalog-state collection can remain while the old runtime is restored.

## Verification and live checks

Local regression evidence: **100 tests passed (80 backend, 11 admin, 9 frontend)**, admin lint, both client builds (including frontend TypeScript), diff and backend syntax checks. The existing frontend static/dynamic API-import warning remains non-blocking. Detailed tracking is recorded in `ADMIN_NEW_PLAN.md`. The actual model-only snapshot was rehearsed against an ephemeral MongoDB replica set: one retained/normalized entry plus three inserted candidates; four disabled NVIDIA entries afterwards; unrelated collection sentinels unchanged; repeat application preserved the resulting catalog. Separate synthetic regression coverage verifies GitHub record retirement, private backup permissions and audit preservation. No migration has been applied to the configured project database.

Live checks used only the fixed demo prompt through the server key, with no project/user data and no MongoDB writes:

| Requested model | Connection test | Application JSON test |
| --- | --- | --- |
| Nemotron Bolt | Passed, 1052 ms | Passed, 3677 ms |
| Mistral Large 4 | Passed, 1029 ms | Timed out at 30 seconds |
| MiniMax M3.1 Flash | Timed out at 30 seconds | Timed out at 30 seconds |

These are observations from one bounded check, not benchmark guarantees. Mistral/MiniMax timeout results are unresolved account/output-readiness limits; neither should be enabled without a later successful test. The live checks did not grant activation evidence to database records: run the admin test on the exact saved post-migration configuration. Advanced parameter combinations were covered with mocked payload tests, not exhaustively exercised against the hosted service.

No production deployment, migration apply or full browser acceptance is claimed. Phase 3 is the backend acceptance gate before `admin` construction.
