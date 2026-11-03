import { keys, id, number, text, stringArray, ContractError } from '@buildestate/contracts';
import { handler, conflict, missing } from '../utils/httpErrors.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';
import { review, reviewListing } from '../services/domain/review.js';
import { archiveProperty, archiveUser, cancelOpenBookings } from '../services/domain/archival.js';
import User from '../models/userModel.js';
import Property from '../models/propertyModel.js';
import { AuthSession } from '../models/authSessionModel.js';
import { revokeSessionUpdate } from '../utils/accountPolicy.js';
import emailService from '../services/emailService.js';

const send = async fn => { try { await fn(); } catch (error) { console.error('Notification delivery failed:', error.message); } };
export const reviewHandler = status => handler(async (req, res) => {
  keys(req.body, status === 'active' ? ['expectedVersion'] : ['expectedVersion', 'reason']);
  const property = await review(req.params.id, status, req.body, req);
  const user = property.postedBy && await User.findById(property.postedBy);
  if (user) await send(() => status === 'active' ? emailService.sendListingApproved(user.email, property.title, String(property._id)) : emailService.sendListingRejected(user.email, property.title, req.body.reason));
  res.json({ success: true, property, message: `Listing ${status === 'active' ? 'approved' : 'rejected'}` });
});
export const approveListing = reviewHandler('active');
export const rejectListing = reviewHandler('rejected');

async function moderate(userId, action, body, req, session) {
  id(userId);
  const user = await User.findById(userId).session(session);
  if (!user || user.status === 'deleted') throw missing('User not found');
  const previousStatus = user.status;
  const allowed = { suspend: ['active'], ban: ['active', 'suspended'], unban: ['banned', 'suspended'] }[action];
  if (!allowed.includes(user.status)) throw conflict(`Cannot ${action} an account in ${user.status} state`);
  if (body.expectedVersion !== undefined && number(body.expectedVersion, 'expectedVersion', { integer: true }) !== (user.__v || 0)) throw conflict('User changed. Refresh before updating.');
  const reason = action === 'unban' ? '' : text(body.reason, 'reason', { max: 2000 });
  const changes = action === 'suspend' ? { status: 'suspended', suspendedUntil: new Date(Date.now() + number(body.days, 'days', { min: 1, max: 365, integer: true }) * 86400000), suspendReason: reason, suspendedAt: new Date(), suspendedBy: req.admin.email }
    : action === 'ban' ? { status: 'banned', banReason: reason, bannedAt: new Date(), bannedBy: req.admin.email }
      : { status: 'active', suspendedUntil: null, suspendReason: '', banReason: '', suspendedAt: null, bannedAt: null };
  const updated = await User.findOneAndUpdate({ _id: user._id, __v: user.__v, status: previousStatus }, { $set: changes, $inc: { ...revokeSessionUpdate.$inc, __v: 1 }, $unset: revokeSessionUpdate.$unset }, { new: true, session, runValidators: true });
  if (!updated) throw conflict('User changed');
  await AuthSession.updateMany({ subjectId: user._id, subjectType: 'user', revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: action } }, { session });
  await Property.updateMany({ postedBy: user._id, status: { $ne: 'archived' } }, { $set: { hiddenByModeration: action !== 'unban', moderationUntil: action === 'suspend' ? changes.suspendedUntil : null }, $inc: { __v: 1 } }, { session });
  if (action !== 'unban') {
    const propertyIds = await Property.find({ postedBy: user._id }).select('_id').session(session);
    await cancelOpenBookings({ $or: [{ userId: user._id }, { propertyId: { $in: propertyIds.map(p => p._id) } }] }, 'Account unavailable', req, session);
  }
  await audit(req, `${action}_user`, 'user', updated, { previousStatus, newStatus: updated.status, reason, ...(action === 'suspend' && { days: body.days }) }, session);
  return updated;
}
const notifyModeration = (user, action, body) => send(() => action === 'suspend' ? emailService.sendUserSuspended(user.email, user.name, body.days, body.reason, user.suspendedUntil) : action === 'ban' ? emailService.sendUserBanned(user.email, user.name, body.reason) : emailService.sendUserReactivated(user.email, user.name));

