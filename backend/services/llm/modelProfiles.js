import crypto from 'node:crypto';
import { keys, text, number, choice, ContractError } from '@buildestate/contracts';

// Conservative hosted-API profiles. Unknown text models must test compatibility.
export const MODEL_PROFILES = Object.freeze({
  'text-basic': { label: 'Basic text (test compatibility)', options: [], maxTokens: 32768 },
  'nemotron-bolt': { label: 'Nemotron 3.5 Bolt', modelId: 'nvidia/nemotron-3.5-bolt-e4b', options: ['enableThinking', 'seed'], maxTokens: 32768 },
  'mistral-large-4': { label: 'Mistral Large 4', modelId: 'mistralai/mistral-large-4-1t-a52b', options: ['reasoningEffort', 'frequencyPenalty', 'presencePenalty'], maxTokens: 65536 },
  'minimax-flash': { label: 'MiniMax M3.1 Flash', modelId: 'minimaxai/minimax-m3.1-flash', options: ['seed'], maxTokens: 65536 },
});
export const BASIC_CONFIG = Object.freeze({ maxTokens: 8192, timeoutMs: 60000, temperature: 0.5, topP: 1 });
export const profileFor = modelId => Object.keys(MODEL_PROFILES).find(key => MODEL_PROFILES[key].modelId === modelId) || 'text-basic';
export function validateModelConfig(model) {
  const modelId = text(model.modelId, 'modelId', { max: 200 });
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(modelId)) throw new ContractError('Use an exact NVIDIA catalog model ID (developer/model)', 'modelId');
  const profile = choice(model.profile === undefined ? profileFor(modelId) : model.profile, Object.keys(MODEL_PROFILES), 'profile');
  const spec = MODEL_PROFILES[profile];
  if (spec.modelId && spec.modelId !== modelId) throw new ContractError('Profile does not match the model ID', 'profile');
  if (profile === 'text-basic' && profileFor(modelId) !== 'text-basic') throw new ContractError('Use the supported profile for this model', 'profile');
  const input = model.config === undefined ? {} : model.config;
  keys(input, [...Object.keys(BASIC_CONFIG), ...spec.options]);
  const config = {
    maxTokens: number(input.maxTokens ?? BASIC_CONFIG.maxTokens, 'maxTokens', { min: 256, max: spec.maxTokens, integer: true }),
    timeoutMs: number(input.timeoutMs ?? BASIC_CONFIG.timeoutMs, 'timeoutMs', { min: 1000, max: 120000, integer: true }),
    temperature: number(input.temperature ?? BASIC_CONFIG.temperature, 'temperature', { min: 0, max: 2 }),
    topP: number(input.topP ?? BASIC_CONFIG.topP, 'topP', { min: 0.01, max: 1 }),
  };
  if (input.enableThinking !== undefined) {
    if (typeof input.enableThinking !== 'boolean') throw new ContractError('enableThinking must be boolean', 'enableThinking');
    config.enableThinking = input.enableThinking;
  }
  if (input.reasoningEffort !== undefined) config.reasoningEffort = choice(input.reasoningEffort, ['high'], 'reasoningEffort');
  if (input.seed !== undefined) config.seed = number(input.seed, 'seed', { min: 0, max: 2147483647, integer: true });
  for (const field of ['frequencyPenalty', 'presencePenalty']) if (input[field] !== undefined) config[field] = number(input[field], field, { min: -2, max: 2 });
  return { modelId, profile, config };
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
export const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export const modelFingerprint = model => fingerprint(validateModelConfig(model));
export const MODEL_SEEDS = [
  ['Nemotron 3.5 Bolt E4B', 'nemotron-bolt', 'nvidia/nemotron-3.5-bolt-e4b'],
  ['Mistral Large 4', 'mistral-large-4', 'mistralai/mistral-large-4-1t-a52b'],
  ['MiniMax M3.1 Flash', 'minimax-flash', 'minimaxai/minimax-m3.1-flash'],
].map(([name, slug, modelId], order) => ({ name, slug, modelId, profile: profileFor(modelId), provider: 'nvidia', order, isActive: false, isDefault: false, config: { ...BASIC_CONFIG } }));
