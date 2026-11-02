import jwt from 'jsonwebtoken';
import { ContractError, id, text } from '@buildestate/contracts';

export function newsletterToken(record, purpose) {
  return jwt.sign({ sub: String(record._id), purpose, version: record.consentVersion || 0 }, process.env.JWT_SECRET,
    { algorithm: 'HS256', audience: 'buildestate-newsletter', expiresIn: purpose === 'confirm' ? '24h' : '365d' });
}
export function readNewsletterToken(token, purpose) {
  try {
    const payload = jwt.verify(text(token, 'token', { max: 2000 }), process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'buildestate-newsletter' });
    if (payload.purpose !== purpose) throw new Error('Wrong token purpose');
    id(payload.sub);
    return payload;
  } catch { throw new ContractError('This newsletter link is invalid or expired. Request a new email from the subscription form.', 'token'); }
}
