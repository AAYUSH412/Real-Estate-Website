import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { MODEL_SEEDS, BASIC_CONFIG, MODEL_PROFILES, profileFor, fingerprint, validateModelConfig } from '../services/llm/modelProfiles.js';

const EJSON = mongoose.mongo.BSON.EJSON;
export const snapshotHash = rows => fingerprint(EJSON.serialize([...rows].sort((a, b) => String(a._id).localeCompare(String(b._id)))));
export function buildNvidiaPlan(rows) {
  const retire = [], normalize = [], insert = [], blockers = [];
  for (const row of [...rows].sort((a, b) => (a.order || 0) - (b.order || 0) || String(a._id).localeCompare(String(b._id)))) {
    if (row.provider === 'github') { retire.push(row); continue; }
    if (row.provider && row.provider !== 'nvidia') { blockers.push(`Unsupported provider for ${row.slug}`); continue; }
    try {
      const profile = profileFor(row.modelId);
      const config = Object.fromEntries(Object.keys(BASIC_CONFIG).map(key => [key, row.config?.[key] ?? BASIC_CONFIG[key]]));
      config.maxTokens = Math.min(Math.max(config.maxTokens, 256), MODEL_PROFILES[profile].maxTokens);
      config.timeoutMs = Math.min(Math.max(config.timeoutMs, 1000), 120000);
      const serving = validateModelConfig({ modelId: row.modelId, profile, config });
      normalize.push({ _id: row._id, slug: row.slug, changes: { ...serving, order: normalize.length, provider: 'nvidia', isActive: false, isDefault: false } });
    } catch { blockers.push(`Invalid NVIDIA model/configuration: ${row.slug}`); }
  }
  for (const seed of MODEL_SEEDS) {
    const sameSlug = normalize.find(row => row.slug === seed.slug);
    if (sameSlug && sameSlug.changes.modelId !== seed.modelId) blockers.push(`Seed slug collision: ${seed.slug}`);
    else if (!sameSlug && !normalize.some(row => row.changes.modelId === seed.modelId)) insert.push({ ...seed, order: normalize.length + insert.length });
  }
  return { snapshot: snapshotHash(rows), retire, normalize, insert, blockers };
}
export function migrationReport(plan) {
  return { snapshot: plan.snapshot, retire: plan.retire.map(row => ({ id: String(row._id), slug: row.slug, modelId: row.modelId })), normalize: plan.normalize.map(row => ({ id: String(row._id), slug: row.slug, ...row.changes })), insert: plan.insert, blockers: plan.blockers, activation: 'All models remain disabled. Test the exact saved configuration and enable through admin after migration.' };
}
export async function applyNvidiaPlan(connection, plan, backupPath) {
  if (plan.blockers.length) throw new Error('Migration has blockers; no changes applied');
  if (!backupPath) throw new Error('A private backup path is required');
  const collection = connection.db.collection('aimodels');
  if (await connection.db.collection('aicatalogstates').findOne({ _id: 'catalog', nvidiaOnlyMigration: 1 })) {
    const pending = (await collection.indexes()).find(index => index.name === 'one_default_ai_model');
    if (pending) await collection.dropIndex(pending.name);
    return { alreadyApplied: true, activation: 'Existing model lifecycle and test evidence left unchanged' };
  }
  const rows = await collection.find().toArray();
  if (snapshotHash(rows) !== plan.snapshot) throw new Error('Model catalog changed; rerun inventory');
  const indexes = rows.length ? await collection.indexes() : [];
  await mkdir(path.dirname(backupPath), { recursive: true, mode: 0o700 });
  await writeFile(backupPath, EJSON.stringify({ collection: 'aimodels', snapshot: plan.snapshot, rows, indexes }, null, 2), { mode: 0o600, flag: 'wx' });
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      await connection.db.collection('aicatalogstates').findOneAndUpdate({ _id: 'catalog' }, { $inc: { revision: 1 } }, { upsert: true, session });
      const current = await collection.find({}, { session }).toArray();
      if (snapshotHash(current) !== plan.snapshot) throw new Error('Model catalog changed after backup; rerun inventory');
      for (const row of plan.retire) {
        await connection.db.collection('ai_model_retirements').updateOne({ _id: row._id }, { $setOnInsert: { original: row, retiredAt: new Date(), reason: 'NVIDIA-only serving catalog' } }, { upsert: true, session });
        await collection.deleteOne({ _id: row._id }, { session });
      }
      for (const row of plan.normalize) await collection.updateOne({ _id: row._id }, { $set: { ...row.changes, updatedAt: new Date() }, $unset: { lastTest: '', lastConnectionTest: '' }, $inc: { __v: 1 } }, { session });
      if (plan.insert.length) await collection.insertMany(plan.insert.map(row => ({ ...row, createdAt: new Date(), updatedAt: new Date(), __v: 0 })), { session });
      await connection.db.collection('aicatalogstates').updateOne({ _id: 'catalog' }, { $set: { nvidiaOnlyMigration: 1 } }, { session });
    });
    // Default changes now serialize through the catalog transaction fence. Unique
    // boolean key reuse prevents atomic default replacement on older catalogs.
    for (const index of indexes) if (index.name === 'one_default_ai_model') await collection.dropIndex(index.name);
  } finally { await session.endSession(); }
  return migrationReport(plan);
}
async function main() {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: '.env.local', quiet: true }); dotenv.config({ quiet: true });
  const apply = process.argv.includes('--apply');
  const backup = process.argv.find(value => value.startsWith('--backup='))?.slice(9);
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false });
  try {
    const rows = await mongoose.connection.db.collection('aimodels').find().toArray();
    const snapshotPath = process.argv.find(value => value.startsWith('--snapshot='))?.slice(11);
    if (snapshotPath) await writeFile(snapshotPath, EJSON.stringify({ rows, indexes: rows.length ? await mongoose.connection.db.collection('aimodels').indexes() : [] }, null, 2), { mode: 0o600, flag: 'wx' });
    const completed = await mongoose.connection.db.collection('aicatalogstates').findOne({ _id: 'catalog', nvidiaOnlyMigration: 1 });
    if (completed) {
      if (apply) await applyNvidiaPlan(mongoose.connection, buildNvidiaPlan(rows), backup);
      console.log(JSON.stringify({ applied: apply, alreadyApplied: true, modelCount: rows.length })); return;
    }
    const plan = buildNvidiaPlan(rows);
    if (apply) await applyNvidiaPlan(mongoose.connection, plan, backup);
    console.log(JSON.stringify({ applied: apply, ...migrationReport(plan) }, null, 2));
  } finally { await mongoose.disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error('NVIDIA catalog operation failed. Check connection, blockers and private backup path; no credentials are logged.'); process.exitCode = 1; });
