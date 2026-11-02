// Explicitly opt-in repair for the owner's demo property data. Never touches user/admin accounts.
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import Property from '../models/propertyModel.js';
import Appointment from '../models/appointmentModel.js';
import User from '../models/userModel.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';

export async function repairDemoData({ apply = false, demoDataConfirmed = false } = {}) {
  if (!demoDataConfirmed) throw new Error('Demo-data confirmation is required');
  const properties = await Property.collection.find({}).toArray();
  const ids = new Set(properties.map(row => String(row._id)));
  const plans = [];
  for (const row of properties) {
    const replacements = {}, previousFields = {};
    for (const [field, min, max, fallback, integer] of [['beds', 0, 100, 0, true], ['baths', 0, 100, 0, true], ['price', 1, 1e12, 1, false], ['sqft', 1, 1e12, 1, false]]) {
      const value = Number(row[field]);
      if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) { replacements[field] = fallback; previousFields[field] = row[field]; }
    }
    if (Object.keys(replacements).length) plans.push({ Model: Property, row, type: 'property', update: { ...replacements, status: 'archived', archivedAt: row.archivedAt || new Date(), archivedBy: 'phase2_demo_repair' }, reason: 'Invalid demo numeric fields; archived with explicit placeholder values', previousFields });
  }
  const userIds = new Set((await User.collection.find({}, { projection: { _id: 1 } }).toArray()).map(row => String(row._id)));
  const archivedIds = new Set(plans.map(plan => String(plan.row._id)));
  for await (const row of Appointment.collection.find({})) {
    const orphan = !ids.has(String(row.propertyId));
    const missingUser = Boolean(row.userId && !userIds.has(String(row.userId)));
    const linkedToArchive = archivedIds.has(String(row.propertyId));
    if (!orphan && !linkedToArchive && !missingUser) continue;
    const open = ['pending', 'confirmed'].includes(row.status);
    const update = {};
    if (orphan && !row.propertySnapshot?.unavailable) update.propertySnapshot = { ...(row.propertySnapshot || {}), title: row.propertySnapshot?.title || 'Unavailable demo property', location: row.propertySnapshot?.location || '', image: row.propertySnapshot?.image || [], phone: row.propertySnapshot?.phone || '', unavailable: true };
    if (missingUser && !row.contactSnapshot?.unavailable) update.contactSnapshot = { ...(row.contactSnapshot || {}), name: row.contactSnapshot?.name || row.guestInfo?.name || 'Unavailable account', email: row.contactSnapshot?.email || row.guestInfo?.email || '', phone: row.contactSnapshot?.phone || row.guestInfo?.phone || '', unavailable: true };
    if (open) Object.assign(update, { status: 'cancelled', activeReservation: false, cancelReason: orphan ? 'Original demo property no longer exists' : missingUser ? 'Original appointment account no longer exists' : 'Invalid demo listing archived' });
    else if ((orphan || missingUser) && row.activeReservation !== false) update.activeReservation = false;
    if (!Object.keys(update).length) continue;
    plans.push({ Model: Appointment, row, type: 'appointment', update, reason: orphan ? 'Retained history for missing demo property' : missingUser ? 'Retained history for previously deleted account' : 'Linked demo listing archived' });
  }
  const report = { mode: apply ? 'apply' : 'dry-run', archivedProperties: plans.filter(p => p.type === 'property').length, repairedAppointments: plans.filter(p => p.type === 'appointment').length, cancelledAppointments: plans.filter(p => p.update.status === 'cancelled').length, applied: 0 };
  if (!apply) return report;
  for (const plan of plans) {
    const { Model, row, type, update, reason } = plan;
    await transaction(async session => {
      const result = await Model.collection.updateOne({ _id: row._id, __v: row.__v === undefined ? { $exists: false } : row.__v, ...(row.updatedAt && { updatedAt: row.updatedAt }) }, { $set: { ...update, updatedAt: new Date() }, $inc: { __v: 1 } }, { session });
      if (!result.matchedCount) throw new Error('Demo record changed; stop writes and rerun the dry run');
      await audit({}, 'phase2_demo_repair', type, row, { reason, previousStatus: row.status, newStatus: update.status || row.status, ...(type === 'property' && { previousFields: plan.previousFields, replacementFields: Object.keys(plan.previousFields) }) }, session);
    });
    report.applied++;
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI explicitly');
    if (process.argv.slice(2).some(arg => !['--apply', '--demo-data-confirmed'].includes(arg))) throw new Error('Unsupported argument');
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
    console.log(JSON.stringify(await repairDemoData({ apply: process.argv.includes('--apply'), demoDataConfirmed: process.argv.includes('--demo-data-confirmed') }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
