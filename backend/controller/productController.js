import { propertyDTO, LISTING_STATUSES, choice } from '@buildestate/contracts';
import { archiveListing } from '../services/domain/archival.js';
import mongoose from 'mongoose';
import Property from '../models/propertyModel.js';
import { listingFiles, saveListing, listingError } from '../services/listingService.js';
import { pagination, pageMetadata } from '../utils/pagination.js';
import { catalogQuery, catalogSort, publicListingQuery, listingStatusQuery } from '../utils/catalogQuery.js';

export const addproperty = async (req, res) => {
  try {
    const property = await saveListing({ body: req.body, files: listingFiles(req.files), req });
    res.status(201).json({ success: true, message: 'Property added successfully', property: propertyDTO(property, true) });
  } catch (error) { return listingError(res, error); }
};

export const updateproperty = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.body.id)) return res.status(400).json({ success: false, message: 'Invalid property ID' });
    const existing = await Property.findById(req.body.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });
    const property = await saveListing({ body: req.body, files: listingFiles(req.files), existing, req });
    res.json({ success: true, message: 'Property updated successfully', property: propertyDTO(property, true) });
  } catch (error) { return listingError(res, error); }
};

async function list(req, res, admin = false) {
  try {
    const { page, limit, skip } = pagination(req.query);
    if (admin && req.query.status && req.query.status !== 'all') choice(req.query.status, LISTING_STATUSES, 'status');
    const base = admin ? (LISTING_STATUSES.includes(req.query.status) ? listingStatusQuery(req.query.status) : {}) : publicListingQuery();
    const query = catalogQuery(req.query, base);
    const [total, property] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query).populate(admin ? { path: 'postedBy', select: 'name email' } : []).sort(catalogSort(req.query.sort)).limit(limit).skip(skip),
    ]);
    const properties = property.map(p => propertyDTO(p, admin));
    res.json({ success: true, property: properties, properties, pagination: pageMetadata(total, page, limit) });
  } catch (error) { return listingError(res, error); }
}
export const listproperty = (req, res) => list(req, res);
export const adminListProperties = (req, res) => list(req, res, true);

async function detail(req, res, admin = false) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID' });
    const property = await Property.findOne({ _id: req.params.id, ...(admin ? {} : publicListingQuery()) }).populate(admin ? { path: 'postedBy', select: 'name email' } : []);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ property: propertyDTO(property, admin), success: true });
  } catch (error) { return listingError(res, error); }
}
export const singleproperty = (req, res) => detail(req, res);
export const adminSingleProperty = (req, res) => detail(req, res, true);

export const removeproperty = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.body.id)) return res.status(400).json({ success: false, message: 'Invalid property ID' });
    const property = await archiveListing(req.body.id, req);
    return res.json({ success: true, message: 'Property archived; linked bookings retained', property });
  } catch (error) { return listingError(res, error); }
};
