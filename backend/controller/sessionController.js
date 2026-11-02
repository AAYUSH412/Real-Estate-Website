import { AuthSession } from '../models/authSessionModel.js';
import { handler, missing } from '../utils/httpErrors.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';
import { id } from '@buildestate/contracts';

export const listSessions = handler(async (req, res) => {
  const rows = await AuthSession.find({ subjectId: req.user._id, subjectType: 'user', sessionVersion: req.user.sessionVersion || 0, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, sessions: rows.map(row => ({ id: row.id, createdAt: row.createdAt, expiresAt: row.expiresAt, userAgent: row.userAgent, current: row.id === req.authSession.id })) });
});
export const revokeSession = handler(async (req, res) => {
  id(req.params.id);
  await transaction(async session => {
    const record = await AuthSession.findOneAndUpdate({ _id: req.params.id, subjectId: req.user._id, subjectType: 'user', revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: 'user_revoked' } }, { new: true, session });
    if (!record) throw missing('Session not found');
    await audit(req, 'session_revoke', 'session', record, {}, session);
  });
  res.json({ success: true, currentSessionRevoked: req.params.id === req.authSession.id });
});
