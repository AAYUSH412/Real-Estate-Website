import { handler } from '../utils/httpErrors.js';
import { schedule, changeBooking, populatedBooking } from '../services/domain/bookings.js';
import { pagination, pageMetadata, escapeRegex } from '../utils/pagination.js';
import { BOOKING_STATUSES, choice, text, keys, appointmentDTO } from '@buildestate/contracts';
import Appointment from '../models/appointmentModel.js';
import User from '../models/userModel.js';
import emailService from '../services/emailService.js';
import { getMeetingLinkTemplate } from '../email.js';

const notify = async work => { try { await work(); } catch (error) { console.error('Booking notification failed:', error.message); } };
export const scheduleViewing = handler(async (req, res) => {
  const appointment = await schedule(req.body, req);
  const dto = await populatedBooking(appointment);
  await notify(() => emailService.sendAppointmentScheduled(appointment.contactSnapshot.email, appointment, appointment.date, appointment.time, appointment.notes));
  await notify(() => emailService.sendAppointmentNotificationToAdmin(appointment, appointment.contactSnapshot));
  res.status(201).json({ success: true, appointment: dto, message: 'Viewing scheduled successfully' });
});

export const mutation = mode => handler(async (req, res) => {
  const allowed = { status: ['appointmentId', 'status', 'reason', 'expectedVersion'], cancel: ['reason', 'expectedVersion'], feedback: ['rating', 'comment', 'expectedVersion'], meeting: ['appointmentId', 'meetingLink', 'expectedVersion'] }[mode];
  keys(req.body, allowed);
  const appointment = await changeBooking(req.params.id || req.body.appointmentId, req.body, req, mode);
  const dto = await populatedBooking(appointment);
  const recipient = appointment.contactSnapshot?.email || appointment.userId?.email || appointment.guestInfo?.email;
  if (recipient && mode === 'meeting') await notify(() => emailService.sendEmailSafely(recipient, 'Your meeting link', getMeetingLinkTemplate(appointment, appointment.meetingLink)));
  else if (recipient && ['status', 'cancel'].includes(mode)) await notify(() => emailService.sendAppointmentStatusUpdate(recipient, appointment, appointment.status));
  res.json({ success: true, appointment: dto, message: 'Appointment updated' });
});
export const updateAppointmentStatus = mutation('status');
export const cancelAppointment = mutation('cancel');
export const submitAppointmentFeedback = mutation('feedback');
export const updateAppointmentMeetingLink = mutation('meeting');

export const listBookings = (admin = false) => handler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const query = admin ? {} : { userId: req.user._id };
  if (req.query.status && req.query.status !== 'all') query.status = choice(req.query.status, BOOKING_STATUSES, 'status');
  if (req.query.search) {
    const value = { $regex: escapeRegex(text(req.query.search, 'search')), $options: 'i' };
    const users = await User.find({ $or: [{ name: value }, { email: value }] }).select('_id').limit(1000);
    query.$or = [{ 'propertySnapshot.title': value }, { 'contactSnapshot.name': value }, { 'contactSnapshot.email': value }, { 'guestInfo.name': value }, { 'guestInfo.email': value }, { userId: { $in: users.map(user => user._id) } }];
  }
  const [total, appointments, upcomingCount, grouped] = await Promise.all([
    Appointment.countDocuments(query), Appointment.find(query).populate('propertyId', 'title location image').populate('userId', 'name email').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Appointment.countDocuments({ ...(admin ? {} : { userId: req.user._id }), status: { $in: ['pending', 'confirmed'] }, startsAt: { $gt: new Date() } }),
    Appointment.aggregate([{ $match: admin ? {} : { userId: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, appointments: appointments.map(appointmentDTO), pagination: { ...pageMetadata(total, page, limit), totalAppointments: total }, upcomingCount, statusCounts: Object.fromEntries(grouped.map(r => [r._id, r.count])) });
});
export const getAllAppointments = listBookings(true);
export const getAppointmentsByUser = listBookings(false);
export const getUpcomingAppointments = handler(async (req, res) => {
  const appointments = await Appointment.find({ userId: req.user._id, startsAt: { $gt: new Date() }, status: { $in: ['pending', 'confirmed'] } }).populate('propertyId', 'title location image').sort({ startsAt: 1 }).limit(5);
  res.json({ success: true, appointments: appointments.map(appointmentDTO) });
});
