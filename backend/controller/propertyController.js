import fs from 'fs';
import { createFirecrawlService } from '../services/firecrawlService.js';
import { createAIService } from '../services/aiService.js';
import { validateAndFixPropertyAnalysis, validateAndFixLocationAnalysis } from '../utils/validateAIResponse.js';
import imagekit from '../config/imagekit.js';
import Property from '../models/propertymodel.js';

// ── Simple in-memory cache (10-minute TTL) ────────────────────────────────────
const _cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
    return entry.data;
}

function setCache(key, data) {
    // Keep cache bounded — evict oldest entry if over 100 keys
    if (_cache.size >= 100) {
        const oldest = _cache.keys().next().value;
        _cache.delete(oldest);
    }
    _cache.set(key, { data, ts: Date.now() });
}

// ── Key validation ────────────────────────────────────────────────────────────

/**
 * Strict gate: both user-provided keys MUST be present.
 * Throws a structured 403 error object if either is missing.
 * The server's own env-var keys are NEVER used as a fallback.
 */
function resolveServices(req) {
    const githubKey = req.headers['x-github-key']?.trim();
    const firecrawlKey = req.headers['x-firecrawl-key']?.trim();

    if (!githubKey || !firecrawlKey) {
        const err = new Error(
            'API keys required. Please add your free GitHub Models and Firecrawl API keys to use the AI Hub.'
        );
        err.statusCode = 403;
        err.code = 'KEYS_REQUIRED';
        throw err;
    }

    return {
        aiService: createAIService(githubKey),
        firecrawlService: createFirecrawlService(firecrawlKey),
    };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export const searchProperties = async (req, res) => {
    try {
        const {
            city,
            locality        = '',
            bhk             = 'Any',
            minPrice        = '0',
            maxPrice,
            propertyCategory,
            propertyType,
            possession      = 'any',
            includeNoBroker = false,
            limit           = 6,
        } = req.body;

        if (!city || !maxPrice) {
            return res.status(400).json({ success: false, message: 'City and maxPrice are required' });
        }

        // Gate: require user API keys
        let services;
        try {
            services = resolveServices(req);
        } catch (keyErr) {
            return res.status(keyErr.statusCode || 403).json({
                success: false,
                message: keyErr.message,
                error: keyErr.code || 'KEYS_REQUIRED',
            });
        }

        const { firecrawlService, aiService } = services;

        // Cache key includes all search dimensions
        const cacheKey = `search:${city}:${locality}:${bhk}:${minPrice}:${maxPrice}:${propertyCategory}:${propertyType}:${possession}:nb${includeNoBroker}:limit${limit}`;
        const cached = getCached(cacheKey);
        if (cached) {
            console.log(`[Cache] HIT for ${cacheKey}`);
            return res.json({ success: true, ...cached, fromCache: true });
        }

        console.log(`[PropertyController] search — city=${city} locality=${locality} bhk=${bhk} maxPrice=${maxPrice} type=${propertyType} possession=${possession}`);

        // Step 1: Firecrawl — search then scrape individual pages
        let propertiesData;
        try {
            propertiesData = await firecrawlService.findProperties({
                city,
                locality,
                bhk,
                minPrice,
                maxPrice,
                propertyType:     propertyType || 'Flat',
                propertyCategory: propertyCategory || 'Residential',
                possession,
                includeNoBroker,
                limit:            Math.min(limit, 20),
            });
        } catch (firecrawlError) {
            console.error('[Firecrawl] Property search failed:', firecrawlError.message);
            return res.status(503).json({
                success: false,
                message: 'Property search service temporarily unavailable. Please try again later.',
                error: 'FIRECRAWL_ERROR',
            });
        }

        if (!propertiesData?.properties || propertiesData.properties.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No ${propertyType || ''} properties found in ${locality ? locality + ', ' : ''}${city} within ₹${parseFloat(maxPrice) < 1 ? Math.round(parseFloat(maxPrice) * 100) + ' Lakhs' : maxPrice + ' Crores'}. Try adjusting your budget or area.`,
                properties: [],
                analysis: null,
            });
        }

        // Step 2: AI analysis
        let analysis;
        try {
            const rawAnalysis = await aiService.analyzeProperties(
                propertiesData.properties,
                {
                    city,
                    locality,
                    bhk,
                    minPrice,
                    maxPrice,
                    propertyType:     propertyType     || 'Flat',
                    propertyCategory: propertyCategory || 'Residential',
                }
            );
            analysis = validateAndFixPropertyAnalysis(rawAnalysis, propertiesData.properties);
        } catch (aiError) {
            console.error('[AI] Property analysis failed:', aiError.message);
            analysis = {
                error: 'Analysis temporarily unavailable',
                overview: propertiesData.properties.slice(0, limit).map(p => ({
                    name:      p.building_name || 'Unknown',
                    price:     p.total_price || p.price || 'Contact for price',
                    area:      p.carpet_area_sqft || p.area_sqft || 'N/A',
                    location:  p.location_address || '',
                    highlight: 'Property details available',
                })),
                best_value:      null,
                recommendations: ['Contact us for more details'],
            };
        }

        const payload = { properties: propertiesData.properties, analysis };
        setCache(cacheKey, payload);
        res.json({ success: true, ...payload });

    } catch (error) {
        console.error('Error searching properties:', error);
        res.status(500).json({ success: false, message: 'Failed to search properties', error: error.message });
    }
};

export const getLocationTrends = async (req, res) => {
    try {
        const { city } = req.params;
        const { limit = 5 } = req.query;

        if (!city) {
            return res.status(400).json({ success: false, message: 'City parameter is required' });
        }

        // Gate: require user API keys
        let services;
        try {
            services = resolveServices(req);
        } catch (keyErr) {
            return res.status(keyErr.statusCode || 403).json({
                success: false,
                message: keyErr.message,
                error: keyErr.code || 'KEYS_REQUIRED',
            });
        }

        const { firecrawlService, aiService } = services;
        const cacheKey = `trends:${city}`;
        const cached = getCached(cacheKey);
        if (cached) {
            console.log(`[Cache] HIT for ${cacheKey}`);
            return res.json({ success: true, ...cached, fromCache: true });
        }

        console.log(`[PropertyController] trends — city=${city}`);

        // Step 1: Firecrawl
        let locationsData;
        try {
            locationsData = await firecrawlService.getLocationTrends(city, Math.min(limit, 5));
        } catch (firecrawlError) {
            console.error('[Firecrawl] Location trends failed:', firecrawlError.message);
            return res.status(503).json({
                success: false,
                message: 'Location trends service temporarily unavailable. Please try again later.',
                error: 'FIRECRAWL_ERROR'
            });
        }

        if (!locationsData?.locations || locationsData.locations.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No location trend data available for ${city} at the moment. Please try again later.`,
                locations: [],
                analysis: null
            });
        }

        // Step 2: AI analysis
        let analysis;
        try {
            const rawAnalysis = await aiService.analyzeLocationTrends(locationsData.locations, city);
            analysis = validateAndFixLocationAnalysis(rawAnalysis);
        } catch (aiError) {
            console.error('[AI] Location analysis failed:', aiError.message);
            analysis = {
                error: 'Analysis temporarily unavailable',
                trends: [],
                top_appreciation: null,
                best_rental_yield: null,
                investment_tips: ['Contact us for personalized investment advice']
            };
        }

        const payload = { locations: locationsData.locations, analysis };
        setCache(cacheKey, payload);
        res.json({ success: true, ...payload });

    } catch (error) {
        console.error('Error getting location trends:', error);
        res.status(500).json({ success: false, message: 'Failed to get location trends', error: error.message });
    }
};

