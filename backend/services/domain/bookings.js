import { eligibleOwner } from './review.js';
import { parseBooking, BOOKING_TRANSITIONS, BOOKING_STATUSES, safeUrl, text, number, choice, id, phone, appointmentDTO } from '@buildestate/contracts';
import Property from '../../models/propertyModel.js';
import Appointment from '../../models/appointmentModel.js';
import { publicListingQuery } from '../../utils/catalogQuery.js';
import { conflict, missing, denied } from '../../utils/httpErrors.js';
import { transaction } from './transaction.js';
import { audit } from './audit.js';

export async function schedule(body, req) {
  const input = parseBooking(body, Boolean(req.user));
  return transaction(async session => {
    if (req.user) await eligibleOwner(req.user._id, session);
    // The fence serializes reservations against archival, expiry edits and market changes.
    const property = await Property.findOneAndUpdate({ _id: input.propertyId, ...publicListingQuery(), marketStatus: { $nin: ['sold', 'rented'] }, $expr: { $ne: ['$availability', 'sold'] } }, { $inc: { bookingFence: 1 } }, { new: true, session });
    if (!property) throw missing('This property is unavailable for booking');
    // Compatibility guard until the explicit legacy-booking migration has run.
    const collision = await Appointment.exists({ propertyId: property._id, status: { $in: ['pending', 'confirmed'] }, $or: [{ startsAt: input.startsAt }, { date: input.date, time: input.time }] }).session(session);
    if (collision) throw conflict('This time slot is already reserved');
    const contact = req.user ? { name: req.user.name, email: req.user.email, phone: phone(body.phone, true) } : input.guestInfo;
    const [appointment] = await Appointment.create([{ ...input, ...(req.user && { userId: req.user._id }), activeReservation: true,
      propertySnapshot: { title: property.title, location: property.location, image: property.image, phone: property.phone }, contactSnapshot: contact }], { session });
    await audit(req, 'create_appointment', 'appointment', appointment, { propertyId: property._id, newStatus: 'pending' }, session);
    return appointment;
  });
}

export async function changeBooking(appointmentId, body, req, mode) {
  id(appointmentId, 'appointmentId');
  return transaction(async session => {
    const appointment = await Appointment.findById(appointmentId).session(session);
    if (!appointment) throw missing('Appointment not found');
    if (!req.admin && (!appointment.userId || String(appointment.userId) !== String(req.user?._id))) throw denied('Not authorized for this appointment');
    if (body.expectedVersion !== undefined && number(body.expectedVersion, 'expectedVersion', { integer: true }) !== (appointment.__v || 0)) throw conflict('Appointment changed. Refresh before updating.');
    const previousStatus = appointment.status;
    if (mode === 'feedback') {
      if (appointment.status !== 'completed') throw conflict('Feedback is available only after a completed viewing');
      if (appointment.feedback?.rating) throw conflict('Feedback has already been submitted');
      appointment.feedback = { rating: number(body.rating, 'rating', { min: 1, max: 5, integer: true }), comment: text(body.comment ?? '', 'comment', { min: 0, max: 2000 }) };
    } else if (mode === 'meeting') {
      if (!['pending', 'confirmed'].includes(appointment.status)) throw conflict('Meeting details cannot change after cancellation/completion');
      appointment.meetingLink = safeUrl(body.meetingLink, 'meetingLink');
      if (!appointment.meetingLink) throw conflict('A meeting link is required');
    } else {
      const next = mode === 'cancel' ? 'cancelled' : choice(body.status, BOOKING_STATUSES, 'status');
      if (!BOOKING_TRANSITIONS[appointment.status].includes(next)) throw conflict(`Cannot change ${appointment.status} to ${next}`);
      if (next === 'completed' && (!appointment.endsAt || appointment.endsAt > new Date())) throw conflict('A viewing can only be completed after its scheduled end');
      appointment.status = next;
      appointment.activeReservation = ['pending', 'confirmed'].includes(next);
      if (next === 'cancelled') appointment.cancelReason = text(body.reason ?? 'Cancelled by user', 'reason', { max: 2000 });
    }
    await appointment.save({ session });
    await audit(req, mode === 'meeting' ? 'update_meeting' : mode === 'feedback' ? 'appointment_feedback' : 'update_appointment', 'appointment', appointment, { previousStatus, newStatus: appointment.status, version: appointment.__v }, session);
    return appointment;
  });
}

export async function populatedBooking(appointment) {
  await appointment.populate([{ path: 'propertyId', select: 'title location image' }, { path: 'userId', select: 'name email' }]);
  return appointmentDTO(appointment);
}
