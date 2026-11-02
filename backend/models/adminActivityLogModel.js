import mongoose from 'mongoose';

const adminActivityLogSchema = new mongoose.Schema({
  adminEmail: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,

  },
  targetType: {
    type: String,
    required: true,
    enum: ['property', 'user', 'appointment', 'aiModel', 'session', 'lead', 'subscriber']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: function() { return ({ property: 'Property', user: 'User', appointment: 'Appointment', aiModel: 'AIModel', session: 'AuthSession' })[this.targetType]; }
  },
  targetName: {
    type: String,
    default: ''
  },
  actorType: { type: String, enum: ['admin', 'user', 'system'], default: 'admin' },
  actorId: mongoose.Schema.Types.ObjectId,
  requestId: String,
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthSession' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  userAgent: {
    type: String,
    default: 'unknown'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
adminActivityLogSchema.index({ adminEmail: 1, createdAt: -1 });
adminActivityLogSchema.index({ action: 1, createdAt: -1 });
adminActivityLogSchema.index({ targetType: 1, createdAt: -1 });
adminActivityLogSchema.index({ targetId: 1 });
adminActivityLogSchema.index({ createdAt: -1 });

adminActivityLogSchema.index({ createdAt: -1, _id: -1 });
const AdminActivityLog = mongoose.model('AdminActivityLog', adminActivityLogSchema);

export default AdminActivityLog;
