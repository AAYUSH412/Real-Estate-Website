import mongoose from 'mongoose';
import { BOOKING_TIME_ZONE, BOOKING_STATUSES } from '@buildestate/contracts';

const appointmentSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Optional — supports guest bookings
  },
  guestInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  startsAt: Date,
  endsAt: Date,
  timeZone: { type: String, default: BOOKING_TIME_ZONE },
  activeReservation: { type: Boolean, default: true },
  propertySnapshot: { title: String, location: String, image: [String], phone: String, unavailable: Boolean },
  contactSnapshot: { name: String, email: String, phone: String, unavailable: Boolean },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: BOOKING_STATUSES,
    default: 'pending'
  },
  meetingLink: {
    type: String,
    trim: true
  },
  meetingPlatform: {
    type: String,
    enum: ['zoom', 'google-meet', 'teams', 'other'],
    default: 'other'
  },
  notes: {
    type: String
  },
  cancelReason: {
    type: String
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  }
}, {
  timestamps: true, optimisticConcurrency: true
});

appointmentSchema.index({ propertyId: 1, startsAt: 1 }, { unique: true, name: 'one_active_property_slot', partialFilterExpression: { activeReservation: true, startsAt: { $type: 'date' } } });
appointmentSchema.index({ userId: 1, startsAt: 1, status: 1 });
// Add indexes for better query performance
appointmentSchema.index({ userId: 1, date: -1 });
appointmentSchema.index({ propertyId: 1, date: -1 });
appointmentSchema.index({ status: 1 });

appointmentSchema.index({ status: 1, createdAt: -1, _id: -1 });
appointmentSchema.index({ userId: 1, createdAt: -1, _id: -1 });
const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;