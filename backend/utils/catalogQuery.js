import { text, number, choice, normalizePropertyType, normalizePurpose, stringArray, ContractError } from '@buildestate/contracts';
import { escapeRegex } from './pagination.js';

export const publicListingQuery = () => ({ $and: [
  { archivedAt: null },
  { $or: [{ hiddenByModeration: { $ne: true } }, { moderationUntil: { $ne: null, $lte: new Date() } }] },
  { $or: [{ status: 'active' }, { status: { $exists: false } }] },
  { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
] });

export function catalogQuery(params, base = {}) {
  const conditions = [base];
  for (const [param, fields] of [['search', ['title', 'location', 'type']], ['location', ['location']]]) {
    if (params[param] !== undefined && text(params[param], param, { min: 0 }).trim()) conditions.push({ $or: fields.map(field => ({ [field]: { $regex: escapeRegex(params[param].trim()), $options: 'i' } })) });
  }
  if (params.type !== undefined && params.type !== 'all') {
    text(params.type, 'type', { max: 200 });
    params.type.split(',').forEach(normalizePropertyType);
    const aliases = { apartment: ['Flat', 'Apartment'], flat: ['Flat', 'Apartment'], office: ['Office', 'Commercial'], commercial: ['Office', 'Commercial'] };
    conditions.push({ type: { $in: params.type.split(',').flatMap(t => aliases[t.toLowerCase()] || [t]) } });
  }
  if (params.availability) {
    const sale = ['buy', 'sale', 'for sale'];
    const rent = ['rent', 'for rent'];
    normalizePurpose(params.availability);
    const requested = params.availability.toLowerCase();
    const aliases = sale.includes(requested) ? sale : rent.includes(requested) ? rent : [requested];
    conditions.push({ availability: { $in: aliases.map(a => new RegExp(`^${escapeRegex(a)}$`, 'i')) } });
  }
  for (const [param, field, op] of [['minPrice', 'price', '$gte'], ['maxPrice', 'price', '$lte'], ['bedrooms', 'beds', '$gte'], ['bathrooms', 'baths', '$gte']]) {
    if (params[param] !== undefined) conditions.push({ [field]: { [op]: number(params[param], param) } });
  }
  if (params.amenities !== undefined) conditions.push({ amenities: { $all: stringArray(text(params.amenities, 'amenities', { max: 3000 }).split(','), 'amenities') } });
  if (params.minPrice !== undefined && params.maxPrice !== undefined && Number(params.minPrice) > Number(params.maxPrice)) throw new ContractError('Invalid price range', 'minPrice');
  return { $and: conditions };
}

export function catalogSort(sort = 'newest') {
  choice(sort, ['featured', 'newest', 'price-low', 'price-high', 'beds'], 'sort');
  return { ...(sort === 'price-low' ? { price: 1 } : sort === 'price-high' ? { price: -1 } : sort === 'beds' ? { beds: -1 } : { createdAt: -1 }), _id: -1 };
}

export const effectiveListingStatus = (now = new Date()) => ({ $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $ne: [{ $ifNull: ['$expiresAt', null] }, null] }, { $lte: ['$expiresAt', now] }] }, 'expired', { $ifNull: ['$status', 'active'] }] });
export function listingStatusQuery(status) {
  if (status === 'active') return { status: 'active', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
  if (status === 'expired') return { $or: [{ status: 'expired' }, { status: 'active', expiresAt: { $ne: null, $lte: new Date() } }] };
  return { status };
}
