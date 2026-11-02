// Read-time policy also handles expired suspensions before the daily job runs.
export function accountDenial(user, now = Date.now()) {
  if (user.status === 'deleted' || user.deletedAt) return 'This account is archived.';
  if (user.status === 'banned') return 'This account is banned.';
  if (user.status === 'suspended' && (!user.suspendedUntil || new Date(user.suspendedUntil).getTime() > now)) {
    return 'This account is suspended.';
  }
  return null;
}

export const sessionVersion = user => user.sessionVersion || 0;
export const versionFilter = user => sessionVersion(user) === 0
  ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }
  : { sessionVersion: sessionVersion(user) };

export const revokeSessionUpdate = {
  $inc: { sessionVersion: 1 },
  $unset: { userRefreshTokenHash: '', userRefreshTokenExpiry: '' },
};

export function publicUser(user) {
  return { _id: user._id, name: user.name, email: user.email, status: user.status,
    isEmailVerified: user.isEmailVerified, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

export function adminUser(user) {
  const dto = { ...publicUser(user), version: user.__v || 0 };
  for (const field of ['suspendedUntil', 'banReason', 'suspendReason', 'bannedAt', 'suspendedAt', 'bannedBy', 'suspendedBy', 'lastActive']) {
    dto[field] = user[field];
  }
  return dto;
}

export const USER_AUTH_FIELDS = '+password +resetToken +resetTokenExpire +emailVerificationToken +verificationTokenExpiry +userRefreshTokenHash +userRefreshTokenExpiry';
export const ADMIN_AUTH_FIELDS = '+password +refreshTokenHash +refreshTokenExpiry';
