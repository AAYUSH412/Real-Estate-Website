export const CONTRACT_VERSION = 2;
export const PROPERTY_TYPES = Object.freeze(['Flat', 'House', 'Villa', 'Plot', 'Penthouse', 'Studio', 'Commercial']);
export const PURPOSES = Object.freeze(['sale', 'rent']);
export const LISTING_STATUSES = Object.freeze(['pending', 'active', 'rejected', 'expired', 'archived']);
export const MARKET_STATUSES = Object.freeze(['available', 'sold', 'rented']);
export const BOOKING_STATUSES = Object.freeze(['pending', 'confirmed', 'cancelled', 'completed']);
export const BOOKING_SLOTS = Object.freeze(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
export const BOOKING_TIME_ZONE = 'Asia/Kolkata';
export const BOOKING_TRANSITIONS = Object.freeze({ pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'], completed: [], cancelled: [] });

export class ContractError extends Error {
  constructor(message, field = 'request', statusCode = 400, code = 'INVALID_INPUT') {
    super(message); this.name = 'ContractError'; this.statusCode = statusCode; this.code = code;
    this.fields = { [field]: message };
  }
}
export function object(value, field = 'body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContractError(`${field} must be an object`, field);
  return value;
}
export function keys(value, allowed) {
  object(value);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new ContractError(`Unknown field: ${key}`, key);
  return value;
}
export function text(value, field, { min = 1, max = 200, optional = false } = {}) {
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new ContractError(`${field} must contain ${min}–${max} characters`, field);
  return value.trim();
}
export function number(value, field, { min = 0, max = 1e12, integer = false } = {}) {
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)) value = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) throw new ContractError(`Invalid ${field}`, field);
  return value;
}
export function id(value, field = 'id') {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new ContractError(`Invalid ${field}`, field);
  return value.toLowerCase();
}
export function choice(value, allowed, field) {
  if (!allowed.includes(value)) throw new ContractError(`Invalid ${field}`, field);
  return value;
}
export function email(value) {
  const normalized = text(value, 'email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new ContractError('Invalid email address', 'email');
  return normalized;
}
export function password(value, field = 'password') {
  if (typeof value !== 'string' || value.length < 8 || new TextEncoder().encode(value).length > 72) throw new ContractError(`${field} must have at least 8 characters and at most 72 UTF-8 bytes`, field);
  return value;
}
export function phone(value, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  const normalized = text(value, 'phone', { max: 30 });
  if (!/^\+?[\d\s()-]{7,30}$/.test(normalized) || normalized.replace(/\D/g, '').length < 7 || normalized.replace(/\D/g, '').length > 15) throw new ContractError('Invalid phone number', 'phone');
  return normalized;
}
export function safeUrl(value, field, googleOnly = false) {
  if (value === '' || value === undefined) return '';
  const input = text(value, field, { max: 2048 });
  let url;
  try { url = new URL(input); } catch { throw new ContractError(`Invalid ${field}`, field); }
  const hosts = ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'];
  if (url.protocol !== 'https:' || url.username || url.password || (googleOnly && !hosts.includes(url.hostname))) throw new ContractError(`Invalid ${field}: use an allowed HTTPS URL`, field);
  return url.href;
}
export function normalizePropertyType(value) {
  const raw = text(value, 'type', { max: 40 }).toLowerCase();
  const aliases = { apartment: 'Flat', office: 'Commercial', 'independent house': 'House', 'studio apartment': 'Studio', 'residential land': 'Plot' };
  return choice(aliases[raw] || PROPERTY_TYPES.find(t => t.toLowerCase() === raw), PROPERTY_TYPES, 'type');
}
export function normalizePurpose(value) {
  const raw = text(value, 'purpose', { max: 20 }).toLowerCase();
  return choice(({ buy: 'sale', 'for sale': 'sale', 'for rent': 'rent', sale: 'sale', rent: 'rent' })[raw], PURPOSES, 'purpose');
}
export function stringArray(value, field, max = 30) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { throw new ContractError(`Invalid ${field}`, field); } }
  if (!Array.isArray(value) || value.length > max) throw new ContractError(`Invalid ${field}`, field);
  return [...new Set(value.map(item => text(item, field, { max: 100 })))];
}
export function parseListing(input, { partial = false } = {}) {
  keys(input, ['id', 'title', 'location', 'price', 'beds', 'baths', 'sqft', 'type', 'purpose', 'availability', 'marketStatus', 'description', 'phone', 'googleMapLink', 'amenities', 'retainedImages', 'expectedVersion']);
  const result = {};
  for (const key of ['title', 'location', 'description']) if (!partial || input[key] !== undefined) result[key] = text(input[key], key, { max: key === 'description' ? 10000 : 300 });
  for (const key of ['price', 'beds', 'baths', 'sqft']) if (!partial || input[key] !== undefined) result[key] = number(input[key], key, { min: ['price', 'sqft'].includes(key) ? 1 : 0, max: ['beds', 'baths'].includes(key) ? 100 : 1e12, integer: ['beds', 'baths'].includes(key) });
  if (!partial || input.type !== undefined) result.type = normalizePropertyType(input.type);
  if (!partial || input.purpose !== undefined || input.availability !== undefined) {
    result.purpose = normalizePurpose(input.purpose ?? input.availability);
    if (input.purpose !== undefined && input.availability !== undefined && normalizePurpose(input.availability) !== result.purpose) throw new ContractError('Conflicting listing purposes', 'availability');
    result.availability = result.purpose; // compatibility alias; market state is separate
  }
  if (input.marketStatus !== undefined) result.marketStatus = choice(input.marketStatus, MARKET_STATUSES, 'marketStatus');
  if (!partial || input.phone !== undefined) result.phone = phone(input.phone);
  if (input.googleMapLink !== undefined) result.googleMapLink = safeUrl(input.googleMapLink, 'googleMapLink', true);
  if (input.amenities !== undefined) result.amenities = stringArray(input.amenities, 'amenities');
  return result;
}
export function parsePage(input = {}, defaultLimit = 20) {
  object(input, 'query');
  const page = number(input.page ?? 1, 'page', { min: 1, max: 100000, integer: true });
  const limit = number(input.limit ?? defaultLimit, 'limit', { min: 1, max: 100, integer: true });
  return { page, limit, skip: (page - 1) * limit };
}
export function pageDTO(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return { currentPage: page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
}
export function bookingInstant(date, time) {
  const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : new Date(NaN);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) throw new ContractError('Invalid booking date', 'date');
  choice(time, BOOKING_SLOTS, 'time');
  return new Date(`${date}T${time}:00+05:30`);
}
export function parseBooking(input, authenticated = false, now = Date.now()) {
  keys(input, ['propertyId', 'date', 'time', 'notes', 'message', 'name', 'email', 'phone']);
  const startsAt = bookingInstant(input.date, input.time);
  if (startsAt.getTime() <= now || startsAt.getTime() > now + 366 * 86400000) throw new ContractError('Choose a future booking within one year', 'date');
  return { propertyId: id(input.propertyId, 'propertyId'), startsAt, endsAt: new Date(startsAt.getTime() + 3600000), date: new Date(`${input.date}T00:00:00Z`), time: input.time,
    notes: text(input.notes ?? input.message ?? '', 'notes', { min: 0, max: 2000 }),
    ...(!authenticated && { guestInfo: { name: text(input.name, 'name', { max: 120 }), email: email(input.email), phone: phone(input.phone) } }) };
}
export function propertyDTO(source, privateFields = false) {
  const p = typeof source.toObject === 'function' ? source.toObject() : source;
  const result = {};
  for (const key of ['_id', 'title', 'location', 'price', 'beds', 'baths', 'sqft', 'description', 'phone', 'image', 'expiresAt', 'createdAt', 'updatedAt', 'status', 'marketStatus']) result[key] = p[key];
  try { result.type = normalizePropertyType(p.type); } catch { result.type = p.type; }
  try { result.purpose = normalizePurpose(p.purpose || p.availability); } catch { result.purpose = p.availability === 'sold' ? 'sale' : null; }
  result.availability = result.purpose;
  result.marketStatus ||= p.availability === 'sold' ? 'sold' : 'available';
  try { result.amenities = stringArray(p.amenities?.length === 1 && p.amenities[0]?.startsWith('[') ? p.amenities[0] : p.amenities || [], 'amenities'); } catch { result.amenities = []; }
  try { result.googleMapLink = safeUrl(p.googleMapLink, 'googleMapLink', true); } catch { result.googleMapLink = ''; }
  result.status ||= 'active';
  if (result.status === 'active' && p.expiresAt && new Date(p.expiresAt) <= new Date()) result.status = 'expired';
  result.version = p.__v || 0;
  if (privateFields) for (const key of ['postedBy', 'rejectionReason', 'archivedAt']) result[key] = p[key];
  if (privateFields) {
    const owner = p.postedBy;
    result.owner = owner?.name !== undefined ? { _id: String(owner._id), name: owner.name, email: owner.email } : null;
    result.ownerId = owner ? String(owner._id || owner) : null;
  }
  return result;
}
export function appointmentDTO(source) {
  const p = typeof source.toObject === 'function' ? source.toObject() : source;
  const result = {};
  for (const key of ['_id', 'propertyId', 'userId', 'guestInfo', 'date', 'time', 'startsAt', 'endsAt', 'timeZone', 'status', 'notes', 'cancelReason', 'feedback', 'propertySnapshot', 'contactSnapshot', 'createdAt', 'updatedAt']) result[key] = p[key];
  try { result.meetingLink = safeUrl(p.meetingLink, 'meetingLink'); } catch { result.meetingLink = ''; }
  result.version = p.__v || 0;
  return result;
}

export function reviewCommand(record, reason) {
  return { expectedVersion: number(record?.version, 'expectedVersion', { integer: true }), ...(reason !== undefined && { reason: text(reason, 'reason', { max: 2000 }) }) };
}

export { createQueryCache } from './queryCache.js';
