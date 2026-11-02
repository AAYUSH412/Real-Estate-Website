import mongoose from 'mongoose';
import Property from '../models/propertyModel.js';
import { listingFiles, saveListing, listingError } from '../services/listingService.js';
import { pagination, pageMetadata } from '../utils/pagination.js';
import { catalogQuery, catalogSort, publicListingQuery } from '../utils/catalogQuery.js';

export const addproperty = async (req, res) => {
  try {
    const property = await saveListing({ body: req.body, files: listingFiles(req.files) });
    res.status(201).json({ success: true, message: 'Property added successfully', property });
  } catch (error) { return listingError(res, error); }
};

export const updateproperty = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.body.id)) return res.status(400).json({ success: false, message: 'Invalid property ID' });
    const existing = await Property.findById(req.body.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });
    const property = await saveListing({ body: req.body, files: listingFiles(req.files), existing });
    res.json({ success: true, message: 'Property updated successfully', property });
  } catch (error) { return listingError(res, error); }
};

async function list(req, res, admin = false) {
  try {
    const { page, limit, skip } = pagination(req.query);
    const base = admin ? (['pending', 'active', 'rejected', 'expired'].includes(req.query.status) ? { status: req.query.status } : {}) : publicListingQuery();
    const query = catalogQuery(req.query, base);
    const [total, property] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query).sort(catalogSort(req.query.sort)).limit(limit).skip(skip),
    ]);
    res.json({ success: true, property, pagination: pageMetadata(total, page, limit) });
  } catch (error) { return listingError(res, error); }
}
export const listproperty = (req, res) => list(req, res);
export const adminListProperties = (req, res) => list(req, res, true);

async function detail(req, res, admin = false) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID' });
    const property = await Property.findOne({ _id: req.params.id, ...(admin ? {} : publicListingQuery()) });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ property, success: true });
  } catch (error) { return listingError(res, error); }
}
export const singleproperty = (req, res) => detail(req, res);
export const adminSingleProperty = (req, res) => detail(req, res, true);

export const removeproperty = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.body.id)) return res.status(400).json({ success: false, message: 'Invalid property ID' });
    const property = await Property.findByIdAndDelete(req.body.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    return res.json({ success: true, message: 'Property removed successfully' });
  } catch (error) { return listingError(res, error); }
};
