import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpire: { type: Date },

    // Email verification fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    verificationTokenExpiry: { type: Date },

    // User status management fields
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    suspendedUntil: { type: Date },
    banReason: { type: String },
    suspendReason: { type: String },
    bannedAt: { type: Date },
    suspendedAt: { type: Date },
    bannedBy: { type: String },      // Admin email
    suspendedBy: { type: String },   // Admin email
    lastActive: { type: Date }
}, {
    timestamps: true  // Adds createdAt and updatedAt
});

// Indexes for efficient queries
UserSchema.index({ status: 1, createdAt: -1 });       // Filter by status + sort
UserSchema.index({ suspendedUntil: 1 });              // Auto-unsuspend cron
UserSchema.index({ email: 'text', name: 'text' });    // Text search

const User = mongoose.model('User', UserSchema);

// Admin model with password hashing
const AdminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    lastLogin: { type: Date }
});

// Hash password before saving
AdminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const Admin = mongoose.model('Admin', AdminSchema);

export { Admin };
export default User;