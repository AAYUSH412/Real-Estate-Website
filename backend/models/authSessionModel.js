import mongoose from 'mongoose';
const sessionSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  subjectType: { type: String, enum: ['user', 'admin'], required: true },
  sessionVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  revokeReason: String,
  rememberMe: Boolean,
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ subjectId: 1, subjectType: 1, revokedAt: 1 });
export const AuthSession = mongoose.model('AuthSession', sessionSchema);

const tokenSchema = new mongoose.Schema({
  digest: { type: String, required: true, unique: true, select: false },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthSession', required: true, index: true },
  consumedAt: Date,
  expiresAt: { type: Date, required: true },
});
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RefreshCredential = mongoose.model('RefreshCredential', tokenSchema);
