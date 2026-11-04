// Explicit maintenance override, not the normal appointment transition workflow.
// Default: inventory only. --apply: private backup, transactional updates and audit.
import '../config/environment.js';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import Appointment from '../models/appointmentModel.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';

const apply = process.argv.includes('--apply');
const runId = randomUUID();
try {
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
  const records = await Appointment.collection.find({}).sort({ _id: 1 }).toArray();
  const affected = records.filter(record => record.status !== 'completed' || record.activeReservation !== false);
  const states = records.reduce((counts, record) => {
    counts[record.status] = (counts[record.status] || 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'inventory', total: records.length, states, affected: affected.length,
    futureAffected: affected.filter(record => record.endsAt && record.endsAt > new Date()).length }));
  if (apply && affected.length) {
    const backupDirectory = path.join(os.tmpdir(), 'buildestate-appointment-backups');
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    const backup = path.join(backupDirectory, `${runId}.ejson`);
    await writeFile(backup, EJSON.stringify({ runId, createdAt: new Date(), database: mongoose.connection.name, records: affected }), { mode: 0o600, flag: 'wx' });
    await transaction(async session => {
      // Abort if any appointment changed after inventory/backup.
      // The transaction's read must use its session to protect the snapshot.
      const snapshot = await Appointment.collection.find({}, { session }).sort({ _id: 1 }).toArray();
      if (EJSON.stringify(snapshot) !== EJSON.stringify(records)) throw new Error('Appointments changed after backup; rerun inventory.');
      for (const record of affected) {
        const result = await Appointment.collection.updateOne({ _id: record._id, ...(record.__v === undefined ? { __v: { $exists: false } } : { __v: record.__v }) }, {
          $set: { status: 'completed', activeReservation: false, updatedAt: new Date() }, $inc: { __v: 1 },
        }, { session });
        if (result.modifiedCount !== 1) throw new Error('Concurrent appointment change; transaction aborted.');
        await audit({ headers: {}, requestId: runId }, 'appointment_maintenance_completed', 'appointment', record._id,
          { runId, previousStatus: record.status, previousVersion: record.__v ?? null, reason: 'Owner requested all appointments completed, including future/cancelled records', maintenanceOverride: true, notificationsSent: false }, session);
      }
    });
    console.log(JSON.stringify({ updated: affected.length, backup, notificationsSent: false }));
  }
  if (apply) console.log(JSON.stringify({ verifiedTotal: await Appointment.countDocuments(), remainingNotCompleted: await Appointment.countDocuments({ status: { $ne: 'completed' } }), remainingReservations: await Appointment.countDocuments({ activeReservation: true }) }));
} catch (error) {
  console.error('Appointment maintenance failed:', error.code || error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
