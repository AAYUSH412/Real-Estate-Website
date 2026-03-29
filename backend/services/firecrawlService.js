import FirecrawlApp from "@mendable/firecrawl-js";
import axios from 'axios';
import { registry } from "../utils/circuitBreaker.js";

// Per-page scrape cap and search timeout
const FIRECRAWL_TIMEOUT_MS = 60_000;
const SEARCH_TIMEOUT_MS    = 90_000; // search + inline scraping takes longer than a bare search
const MAX_RETRIES          = 2;
const IS_PROD              = process.env.NODE_ENV === 'production';

/** Conditional logger — suppresses verbose output in production */
const log = {
    info:  (...args) => { if (!IS_PROD) console.log(...args); },
    warn:  (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};

// ── Property type → natural-language search term ─────────────────────────────
const PROPERTY_TYPE_SEARCH_TERMS = {
    'Flat':       'flat',
    'House':      'independent house',
    'Villa':      'villa',
    'Plot':       'plot',
    'Penthouse':  'penthouse',
    'Studio':     'studio apartment',
    'Commercial': 'commercial property',
};

// ── Multi-source search config ────────────────────────────────────────────────
// Each source contributes up to `limit` URLs per search.
// NoBroker is opt-in (owner-direct, no brokerage listings).
const SEARCH_SOURCES = {
    '99acres':     { domain: '99acres.com',     limit: 6 },
    'magicbricks': { domain: 'magicbricks.com', limit: 6 },
    'housing':     { domain: 'housing.com',     limit: 6 },
    'nobroker':    { domain: 'nobroker.in',      limit: 5 },
};

// ── Extraction schema (array-based) ──────────────────────────────────────────
// Works for both category pages (many listings) AND individual detail pages.
// The AI fills the array with however many FOR SALE properties it finds.
const SEARCH_RESULT_SCHEMA = {
    type: "object",
    properties: {
        properties: {
            type: "array",
            description: "All FOR SALE property listings found on this page. Skip PG and rentals.",
            items: {
                type: "object",
                properties: {
                    building_name:          { type: "string", description: "Society or project name" },
                    builder_name:           { type: "string", description: "Developer or builder name" },
                    property_type:          { type: "string", description: "Flat / House / Villa / Plot etc." },
                    bhk_config:             { type: "string", description: "e.g. 2 BHK, 3 BHK" },
                    location_address:       { type: "string", description: "Full address with locality and city" },
                    total_price:            { type: "string", description: "Total purchase price e.g. ₹1.65 Cr" },
                    price_per_sqft:         { type: "string", description: "Price per sq ft e.g. ₹12,500/sqft" },
                    carpet_area_sqft:       { type: "string", description: "Carpet area in sqft" },
                    superbuiltup_area_sqft: { type: "string", description: "Super built-up area in sqft" },
                    floor_number:           { type: "string", description: "Floor number e.g. 5" },
                    total_floors:           { type: "string", description: "Total floors in building" },
                    possession_status:      { type: "string", description: "Ready to Move / Under Construction / possession date" },
                    facing_direction:       { type: "string", description: "East / West / North / South" },
                    parking:                { type: "string", description: "Covered / Open / None" },
                    rera_number:            { type: "string", description: "RERA registration number, blank if absent" },
                    amenities:              { type: "array", items: { type: "string" }, description: "Top 5 amenities" },
                    nearby_landmarks:       { type: "array", items: { type: "string" }, description: "Nearby metro, school, hospital" },
                    description:            { type: "string", description: "Brief description max 50 words" },
                },
                required: ["building_name", "property_type", "location_address", "total_price"],
            },
        },
    },
    required: ["properties"],
};

const SEARCH_RESULT_PROMPT =
    "Extract all FOR SALE (purchase) property listings from this page. " +
    "Each property must have a total purchase price in Crores or Lakhs — NOT a rental price in /month or /bed. " +
    "Skip PG, paying guest, and rental listings entirely. " +
    "If this is a category page with multiple listings, extract each one (up to 6). " +
    "If this is a single property detail page, extract that one property.";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the base search query (no site: filter — each source appends its own).
 * e.g. "2BHK flat for sale in Powai Mumbai under 2 crore ready to move"
 */
function buildSearchQuery({ city, locality, bhk, maxPrice, propertyType, possession }) {
    const parts = [];

    if (bhk && bhk !== 'Any') parts.push(bhk);

    const typeTerm = PROPERTY_TYPE_SEARCH_TERMS[propertyType] || 'flat';
    parts.push(typeTerm, 'for sale in');

    if (locality) parts.push(locality);
    parts.push(city);

    if (maxPrice) {
        const priceNum = parseFloat(maxPrice);
        const budgetLabel = priceNum < 1
            ? `${Math.round(priceNum * 100)} lakh`
            : `${priceNum} crore`;
        parts.push(`under ${budgetLabel}`);
    }

    if (possession === 'ready') parts.push('ready to move');

    return parts.join(' ');
}

/**
 * Parse an Indian price string to a float in Crores.
 * Handles: "₹1.65 Cr", "₹45 L", "₹45 Lakh", raw numbers.
 * Returns null if the string looks like a rental price or can't be parsed.
 */
function parsePriceToCrores(priceStr) {
    if (!priceStr || typeof priceStr !== 'string') return null;
    const s = priceStr.replace(/[₹,\s]/g, '').toLowerCase();

    // Reject rental/PG price patterns
    if (/\/bed|\/bedroom|\/month|\/day/.test(s)) return null;

    const croreMatch = s.match(/^([\d.]+)cr/);
    if (croreMatch) return parseFloat(croreMatch[1]);

    const lakhMatch = s.match(/^([\d.]+)l/);
    if (lakhMatch) return parseFloat(lakhMatch[1]) / 100;

    // Raw absolute number (e.g. 16500000) — assume INR
    const numMatch = s.match(/^([\d.]+)$/);
    if (numMatch) {
        const n = parseFloat(numMatch[1]);
        if (n > 100000) return n / 10_000_000;
    }

    return null;
}

/**
 * Deduplicate scraped properties.
 * Two properties are considered duplicates when they share the same
 * building name (case-insensitive) AND the same BHK config.
 * When duplicates exist, the one with more populated fields wins.
 */
function deduplicateProperties(properties) {
    const best = new Map();

    for (const p of properties) {
        const key = [
            (p.building_name || '').toLowerCase().trim(),
            (p.bhk_config    || '').toLowerCase().trim(),
        ].join('::');

        if (!best.has(key)) {
            best.set(key, p);
        } else {
            // Keep whichever has more non-empty fields
            const existing     = best.get(key);
            const countFilled  = obj => Object.values(obj).filter(v => v && v !== '').length;
            if (countFilled(p) > countFilled(existing)) best.set(key, p);
        }
    }

    return Array.from(best.values());
}

/**
 * Round-robin interleave properties from different sources so the final
 * slice contains a proportional mix (e.g. 6 99acres + 6 magicbricks)
 * rather than all properties from the first source.
 *
 * Each source's properties are sorted by price (descending) so higher-value
 * properties (closer to user's budget target) appear first.
 */
function interleaveBySource(properties, limit) {
    const queues = {};
    for (const p of properties) {
        const src = p.source || 'unknown';
        if (!queues[src]) queues[src] = [];
        queues[src].push(p);
    }

    // Sort each source's queue by price (descending) - higher priced first
    for (const src in queues) {
        queues[src].sort((a, b) => {
            const priceA = parsePriceToCrores(a.total_price || '0') || 0;
            const priceB = parsePriceToCrores(b.total_price || '0') || 0;
            return priceB - priceA; // Descending: higher prices first
        });
    }

    const groups = Object.values(queues);
    const result = [];
    let round = 0;
    while (result.length < limit) {
        let added = 0;
        for (const group of groups) {
            if (result.length >= limit) break;
            if (round < group.length) { result.push(group[round]); added++; }
        }
        if (added === 0) break;
        round++;
    }
    return result;
}

/**
 * Drop PG/rental listings and properties outside the user's budget.
 * Allows ±15 % tolerance so rounding in displayed prices doesn't incorrectly
 * reject a valid listing.
 *
 * Smart minimum price: When maxPrice is high, exclude properties that are
 * too far below the budget (users searching for 5Cr don't want 50L properties).
 */
function filterValidProperties(properties, minPrice, maxPrice) {
    const max = parseFloat(maxPrice) || 0;
    let min = parseFloat(minPrice) || 0;

    // Smart minimum price calculation:
    // - For budget >= 2 Cr: minimum = 30% of maxPrice (e.g., 5Cr → 1.5Cr minimum)
    // - For budget >= 1 Cr: minimum = 25% of maxPrice (e.g., 1.5Cr → 37.5L minimum)
    // - For budget < 1 Cr: no automatic minimum
    if (min === 0 && max >= 2) {
        min = max * 0.30; // 30% floor for high budgets
    } else if (min === 0 && max >= 1) {
        min = max * 0.25; // 25% floor for medium budgets
    }

    return properties.filter(p => {
        const price = p.total_price || '';

        // Reject price strings that look like rentals
        if (/\/bed|\/bedroom|\/month|\/day/i.test(price)) return false;

        // Reject URLs that are clearly rentals/PG
        const url = p.property_url || '';
        if (/paying.guest|pg-for-rent|for-rent/.test(url)) return false;

        // Parse and validate against budget
        const priceInCr = parsePriceToCrores(price);
        if (priceInCr === null) return false;

        if (max > 0 && priceInCr > max * 1.15) return false;
        if (min > 0 && priceInCr < min * 0.85) return false;

        return true;
    });
}

/**
 * Sanitize user-input strings before embedding in queries or logs.
 */
function sanitize(input, maxLen = 60) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, maxLen);
}

