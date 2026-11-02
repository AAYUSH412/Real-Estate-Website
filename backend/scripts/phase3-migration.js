import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { email } from '@buildestate/contracts';
import News from '../models/newsModel.js';
import Form from '../models/formModel.js';

// Run against a backup/rehearsal first, then stop writes before --apply.
// Existing addresses never become confirmed without an actual recipient action.
export async function migratePhase3({ apply = false } = {}) {
  const rows = await News.collection.find({}).toArray();
  const seen = new Set(), blockers = [], plans = [];
  for (const row of rows) {
    try {
      const normalized = email(row.email);
      if (seen.has(normalized)) { blockers.push({ id: String(row._id), reason: 'Duplicate normalized newsletter address; reconcile suppression/consent explicitly' }); continue; }
      seen.add(normalized);
      const update = { email: normalized, status: row.status || 'pending', consentVersion: row.consentVersion || 0 };
      if (!['pending', 'confirmed', 'unsubscribed'].includes(update.status)) throw new Error('Invalid subscriber status');
      if (update.status === 'confirmed' && (!row.confirmedAt || row.consentSource !== 'email-confirmation')) throw new Error('Confirmed subscriber lacks recipient consent evidence');
      if (Object.entries(update).some(([key, value]) => row[key] !== value)) plans.push({ row, update });
    } catch { blockers.push({ id: String(row._id), reason: 'Invalid email or unsupported consent state' }); }
  }
  const report = { mode: apply ? 'apply' : 'dry-run', subscribers: rows.length, planned: plans.length, blockers, applied: 0 };
  if (!apply || blockers.length) return report;
  for (const { row, update } of plans) {
    const result = await News.collection.updateOne({ _id: row._id, email: row.email, status: row.status ?? { $exists: false }, consentVersion: row.consentVersion ?? { $exists: false } }, { $set: update });
    if (!result.matchedCount) throw new Error('Concurrent subscriber change; stop writes and repeat preflight');
    report.applied++;
  }
  await Form.collection.updateMany({ status: { $exists: false } }, [{ $set: { status: 'new', adminNote: { $ifNull: ['$adminNote', ''] }, __v: { $ifNull: ['$__v', 0] } } }]);
  await News.createIndexes(); await Form.createIndexes();
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI explicitly; no .env files loaded');
    if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/phase3-migration.js [--apply]');
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
    const report = await migratePhase3({ apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(report, null, 2)); if (report.blockers.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
