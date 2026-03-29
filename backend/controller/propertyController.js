import fs from 'fs';
import { createFirecrawlService } from '../services/firecrawlService.js';
import { createAIService } from '../services/aiService.js';
import { validateAndFixPropertyAnalysis, validateAndFixLocationAnalysis } from '../utils/validateAIResponse.js';
import imagekit from '../config/imagekit.js';
import Property from '../models/propertyModel.js';
import SearchCache from '../models/searchCacheModel.js';
import { coalesce, getInFlightCount } from '../utils/requestCoalescer.js';
import logger from '../utils/logger.js';

// ── MongoDB-based cache (10-minute TTL via TTL index) ────────────────────────
// Replaces in-memory cache - works across all server instances

/**
 * Get cached data from MongoDB
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached data or null
 */
async function getCached(key) {
    try {
        const cached = await SearchCache.findOne({ cacheKey: key });
        return cached?.data || null;
    } catch (err) {
        logger.warn('Cache MongoDB read error', { key: key.substring(0, 30), error: err.message });
        return null;
    }
}

/**
 * Set cached data in MongoDB
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
async function setCache(key, data) {
    try {
        await SearchCache.findOneAndUpdate(
            { cacheKey: key },
            { cacheKey: key, data, createdAt: new Date() },
            { upsert: true, new: true }
        );
    } catch (err) {
        logger.warn('Cache MongoDB write error', { key: key.substring(0, 30), error: err.message });
    }
}

/**
 * Get cache statistics (for monitoring)
 */
export async function getCacheStats() {
    try {
        const count = await SearchCache.countDocuments();
        const oldestEntry = await SearchCache.findOne().sort({ createdAt: 1 });
        return {
            cachedSearches: count,
            oldestEntry: oldestEntry?.createdAt || null,
            ttlMinutes: 10,
            inFlightRequests: getInFlightCount()
        };
    } catch (err) {
        logger.warn('Cache stats error', { error: err.message });
        return { error: err.message };
    }
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

function isUnauthorizedError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.statusCode || err?.status || 0;
    return code === 401 || msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid token');
}

