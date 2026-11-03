import { keys, text, number, choice, pageDTO } from '@buildestate/contracts';
import Form from '../models/formModel.js';
import News from '../models/newsModel.js';
import { pagination, escapeRegex } from '../utils/pagination.js';
import { handler, conflict, missing } from '../utils/httpErrors.js';
import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';

const list = (Model, statuses, field) => handler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status && req.query.status !== 'all') {
    const status = choice(req.query.status, statuses, 'status');
    // Existing records without a state are never presumed confirmed.
    if (status === statuses[0]) filter.$or = [{ status }, { status: { $exists: false } }];
    else filter.status = status;
  }
  if (req.query.search) filter.email = { $regex: escapeRegex(text(req.query.search, 'search')), $options: 'i' };
  const projection = field === 'subscribers' ? 'email status createdAt confirmedAt unsubscribedAt __v' : 'name email phone message status adminNote createdAt __v';
  const [rows, total] = await Promise.all([Model.find(filter).select(projection).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(), Model.countDocuments(filter)]);
  res.json({ success: true, [field]: rows.map(row => ({ ...row, status: row.status || statuses[0], version: row.__v || 0 })), pagination: pageDTO(total, page, limit) });
});
export const listLeads = list(Form, ['new', 'in_progress', 'resolved'], 'leads');
export const getLeadDetails = handler(async (req, res) => {
  const lead = await Form.findById(req.params.id).select('name email phone message status adminNote createdAt updatedAt __v').lean();
  if (!lead) throw missing('Inquiry not found');
  res.json({ success: true, lead: { ...lead, status: lead.status || 'new', version: lead.__v || 0 } });
});
export const listSubscribers = list(News, ['pending', 'confirmed', 'unsubscribed'], 'subscribers');
export const updateLead = handler(async (req, res) => {
  keys(req.body, ['status', 'adminNote', 'expectedVersion']);
  const status = choice(req.body.status, ['new', 'in_progress', 'resolved'], 'status');
  const adminNote = text(req.body.adminNote, 'adminNote', { min: 0, max: 2000 });
  const version = number(req.body.expectedVersion, 'expectedVersion', { integer: true });
  const lead = await transaction(async session => {
    const previous = await Form.findById(req.params.id).session(session);
    if (!previous) throw missing('Inquiry not found');
    if ((previous.__v || 0) !== version) throw conflict('Inquiry changed. Refresh before updating.');
    const row = await Form.findOneAndUpdate({ _id: previous._id, __v: previous.__v }, { $set: { status, adminNote }, $inc: { __v: 1 } }, { new: true, session });
    if (!row) throw conflict('Inquiry changed. Refresh before updating.');
    await audit(req, 'update_lead', 'lead', row, { previousStatus: previous.status || 'new', newStatus: status }, session);
    return row;
  });
  res.json({ success: true, lead: { ...lead.toObject(), version: lead.__v } });
});
export const suppressSubscriber = handler(async (req, res) => {
  keys(req.body, []);
  await transaction(async session => {
    const row = await News.findById(req.params.id).session(session);
    if (!row) throw missing('Subscriber not found');
    if (row.status === 'unsubscribed') return;
    await News.updateOne({ _id: row._id }, { $set: { status: 'unsubscribed', unsubscribedAt: new Date() }, $inc: { consentVersion: 1 } }, { session });
    await audit(req, 'suppress_subscriber', 'subscriber', row, {}, session);
  });
  res.json({ success: true, message: 'Address suppressed. Only the recipient can confirm a new subscription.' });
});
