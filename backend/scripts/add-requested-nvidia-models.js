// Idempotent catalog additions through the existing validated create command.
// Inventory by default; --apply saves a private backup and creates missing rows disabled.
import '../config/environment.js';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import AIModel from '../models/aiModelModel.js';
import { createModel } from '../controller/aiModelController.js';
import { BASIC_CONFIG } from '../services/llm/modelProfiles.js';

const candidates = [
  { name: 'Nemotron 3.5 Bolt E4B', slug: 'nemotron-bolt', modelId: 'nvidia/nemotron-3.5-bolt-e4b', profile: 'nemotron-bolt' },
  { name: 'Nemotron 3.5 Super VL 120B A12B', slug: 'nemotron-super-vl', modelId: 'nvidia/nemotron-3.5-super-vl-120b-a12b', profile: 'text-basic' },
  { name: 'Mistral Large 4', slug: 'mistral-large-4', modelId: 'mistralai/mistral-large-4-1t-a52b', profile: 'mistral-large-4' },
];
try {
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
  const original = await AIModel.collection.find({}).toArray();
  const missing = candidates.filter(candidate => !original.some(row => row.provider === 'nvidia' && row.modelId === candidate.modelId));
  console.log(JSON.stringify({ existingCount: original.length, missing: missing.map(row => row.modelId) }));
  if (process.argv.includes('--apply') && missing.length) {
    const directory = path.join(os.tmpdir(), 'buildestate-model-backups');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const backup = path.join(directory, `${randomUUID()}.ejson`);
    await writeFile(backup, EJSON.stringify({ createdAt: new Date(), records: original, indexes: await AIModel.collection.indexes() }), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ backup }));
    for (const candidate of missing) {
      if (await AIModel.exists({ provider: 'nvidia', modelId: candidate.modelId })) continue;
      let status = 200;
      let response;
      await createModel({ body: { ...candidate, config: { ...BASIC_CONFIG }, description: 'Added at owner request; application testing required before activation.' }, headers: {}, requestId: randomUUID() }, {
        status(value) { status = value; return this; },
        json(value) { response = value; },
      });
      if (status !== 201) throw new Error(`Create failed: ${response?.code || status}`);
      console.log(JSON.stringify({ added: candidate.modelId, isActive: response.model.isActive }));
    }
  }
  console.log(JSON.stringify({ models: await AIModel.find({ provider: 'nvidia', modelId: { $in: candidates.map(row => row.modelId) } }).select('modelId profile isActive isDefault -_id').lean() }));
} catch (error) {
  console.error('Model additions failed:', error.message?.startsWith('Create failed:') ? error.message : error.code || error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
