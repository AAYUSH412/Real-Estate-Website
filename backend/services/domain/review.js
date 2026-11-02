import Property from '../../models/propertyModel.js';
import User from '../../models/userModel.js';
import { accountDenial } from '../../utils/accountPolicy.js';
import { id, number, text, propertyDTO } from '@buildestate/contracts';
import { missing, conflict } from '../../utils/httpErrors.js';
import { transaction } from './transaction.js';
import { audit } from './audit.js';

export async function eligibleOwner(ownerId, session) {
  if (!ownerId) return null;
  const user = await User.findOneAndUpdate({ _id: ownerId }, { $inc: { sessionFence: 1 } }, { new: true, session });
  if (!user || !user.isEmailVerified || accountDenial(user)) throw conflict('The listing owner is unavailable, banned or suspended');
  return user;
}

export async function reviewListing(propertyId, status, body, req, session) {
  id(propertyId);
  const expectedVersion = number(body.expectedVersion, 'expectedVersion', { integer: true });
  const reason = status === 'rejected' ? text(body.reason, 'reason', { max: 2000 }) : '';
  const property = await Property.findById(propertyId).session(session);
  if (!property) throw missing('Listing not found');
  if (property.status !== 'pending' || (property.__v || 0) !== expectedVersion) throw conflict('This listing changed or is no longer pending. Refresh the review queue.');
  await eligibleOwner(property.postedBy, session);
  // Canonicalize legacy rows before validated publication.
  const normalized = propertyDTO(property, true);
  property.type = normalized.type; property.availability = normalized.purpose; property.purpose = normalized.purpose;
  property.amenities = normalized.amenities;
  property.status = status; property.rejectionReason = reason;
  property.expiresAt = status === 'active' && property.postedBy ? new Date(Date.now() + 45 * 86400000) : null;
  if (status === 'active') property.publishedAt = new Date();
  await property.save({ session });
  await audit(req, status === 'active' ? 'approve_property' : 'reject_property', 'property', property, { previousStatus: 'pending', newStatus: status, reason, version: property.__v }, session);
  return propertyDTO(property, true);
}
export const review = (propertyId, status, body, req) => transaction(session => reviewListing(propertyId, status, body, req, session));
