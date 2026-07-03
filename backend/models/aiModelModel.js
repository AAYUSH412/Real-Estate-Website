import mongoose from 'mongoose';

const aiModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    modelId: { type: String, required: true },
    badge: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    config: {
      maxTokens: { type: Number, default: 6000 },
      timeoutMs: { type: Number, default: 90000 },
      temperature: { type: Number, default: 0.3 },
      topP: { type: Number, default: 1 },
      enableThinking: { type: Boolean, default: false },
      reasoningBudget: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model('AIModel', aiModelSchema);
