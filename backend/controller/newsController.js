import News from '../models/newsModel.js';
import { keys } from '@buildestate/contracts';
import { handler, missing } from '../utils/httpErrors.js';
import { newsletterToken, readNewsletterToken } from '../utils/newsletterTokens.js';
import emailService from '../services/emailService.js';

export const submitNewsletter = handler(async (req, res) => {
  const email = req.body.email;
  let record = await News.findOne({ email }).lean();
  if (!record) {
    try { record = await News.create({ email, status: 'pending', consentVersion: 0 }); }
    catch (error) { if (error.code !== 11000) throw error; record = await News.findOne({ email }).lean(); }
  }
  if (record.consentVersion === undefined || !record.status) {
    await News.collection.updateOne({ _id: record._id }, [{ $set: { consentVersion: { $ifNull: ['$consentVersion', 0] }, status: { $ifNull: ['$status', 'pending'] } } }]);
    record = await News.findById(record._id).lean();
  }
  // A suppressed address can request a new confirmation, but stays suppressed until it is used.
  const site = process.env.WEBSITE_URL || 'https://buildestate.vercel.app';
  const confirm = `${site}/newsletter/confirm?token=${encodeURIComponent(newsletterToken(record, 'confirm'))}`;
  const unsubscribe = `${site}/unsubscribe?token=${encodeURIComponent(newsletterToken(record, 'unsubscribe'))}`;
  try {
    await emailService.sendEmail(email, 'Confirm your BuildEstate newsletter subscription',
      `<!doctype html><html lang="en"><body><h1>Confirm your subscription</h1><p>You requested property news from BuildEstate. Confirm only if you want these emails.</p><p><a href="${confirm}">Confirm subscription</a> (expires in 24 hours)</p><p>If you did not request this, ignore this email or <a href="${unsubscribe}">unsubscribe</a>.</p></body></html>`);
  } catch {
    return res.status(503).json({ success: false, message: 'The confirmation email could not be sent. Please try the subscription form again later.' });
  }
  res.json({ success: true, message: 'Check your inbox and confirm to receive newsletters.' });
});
export const confirmNewsletter = handler(async (req, res) => {
  keys(req.body, ['token']);
  const payload = readNewsletterToken(req.body.token, 'confirm');
  const record = await News.findOneAndUpdate({ _id: payload.sub, consentVersion: payload.version },
    { $set: { status: 'confirmed', confirmedAt: new Date(), consentSource: 'email-confirmation' }, $unset: { unsubscribedAt: 1 } }, { new: true });
  if (!record) throw missing('This confirmation was revoked. Request a new confirmation email.');
  res.json({ success: true, message: 'Subscription confirmed. You can unsubscribe using the link in your email.' });
});
export const unsubscribeNewsletter = handler(async (req, res) => {
  keys(req.body, ['token']);
  const payload = readNewsletterToken(req.body.token, 'unsubscribe');
  // Opt-out links remain valid after later opt-outs; confirmation links are revoked each time.
  await News.updateOne({ _id: payload.sub, status: { $ne: 'unsubscribed' } }, { $set: { status: 'unsubscribed', unsubscribedAt: new Date() }, $inc: { consentVersion: 1 } });
  res.json({ success: true, message: 'You have been unsubscribed.' });
});
