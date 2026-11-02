import { escapeRegex } from './pagination.js';

export const publicListingQuery = () => ({ $and: [
  { $or: [{ status: 'active' }, { status: { $exists: false } }] },
  { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
] });

export function catalogQuery(params, base = {}) {
  const conditions = [base];
  for (const [param, fields] of [['search', ['title', 'location', 'type']], ['location', ['location']]]) {
    if (typeof params[param] === 'string' && params[param].trim()) conditions.push({ $or: fields.map(field => ({ [field]: { $regex: escapeRegex(params[param].trim()), $options: 'i' } })) });
  }
  if (typeof params.type === 'string' && params.type !== 'all') {
    const aliases = { apartment: ['Flat', 'Apartment'], flat: ['Flat', 'Apartment'], office: ['Office', 'Commercial'], commercial: ['Office', 'Commercial'] };
    conditions.push({ type: { $in: params.type.split(',').flatMap(t => aliases[t.toLowerCase()] || [t]) } });
  }
  if (params.availability) {
    const sale = ['buy', 'sale', 'for sale'];
    const rent = ['rent', 'for rent'];
    const requested = String(params.availability).toLowerCase();
    const aliases = sale.includes(requested) ? sale : rent.includes(requested) ? rent : [requested];
    conditions.push({ availability: { $in: aliases.map(a => new RegExp(`^${escapeRegex(a)}$`, 'i')) } });
  }
  for (const [param, field, op] of [['minPrice', 'price', '$gte'], ['maxPrice', 'price', '$lte'], ['bedrooms', 'beds', '$gte'], ['bathrooms', 'baths', '$gte']]) {
    if (params[param] !== undefined && params[param] !== '' && Number.isFinite(Number(params[param])) && Number(params[param]) >= 0) conditions.push({ [field]: { [op]: Number(params[param]) } });
  }
  if (typeof params.amenities === 'string' && params.amenities) conditions.push({ amenities: { $all: params.amenities.split(',').slice(0, 30) } });
  return { $and: conditions };
}

export function catalogSort(sort) {
  return { ...(sort === 'price-low' ? { price: 1 } : sort === 'price-high' ? { price: -1 } : sort === 'beds' ? { beds: -1 } : { createdAt: -1 }), _id: -1 };
}
