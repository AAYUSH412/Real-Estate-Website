import mongoose from 'mongoose';
import Property from '../models/propertyModel.js';

export async function loadOwnedListing(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid listing ID' });
    const listing = await Property.findOne({ _id: req.params.id, postedBy: req.user._id });
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    req.listing = listing;
    next();
  } catch (error) { next(error); }
}
