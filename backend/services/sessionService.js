import { restoreExpiredSuspension } from './domain/maintenance.js';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AuthSession, RefreshCredential } from '../models/authSessionModel.js';
import User, { Admin } from '../models/userModel.js';
import { accountDenial, versionFilter, sessionVersion } from '../utils/accountPolicy.js';
import { transaction } from './domain/transaction.js';
import { audit } from './domain/audit.js';
import { ContractError } from '@buildestate/contracts';

const expired = () => new ContractError('Session expired. Please sign in again.', 'session', 401, 'SESSION_EXPIRED');
const digest = raw => crypto.createHash('sha256').update(raw).digest('hex');
const modelFor = kind => kind === 'admin' ? Admin : User;
const actorRequest = (req, user, kind) => ({ ...req, ...(kind === 'admin' ? { admin: user } : { user }) });
const tokenFor = (record, user) => jwt.sign({ id: String(user._id), ...(record.subjectType === 'admin' && { email: user.email }), sid: String(record._id), kind: record.subjectType, sv: record.sessionVersion }, process.env.JWT_SECRET, { expiresIn: record.subjectType === 'admin' ? '2h' : '1h' });

export async function createSession(user, kind, rememberMe = false, req = {}) {
  if (kind === 'user' && user.status === 'suspended' && user.suspendedUntil && user.suspendedUntil <= new Date()) await restoreExpiredSuspension(user._id);
  const raw = crypto.randomBytes(48).toString('hex');
  const maxAge = (kind === 'admin' || rememberMe ? 30 : 7) * 86400000;
  const record = await transaction(async session => {
    // Serialize issuance against password changes, moderation and account archival.
    const current = await modelFor(kind).findOneAndUpdate({ _id: user._id, ...versionFilter(user) }, { $inc: { sessionFence: 1 } }, { new: true, session });
    if (!current) throw expired();
    const denial = kind === 'user' ? accountDenial(current) || (!current.isEmailVerified && 'Verify your email first.') : current.role !== 'admin' && 'Administrator access revoked';
    if (denial) throw new ContractError(denial, 'account', 403, 'ACCOUNT_DISABLED');
    const [record] = await AuthSession.create([{ subjectId: user._id, subjectType: kind, sessionVersion: sessionVersion(current), rememberMe,
      expiresAt: new Date(Date.now() + maxAge), ipAddress: String(req.ip || '').slice(0, 100), userAgent: String(req.headers?.['user-agent'] || '').slice(0, 500) }], { session });
    await RefreshCredential.create([{ digest: digest(raw), sessionId: record._id, expiresAt: record.expiresAt }], { session });
    await audit(actorRequest(req, user, kind), 'session_login', 'session', record, { subjectType: kind }, session);
    return record;
  });
  return { token: tokenFor(record, user), raw, maxAge };
}

export async function rotateSession(raw, kind, req = {}) {
  if (typeof raw !== 'string' || !/^[a-f\d]{96}$/.test(raw)) throw expired();
  const nextRaw = crypto.randomBytes(48).toString('hex');
  const result = await transaction(async session => {
    const credential = await RefreshCredential.findOne({ digest: digest(raw), expiresAt: { $gt: new Date() } }).session(session);
    if (!credential) return null;
    const record = await AuthSession.findOne({ _id: credential.sessionId, subjectType: kind, revokedAt: null, expiresAt: { $gt: new Date() } }).session(session);
    if (!record) return null;
    const user = await modelFor(kind).findOneAndUpdate({ _id: record.subjectId, ...versionFilter(record) }, { $inc: { sessionFence: 1 } }, { new: true, session });
    if (!user || (kind === 'user' ? accountDenial(user) || !user.isEmailVerified : user.role !== 'admin')) return null;
    if (credential.consumedAt) {
      record.revokedAt = new Date(); record.revokeReason = 'refresh_replay'; await record.save({ session });
      await audit(actorRequest(req, user, kind), 'session_replay', 'session', record, {}, session);
      return null; // Commit revocation before returning 401, rather than throwing/rolling back it.
    }
    const consumed = await RefreshCredential.updateOne({ _id: credential._id, consumedAt: null }, { $set: { consumedAt: new Date() } }, { session });
    if (!consumed.modifiedCount) return null;
    await RefreshCredential.create([{ digest: digest(nextRaw), sessionId: record._id, expiresAt: record.expiresAt }], { session });
    await audit(actorRequest(req, user, kind), 'session_refresh', 'session', record, {}, session);
    return { record, user };
  });
  if (!result) throw expired();
  return { token: tokenFor(result.record, result.user), raw: nextRaw, maxAge: Math.max(0, result.record.expiresAt.getTime() - Date.now()) };
}

export async function closeSession(raw, kind, req = {}) {
  if (typeof raw !== 'string' || !/^[a-f\d]{96}$/.test(raw)) return;
  await transaction(async session => {
    const credential = await RefreshCredential.findOne({ digest: digest(raw) }).session(session);
    if (!credential) return;
    const record = await AuthSession.findOneAndUpdate({ _id: credential.sessionId, subjectType: kind, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: 'logout' } }, { new: true, session });
    if (!record) return;
    const user = await modelFor(kind).findById(record.subjectId).session(session);
    await audit(actorRequest(req, user, kind), 'session_logout', 'session', record, {}, session);
  });
}

export async function validateAccessSession(decoded, kind) {
  if (!decoded.sid || decoded.kind !== kind) throw expired();
  const record = await AuthSession.findOne({ _id: decoded.sid, subjectType: kind, subjectId: decoded.id, revokedAt: null, expiresAt: { $gt: new Date() } });
  if (!record || record.sessionVersion !== (decoded.sv ?? 0)) throw expired();
  return record;
}
