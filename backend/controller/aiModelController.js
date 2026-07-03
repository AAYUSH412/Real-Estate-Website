import AIModel from '../models/aiModelModel.js';
import logger from '../utils/logger.js';

// ── In-memory cache (5-min TTL) ──────────────────────────────────────────────
let _cache = null;
let _cacheExpiry = 0;

function invalidateCache() {
  _cache = null;
  _cacheExpiry = 0;
}

const SEED_MODELS = [
  {
    name: 'Nemotron Nano',
    slug: 'nemotron-nano',
    modelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    badge: 'Fast · Reasoning',
    description: '30B reasoning model. Balanced speed and quality for most searches.',
    isActive: true,
    isDefault: true,
    order: 0,
    config: {
      maxTokens: 65536,
      timeoutMs: 120000,
      temperature: 0.6,
      topP: 0.95,
      enableThinking: true,
      reasoningBudget: 16384,
    },
  },
  {
    name: 'Nemotron Ultra',
    slug: 'nemotron-ultra',
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b',
    badge: 'Ultra · Deep Analysis',
    description: '550B flagship model. Best analysis quality, slower response.',
    isActive: true,
    isDefault: false,
    order: 1,
    config: {
      maxTokens: 65536,
      timeoutMs: 180000,
      temperature: 0.6,
      topP: 0.95,
      enableThinking: true,
      reasoningBudget: 16384,
    },
  },
  {
    name: 'Mistral Medium',
    slug: 'mistral-medium',
    modelId: 'mistralai/mistral-medium-3.5-128b',
    badge: 'Fast · Reliable',
    description: '128B model, no reasoning. Quickest responses, consistently formatted output.',
    isActive: true,
    isDefault: false,
    order: 2,
    config: {
      maxTokens: 6000,
      timeoutMs: 90000,
      temperature: 0.3,
      topP: 1,
      enableThinking: false,
      reasoningBudget: null,
    },
  },
];

async function seedDefaultModels() {
  try {
    await AIModel.insertMany(SEED_MODELS, { ordered: false });
    logger.info('AIModel: seeded 3 default models');
  } catch (err) {
    logger.warn('AIModel seed skipped (already exists or error)', { error: err.message });
  }
}

/**
 * Returns active models from cache or DB. Auto-seeds if DB is empty.
 * Used by propertyController to build NvidiaNimProvider config.
 */
export async function resolveActiveModels() {
  if (_cache && Date.now() < _cacheExpiry) return _cache;

  let models = await AIModel.find({ isActive: true }).sort('order').lean();

  if (!models.length) {
    await seedDefaultModels();
    models = await AIModel.find({ isActive: true }).sort('order').lean();
  }

  _cache = models;
  _cacheExpiry = Date.now() + 5 * 60 * 1000;
  return models;
}

// ── Public endpoint ───────────────────────────────────────────────────────────

export async function getPublicModels(req, res) {
  try {
    const models = await resolveActiveModels();
    const safe = models.map(({ name, slug, badge, description, isDefault }) => ({
      name, slug, badge, description, isDefault,
    }));
    res.json({ success: true, models: safe });
  } catch (err) {
    logger.error('getPublicModels error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch AI models' });
  }
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function listModels(req, res) {
  try {
    const models = await AIModel.find().sort('order');
    res.json({ success: true, models });
  } catch (err) {
    logger.error('listModels error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch models' });
  }
}

export async function createModel(req, res) {
  try {
    const { name, slug, modelId, badge, description, isActive, isDefault, order, config } = req.body;
    if (!name || !slug || !modelId) {
      return res.status(400).json({ success: false, message: 'name, slug, and modelId are required' });
    }

    if (isDefault) {
      await AIModel.updateMany({ isDefault: true }, { isDefault: false });
    }

    const model = await AIModel.create({ name, slug, modelId, badge, description, isActive, isDefault, order: order ?? 0, config });
    invalidateCache();
    res.status(201).json({ success: true, model });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A model with that slug already exists' });
    }
    logger.error('createModel error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to create model' });
  }
}

export async function updateModel(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.isDefault) {
      await AIModel.updateMany({ _id: { $ne: id }, isDefault: true }, { isDefault: false });
    }

    const model = await AIModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    invalidateCache();
    res.json({ success: true, model });
  } catch (err) {
    logger.error('updateModel error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to update model' });
  }
}

export async function deleteModel(req, res) {
  try {
    const { id } = req.params;
    const model = await AIModel.findByIdAndDelete(id);
    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    invalidateCache();
    res.json({ success: true, message: 'Model deleted' });
  } catch (err) {
    logger.error('deleteModel error', { error: err.message });
    res.status(500).json({ success: false, message: 'Failed to delete model' });
  }
}
