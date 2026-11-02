import mongoose from 'mongoose';
const newsSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ['pending', 'confirmed', 'unsubscribed'], default: 'pending' },
  consentVersion: { type: Number, default: 0 },
  confirmedAt: Date, unsubscribedAt: Date, consentSource: String,
}, { timestamps: true });
newsSchema.index({ email: 1 }, { unique: true });
newsSchema.index({ status: 1, createdAt: -1, _id: -1 });
export default mongoose.model('News', newsSchema);
