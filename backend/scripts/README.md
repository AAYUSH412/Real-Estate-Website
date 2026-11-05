# Backend scripts

Run these from the `backend/` folder. They use your `.env.local` settings, so **check which database `MONGO_URI` points to first.**

## For everyday use

| Script | What it does |
| --- | --- |
| `local-db.js` | Runs the local MongoDB used by `npm run dev` |
| `seed-demo.js` | Adds sample data to an empty database. Use `npm run seed` from the root. |
| `createAdmin.js` | Creates the admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, for a hosted database. Skips an admin that already exists. |
| `seedAIModels.js` | Adds disabled AI model entries to an empty catalog |

## AI model maintenance

See the [NVIDIA model guide](../docs/admin-phase2-nvidia.md) before using these. Some use NVIDIA quota.

| Script | What it does |
| --- | --- |
| `nvidia-model-migration.js` | Inventories and migrates the model catalog. Only changes data with `--apply`. |
| `rehearseNvidiaMigration.js` | Tries that migration on a temporary database |
| `testNvidiaProfiles.js` | Tests model profiles against NVIDIA |
| `migrateAIModels.js` | Retired. It exits and points to the migration above. |

## Historical migrations

Kept for reference and used by the tests. These changed the live database once, so you should not need them on a new database.

| Script | What it did |
| --- | --- |
| `phase2-migration.js`, `phase3-migration.js` | Updated existing records to new data rules |
| `phase2-demo-repair.js` | Repaired demo data |