const moderationHandler = action => handler(async (req, res) => {
  keys(req.body, ['reason', 'days', 'expectedVersion']);
  const user = await transaction(session => moderate(req.params.id, action, req.body, req, session));
  await notifyModeration(user, action, req.body);
  res.json({ success: true, message: `Account ${user.status}`, user: { _id: user._id, name: user.name, email: user.email, status: user.status, suspendedUntil: user.suspendedUntil, version: user.__v } });
});
export const suspendUser = moderationHandler('suspend');
export const banUser = moderationHandler('ban');
export const unbanUser = moderationHandler('unban');
export const deleteUser = handler(async (req, res) => {
  const result = await archiveUser(req.params.id, req);
  res.json({ success: true, message: 'User archived; linked history retained', ...result });
});

function ids(input, field) {
  const values = stringArray(input, field, 100);
  if (!values.length) throw new ContractError('Select at least one record');
  return values.map(value => id(value, field));
}
const bulkModerate = action => handler(async (req, res) => {
  keys(req.body, ['userIds', 'reason', 'days', 'expectedVersions']);
  const selected = ids(req.body.userIds, 'userIds');
  if (req.body.expectedVersions !== undefined) {
    keys(req.body.expectedVersions, selected);
    for (const userId of selected) number(req.body.expectedVersions[userId], 'expectedVersions', { integer: true });
  }
  const results = await transaction(async session => {
    const rows = [];
    for (const userId of selected) { const user = await moderate(userId, action, { ...req.body, expectedVersion: req.body.expectedVersions?.[userId] }, req, session); rows.push({ id: userId, status: user.status }); }
    await audit(req, `bulk_${action}_users`, 'user', null, { count: rows.length, affectedIds: selected }, session);
    return rows;
  });
  for (const row of results) { const user = await User.findById(row.id); if (user) await notifyModeration(user, action, req.body); }
  res.json({ success: true, count: results.length, results, message: 'Selected accounts updated' });
});
export const bulkSuspendUsers = bulkModerate('suspend');
export const bulkBanUsers = bulkModerate('ban');

const bulkProperties = status => handler(async (req, res) => {
  keys(req.body, ['propertyIds', 'expectedVersions', 'reason']);
  const selected = ids(req.body.propertyIds, 'propertyIds');
  if (req.body.expectedVersions !== undefined) {
    keys(req.body.expectedVersions, selected);
    for (const propertyId of selected) number(req.body.expectedVersions[propertyId], 'expectedVersions', { integer: true });
  }
  const results = await transaction(async session => {
    const rows = [];
    for (const propertyId of selected) {
      const property = status === 'archived' ? await archiveProperty(propertyId, req, session, req.body.expectedVersions?.[propertyId]) : await reviewListing(propertyId, status, { reason: req.body.reason, expectedVersion: req.body.expectedVersions?.[propertyId] }, req, session);
      rows.push({ id: propertyId, status: property.status, version: property.version });
    }
    await audit(req, status === 'archived' ? 'bulk_delete_properties' : status === 'active' ? 'bulk_approve_properties' : 'bulk_reject_properties', 'property', null, { count: rows.length, affectedIds: selected }, session);
    return rows;
  });
  if (status !== 'archived') for (const propertyId of selected) {
    const property = await Property.findById(propertyId);
    const user = property?.postedBy && await User.findById(property.postedBy);
    if (user) await send(() => status === 'active' ? emailService.sendListingApproved(user.email, property.title, propertyId) : emailService.sendListingRejected(user.email, property.title, req.body.reason));
  }
  res.json({ success: true, count: results.length, results, message: 'Selected listings updated' });
});
export const bulkApproveProperties = bulkProperties('active');
export const bulkRejectProperties = bulkProperties('rejected');
export const bulkDeleteProperties = bulkProperties('archived');