/**
 * Wraps a promise with a hard timeout.
 */
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`[Firecrawl] ${label} timed out after ${ms / 1000}s`)), ms)
        ),
    ]);
}

/**
 * Classify a Firecrawl error as retryable and return the reason, or null.
 */
function isRetryableError(err) {
    const msg  = String(err?.message || '').toLowerCase();
    const code = err?.statusCode || err?.status || 0;
    if (msg.includes('err_tunnel_connection_failed') || msg.includes('proxy error') || msg.includes('internal proxy')) return 'proxy';
    if (code === 429 || msg.includes('rate limit')) return 'rate_limit';
    if (code === 503 || code === 502 || msg.includes('temporarily unavailable')) return 'server';
    return null;
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

// ── Service class ─────────────────────────────────────────────────────────────

class FirecrawlService {
    constructor(apiKey) {
        if (!apiKey) throw new Error('[FirecrawlService] API key is required — no fallback allowed.');
        this.apiKey = apiKey;
        this.firecrawl = new FirecrawlApp({ apiKey });

        // Initialize circuit breakers for different operation types
        this.searchCircuit = registry.getBreaker('firecrawl-search', {
            failureThreshold: 4,
            timeout: 120000, // 2 minutes
            name: 'firecrawl-search'
        });

        this.scrapeCircuit = registry.getBreaker('firecrawl-scrape', {
            failureThreshold: 5,
            timeout: 90000, // 1.5 minutes
            name: 'firecrawl-scrape'
        });
    }

    async validateApiKey() {
        try {
            await withTimeout(
                // Validate against the canonical scrape path from Firecrawl docs.
                (typeof this.firecrawl.scrape === 'function'
                    ? this.firecrawl.scrape('https://example.com', { formats: ['markdown'] })
                    : this.firecrawl.scrapeUrl('https://example.com', { formats: ['markdown'] })),
                20_000,
                'validate-firecrawl-key-sdk'
            );
            return { valid: true, via: 'sdk' };
        } catch (sdkErr) {
            // Fallback to direct HTTP check on v2 API to avoid SDK/version false negatives.
            try {
                const response = await axios.post(
                    'https://api.firecrawl.dev/v2/scrape',
                    { url: 'https://example.com' },
                    {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 20_000,
                    }
                );

                if (response.status === 200 && response.data?.success !== false) {
                    return { valid: true, via: 'http' };
                }

                throw new Error(`Firecrawl direct validation failed: ${response.data?.error || 'Unknown error'}`);
            } catch (httpErr) {
                const status = httpErr?.response?.status;
                const detail = httpErr?.response?.data?.error || httpErr?.message || sdkErr?.message || 'Unknown error';
                const err = new Error(`[FirecrawlValidation] ${detail}`);
                err.statusCode = status || httpErr?.statusCode || 500;
                throw err;
            }
        }
    }

    /**
     * Find properties matching the user's criteria.
     *
     * Flow:
     *   1. Build base query (no site: filter)
     *   2. Search all active sources in parallel with inline JSON extraction (scrapeOptions)
     *      — Firecrawl searches + extracts structured data in one call, no separate scrapes
     *   3. Collect property objects directly from search result items (.json field)
     *   4. Code-side filter (reject PG / rental / out-of-budget)
     *   5. Deduplicate properties (same building + BHK across sites)
     *   6. Return top `limit` results
     */
    async findProperties({
        city,
        locality       = '',
        bhk            = 'Any',
        minPrice       = '0',
        maxPrice       = '5',
        propertyType   = 'Flat',
        propertyCategory = 'Residential',
        possession     = 'any',
        includeNoBroker = false,
        limit          = 12,
    }) {
        try {
            city         = sanitize(city, 40);
            locality     = sanitize(locality, 40);
            propertyType = sanitize(propertyType, 20);

            if (!city) throw new Error('City name is required');

            // ── Step 1: Build base query ────────────────────────────────────
            const baseQuery = buildSearchQuery({ city, locality, bhk, maxPrice, propertyType, possession });

            const priceNum    = parseFloat(maxPrice);
            const budgetLabel = priceNum < 1
                ? `${Math.round(priceNum * 100)} Lakhs`
                : `${priceNum} Crores`;

            // Decide which sources to search
            const activeSources = ['99acres', 'magicbricks', 'housing'];
            if (includeNoBroker) activeSources.push('nobroker');

            console.log('\n[DEBUG] ─── Firecrawl Multi-Source Search ──────────────');
            console.log('[DEBUG] Base query   :', baseQuery);
            console.log('[DEBUG] Sources      :', activeSources.join(', '));
            console.log('[DEBUG] City         :', city, locality ? `| Locality: ${locality}` : '');
            console.log('[DEBUG] BHK          :', bhk);
            console.log('[DEBUG] Budget       :', minPrice, '–', maxPrice, 'Cr →', budgetLabel);
            console.log('[DEBUG] Type         :', propertyType);
            console.log('[DEBUG] Possession   :', possession);
            console.log('[DEBUG] NoBroker     :', includeNoBroker);
            console.log('[DEBUG] ────────────────────────────────────────────────\n');

            // ── Step 2: Parallel search + inline extraction across all active sources ─
            // scrapeOptions tells Firecrawl to extract structured JSON from each result
            // page it finds. No separate scrapeUrl calls needed — one API call per source.
            const searchPromises = activeSources.map(sourceKey => {
                const { domain, limit: srcLimit } = SEARCH_SOURCES[sourceKey];
                const query = `${baseQuery} site:${domain}`;

                // Wrap search operation with circuit breaker
                return this.searchCircuit.execute(async () => {
                    const response = await withTimeout(
                        this.firecrawl.search(query, {
                            limit: srcLimit,
                            location: 'India',
                            scrapeOptions: {
                                formats: [{
                                    type: 'json',
                                    prompt: SEARCH_RESULT_PROMPT,
                                    schema: SEARCH_RESULT_SCHEMA,
                                }],
                                onlyMainContent: true,
                            },
                        }),
                        SEARCH_TIMEOUT_MS,
                        `search:${sourceKey}`
                    );

                    const normalizedData = Array.isArray(response?.data)
                        ? response.data
                        : [
                            ...(Array.isArray(response?.web) ? response.web : []),
                            ...(Array.isArray(response?.news) ? response.news : []),
                            ...(Array.isArray(response?.images) ? response.images : []),
                        ];

                    return normalizedData;
                }).then(result => ({ sourceKey, data: Array.isArray(result) ? result : [], error: null }))
                .catch(err => {
                    log.warn(`[Firecrawl] Search failed for ${sourceKey}: ${err.message}`);
                    return { sourceKey, data: [], error: err };
                });
            });

            const searchResults = await Promise.all(searchPromises);

            // Check if ALL sources failed with 402 (insufficient credits)
            const all402 = searchResults.every(r => r.error && isCreditsExhaustedError(r.error));
            if (all402) {
                const err = new Error('Firecrawl API credits exhausted. Please upgrade your plan at https://firecrawl.dev/pricing');
                err.code = 'FIRECRAWL_CREDITS_EXHAUSTED';
                err.statusCode = 402;
                throw err;
            }

            const allUnauthorized = searchResults.length > 0 && searchResults.every(r => r.error && isUnauthorizedError(r.error));
            if (allUnauthorized) {
                const err = new Error('Firecrawl API key is invalid or expired. Please update your Firecrawl key.');
                err.code = 'FIRECRAWL_AUTH_ERROR';
                err.statusCode = 401;
                throw err;
            }

            const allFailed = searchResults.length > 0 && searchResults.every(r => !!r.error);
            if (allFailed) {
                const err = new Error('All Firecrawl sources failed. Please try again in a few minutes.');
                err.code = 'FIRECRAWL_ERROR';
                err.statusCode = 503;
                throw err;
            }

            // ── Step 3: Flatten per-result property arrays ──────────────────
            // Each result item: { url, title, description, json: { properties: [...] } }
            // A category page contributes multiple items; a detail page contributes one.
            const rawProperties = searchResults.flatMap(({ sourceKey, data }) => {
                const extracted = [];
                for (const result of data) {
                    const items = result.json?.properties;
                    if (!Array.isArray(items) || items.length === 0) continue;
                    for (const prop of items) {
                        extracted.push({
                            ...prop,
                            property_url: result.url,
                            source:       sourceKey,
                        });
                    }
                }
                return extracted;
            });

            console.log('[DEBUG] ─── Search + Extract Results (all sources) ───────');
            searchResults.forEach(({ sourceKey, data }) => {
                const propCount = data.reduce((n, r) => n + (r.json?.properties?.length || 0), 0);
                console.log(`[DEBUG] ${sourceKey.padEnd(12)}: ${data.length} pages → ${propCount} properties`);
            });
            console.log('[DEBUG] Total raw properties :', rawProperties.length);
            rawProperties.forEach((p, i) =>
                console.log(`[DEBUG] [${i}] [${p.source}] name=${p.building_name} | price=${p.total_price} | bhk=${p.bhk_config}`)
            );
            console.log('[DEBUG] ────────────────────────────────────────────────\n');

            if (rawProperties.length === 0) {
                return { properties: [] };
            }

            // ── Step 4: Filter (reject PG / rental / out-of-budget) ─────────
            // Calculate smart minimum price for logging
            const maxPriceNum = parseFloat(maxPrice) || 0;
            let smartMinPrice = parseFloat(minPrice) || 0;
            if (smartMinPrice === 0 && maxPriceNum >= 2) {
                smartMinPrice = maxPriceNum * 0.30;
            } else if (smartMinPrice === 0 && maxPriceNum >= 1) {
                smartMinPrice = maxPriceNum * 0.25;
            }
            if (smartMinPrice > 0) {
                console.log(`[DEBUG] Smart min price      : ₹${smartMinPrice.toFixed(2)} Cr (${(smartMinPrice * 100).toFixed(0)} L floor for ${maxPriceNum} Cr budget)`);
            }

            const filtered = filterValidProperties(rawProperties, minPrice, maxPrice);

            // ── Step 5: Deduplicate same property across portals ────────────
            const deduplicated = deduplicateProperties(filtered);

            console.log('[DEBUG] ─── After Filter + Dedup ───────────────────────');
            console.log('[DEBUG] After filter         :', filtered.length, '/', rawProperties.length);
            console.log('[DEBUG] After dedup          :', deduplicated.length);
            deduplicated.forEach((p, i) =>
                console.log(`[DEBUG] [${i}] ✓ [${p.source}] name=${p.building_name} | price=${p.total_price}`)
            );
            console.log('[DEBUG] ────────────────────────────────────────────────\n');

            // Normalise field names so existing AI service stays compatible
            const properties = interleaveBySource(deduplicated, limit).map(p => ({
                ...p,
                price:     p.total_price,
                area_sqft: p.carpet_area_sqft || p.superbuiltup_area_sqft || '',
            }));

            log.info(`[Firecrawl] Returning ${properties.length} properties for ${city} (sources: ${activeSources.join(', ')})`);
            return { properties };

        } catch (error) {
            log.error('Error finding properties:', error.message || error);
            throw error;
        }
    }

    // ── Location trends (unchanged from previous version) ────────────────────

    async getLocationTrends(city, limit = 5) {
        try {
            city = sanitize(city, 40);
            if (!city) throw new Error('City name is required');

            const formattedLocation = city.toLowerCase().replace(/\s+/g, '-');
            const url = `https://www.99acres.com/property-rates-and-price-trends-in-${formattedLocation}-prffid`;

            const locationSchema = {
                type: "object",
                properties: {
                    locations: {
                        type: "array",
                        description: `Price trend data for ${limit} localities`,
                        items: {
                            type: "object",
                            properties: {
                                location:         { type: "string" },
                                price_per_sqft:   { type: "number" },
                                percent_increase: { type: "number" },
                                rental_yield:     { type: "number" },
                            },
                            required: ["location", "price_per_sqft", "percent_increase", "rental_yield"],
                        },
                    },
                },
                required: ["locations"],
            };

            log.info(`[Firecrawl] Scraping trends from: ${url}`);
            const scrapeResult = await this._scrapeWithRetry(url, {
                formats: [{
                    type: 'json',
                    prompt: `Extract price trend data for ${limit} major localities in ${city}. Include location name, price per sqft, yearly percent increase, and rental yield.`,
                    schema: locationSchema,
                }],
                waitFor:         10000,
                timeout:         FIRECRAWL_TIMEOUT_MS,
                onlyMainContent: true,
            }, `getLocationTrends(${city})`);

            const rawLocations = scrapeResult.json?.locations || [];
            const locations    = rawLocations.slice(0, limit);
            log.info(`[Firecrawl] Extracted ${rawLocations.length} locations, returning ${locations.length}`);
            return { locations };

        } catch (error) {
            log.error('Error fetching location trends:', error.message || error);
            throw error;
        }
    }

    // ── Shared retry helper ───────────────────────────────────────────────────

    async _scrapeWithRetry(url, baseOpts, label) {
        let lastError;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            const useGeo = attempt === 0;
            const opts   = useGeo ? { ...baseOpts, location: { country: "IN" } } : { ...baseOpts };

            try {
                // Wrap scrape operation with circuit breaker
                const result = await this.scrapeCircuit.execute(async () => {
                    const scrapeMethod = typeof this.firecrawl.scrape === 'function'
                        ? this.firecrawl.scrape.bind(this.firecrawl)
                        : this.firecrawl.scrapeUrl.bind(this.firecrawl);

                    return await withTimeout(
                        scrapeMethod(url, opts),
                        FIRECRAWL_TIMEOUT_MS,
                        `${label} (attempt ${attempt + 1})`
                    );
                });

                if (!result || result.success === false) {
                    throw new Error(`Firecrawl error: ${result.error || 'Unknown'}`);
                }
                return result;
            } catch (err) {
                lastError = err;
                const reason = isRetryableError(err);
                if (!reason || attempt === MAX_RETRIES) break;

                const delayMs = reason === 'rate_limit' ? 3000 : reason === 'proxy' ? 2000 : 1000;
                log.warn(`[Firecrawl] ${reason} on attempt ${attempt + 1}, retrying in ${delayMs / 1000}s…`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }

        throw lastError;
    }
}

/**
 * Factory — create a FirecrawlService with a caller-supplied API key.
 * Server env-var keys MUST NOT be used as a fallback.
 */
export function createFirecrawlService(apiKey) {
    return new FirecrawlService(apiKey);
}
