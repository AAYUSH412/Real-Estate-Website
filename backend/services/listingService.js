import { parseListing, number, propertyDTO } from '@buildestate/contracts';
import { transaction } from './domain/transaction.js';
import { audit } from './domain/audit.js';
import { eligibleOwner } from './domain/review.js';
import { cancelOpenBookings } from './domain/archival.js';
import { conflict, missing, respondError } from '../utils/httpErrors.js';
import Property from '../models/propertyModel.js';
import imagekit from '../config/imagekit.js';
import logger from '../utils/logger.js';

const badRequest = message => Object.assign(new Error(message), { statusCode: 400 });
export const listingFiles = files => Array.isArray(files) ? files : Object.values(files || {}).flat();

export function parseArray(value, label) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw badRequest(`${label} must be an array`); }
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw badRequest(`${label} must be a string array`);
  return value;
}

export function validateImage(file) {
  const b = file.buffer;
  if (!Buffer.isBuffer(b)) throw badRequest('Invalid image upload');
  const signatures = {
    'image/jpeg': b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/gif': ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString()),
    'image/webp': b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  };
  if (!signatures[file.mimetype]) throw badRequest('Image contents do not match its declared format');
}

async function removeAssets(assets) {
  const results = await Promise.allSettled(assets.filter(a => a.fileId).map(a => Promise.resolve().then(() => imagekit.deleteFile(a.fileId))));
  results.forEach(result => {
    if (result.status === 'rejected') logger.error('Media cleanup failed; manual cleanup may be required', { error: result.reason?.message });
  });
}

export function retainedImages(body, existing, files) {
  const current = existing?.image || [];
  const kept = body.retainedImages === undefined ? (files.length ? [] : [...current]) : parseArray(body.retainedImages, 'retainedImages');
  if (new Set(kept).size !== kept.length || kept.some(url => !current.includes(url))) throw badRequest('Invalid retained image selection');
  if (kept.length + files.length < 1 || kept.length + files.length > 4) throw badRequest('A listing must have between 1 and 4 images');
  return kept;
}

export async function saveListing({ body, files, existing = null, owner = null, req = {} }) {
  const kept = retainedImages(body, existing, files);
  files.forEach(validateImage);
  const fields = parseListing(body, { partial: Boolean(existing) });
  if (existing) {
    const normalized = propertyDTO(existing, true);
    fields.type ??= normalized.type;
    fields.purpose ??= normalized.purpose;
    fields.availability = fields.purpose;
    fields.amenities ??= normalized.amenities;
    fields.marketStatus ??= normalized.marketStatus;
    if (existing.status === 'archived') throw conflict('Archived listings cannot be edited');
    if (body.expectedVersion !== undefined && number(body.expectedVersion, 'expectedVersion', { integer: true }) !== (existing.__v || 0)) throw conflict('Listing changed. Refresh before saving.');
  }
  if ((fields.marketStatus === 'sold' && fields.purpose !== 'sale') || (fields.marketStatus === 'rented' && fields.purpose !== 'rent')) throw conflict('Market status does not match listing purpose');
  const publication = owner ? { status: 'pending', rejectionReason: '', postedBy: owner, expiresAt: null } : (!existing ? { publishedAt: new Date() } : {});
  const candidate = new Property({ ...(existing?.toObject() || {}), ...fields, ...publication,
    image: [...kept, ...files.map((_, i) => `pending-upload-${i}`)] });
  await candidate.validate();
  const uploaded = [];
  try {
    const results = await Promise.allSettled(files.map(async file => {
      const asset = await imagekit.upload({ file: file.buffer, fileName: file.originalname, folder: 'Property' });
      uploaded.push({ url: asset.url, fileId: asset.fileId });
      return asset;
    }));
    const failed = results.find(r => r.status === 'rejected');
    if (failed) throw failed.reason;
    const ordered = results.map(r => ({ url: r.value.url, fileId: r.value.fileId }));
    const oldAssets = existing?.imageAssets || [];
    const imageAssets = [...oldAssets.filter(a => kept.includes(a.url)), ...ordered];
    const target = await transaction(async session => {
      await eligibleOwner(owner || existing?.postedBy, session);
      const current = existing ? await Property.findById(existing._id).session(session) : candidate;
      if (!current) throw missing('Listing not found');
      if (existing && ((current.__v || 0) !== (existing.__v || 0) || current.status === 'archived')) throw conflict('Listing changed while uploading. Refresh and try again.');
      current.set({ ...fields, ...publication, image: [...kept, ...ordered.map(a => a.url)], imageAssets });
      await current.save({ session });
      if (current.status !== 'active' || (fields.marketStatus && fields.marketStatus !== 'available')) await cancelOpenBookings({ propertyId: current._id }, 'Listing is no longer available', req, session);
      await audit(req, existing ? 'update_property' : 'create_property', 'property', current, { newStatus: current.status, version: current.__v }, session);
      return current;
    });
    await removeAssets(oldAssets.filter(a => !kept.includes(a.url)));
    return target;
  } catch (error) {
    await removeAssets(uploaded);
    throw error;
  }
}

export const listingError = respondError;
