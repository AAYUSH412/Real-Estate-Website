import mongoose from 'mongoose';
import { MODEL_PROFILES, BASIC_CONFIG } from '../services/llm/modelProfiles.js';

const evidence = new mongoose.Schema({ passed: Boolean, mode: String, configuration: String, testedAt: Date, latencyMs: Number, code: String, effective: { maxTokens: Number, timeoutMs: Number } }, { _id: false });
const config = new mongoose.Schema({
  maxTokens: { type: Number, default: BASIC_CONFIG.maxTokens }, timeoutMs: { type: Number, default: BASIC_CONFIG.timeoutMs },
  temperature: { type: Number, default: BASIC_CONFIG.temperature }, topP: { type: Number, default: BASIC_CONFIG.topP },
  enableThinking: Boolean, reasoningEffort: String, seed: Number, frequencyPenalty: Number, presencePenalty: Number,
}, { _id: false, versionKey: false });
const aiModelSchema = new mongoose.Schema({
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true }, modelId: { type: String, required: true },
  badge: { type: String, default: '' }, description: { type: String, default: '' },
  isActive: { type: Boolean, default: false }, isDefault: { type: Boolean, default: false }, order: { type: Number, default: 0 },
  provider: { type: String, enum: ['nvidia'], default: 'nvidia' },
  profile: { type: String, enum: Object.keys(MODEL_PROFILES), default: 'text-basic' },
  config: { type: config, default: () => ({}) }, lastTest: evidence, lastConnectionTest: evidence,
}, { timestamps: true, optimisticConcurrency: true });
// Catalog writes share a transaction fence, rather than reusing a unique boolean
// index inside default-replacement transactions. Migration retires the old index.
export const AICatalogState = mongoose.model('AICatalogState', new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 } }, { versionKey: false }));
export default mongoose.model('AIModel', aiModelSchema);
