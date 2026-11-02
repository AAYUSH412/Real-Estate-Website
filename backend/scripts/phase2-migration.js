import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { email, parseListing, BOOKING_TIME_ZONE, propertyDTO } from '@buildestate/contracts';
import Property from '../models/propertyModel.js';
import User, { Admin } from '../models/userModel.js';
import Appointment from '../models/appointmentModel.js';
import AIModel from '../models/aiModelModel.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';

export function canonicalTime(time) {
  if (typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return time;
  const match = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i.exec(String(time));
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) throw new Error('Unrecognized booking time');
  return `${String(Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${match[2]}`;
}

// Historical slots may predate the current six-slot booking policy.
export function legacyBookingInstant(date, time) {
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) throw new Error('Invalid legacy booking date');
  return new Date(`${date}T${canonicalTime(time)}:00+05:30`);
}

// Preflight is read-only. Report only collection/id/reason, never credentials or contact data.
export async function migratePhase2({ apply = false } = {}) {
  const blockers = [], plans = [];
  const properties = new Map(), users = new Map(), slots = new Map();
  const issue = (model, row, message) => blockers.push({ collection: model.collection.name, id: String(row._id), message });
  for (const Model of [User, Admin]) {
    const addresses = new Map();
    for await (const row of Model.collection.find({})) {
      try {
        const normalized = email(row.email);
        if (addresses.has(normalized)) issue(Model, row, `Normalized email collision with ${addresses.get(normalized)}`);
        addresses.set(normalized, String(row._id));
        plans.push({ Model, row, update: { email: normalized, sessionVersion: row.sessionVersion || 0, sessionFence: row.sessionFence || 0 } });
        if (Model === User) users.set(String(row._id), row);
      } catch (error) { issue(Model, row, error.message); }
    }
  }
  for await (const row of Property.collection.find({})) {
    properties.set(String(row._id), row);
    try {
      const dto = propertyDTO(row, true);
      const fields = Object.fromEntries(['title', 'location', 'price', 'beds', 'baths', 'sqft', 'type', 'description', 'phone'].map(key => [key, row[key]]));
      const normalized = parseListing({ ...fields, purpose: dto.purpose, amenities: dto.amenities });
      if (row.postedBy && !users.has(String(row.postedBy))) throw new Error('Missing listing owner; resolve ownership explicitly');
      const owner = users.get(String(row.postedBy));
      plans.push({ Model: Property, row, update: { ...normalized, moderationUntil: owner?.status === 'suspended' ? owner.suspendedUntil || null : null, marketStatus: row.marketStatus || (row.availability === 'sold' ? 'sold' : 'available'), hiddenByModeration: Boolean(owner && (owner.status === 'banned' || owner.status === 'deleted' || (owner.status === 'suspended' && owner.suspendedUntil > new Date()))), status: row.status || 'active' } });
    } catch (error) { issue(Property, row, error.message); }
  }
  for await (const row of Appointment.collection.find({})) {
    try {
      const date = new Date(row.date).toISOString().slice(0, 10), time = canonicalTime(row.time);
      const startsAt = legacyBookingInstant(date, time), endsAt = new Date(startsAt.getTime() + 3600000);
      const property = properties.get(String(row.propertyId)), user = users.get(String(row.userId));
      if (!property && !row.propertySnapshot?.title) throw new Error('Missing property and historical snapshot');
      if (row.userId && !user && !row.contactSnapshot?.email && !row.contactSnapshot?.unavailable) throw new Error('Missing user and historical contact snapshot');
      const activeReservation = ['pending', 'confirmed'].includes(row.status);
      if (activeReservation) {
        const key = `${row.propertyId}:${startsAt.toISOString()}`;
        if (slots.has(key)) issue(Appointment, row, `Duplicate active slot with ${slots.get(key)}; choose cancellation explicitly`);
        slots.set(key, String(row._id));
      }
      plans.push({ Model: Appointment, row, update: { time, startsAt, endsAt, timeZone: BOOKING_TIME_ZONE, activeReservation,
        propertySnapshot: row.propertySnapshot?.title ? row.propertySnapshot : { title: property.title, location: property.location, image: property.image, phone: property.phone },
        contactSnapshot: row.contactSnapshot?.email || row.contactSnapshot?.unavailable ? row.contactSnapshot : { name: user?.name || row.guestInfo?.name || '', email: user?.email || row.guestInfo?.email || '', phone: row.guestInfo?.phone || '' } } });
    } catch (error) { issue(Appointment, row, error.message); }
  }
  if (await AIModel.countDocuments({ isDefault: true }) > 1) blockers.push({ collection: AIModel.collection.name, message: 'Multiple default AI models; select one explicitly' });
  const report = { mode: apply ? 'apply' : 'dry-run', planned: plans.length, blockers, applied: 0 };
  if (!apply || blockers.length) return report;
  // Run only during a maintenance window: each row is CAS protected; rerun safely after interruption.
  for (const { Model, row, update } of plans) {
    await transaction(async session => {
      const result = await Model.collection.updateOne({ _id: row._id, ...(row.__v === undefined ? { __v: { $exists: false } } : { __v: row.__v }), ...(row.updatedAt && { updatedAt: row.updatedAt }) }, { $set: update }, { session });
      if (!result.matchedCount) throw new Error(`Concurrent write to ${Model.collection.name}/${row._id}; stop traffic and rerun preflight`);
      await audit({}, 'phase2_migration', Model === Property ? 'property' : Model === Appointment ? 'appointment' : 'user', row, { collection: Model.collection.name }, session);
    });
    report.applied++;
  }
  await Appointment.createIndexes();
  await Property.createIndexes();
  await AIModel.createIndexes();
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI explicitly; no .env files are loaded');
    if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/phase2-migration.js [--apply]');
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
    const report = await migratePhase2({ apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(report, null, 2));
    if (report.blockers.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
