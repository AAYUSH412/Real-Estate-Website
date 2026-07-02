import fs from 'fs';
import { createFirecrawlService } from '../services/firecrawlService.js';
import { createAIService } from '../services/aiService.js';
import { validateAndFixPropertyAnalysis, validateAndFixLocationAnalysis } from '../utils/validateAIResponse.js';
import imagekit from '../config/imagekit.js';
import Property from '../models/propertyModel.js';
import SearchCache from '../models/searchCacheModel.js';
import { coalesce, getInFlightCount } from '../utils/requestCoalescer.js';
import logger from '../utils/logger.js';

// ── SSE Progress Broadcaster ──────────────────────────────────────────────────
// Maps cacheKey → Set of sendFn callbacks for all SSE clients waiting on that key.
// When the coalescer work function broadcasts a milestone (e.g. firecrawl done),
// all waiting SSE clients receive the event — not just the first requester.
const progressSubs = new Map();

function registerSSEClient(key, sendFn) {
    if (!progressSubs.has(key)) progressSubs.set(key, new Set());
    progressSubs.get(key).add(sendFn);
    return () => {
        const subs = progressSubs.get(key);
        subs?.delete(sendFn);
        if (subs?.size === 0) progressSubs.delete(key);
    };
}

function broadcastProgress(key, event, data) {
    progressSubs.get(key)?.forEach(fn => {
        try { fn(event, data); } catch (_) {}
    });
}

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

// ── Locality autocomplete ─────────────────────────────────────────────────────
// Harvests unique locality names from already-cached SearchCache documents.
// No API keys required — reads only MongoDB data that's already been scraped.
export async function getLocalitySuggestions(req, res) {
    const city  = (req.query.city  || '').trim();
    const q     = (req.query.q     || '').trim().toLowerCase();

    if (!city) {
        return res.status(400).json({ success: false, message: 'city is required' });
    }

    try {
        // Escape regex special chars so city names like "Navi Mumbai" work safely
        const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const docs = await SearchCache.find(
            { cacheKey: { $regex: `^search:${escaped}:` } },
            { 'data.properties': 1 }
        ).limit(50).lean();

        const seen       = new Set();
        const localities = [];
        const cityLower  = city.toLowerCase();

        for (const doc of docs) {
            const props = doc.data?.properties || [];
            for (const p of props) {
                const addr = (p.location_address || '').trim();
                if (!addr) continue;

                // Split "Baner, Pune" → ["Baner", "Pune"] and harvest each segment
                const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
                for (const part of parts) {
                    const lower = part.toLowerCase();
                    if (lower === cityLower) continue;   // skip the city name itself
                    if (seen.has(lower)) continue;
                    if (q && !lower.includes(q)) continue;
                    seen.add(lower);
                    localities.push(part);
                    if (localities.length >= 40) break;   // cap before slicing to 8
                }
                if (localities.length >= 40) break;
            }
            if (localities.length >= 40) break;
        }

        res.json({ success: true, localities: localities.slice(0, 8) });
    } catch (err) {
        logger.warn('Locality suggestions error', { city, error: err.message });
        res.status(500).json({ success: false, message: 'Failed to fetch locality suggestions' });
    }
}

// ── Key validation ────────────────────────────────────────────────────────────

/**
 * Gate: Firecrawl is always required (user-provided).
 * AI provider priority: user NVIDIA key → user GitHub key → server NVIDIA key (env fallback).
 * Server NVIDIA key allows "Firecrawl only" onboarding for new users.
 */
function resolveServices(req) {
    const userGithubKey  = req.headers['x-github-key']?.trim()    || null;
    const firecrawlKey   = req.headers['x-firecrawl-key']?.trim() || null;
    const userNvidiaKey  = req.headers['x-nvidia-key']?.trim()    || null;
    const serverNvidiaKey = process.env.NVIDIA_API_KEY?.trim()    || null;

    if (!firecrawlKey) {
        const err = new Error('Firecrawl API key is required for property search.');
        err.statusCode = 403;
        err.code = 'KEYS_REQUIRED';
        throw err;
    }

    // Resolve AI provider: user keys first, then server fallback
    const effectiveNvidiaKey = userNvidiaKey || (!userGithubKey ? serverNvidiaKey : null);

    if (!userGithubKey && !effectiveNvidiaKey) {
        const err = new Error(
            'Add at least one AI provider key — GitHub Models or NVIDIA NIM — or contact the site admin.'
        );
        err.statusCode = 403;
        err.code = 'KEYS_REQUIRED';
        throw err;
    }

    return {
        aiService:        createAIService(userGithubKey, effectiveNvidiaKey),
        firecrawlService: createFirecrawlService(firecrawlKey),
    };
}

