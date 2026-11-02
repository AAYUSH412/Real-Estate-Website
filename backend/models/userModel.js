import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, select: false, required: true },
    resetToken: { type: String, select: false },
    resetTokenExpire: { type: Date, select: false },

    // Email verification fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    verificationTokenExpiry: { type: Date, select: false },

    // User status management fields
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned', 'deleted'],
        default: 'active'
    },
    suspendedUntil: { type: Date },
    banReason: { type: String },
    suspendReason: { type: String },
    bannedAt: { type: Date },
    suspendedAt: { type: Date },
    bannedBy: { type: String },      // Admin email
    suspendedBy: { type: String },   // Admin email
    lastActive: { type: Date },
    deletedAt: Date,
    sessionFence: { type: Number, default: 0 },
    sessionVersion: { type: Number, default: 0 },
    rememberMe: { type: Boolean, default: false },

    // Brute-force protection: 5 failed logins → 15 min lock
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Rotating httpOnly refresh token (SHA-256 hash of the cookie value)
    userRefreshTokenHash: { type: String, select: false },
    userRefreshTokenExpiry: { type: Date, select: false }
}, {
    timestamps: true, optimisticConcurrency: true
});

// Indexes for efficient queries
UserSchema.index({ status: 1, createdAt: -1 });       // Filter by status + sort
UserSchema.index({ suspendedUntil: 1 });              // Auto-unsuspend cron
UserSchema.index({ email: 'text', name: 'text' });    // Text search

const User = mongoose.model('User', UserSchema);

// Admin model with password hashing
const AdminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, select: false, required: true },
    role: { type: String, default: 'admin' },
    lastLogin: { type: Date },
    sessionVersion: { type: Number, default: 0 },
    sessionFence: { type: Number, default: 0 },

    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Refresh token (SHA-256 hash of the httpOnly cookie value)
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiry: { type: Date, select: false }
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