function isCreditsExhaustedError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.statusCode || err?.status || 0;
    return code === 402 || msg.includes('402') || msg.includes('insufficient credits') || msg.includes('credits exhausted');
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

        // Check persistent MongoDB cache first
        const cached = await getCached(cacheKey);
        if (cached) {
            logger.info('Cache HIT', { key: cacheKey.substring(0, 50) });
            return res.json({ success: true, ...cached, fromCache: true });
        }

        logger.info('Property search', { city, locality, bhk, maxPrice, propertyType, possession });

        // Use coalescer to prevent duplicate in-flight requests
        // If another request with the same key is already processing, wait for it
        let result;
        try {
            result = await coalesce(cacheKey, async () => {
                // Double-check cache (another request may have just completed)
                const rechecked = await getCached(cacheKey);
                if (rechecked) {
                    logger.debug('Coalesce cache filled by another request', { key: cacheKey.substring(0, 50) });
                    return { ...rechecked, fromCoalesce: true };
                }

                // Step 1: Firecrawl — search then scrape individual pages
                const propertiesData = await firecrawlService.findProperties({
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

                if (!propertiesData?.properties || propertiesData.properties.length === 0) {
                    return {
                        notFound: true,
                        message: `No ${propertyType || ''} properties found in ${locality ? locality + ', ' : ''}${city} within ₹${parseFloat(maxPrice) < 1 ? Math.round(parseFloat(maxPrice) * 100) + ' Lakhs' : maxPrice + ' Crores'}. Try adjusting your budget or area.`
                    };
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
                    logger.error('AI property analysis failed', { error: aiError.message });
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

                // Save to persistent cache
                await setCache(cacheKey, payload);
                logger.info('Cache SET', { key: cacheKey.substring(0, 50) });

                return payload;
            });
        } catch (coalesceError) {
            // Handle errors from the coalesced operation
            logger.error('Coalesce error', { error: coalesceError.message });

            if (coalesceError.code === 'FIRECRAWL_AUTH_ERROR' || isUnauthorizedError(coalesceError)) {
                return res.status(403).json({
                    success: false,
                    message: 'Your Firecrawl API key is invalid or expired. Please update it and try again.',
                    error: 'KEYS_INVALID',
                    provider: 'firecrawl',
                });
            }

            if (coalesceError.code === 'FIRECRAWL_CREDITS_EXHAUSTED') {
                return res.status(402).json({
                    success: false,
                    message: 'Your Firecrawl API credits have been exhausted. Please upgrade your plan or add more credits.',
                    error: 'FIRECRAWL_CREDITS_EXHAUSTED',
                    upgradeUrl: 'https://firecrawl.dev/pricing',
                });
            }

            return res.status(503).json({
                success: false,
                message: 'Property search service temporarily unavailable. Please try again later.',
                error: 'FIRECRAWL_ERROR',
            });
        }

        // Handle special cases from coalesced result
        if (result.notFound) {
            return res.status(404).json({
                success: false,
                message: result.message,
                properties: [],
                analysis: null,
            });
        }

        res.json({ success: true, ...result });

    } catch (error) {
        logger.error("Error searching properties", { error: error.message, stack: error.stack });
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

        // Check persistent MongoDB cache first
        const cached = await getCached(cacheKey);
        if (cached) {
            logger.info('Cache HIT', { key: cacheKey });
            return res.json({ success: true, ...cached, fromCache: true });
        }

        logger.info('Location trends search', { city });

        // Use coalescer to prevent duplicate in-flight requests
        let result;
        try {
            result = await coalesce(cacheKey, async () => {
                // Double-check cache
                const rechecked = await getCached(cacheKey);
                if (rechecked) {
                    return { ...rechecked, fromCoalesce: true };
                }

                // Step 1: Firecrawl
                const locationsData = await firecrawlService.getLocationTrends(city, Math.min(limit, 5));

                if (!locationsData?.locations || locationsData.locations.length === 0) {
                    return {
                        notFound: true,
                        message: `No location trend data available for ${city} at the moment. Please try again later.`
                    };
                }

                // Step 2: AI analysis
                let analysis;
                try {
                    const rawAnalysis = await aiService.analyzeLocationTrends(locationsData.locations, city);
                    analysis = validateAndFixLocationAnalysis(rawAnalysis);
                } catch (aiError) {
                    logger.error('AI location analysis failed', { city, error: aiError.message });
                    analysis = {
                        error: 'Analysis temporarily unavailable',
                        trends: [],
                        top_appreciation: null,
                        best_rental_yield: null,
                        investment_tips: ['Contact us for personalized investment advice']
                    };
                }

                const payload = { locations: locationsData.locations, analysis };
                await setCache(cacheKey, payload);
                logger.info('Cache SET', { key: cacheKey });
                return payload;
            });
        } catch (coalesceError) {
            logger.error('Coalesce location trends error', { error: coalesceError.message });

            if (isUnauthorizedError(coalesceError)) {
                return res.status(403).json({
                    success: false,
                    message: 'Your Firecrawl API key is invalid or expired. Please update it and try again.',
                    error: 'KEYS_INVALID',
                    provider: 'firecrawl',
                });
            }

            if (coalesceError.code === 'FIRECRAWL_CREDITS_EXHAUSTED' || isCreditsExhaustedError(coalesceError)) {
                return res.status(402).json({
                    success: false,
                    message: 'Your Firecrawl API credits have been exhausted. Please upgrade your plan or add more credits.',
                    error: 'FIRECRAWL_CREDITS_EXHAUSTED',
                    upgradeUrl: 'https://firecrawl.dev/pricing',
                });
            }

            return res.status(503).json({
                success: false,
                message: 'Location trends service temporarily unavailable. Please try again later.',
                error: 'FIRECRAWL_ERROR'
            });
        }

        // Handle special cases from coalesced result
        if (result.notFound) {
            return res.status(404).json({
                success: false,
                message: result.message,
                locations: [],
                analysis: null
            });
        }

        res.json({ success: true, ...result });

    } catch (error) {
        logger.error("Error getting location trends", { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to get location trends', error: error.message });
    }
};

export const validateApiKeys = async (req, res) => {
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

    const { aiService, firecrawlService } = services;

    const [githubResult, firecrawlResult] = await Promise.allSettled([
        aiService.validateApiKey(),
        firecrawlService.validateApiKey(),
    ]);

    const githubErr = githubResult.status === 'rejected' ? githubResult.reason : null;
    const firecrawlErr = firecrawlResult.status === 'rejected' ? firecrawlResult.reason : null;

    logger.debug('Key validation', {
        githubStatus: githubResult.status,
        firecrawlStatus: firecrawlResult.status,
        githubError: githubErr?.message || null,
        firecrawlError: firecrawlErr?.message || null,
    });

    if (!githubErr && !firecrawlErr) {
        return res.json({
            success: true,
            message: 'API keys are valid.',
            github: { valid: true },
            firecrawl: { valid: true },
        });
    }

    if (githubErr && isUnauthorizedError(githubErr)) {
        return res.status(403).json({
            success: false,
            message: 'Your GitHub Models API key is invalid or expired. Please update it and try again.',
            error: 'KEYS_INVALID',
            provider: 'github',
        });
    }

    if (firecrawlErr && isUnauthorizedError(firecrawlErr)) {
        return res.status(403).json({
            success: false,
            message: 'Your Firecrawl API key is invalid or expired. Please update it and try again.',
            error: 'KEYS_INVALID',
            provider: 'firecrawl',
        });
    }

    if (firecrawlErr && isCreditsExhaustedError(firecrawlErr)) {
        return res.status(402).json({
            success: false,
            message: 'Your Firecrawl API credits have been exhausted. Please upgrade your plan or add more credits.',
            error: 'FIRECRAWL_CREDITS_EXHAUSTED',
            provider: 'firecrawl',
            upgradeUrl: 'https://firecrawl.dev/pricing',
        });
    }

    return res.status(503).json({
        success: false,
        message: 'Unable to validate API keys right now. Please try again.',
        error: 'KEY_VALIDATION_FAILED',
    });
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
                if (err) logger.warn("Error deleting temp file", { error: err?.message });
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
        logger.error("Error creating user listing", { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to create listing', error: error.message });
    }
};

/** GET /api/user/properties — get all listings by the logged-in user */
export const getUserListings = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default 10 per page for user listings
        const skip = (page - 1) * limit;

        const query = { postedBy: req.user._id };

        // Get total count for pagination metadata
        const totalProperties = await Property.countDocuments(query);
        const totalPages = Math.ceil(totalProperties / limit);

        // Get properties with pagination
        const properties = await Property.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        res.json({
            success: true,
            properties,
            pagination: {
                currentPage: page,
                totalPages,
                totalProperties,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                limit
            }
        });
    } catch (error) {
        logger.error("Error fetching user listings", { error: error.message, stack: error.stack });
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
        logger.error("Error updating user listing", { error: error.message, stack: error.stack });
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
        logger.error("Error deleting user listing", { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to delete listing', error: error.message });
    }
};