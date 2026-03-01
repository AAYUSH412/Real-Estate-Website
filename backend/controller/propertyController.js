import { createFirecrawlService } from '../services/firecrawlService.js';
import { createAIService } from '../services/aiService.js';
import { validateAndFixPropertyAnalysis, validateAndFixLocationAnalysis } from '../utils/validateAIResponse.js';

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
        const { city, maxPrice, propertyCategory, propertyType, limit = 6 } = req.body;

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
        const cacheKey = `search:${city}:${maxPrice}:${propertyCategory}:${propertyType}`;
        const cached = getCached(cacheKey);
        if (cached) {
            console.log(`[Cache] HIT for ${cacheKey}`);
            return res.json({ success: true, ...cached, fromCache: true });
        }

        console.log(`[PropertyController] search — city=${city} maxPrice=${maxPrice} type=${propertyType} category=${propertyCategory}`);

        // Step 1: Firecrawl
        let propertiesData;
        try {
            propertiesData = await firecrawlService.findProperties(
                city,
                maxPrice,
                propertyCategory || 'Residential',
                propertyType || 'Flat',
                Math.min(limit, 6)
            );
        } catch (firecrawlError) {
            console.error('[Firecrawl] Property search failed:', firecrawlError.message);
            return res.status(503).json({
                success: false,
                message: 'Property search service temporarily unavailable. Please try again later.',
                error: 'FIRECRAWL_ERROR'
            });
        }

        if (!propertiesData?.properties || propertiesData.properties.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No ${propertyType || ''} properties found in ${city} within ₹${maxPrice < 1 ? Math.round(maxPrice * 100) + ' Lakhs' : maxPrice + ' Crores'}. Try increasing the budget or choosing a different property type.`,
                properties: [],
                analysis: null
            });
        }

        // Step 2: AI analysis
        let analysis;
        try {
            const rawAnalysis = await aiService.analyzeProperties(
                propertiesData.properties,
                city,
                maxPrice,
                propertyCategory || 'Residential',
                propertyType || 'Flat'
            );
            analysis = validateAndFixPropertyAnalysis(rawAnalysis, propertiesData.properties);
        } catch (aiError) {
            console.error('[AI] Property analysis failed:', aiError.message);
            analysis = {
                error: 'Analysis temporarily unavailable',
                overview: propertiesData.properties.slice(0, 3).map(p => ({
                    name: p.building_name || 'Unknown',
                    price: p.price || 'Contact for price',
                    area: p.area_sqft || 'N/A',
                    location: p.location_address || '',
                    highlight: 'Property details available'
                })),
                best_value: null,
                recommendations: ['Contact us for more details']
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