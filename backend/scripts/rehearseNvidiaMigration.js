// Rehearse a private model-only snapshot in ephemeral MongoDB. No live DB access.
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { buildNvidiaPlan, applyNvidiaPlan, snapshotHash } from './nvidia-model-migration.js';

const snapshot = process.argv.find(value => value.startsWith('--snapshot='))?.slice(11);
if (!snapshot) throw new Error('Pass a private --snapshot=path file');
process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(tmpdir(), 'buildestate-mongo-binaries');
const source = mongoose.mongo.BSON.EJSON.parse(await readFile(snapshot, 'utf8'));
let mongo;
try {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false });
  const db = mongoose.connection.db, models = db.collection('aimodels');
  if (source.rows.length) await models.insertMany(source.rows);
  for (const index of source.indexes || []) if (index.name !== '_id_') {
    const { key, name, unique, partialFilterExpression } = index;
    await models.createIndex(key, { name, ...(unique && { unique }), ...(partialFilterExpression && { partialFilterExpression }) });
  }
  const sentinels = ['users', 'properties', 'appointments', 'adminactivitylogs'];
  for (const name of sentinels) await db.collection(name).insertOne({ marker: 'rehearsal-preservation-sentinel' });
  const before = {};
  for (const name of sentinels) before[name] = snapshotHash(await db.collection(name).find().toArray());
  const plan = buildNvidiaPlan(await models.find().toArray());
  const dir = await mkdtemp(path.join(tmpdir(), 'nvidia-rehearsal-'));
  await applyNvidiaPlan(mongoose.connection, plan, path.join(dir, 'model-backup.ejson'));
  for (const name of sentinels) if (before[name] !== snapshotHash(await db.collection(name).find().toArray())) throw new Error(`Unexpected change to ${name}`);
  const first = snapshotHash(await models.find().toArray());
  const repeat = await applyNvidiaPlan(mongoose.connection, buildNvidiaPlan(await models.find().toArray()), path.join(dir, 'unused-repeat.ejson'));
  if (!repeat.alreadyApplied || snapshotHash(await models.find().toArray()) !== first) throw new Error('Migration is not idempotent');
  console.log(JSON.stringify({ passed: true, sourceModelCount: source.rows.length, normalized: plan.normalize.length, retired: plan.retire.length, inserted: plan.insert.length, finalModelCount: await models.countDocuments(), enabledCount: await models.countDocuments({ isActive: true }), unrelatedCollectionsUnchanged: true, repeatPreservedCatalog: true, backupDirectory: dir }, null, 2));
} finally { await mongoose.disconnect(); await mongo?.stop(); }
