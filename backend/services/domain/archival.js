import Property from '../../models/propertyModel.js';
import User from '../../models/userModel.js';
import Appointment from '../../models/appointmentModel.js';
import { AuthSession } from '../../models/authSessionModel.js';
import { transaction, afterCommit } from './transaction.js';
import emailService from '../emailService.js';
import { audit } from './audit.js';
import { id, number, propertyDTO } from '@buildestate/contracts';
import { missing, conflict } from '../../utils/httpErrors.js';
import { revokeSessionUpdate } from '../../utils/accountPolicy.js';

export async function cancelOpenBookings(query, reason, req, session) {
  const appointments = await Appointment.find({ ...query, status: { $in: ['pending', 'confirmed'] } }).session(session);
  for (const appointment of appointments) {
    const previousStatus = appointment.status;
    appointment.status = 'cancelled'; appointment.activeReservation = false; appointment.cancelReason = reason;
    await appointment.save({ session });
    await audit(req, 'cancel_appointment', 'appointment', appointment, { previousStatus, newStatus: 'cancelled', reason }, session);
    const snapshot = appointment.toObject();
    afterCommit(session, async () => {
      const recipient = snapshot.contactSnapshot?.email || snapshot.guestInfo?.email || (snapshot.userId && (await User.findById(snapshot.userId).select('email'))?.email);
      if (recipient) await emailService.sendAppointmentStatusUpdate(recipient, snapshot, 'cancelled');
    });
  }
  return appointments.length;
}

export async function archiveProperty(propertyId, req, session, expectedVersion = req.body?.expectedVersion) {
  id(String(propertyId));
  const query = { _id: propertyId, ...(req.user && { postedBy: req.user._id }) };
  const property = await Property.findOne(query).session(session);
  if (!property) throw missing('Listing not found');
  if (expectedVersion != null && number(expectedVersion, 'expectedVersion', { integer: true }) !== (property.__v || 0)) throw conflict('Listing changed. Refresh before archiving.');
  if (property.status === 'archived') throw conflict('Listing is already archived');
  const previousStatus = property.status;
  property.status = 'archived'; property.archivedAt = new Date(); property.archivedBy = req.admin?.email || String(req.user?._id || 'system');
  // Retain all media/reference records for booking history and controlled retention.
  await Property.updateOne({ _id: property._id, status: { $ne: 'archived' } }, { $set: { status: 'archived', archivedAt: property.archivedAt, archivedBy: property.archivedBy }, $inc: { __v: 1 } }, { session });
  property.__v = (property.__v || 0) + 1;
  const cancelled = await cancelOpenBookings({ propertyId: property._id }, 'Listing archived', req, session);
  await audit(req, 'delete_property', 'property', property, { previousStatus, newStatus: 'archived', cancelled }, session);
  return propertyDTO(property, true);
}
export const archiveListing = (propertyId, req) => {
  if (req.body?.expectedVersion !== undefined) number(req.body.expectedVersion, 'expectedVersion', { integer: true });
  return transaction(session => archiveProperty(propertyId, req, session));
};

export async function archiveUser(userId, req) {
  id(userId);
  const expectedVersion = req.body?.expectedVersion;
  if (expectedVersion !== undefined) number(expectedVersion, 'expectedVersion', { integer: true });
  return transaction(async session => {
    const previous = await User.findById(userId).session(session);
    if (!previous || previous.status === 'deleted') throw missing('User not found or already archived');
    if (expectedVersion !== undefined && (previous.__v || 0) !== expectedVersion) throw conflict('User changed. Refresh before archiving.');
    const user = await User.findOneAndUpdate({ _id: userId, __v: previous.__v, status: { $ne: 'deleted' } }, { $set: { status: 'deleted', deletedAt: new Date() }, ...revokeSessionUpdate, $inc: { ...revokeSessionUpdate.$inc, __v: 1 } }, { new: true, session });
    if (!user) throw missing('User not found or already archived');
    const properties = await Property.find({ postedBy: user._id, status: { $ne: 'archived' } }).select('_id').session(session);
    for (const property of properties) await archiveProperty(property._id, req, session, null);
    const cancelled = await cancelOpenBookings({ userId: user._id }, 'Account archived', req, session);
    await AuthSession.updateMany({ subjectId: user._id, subjectType: 'user', revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: 'account_archived' } }, { session });
    await audit(req, 'delete_user', 'user', user, { newStatus: 'deleted', archivedProperties: properties.length, cancelled }, session);
    return { archivedProperties: properties.length, cancelled };
  });
}
