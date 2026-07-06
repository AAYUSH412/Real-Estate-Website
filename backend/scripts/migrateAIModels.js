import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env.local' });
dotenv.config();

/**
 * Migration: add GitHub Models entries + backfill provider field on NVIDIA models.
 *
 * Run once from the backend/ directory:
 *   node scripts/migrateAIModels.js
 *
 * Safe to re-run — uses upsert so duplicate slugs are never inserted.
 */

const aiModelSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    modelId: String,
    provider: { type: String, enum: ['nvidia', 'github'], default: 'nvidia' },
    badge: String,
    description: String,
    isActive: Boolean,
    isDefault: Boolean,
    order: Number,
    config: {
      maxTokens: Number,
      timeoutMs: Number,
      temperature: Number,
      topP: Number,
      enableThinking: Boolean,
      reasoningBudget: Number,
    },
  },
  { timestamps: true }
);
const AIModel = mongoose.model('AIModel', aiModelSchema);

const GITHUB_MODELS = [
  // ── GitHub Models (primary provider chain) ───────────────────────────────
  {
    name: 'GPT-4.1',
    slug: 'gpt-4-1',
    modelId: 'openai/gpt-4.1',
    provider: 'github',
    badge: 'Fast · Reliable',
    description: 'OpenAI GPT-4.1 via GitHub Models. Best JSON accuracy, lowest latency.',
    isActive: true,
    isDefault: true,
    order: 0,
    config: {
      maxTokens: 32768,
      timeoutMs: 30000,
      temperature: 0.3,
      topP: 1.0,
      enableThinking: false,
      reasoningBudget: null,
    },
  },
  {
    name: 'Llama 4 Scout',
    slug: 'llama-4-scout',
    modelId: 'meta/Llama-4-Scout-17B-16E-Instruct',
    provider: 'github',
    badge: 'Open Source · Fast',
    description: '17B MoE model from Meta. Sub-second responses, no rate limits on free tier.',
    isActive: true,
    isDefault: false,
    order: 1,
    config: {
      maxTokens: 4096,
      timeoutMs: 45000,
      temperature: 0.3,
      topP: 0.1,
      enableThinking: false,
      reasoningBudget: null,
    },
  },
  {
    name: 'Mistral Medium 3',
    slug: 'mistral-medium-3',
    modelId: 'mistral-ai/mistral-medium-2505',
    provider: 'github',
    badge: 'Open Source · Reliable',
    description: 'Mistral Medium 3 (May 2025). Reliable fallback with consistent formatting.',
    isActive: true,
    isDefault: false,
    order: 2,
    config: {
      maxTokens: 4096,
      timeoutMs: 45000,
      temperature: 0.3,
      topP: 0.01,
      enableThinking: false,
      reasoningBudget: null,
    },
  },
];

// Existing NVIDIA slugs → new order numbers (moved to 3-5 so GitHub models sit at 0-2)
const NVIDIA_ORDER_MAP = {
  'nemotron-nano':  3,
  'mistral-medium': 4,
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  // ── 1. Upsert GitHub Models entries ────────────────────────────────────────
  console.log('\nUpserting GitHub Models...');
  for (const m of GITHUB_MODELS) {
    const result = await AIModel.updateOne(
      { slug: m.slug },
      { $setOnInsert: m },
      { upsert: true }
    );
    if (result.upsertedCount) {
      console.log(`  + inserted: ${m.name} (${m.slug})`);
    } else {
      console.log(`  ~ already exists, skipped: ${m.slug}`);
    }
  }

  // ── 2. Backfill provider:'nvidia' on existing NVIDIA entries ───────────────
  console.log('\nBackfilling provider field on NVIDIA models...');
  const backfill = await AIModel.updateMany(
    { provider: { $exists: false } },
    { $set: { provider: 'nvidia' } }
  );
  console.log(`  Updated ${backfill.modifiedCount} document(s) missing provider field`);

  // ── 3. Fix isDefault: GPT-4.1 becomes default, old default cleared ─────────
  console.log('\nSetting GPT-4.1 as default model...');
  await AIModel.updateMany({ isDefault: true, slug: { $ne: 'gpt-4-1' } }, { $set: { isDefault: false } });
  await AIModel.updateOne({ slug: 'gpt-4-1' }, { $set: { isDefault: true } });
  console.log('  Done');

  // ── 4. Re-order NVIDIA models to sit after GitHub models ───────────────────
  console.log('\nUpdating order for NVIDIA models...');
  for (const [slug, order] of Object.entries(NVIDIA_ORDER_MAP)) {
    const r = await AIModel.updateOne({ slug }, { $set: { order } });
    if (r.matchedCount) {
      console.log(`  ${slug} → order ${order}`);
    } else {
      console.log(`  ${slug} not found, skipping`);
    }
  }

  // ── 5. Final state ──────────────────────────────────────────────────────────
  console.log('\nFinal model list:');
  const all = await AIModel.find().sort('order').lean();
  for (const m of all) {
    const def = m.isDefault ? ' [default]' : '';
    console.log(`  [${m.provider}] ${m.order}. ${m.name} (${m.slug})${def}`);
  }

  await mongoose.disconnect();
  console.log('\nMigration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
