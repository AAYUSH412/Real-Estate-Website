import { keys, text, number, choice, ContractError } from '@buildestate/contracts';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';
import { respondError } from '../utils/httpErrors.js';
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
  // ── NVIDIA NIM (fallback provider chain) ─────────────────────────────────
  {
    name: 'Nemotron Nano',
    slug: 'nemotron-nano',
    modelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    provider: 'nvidia',
    badge: 'Fast · Reasoning',
    description: '30B reasoning model. Balanced speed and quality for most searches.',
    isActive: true,
    isDefault: false,
    order: 3,
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
    name: 'Mistral Medium',
    slug: 'mistral-medium',
    modelId: 'mistralai/mistral-medium-3.5-128b',
    provider: 'nvidia',
    badge: 'Fast · Reliable',
    description: '128B model, no reasoning. Quickest responses, consistently formatted output.',
    isActive: true,
    isDefault: false,
    order: 5,
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

export async function seedDefaultModels() {
  try {
    await AIModel.insertMany(SEED_MODELS, { ordered: false });
    logger.info('AIModel: seeded default AI models');
  } catch (err) {
    logger.warn('AIModel seed skipped (already exists or error)', { error: err.message });
  }
}

/**
 * Returns active configured models. Seeding is an explicit setup operation.
 * Use resolveModelsByProvider() to split into per-provider lists.
 */
export async function resolveActiveModels() {
  if (_cache && Date.now() < _cacheExpiry) return _cache;

  let models = await AIModel.find({ isActive: true }).sort('order').lean();

  _cache = models;
  _cacheExpiry = Date.now() + 5 * 60 * 1000;
  return models;
}

/**
 * Returns active models split by provider.
 * propertyController calls this to build per-provider model configs.
 */
export async function resolveModelsByProvider() {
  const all = await resolveActiveModels();
  return {
    github: all.filter(m => (m.provider || 'nvidia') === 'github'),
    nvidia: all.filter(m => (m.provider || 'nvidia') === 'nvidia'),
  };
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

function modelInput(input, partial = false) {
  keys(input, ['name', 'slug', 'modelId', 'badge', 'description', 'isActive', 'isDefault', 'order', 'config', 'provider', 'expectedVersion']);
  const output = {};
  for (const field of ['name', 'slug', 'modelId', 'badge', 'description']) {
    if (input[field] !== undefined || (!partial && ['name', 'slug', 'modelId'].includes(field))) output[field] = text(input[field], field, { min: ['badge', 'description'].includes(field) ? 0 : 1, max: field === 'description' ? 2000 : 200 });
  }
  if (output.slug && !/^[a-z0-9-]+$/.test(output.slug)) throw new ContractError('Invalid model slug', 'slug');
  if (!partial || input.provider !== undefined) output.provider = choice(input.provider, ['github', 'nvidia'], 'provider');
  for (const field of ['isActive', 'isDefault']) if (input[field] !== undefined) {
    if (typeof input[field] !== 'boolean') throw new ContractError(`${field} must be boolean`, field);
    output[field] = input[field];
  }
  if (input.order !== undefined) output.order = number(input.order, 'order', { integer: true, max: 10000 });
  if (input.config !== undefined) {
    keys(input.config, ['maxTokens', 'timeoutMs', 'temperature', 'topP', 'enableThinking', 'reasoningBudget']);
    output.config = {};
    const bounds = { maxTokens: { min: 1, max: 65536, integer: true }, timeoutMs: { min: 1000, max: 120000, integer: true }, temperature: { max: 2 }, topP: { min: 0.01, max: 1 }, reasoningBudget: { max: 65536, integer: true } };
    for (const [field, options] of Object.entries(bounds)) if (input.config[field] !== undefined) output.config[field] = field === 'reasoningBudget' && input.config[field] === null ? null : number(input.config[field], field, options);
    if (input.config.enableThinking !== undefined) {
      if (typeof input.config.enableThinking !== 'boolean') throw new ContractError('enableThinking must be boolean', 'enableThinking');
      output.config.enableThinking = input.config.enableThinking;
    }
  }
  return output;
}

export async function createModel(req, res) {
  try {
    const values = modelInput(req.body);
    const model = await transaction(async session => {
      const candidate = new AIModel(values); await candidate.validate();
      if (candidate.isDefault && !candidate.isActive) throw new ContractError('Default model must be active', 'isDefault');
      if (candidate.isDefault) await AIModel.updateMany({ isDefault: true }, { $set: { isDefault: false }, $inc: { __v: 1 } }, { session });
      await candidate.save({ session });
      await audit(req, 'create_ai_model', 'aiModel', candidate, { provider: candidate.provider }, session);
      return candidate;
    });
    invalidateCache(); res.status(201).json({ success: true, model });
  } catch (error) { return respondError(res, error); }
}
export async function updateModel(req, res) {
  try {
    const updates = modelInput(req.body, true);
    const model = await transaction(async session => {
      const current = await AIModel.findById(req.params.id).session(session);
      if (!current) throw new ContractError('Model not found', 'id', 404);
      if (req.body.expectedVersion !== undefined && number(req.body.expectedVersion, 'expectedVersion', { integer: true }) !== (current.__v || 0)) throw new ContractError('Model changed. Refresh first.', 'version', 409);
      if (updates.config) updates.config = { ...current.config.toObject(), ...updates.config };
      current.set(updates);
      if (!current.isActive) current.isDefault = false;
      await current.validate();
      if (current.isDefault) await AIModel.updateMany({ _id: { $ne: current._id }, isDefault: true }, { $set: { isDefault: false }, $inc: { __v: 1 } }, { session });
      await current.save({ session });
      await audit(req, 'update_ai_model', 'aiModel', current, { provider: current.provider, changedFields: Object.keys(updates) }, session);
      return current;
    });
    invalidateCache(); res.json({ success: true, model });
  } catch (error) { return respondError(res, error); }
}
export async function deleteModel(req, res) {
  try {
    await transaction(async session => {
      const model = await AIModel.findByIdAndDelete(req.params.id, { session });
      if (!model) throw new ContractError('Model not found', 'id', 404);
      await audit(req, 'delete_ai_model', 'aiModel', model, {}, session);
    });
    invalidateCache(); res.json({ success: true, message: 'Model deleted' });
  } catch (error) { return respondError(res, error); }
}
