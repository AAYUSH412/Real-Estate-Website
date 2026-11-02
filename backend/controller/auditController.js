import { text, choice, ContractError } from '@buildestate/contracts';
import AdminActivityLog from '../models/adminActivityLogModel.js';
import { pagination, pageMetadata } from '../utils/pagination.js';
import { handler } from '../utils/httpErrors.js';

function auditQuery(input) {
  const query = {};
  if (input.action !== undefined) query.action = text(input.action, 'action', { max: 100 });
  if (input.adminEmail !== undefined) query.adminEmail = text(input.adminEmail, 'adminEmail', { max: 254 });
  if (input.targetType !== undefined) query.targetType = choice(input.targetType, ['user', 'property', 'appointment', 'aiModel', 'session', 'lead', 'subscriber'], 'targetType');
  for (const name of ['startDate', 'endDate']) if (input[name] !== undefined) {
    const raw = text(input[name], name, { max: 40 });
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime()) || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw) || date.toISOString().slice(0, 10) !== raw.slice(0, 10)) throw new ContractError(`Invalid ${name}`, name);
    query.createdAt ||= {};
    if (name === 'startDate') query.createdAt.$gte = date;
    else query.createdAt.$lt = raw.length === 10 ? new Date(date.getTime() + 86400000) : date;
  }
  if (query.createdAt?.$gte >= query.createdAt?.$lt) throw new ContractError('Invalid date range', 'startDate');
  return query;
}
export const getActivityLogs = handler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const query = auditQuery(req.query);
  const [total, logs] = await Promise.all([AdminActivityLog.countDocuments(query), AdminActivityLog.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)]);
  res.json({ success: true, logs, pagination: { ...pageMetadata(total, page, limit), totalLogs: total } });
});

const cell = value => {
  let s = String(value ?? '');
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export const exportActivityLogs = handler(async (req, res) => {
  const query = auditQuery(req.query);
  res.attachment('activity-logs.csv'); res.type('text/csv');
  res.write('Timestamp,Admin,Action,Target Type,Target,Reason,IP Address\r\n');
  const cursor = AdminActivityLog.find(query).sort({ createdAt: -1, _id: -1 }).limit(10000).lean().cursor();
  try {
    for await (const log of cursor) {
      if (res.destroyed) break;
      const row = [log.createdAt.toISOString(), log.adminEmail, log.action, log.targetType, log.targetName, log.metadata?.reason, log.ipAddress].map(cell).join(',') + '\r\n';
      if (!res.write(row)) await new Promise(resolve => { const done = () => { res.off('drain', done); res.off('close', done); resolve(); }; res.once('drain', done); res.once('close', done); });
    }
  } finally { await cursor.close(); }
  if (!res.destroyed) res.end();
});