// ── User property listing CRUD ────────────────────────────────────────────────
// These endpoints are protected by the `protect` middleware.
// All user-submitted listings start as 'pending' and require admin approval.

const EXPIRY_DAYS = 45;

/**
 * Upload files in req.files (from multer array) to ImageKit.
 * Returns an array of public URLs.
 * Deletes each temp file after uploading.
 */
async function uploadImages(files) {
    return Promise.all(
        files.map(async (file) => {
            const result = await imagekit.upload({
                file: fs.readFileSync(file.path),
                fileName: file.originalname,
                folder: 'Property',
            });
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
            return result.url;
        })
    );
}

/** POST /api/user/properties — create a new listing (pending approval) */
export const createUserListing = async (req, res) => {
    try {
        const { title, location, price, beds, baths, sqft, type, availability, description, phone, googleMapLink } = req.body;

        // Parse amenities — frontend sends as JSON string in FormData
        let amenities = [];
        try {
            amenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];
        } catch {
            amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [];
        }

        // Required field validation
        const missing = ['title', 'location', 'price', 'beds', 'baths', 'sqft', 'type', 'availability', 'description', 'phone']
            .filter((f) => !req.body[f]);
        if (missing.length) {
            return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
        }

        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one image is required' });
        }

        const imageUrls = await uploadImages(files);

        const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        const property = await Property.create({
            title,
            location,
            price: Number(price),
            beds: Number(beds),
            baths: Number(baths),
            sqft: Number(sqft),
            type,
            availability,
            description,
            amenities,
            image: imageUrls,
            phone,
            googleMapLink: googleMapLink || '',
            status: 'pending',
            postedBy: req.user._id,
            expiresAt,
        });

        res.status(201).json({ success: true, message: 'Listing submitted for review', property });
    } catch (error) {
        console.error('Error creating user listing:', error);
        res.status(500).json({ success: false, message: 'Failed to create listing', error: error.message });
    }
};

