import User from '../../models/userModel.js';
import Property from '../../models/propertyModel.js';
import { transaction } from './transaction.js';
import { audit } from './audit.js';
import { cancelOpenBookings } from './archival.js';

export async function restoreExpiredSuspension(userId) {
  return transaction(async session => {
    const user = await User.findOneAndUpdate({ _id: userId, status: 'suspended', suspendedUntil: { $ne: null, $lte: new Date() } },
      { $set: { status: 'active', suspendedUntil: null, suspendReason: '' }, $inc: { __v: 1 } }, { new: true, session });
    if (!user) return false;
    await Property.updateMany({ postedBy: user._id, status: { $ne: 'archived' }, hiddenByModeration: true }, { $set: { hiddenByModeration: false, moderationUntil: null }, $inc: { __v: 1 } }, { session });
    await audit({}, 'auto_unsuspend_user', 'user', user, { previousStatus: 'suspended', newStatus: 'active' }, session);
    return true;
  });
}
export async function reconcileSuspensions() {
  let count = 0;
  const cursor = User.find({ status: 'suspended', suspendedUntil: { $ne: null, $lte: new Date() } }).select('_id').lean().cursor();
  for await (const user of cursor) if (await restoreExpiredSuspension(user._id)) count++;
  return count;
}
export async function reconcileExpiredListings() {
  let count = 0;
  const cursor = Property.find({ status: 'active', expiresAt: { $ne: null, $lte: new Date() } }).select('_id').lean().cursor();
  for await (const row of cursor) { const changed = await transaction(async session => {
    const property = await Property.findOneAndUpdate({ _id: row._id, status: 'active', expiresAt: { $ne: null, $lte: new Date() } }, { $set: { status: 'expired' }, $inc: { __v: 1 } }, { new: true, session });
    if (!property) return;
    await cancelOpenBookings({ propertyId: property._id }, 'Listing expired', {}, session);
    await audit({}, 'expire_property', 'property', property, { previousStatus: 'active', newStatus: 'expired' }, session);
    return true;
  }); if (changed) count++; }
  return count;
}
