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

export async function saveListing({ body, files, existing = null, owner = null }) {
  const kept = retainedImages(body, existing, files);
  files.forEach(validateImage);
  const fields = {};
  for (const key of ['title', 'location', 'price', 'beds', 'baths', 'sqft', 'type', 'availability', 'description', 'phone', 'googleMapLink']) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.amenities !== undefined) fields.amenities = parseArray(body.amenities, 'amenities');
  const publication = owner ? { status: 'pending', rejectionReason: '', postedBy: owner } : {};
  if (owner && !existing) publication.expiresAt = new Date(Date.now() + 45 * 86400000);
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
    const target = existing || candidate;
    target.set({ ...fields, ...publication, image: [...kept, ...ordered.map(a => a.url)], imageAssets });
    await target.save();
    await removeAssets(oldAssets.filter(a => !kept.includes(a.url)));
    return target;
  } catch (error) {
    await removeAssets(uploaded);
    throw error;
  }
}

export function listingError(res, error) {
  const status = error.statusCode || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.name === 'VersionError' ? 409 : 500);
  return res.status(status).json({ success: false, message: status < 500 ? error.message : 'Failed to save listing. Please try again.' });
}