/** GET /api/user/properties — get all listings by the logged-in user */
export const getUserListings = async (req, res) => {
    try {
        const properties = await Property.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, properties });
    } catch (error) {
        console.error('Error fetching user listings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch listings', error: error.message });
    }
};

/** PUT /api/user/properties/:id — edit an owned listing (resets to pending) */
export const updateUserListing = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        if (!property.postedBy || property.postedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorised to edit this listing' });
        }

        const { title, location, price, beds, baths, sqft, type, availability, description, phone, googleMapLink } = req.body;

        let amenities = property.amenities;
        if (req.body.amenities) {
            try {
                amenities = JSON.parse(req.body.amenities);
            } catch {
                amenities = Array.isArray(req.body.amenities) ? req.body.amenities : property.amenities;
            }
        }

        // If new images uploaded, replace the existing set
        let imageUrls = property.image;
        const files = req.files || [];
        if (files.length > 0) {
            imageUrls = await uploadImages(files);
        }

        const updates = {
            ...(title && { title }),
            ...(location && { location }),
            ...(price && { price: Number(price) }),
            ...(beds && { beds: Number(beds) }),
            ...(baths && { baths: Number(baths) }),
            ...(sqft && { sqft: Number(sqft) }),
            ...(type && { type }),
            ...(availability && { availability }),
            ...(description && { description }),
            ...(phone && { phone }),
            googleMapLink: googleMapLink ?? property.googleMapLink,
            amenities,
            image: imageUrls,
            // Any edit resets to pending so admin re-reviews
            status: 'pending',
            rejectionReason: '',
        };

        const updated = await Property.findByIdAndUpdate(req.params.id, updates, { new: true });
        res.json({ success: true, message: 'Listing updated and resubmitted for review', property: updated });
    } catch (error) {
        console.error('Error updating user listing:', error);
        res.status(500).json({ success: false, message: 'Failed to update listing', error: error.message });
    }
};

/** DELETE /api/user/properties/:id — delete an owned listing */
export const deleteUserListing = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        if (!property.postedBy || property.postedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorised to delete this listing' });
        }

        await Property.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Error deleting user listing:', error);
        res.status(500).json({ success: false, message: 'Failed to delete listing', error: error.message });
    }
};