function isUnauthorizedError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.statusCode || err?.status || 0;
    return code === 401
        || msg.includes('401')
        || msg.includes('unauthorized')
        || msg.includes('invalid token')
        || msg.includes('bad credentials')
        || msg.includes('invalid api key')
        || msg.includes('invalid key');
}

function isCreditsExhaustedError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.statusCode || err?.status || 0;
    return code === 402 || msg.includes('402') || msg.includes('insufficient credits') || msg.includes('credits exhausted');
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export const searchProperties = async (req, res) => {
    // ── SSE detection ─────────────────────────────────────────────────────────
    // Client signals SSE intent via Accept: text/event-stream header.
    // Validation errors (400/403) that fire before flushHeaders() are still plain JSON
    // so the client can detect !response.ok and surface them normally.
    const isSSE = req.headers['accept'] === 'text/event-stream';

    // Installed after SSE headers are flushed. Null in JSON mode.
    let sseWrite = null;
    let sseUnregister = null;

    // Helper: write one SSE event. Silently ignores write errors (client disconnected).
    function writeSSE(event, data) {
        try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
    }

    // Helper: finalize response — handles both SSE and JSON paths.
    function sendResult(data) {
        if (sseWrite) {
            sseWrite('result', data);
            sseWrite('done', {});
            res.end();
        } else {
            res.json(data);
        }
    }

    // Helper: send error — uses SSE error event if headers already flushed, else JSON.
    function sendError(status, body) {
        if (sseWrite) {
            sseWrite('error', body);
            res.end();
        } else {
            res.status(status).json(body);
        }
    }

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
            limit           = 6,
        } = req.body;

        // ── Early validation (before SSE headers — errors returned as plain JSON) ──
        if (!city || !maxPrice) {
            return res.status(400).json({ success: false, message: 'City and maxPrice are required' });
        }

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
        const cacheKey = `search:${city}:${locality}:${bhk}:${minPrice}:${maxPrice}:${propertyCategory}:${propertyType}:${possession}:limit${limit}`;

        // ── Flush SSE headers now (after early validation, before slow work) ──────
        if (isSSE) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
            res.flushHeaders();
            sseWrite = writeSSE;

            // Clean up subscriber when client disconnects early
            req.on('close', () => {
                sseUnregister?.();
                if (!res.writableEnded) res.end();
            });
        }

        // ── Cache check ──────────────────────────────────────────────────────────
        const cached = await getCached(cacheKey);
        if (cached) {
            logger.info('Cache HIT', { key: cacheKey.substring(0, 50) });
            return sendResult({ success: true, ...cached, fromCache: true });
        }

        logger.info('Property search', { city, locality, bhk, maxPrice, propertyType, possession });

        // ── Register SSE subscriber BEFORE entering coalescer ────────────────────
        // This ensures even coalesced (secondary) requests receive broadcast events
        // that fire from inside the coalescer work function.
        if (sseWrite) {
            sseWrite('status', {
                stage:   'searching',
                message: `Querying 99acres, MagicBricks, Housing.com for ${bhk !== 'Any' ? bhk + ' ' : ''}${(propertyType || 'properties').toLowerCase()}s in ${locality || city}…`,
            });
            sseUnregister = registerSSEClient(cacheKey, sseWrite);
        }

        let result;
        try {
            result = await coalesce(cacheKey, async () => {
                // Double-check cache (another request may have just completed)
                const rechecked = await getCached(cacheKey);
                if (rechecked) {
                    logger.debug('Coalesce cache filled by another request', { key: cacheKey.substring(0, 50) });
                    return { ...rechecked, fromCoalesce: true };
                }

                // Step 1: Firecrawl — search + scrape individual listing pages
                const propertiesData = await firecrawlService.findProperties({
                    city,
                    locality,
                    bhk,
                    minPrice,
                    maxPrice,
                    propertyType:     propertyType || 'Flat',
                    propertyCategory: propertyCategory || 'Residential',
                    possession,
                    limit:            Math.min(limit, 20),
                });

                if (!propertiesData?.properties || propertiesData.properties.length === 0) {
                    return {
                        notFound: true,
                        message: `No ${propertyType || ''} properties found in ${locality ? locality + ', ' : ''}${city} within ₹${parseFloat(maxPrice) < 1 ? Math.round(parseFloat(maxPrice) * 100) + ' Lakhs' : maxPrice + ' Crores'}. Try adjusting your budget or area.`
                    };
                }

                // Broadcast milestone: Firecrawl done, AI analysis starting.
                // Reaches ALL SSE clients waiting on this cacheKey (primary + coalesced).
                broadcastProgress(cacheKey, 'status', {
                    stage:   'analyzing',
                    count:   propertiesData.properties.length,
                    message: `Found ${propertiesData.properties.length} properties — ranking with AI…`,
                });

                // Look up city benchmarks from cached trends (zero extra Firecrawl calls)
                const trendsCacheData = await getCached(`trends:${city}`);
                const cityBenchmarks  = trendsCacheData?.analysis?.trends || null;
                if (cityBenchmarks) {
                    logger.debug('City benchmarks loaded from trends cache', { city, count: cityBenchmarks.length });
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
                            cityBenchmarks,
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
                await setCache(cacheKey, payload);
                logger.info('Cache SET', { key: cacheKey.substring(0, 50) });
                return payload;
            });
        } catch (coalesceError) {
            logger.error('Coalesce error', { error: coalesceError.message });

            if (coalesceError.code === 'FIRECRAWL_AUTH_ERROR' || isUnauthorizedError(coalesceError)) {
                return sendError(403, {
                    success: false,
                    message: 'Your Firecrawl API key is invalid or expired. Please update it and try again.',
                    error: 'KEYS_INVALID',
                    provider: 'firecrawl',
                });
            }

            if (coalesceError.code === 'FIRECRAWL_CREDITS_EXHAUSTED') {
                return sendError(402, {
                    success: false,
                    message: 'Your Firecrawl API credits have been exhausted. Please upgrade your plan or add more credits.',
                    error: 'FIRECRAWL_CREDITS_EXHAUSTED',
                    upgradeUrl: 'https://firecrawl.dev/pricing',
                });
            }

            return sendError(503, {
                success: false,
                message: 'Property search service temporarily unavailable. Please try again later.',
                error: 'FIRECRAWL_ERROR',
            });
        } finally {
            sseUnregister?.();
            sseUnregister = null;
        }

        if (result.notFound) {
            return sendError(404, {
                success: false,
                message: result.message,
                properties: [],
                analysis: null,
            });
        }

        sendResult({ success: true, ...result });

    } catch (error) {
        logger.error('Error searching properties', { error: error.message, stack: error.stack });
        sseUnregister?.();
        if (sseWrite) {
            sseWrite('error', { success: false, message: 'Failed to search properties', error: error.message });
            if (!res.writableEnded) res.end();
        } else {
            res.status(500).json({ success: false, message: 'Failed to search properties', error: error.message });
        }
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
    const githubKey    = req.headers['x-github-key']?.trim()    || null;
    const firecrawlKey = req.headers['x-firecrawl-key']?.trim() || null;
    const nvidiaKey    = req.headers['x-nvidia-key']?.trim()    || null;

    // Firecrawl is always required
    if (!firecrawlKey) {
        return res.status(403).json({
            success: false,
            message: 'Firecrawl API key is required for property search.',
            error: 'KEYS_REQUIRED',
            provider: 'firecrawl',
        });
    }

    // At least one AI provider required
    if (!githubKey && !nvidiaKey) {
        return res.status(403).json({
            success: false,
            message: 'Add at least one AI provider key — GitHub Models or NVIDIA NIM.',
            error: 'KEYS_REQUIRED',
        });
    }

    const { GitHubModelsProvider } = await import('../services/llm/GitHubModelsProvider.js');
    const { NvidiaNimProvider }    = await import('../services/llm/NvidiaNimProvider.js');

    // Validate whichever keys were provided
    const validationTasks = [
        createFirecrawlService(firecrawlKey).validateApiKey()
            .then(r => ({ provider: 'firecrawl', valid: true,  ...r }))
            .catch(e => ({ provider: 'firecrawl', valid: false, error: e.message, statusCode: e.statusCode })),
    ];

    if (githubKey) {
        validationTasks.push(
            new GitHubModelsProvider(githubKey).validateKey()
                .then(r => ({ provider: 'github', ...r }))
                .catch(e => ({ provider: 'github', valid: false, error: e.message, statusCode: e.statusCode }))
        );
    }

    if (nvidiaKey) {
        validationTasks.push(
            new NvidiaNimProvider(nvidiaKey).validateKey()
                .then(r => ({ provider: 'nvidia', ...r }))
                .catch(e => ({ provider: 'nvidia', valid: false, error: e.message, statusCode: e.statusCode }))
        );
    }

    const results = await Promise.all(validationTasks);
    const byProvider = Object.fromEntries(results.map(r => [r.provider, r]));

    logger.debug('Key validation results', byProvider);

    const firecrawlResult = byProvider.firecrawl;
    const githubResult    = byProvider.github   || null;
    const nvidiaResult    = byProvider.nvidia   || null;

    // Firecrawl failed
    if (!firecrawlResult.valid) {
        const isCredits = isCreditsExhaustedError({ statusCode: firecrawlResult.statusCode, message: firecrawlResult.error });
        if (isCredits) {
            return res.status(402).json({
                success: false,
                message: 'Your Firecrawl API credits have been exhausted. Please upgrade your plan or add more credits.',
                error: 'FIRECRAWL_CREDITS_EXHAUSTED',
                provider: 'firecrawl',
                upgradeUrl: 'https://firecrawl.dev/pricing',
            });
        }
        const isNetworkErr = /network|timeout|econnrefused|fetch/i.test(firecrawlResult.error || '');
        return res.status(isNetworkErr ? 503 : 403).json({
            success: false,
            message: isNetworkErr
                ? 'Could not reach Firecrawl right now. Please try again in a moment.'
                : 'Your Firecrawl API key is invalid or expired. Please update it and try again.',
            error: isNetworkErr ? 'KEY_VALIDATION_FAILED' : 'KEYS_INVALID',
            provider: 'firecrawl',
        });
    }

    // GitHub provided but failed
    if (githubResult && !githubResult.valid) {
        // If NVIDIA is also provided and valid, don't block — GitHub failure is non-fatal
        const nvidiaOk = nvidiaResult?.valid === true;
        if (!nvidiaOk) {
            const isNetworkErr = /network|timeout|econnrefused|fetch/i.test(githubResult.error || '');
            return res.status(isNetworkErr ? 503 : 403).json({
                success: false,
                message: isNetworkErr
                    ? 'Could not reach GitHub Models right now. Please try again in a moment.'
                    : 'Your GitHub Models API key is invalid or expired. Get a new key at github.com/marketplace/models.',
                error: isNetworkErr ? 'KEY_VALIDATION_FAILED' : 'KEYS_INVALID',
                provider: 'github',
            });
        }
        // NVIDIA is valid — save succeeds; warn about GitHub
        logger.warn('GitHub key invalid but NVIDIA valid — proceeding with NVIDIA only');
    }

    // NVIDIA provided but failed (only if it's the sole AI provider)
    if (nvidiaResult && !nvidiaResult.valid && !githubResult?.valid) {
        return res.status(403).json({
            success: false,
            message: 'Your NVIDIA NIM key is invalid. Please check it at build.nvidia.com.',
            error: 'KEYS_INVALID',
            provider: 'nvidia',
        });
    }

    // All required keys passed
    return res.json({
        success: true,
        message: 'API keys are valid.',
        firecrawl: { valid: true },
        ...(githubResult  && { github: { valid: githubResult.valid,  error: githubResult.valid  ? null : githubResult.error  } }),
        ...(nvidiaResult  && { nvidia: { valid: nvidiaResult.valid,  error: nvidiaResult.valid  ? null : nvidiaResult.error  } }),
        ...(nvidiaResult && {
            nvidia: {
                valid:   nvidiaResult.valid,
                error:   nvidiaResult.valid ? null : nvidiaResult.error,
                message: nvidiaResult.valid
                    ? 'NVIDIA NIM key verified — 40 rpm quota active.'
                    : 'NVIDIA NIM key invalid. GitHub Models will be used instead.',
            },
        }),
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