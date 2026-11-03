import { keys, text, number, choice, id, ContractError } from '@buildestate/contracts';
import AIModel, { AICatalogState } from '../models/aiModelModel.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';
import { handler, missing, conflict } from '../utils/httpErrors.js';
import { MODEL_PROFILES, MODEL_SEEDS, validateModelConfig, modelFingerprint, fingerprint } from '../services/llm/modelProfiles.js';
import { NvidiaNimProvider } from '../services/llm/NvidiaNimProvider.js';

const evidenceDTO = value => value && ({ passed: value.passed, mode: value.mode, configuration: value.configuration, testedAt: value.testedAt, latencyMs: value.latencyMs, code: value.code, effective: value.effective && { maxTokens: value.effective.maxTokens, timeoutMs: value.effective.timeoutMs } });
const dto = row => {
  const model = row.toObject ? row.toObject() : row;
  const result = Object.fromEntries(['_id', 'name', 'slug', 'modelId', 'provider', 'profile', 'badge', 'description', 'isActive', 'isDefault', 'order', 'createdAt', 'updatedAt'].map(key => [key, model[key]]));
  return { ...result, config: validateModelConfig(model).config, version: model.__v || 0, __v: model.__v || 0, configuration: modelFingerprint(model), lastTest: evidenceDTO(model.lastTest), lastConnectionTest: evidenceDTO(model.lastConnectionTest) };
};
const version = (row, expected) => {
  if (number(expected, 'expectedVersion', { integer: true }) !== (row.__v || 0)) throw conflict('Model changed. Refresh before updating.');
};
const verified = row => row.lastTest?.passed === true && row.lastTest.configuration === modelFingerprint(row.toObject ? row.toObject() : row);
const requireVerified = row => { if (!verified(row)) throw conflict('Run a successful application test for this saved configuration before enabling or selecting it.'); };
export const catalogFence = session => AICatalogState.findOneAndUpdate({ _id: 'catalog' }, { $inc: { revision: 1 } }, { upsert: true, new: true, session });
export async function seedDefaultModels() {
  return transaction(async session => {
    await catalogFence(session);
    if (await AIModel.exists({}).session(session)) throw conflict('Catalog is not empty. Use Add model or the migration instead of reseeding.');
    return AIModel.create(MODEL_SEEDS, { session, ordered: true });
  });
}
export async function resolveActiveModels() {
  // Re-read catalog on each request: updates propagate across all API instances.
  const rows = await AIModel.find({ provider: 'nvidia', isActive: true }).sort({ isDefault: -1, order: 1, _id: 1 }).lean();
  return rows.filter(row => { try { validateModelConfig(row); return verified(row); } catch { return false; } });
}
export async function resolveModelsByProvider() { return { nvidia: await resolveActiveModels() }; }
export async function resolveCatalog() {
  const models = await resolveActiveModels();
  return { models, configuration: fingerprint(models.map(row => ({ id: String(row._id), version: row.__v || 0, configuration: modelFingerprint(row), order: row.order, isDefault: row.isDefault }))) };
}
export const getPublicModels = handler(async (req, res) => {
  const { models, configuration } = await resolveCatalog();
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, models: (process.env.NVIDIA_API_KEY ? models : []).map(({ name, slug, badge, description, isDefault }) => ({ name, slug, badge, description, isDefault })), configuration, available: Boolean(process.env.NVIDIA_API_KEY) && models.length > 0 });
});
export const listModels = handler(async (req, res) => {
  const rows = await AIModel.find().sort({ order: 1, _id: 1 }).lean();
  const models = [], unsupported = [];
  for (const row of rows) {
    try { if (row.provider !== 'nvidia') throw new Error('Legacy provider'); models.push(dto(row)); }
    catch { unsupported.push({ _id: row._id, slug: row.slug }); }
  }
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, models, profiles: MODEL_PROFILES, unsupported, migrationRequired: unsupported.length > 0 });
});
function modelInput(input, current = null) {
  keys(input, ['name', 'slug', 'modelId', 'badge', 'description', 'isActive', 'isDefault', 'order', 'profile', 'config', 'provider', 'expectedVersion', 'replacementId', 'replacementVersion', 'turnOffAI']);
  if (input.provider !== undefined) choice(input.provider, ['nvidia'], 'provider');
  const output = {};
  for (const field of ['name', 'slug', 'modelId', 'badge', 'description']) {
    if (input[field] !== undefined || (!current && ['name', 'slug', 'modelId'].includes(field))) output[field] = text(input[field], field, { min: ['badge', 'description'].includes(field) ? 0 : 1, max: field === 'description' ? 2000 : 200 });
  }
  if (output.slug && !/^[a-z0-9-]+$/.test(output.slug)) throw new ContractError('Invalid model slug', 'slug');
  for (const field of ['isActive', 'isDefault', 'turnOffAI']) if (input[field] !== undefined && typeof input[field] !== 'boolean') throw new ContractError(`${field} must be boolean`, field);
  for (const field of ['isActive', 'isDefault']) if (input[field] !== undefined) output[field] = input[field];
  if (input.order !== undefined) output.order = number(input.order, 'order', { integer: true, max: 10000 });
  const previous = current?.toObject() || {};
  const serving = validateModelConfig({ modelId: output.modelId || previous.modelId, profile: input.profile === undefined ? previous.profile : input.profile, config: input.config === undefined ? previous.config : input.config });
  return { ...output, ...serving, provider: 'nvidia' };
}
export const createModel = handler(async (req, res) => {
  const values = modelInput(req.body);
  if (values.isActive || values.isDefault) throw new ContractError('New models must be saved disabled and tested first', 'isActive');
  const model = await transaction(async session => {
    await catalogFence(session);
    if (await AIModel.countDocuments({}).session(session) >= 50) throw conflict('Catalog limit reached (50 models)');
    const last = await AIModel.findOne().sort({ order: -1 }).session(session);
    const order = (last?.order ?? -1) + 1;
    const [row] = await AIModel.create([{ ...values, order, isActive: false, isDefault: false }], { session });
    await audit(req, 'create_ai_model', 'aiModel', row, { provider: 'nvidia', configuration: modelFingerprint(row.toObject()) }, session);
    return row;
  });
  res.status(201).json({ success: true, model: dto(model) });
});
async function changeDefault(current, input, req, session) {
  if (input.turnOffAI) {
    if (input.replacementId) throw new ContractError('Choose replacement or turn off AI, not both', 'replacementId');
    await AIModel.updateMany({ _id: { $ne: current._id }, isActive: true }, { $set: { isActive: false, isDefault: false }, $inc: { __v: 1 } }, { session });
    await audit(req, 'disable_ai_catalog', 'aiModel', current, {}, session);
    return;
  }
  if (!input.replacementId || String(input.replacementId) === String(current._id)) throw conflict('Choose an enabled replacement or explicitly turn off AI search.');
  const replacement = await AIModel.findById(id(input.replacementId, 'replacementId')).session(session);
  if (!replacement || !replacement.isActive || replacement.provider !== 'nvidia') throw conflict('Replacement must be an enabled NVIDIA model');
  version(replacement, input.replacementVersion); requireVerified(replacement);
  await AIModel.updateMany({ _id: { $ne: current._id }, isDefault: true }, { $set: { isDefault: false }, $inc: { __v: 1 } }, { session });
  replacement.isDefault = true; await replacement.save({ session });
}
export const updateModel = handler(async (req, res) => {
  const model = await transaction(async session => {
    await catalogFence(session);
    const current = await AIModel.findById(req.params.id).session(session);
    if (!current || current.provider !== 'nvidia') throw missing('NVIDIA model not found');
    version(current, req.body.expectedVersion);
    const updates = modelInput(req.body, current);
    if (updates.order !== undefined && updates.order !== current.order) throw new ContractError('Use the atomic reorder command to change fallback order', 'order');
    const changed = modelFingerprint(current.toObject()) !== modelFingerprint(updates);
    if (changed && current.isActive) throw conflict('Disable the model before changing its serving configuration');
    if (changed) current.lastTest = undefined;
    const removingDefault = current.isDefault && (updates.isActive === false || updates.isDefault === false);
    if (removingDefault) await changeDefault(current, req.body, req, session);
    else if (req.body.turnOffAI || req.body.replacementId) throw new ContractError('Replacement/off controls apply to the current default', 'replacementId');
    current.set(updates);
    if (removingDefault) { current.isDefault = false; if (req.body.turnOffAI) current.isActive = false; }
    if (current.isActive) requireVerified(current);
    if (!current.isActive && current.isDefault) throw conflict('Default model must be enabled');
    if (current.isActive && !(await AIModel.exists({ isDefault: true, _id: { $ne: current._id } }).session(session))) current.isDefault = true;
    if (current.isDefault) await AIModel.updateMany({ _id: { $ne: current._id }, isDefault: true }, { $set: { isDefault: false }, $inc: { __v: 1 } }, { session });
    await current.save({ session });
    await audit(req, 'update_ai_model', 'aiModel', current, { changedFields: Object.keys(req.body).filter(key => key !== 'expectedVersion'), configuration: modelFingerprint(current.toObject()) }, session);
    return current;
  });
  res.json({ success: true, model: dto(model) });
});
export const deleteModel = handler(async (req, res) => {
  keys(req.body, ['expectedVersion', 'replacementId', 'replacementVersion', 'turnOffAI']);
  await transaction(async session => {
    await catalogFence(session);
    const current = await AIModel.findById(req.params.id).session(session);
    if (!current || current.provider !== 'nvidia') throw missing('NVIDIA model not found');
    version(current, req.body.expectedVersion);
    if (req.body.turnOffAI !== undefined && typeof req.body.turnOffAI !== 'boolean') throw new ContractError('turnOffAI must be boolean', 'turnOffAI');
    if (current.isDefault) await changeDefault(current, req.body, req, session);
    else if (req.body.turnOffAI || req.body.replacementId) throw new ContractError('Replacement/off controls apply to the current default', 'replacementId');
    await AIModel.deleteOne({ _id: current._id }, { session });
    await audit(req, 'delete_ai_model', 'aiModel', current, { slug: current.slug, modelId: current.modelId, configuration: modelFingerprint(current.toObject()) }, session);
  });
  res.json({ success: true, message: 'Model removed; audit history retained' });
});
export const reorderModels = handler(async (req, res) => {
  keys(req.body, ['modelIds', 'expectedVersions']);
  if (!Array.isArray(req.body.modelIds) || req.body.modelIds.length > 50 || new Set(req.body.modelIds).size !== req.body.modelIds.length) throw new ContractError('Send a unique ordered model list (maximum 50)', 'modelIds');
  const ids = req.body.modelIds.map(value => id(value)); keys(req.body.expectedVersions, ids);
  await transaction(async session => {
    await catalogFence(session);
    const rows = await AIModel.find({ provider: 'nvidia' }).session(session);
    if (rows.length !== ids.length || rows.some(row => !ids.includes(String(row._id)))) throw conflict('Catalog changed. Refresh before reordering.');
    for (const row of rows) {
      version(row, req.body.expectedVersions[String(row._id)]); row.order = ids.indexOf(String(row._id)); await row.save({ session });
    }
    await audit(req, 'reorder_ai_models', 'aiModel', null, { modelIds: ids }, session);
  });
  res.json({ success: true });
});
const parseJSON = raw => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
export const APPLICATION_TEST_PROMPT = 'Analyze only this demo property: name="Demo Home", price="INR 5000000", area="1000 sqft", location="Pune". Return JSON with overview:[{name:"Demo Home",price:"INR 5000000",area:"1000 sqft",location:"Pune",match_score:50}], best_value:{name:"Demo Home",reason:"Demo comparison only"}, recommendations:["Verify source details"]. Do not add claims or other properties.';
export function validateApplicationTest(raw) {
  const data = parseJSON(raw);
  const item = data.overview?.[0];
  if (!Array.isArray(data.overview) || data.overview.length !== 1 || item.name !== 'Demo Home' || item.price !== 'INR 5000000' || item.area !== '1000 sqft' || item.location !== 'Pune' || !Number.isInteger(item.match_score) || item.match_score < 0 || item.match_score > 100 || data.best_value?.name !== 'Demo Home' || typeof data.best_value.reason !== 'string' || !Array.isArray(data.recommendations) || !data.recommendations.length || data.recommendations.some(value => typeof value !== 'string')) throw new Error('Application JSON check failed');
}
export const testModel = handler(async (req, res) => {
  keys(req.body, ['expectedVersion', 'mode']);
  const mode = choice(req.body.mode || 'application', ['application', 'connection'], 'mode');
  const row = await AIModel.findById(req.params.id);
  if (!row || row.provider !== 'nvidia') throw missing('NVIDIA model not found');
  version(row, req.body.expectedVersion);
  if (!process.env.NVIDIA_API_KEY) throw new ContractError('NVIDIA service is not configured', 'service', 503, 'AI_UNAVAILABLE');
  const configuration = modelFingerprint(row.toObject());
  const provider = new NvidiaNimProvider(process.env.NVIDIA_API_KEY, [row.toObject()]);
  const start = Date.now(); let effective, passed = false, code = 'APPLICATION_JSON_INVALID';
  try {
    await provider.generateText(mode === 'application' ? APPLICATION_TEST_PROMPT : 'Reply OK.', 'Return only the requested final answer. No reasoning or markdown.', {
      exact: true, maxTokens: mode === 'application' ? 1024 : 256, timeoutMs: 30000,
      validate: mode === 'application' ? validateApplicationTest : raw => { if (raw.trim().toUpperCase().replace(/[.!]/g, '') !== 'OK') throw new Error('Unexpected connection response'); },
      onResult: result => { effective = result.effective; },
    });
    passed = true; code = 'PASSED';
  } catch (error) { code = error.code || (mode === 'application' ? 'APPLICATION_JSON_INVALID' : 'CONNECTION_TEST_FAILED'); }
  const result = { mode, passed, configuration, testedAt: new Date(), latencyMs: Date.now() - start, code, effective: effective || { maxTokens: Math.min(row.config.maxTokens, mode === 'application' ? 1024 : 256), timeoutMs: Math.min(row.config.timeoutMs, 30000) } };
  const saved = await transaction(async session => {
    await catalogFence(session);
    const current = await AIModel.findById(row._id).session(session);
    if (!current || (current.__v || 0) !== (row.__v || 0) || modelFingerprint(current.toObject()) !== configuration) throw conflict('Model changed while testing. Test the saved configuration again.');
    current[mode === 'application' ? 'lastTest' : 'lastConnectionTest'] = result;
    await current.save({ session });
    await audit(req, 'test_ai_model', 'aiModel', current, { mode, passed, code, configuration }, session);
    return current;
  });
  res.json({ success: true, result, model: dto(saved) });
});
