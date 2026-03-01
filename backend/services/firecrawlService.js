import FirecrawlApp from "@mendable/firecrawl-js";

// Firecrawl can be slow on large pages — cap at 60 seconds per call
const FIRECRAWL_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const IS_PROD = process.env.NODE_ENV === 'production';

/** Conditional logger — suppresses verbose output in production */
const log = {
    info: (...args) => { if (!IS_PROD) console.log(...args); },
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};

// ── 99acres City ID Map ──────────────────────────────────────────────────────
// These are the internal numeric IDs 99acres uses in query parameters.
// Without the correct ID, filtered URLs return error pages.
const CITY_IDS = {
    'mumbai': 1,
    'delhi': 2,
    'bangalore': 3,
    'bengaluru': 3,
    'pune': 5,
    'chennai': 8,
    'hyderabad': 17,
    'kolkata': 25,
    'noida': 32,
    'ahmedabad': 45,
    'gurgaon': 75,
    'gurugram': 75,
    'thane': 41,
    'navi mumbai': 43,
    'ghaziabad': 11,
    'faridabad': 60,
    'greater noida': 74,
    'lucknow': 218,
    'jaipur': 100,
    'chandigarh': 12,
    'indore': 125,
    'nagpur': 98,
    'bhopal': 112,
    'kochi': 152,
    'coimbatore': 140,
    'vadodara': 88,
    'surat': 87,
    'mysore': 147,
    'vizag': 176,        // Visakhapatnam
    'visakhapatnam': 176,
    'patna': 200,
    'dehradun': 197,
    'mohali': 76,
    'zirakpur': 292,
    'panchkula': 95,
};

// ── City name aliases ────────────────────────────────────────────────────────
// Maps user-friendly / alternate names to the canonical key used in CITY_IDS.
const CITY_ALIASES = {
    'bombay': 'mumbai',
    'new delhi': 'delhi',
    'bengaluru': 'bangalore',
    'gurugram': 'gurgaon',
    'navimumbai': 'navi mumbai',
    'visakhapatnam': 'vizag',
};

// ── Property Type → 99acres URL Slug ────────────────────────────────────────
// The URL path must contain the exact slug for the property type.
const PROPERTY_TYPE_SLUGS = {
    'Flat': 'flat',
    'House': 'independent-house',
    'Villa': 'villa',
    'Plot': 'residential-land',
    'Penthouse': 'penthouse',
    'Studio': 'studio-apartment',
    'Commercial': 'commercial-property',
};

// ── Property Type → Human-readable prompt label ─────────────────────────────
const PROPERTY_TYPE_LABELS = {
    'Flat': 'Flats/Apartments',
    'House': 'Independent Houses',
    'Villa': 'Villas',
    'Plot': 'Residential Plots/Land',
    'Penthouse': 'Penthouses',
    'Studio': 'Studio Apartments',
    'Commercial': 'Commercial Properties',
};

// ── Budget → 99acres budget_max Index ────────────────────────────────────────
// 99acres uses a non-linear index scale for the budget_max query parameter.
// The thresholds are in Lakhs. We find the highest threshold ≤ user's budget.
const BUDGET_THRESHOLDS = [
    { lakhs: 5,    index: 2 },
    { lakhs: 10,   index: 3 },
    { lakhs: 20,   index: 4 },
    { lakhs: 30,   index: 5 },
    { lakhs: 40,   index: 6 },
    { lakhs: 50,   index: 7 },
    { lakhs: 60,   index: 8 },
    { lakhs: 70,   index: 17 },
    { lakhs: 80,   index: 18 },
    { lakhs: 90,   index: 19 },
    { lakhs: 100,  index: 9 },   // 1 Crore
    { lakhs: 150,  index: 10 },  // 1.5 Crores
    { lakhs: 200,  index: 11 },  // 2 Crores
    { lakhs: 300,  index: 12 },  // 3 Crores
    { lakhs: 500,  index: 13 },  // 5 Crores
    { lakhs: 1000, index: 14 },  // 10 Crores
    { lakhs: 2500, index: 15 },  // 25 Crores
];

/**
 * Convert maxPrice (in Crores string) to the 99acres budget_max index.
 * Returns the index for the smallest threshold that is ≥ the user's budget,
 * or null if the budget exceeds all thresholds.
 */
function getBudgetMaxIndex(maxPriceCrores) {
    const budgetInLakhs = parseFloat(maxPriceCrores) * 100;
    if (isNaN(budgetInLakhs) || budgetInLakhs <= 0) return null;

    // Find the smallest threshold >= user budget
    for (const { lakhs, index } of BUDGET_THRESHOLDS) {
        if (lakhs >= budgetInLakhs) return index;
    }
    // Budget exceeds all thresholds — omit parameter (no cap)
    return null;
}

/**
 * Resolve user-entered city name to the canonical key used in CITY_IDS.
 * Handles aliases and case-insensitive matching.
 */
function resolveCity(city) {
    const normalized = city.toLowerCase().trim();
    const aliased = CITY_ALIASES[normalized] || normalized;
    return { key: aliased, id: CITY_IDS[aliased] || null };
}

/**
 * Build the best possible 99acres URL for the given search parameters.
 * - Known city → deterministic filtered URL
 * - Unknown city → generic city listing page (fallback)
 */
function build99acresURL(city, maxPrice, propertyType) {
    const { key: cityKey, id: cityId } = resolveCity(city);
    const slug = PROPERTY_TYPE_SLUGS[propertyType] || null;
    const budgetIndex = getBudgetMaxIndex(maxPrice);

    // ── Deterministic path: city ID is known ──
    if (cityId && slug) {
        const formattedCity = cityKey.replace(/\s+/g, '-');
        const params = new URLSearchParams();
        params.set('city', String(cityId));
        if (budgetIndex !== null) params.set('budget_max', String(budgetIndex));

        const url = `https://www.99acres.com/search/property/buy/${slug}/${formattedCity}?${params.toString()}`;
        log.info(`[Firecrawl] Deterministic URL: ${url}`);
        return { url, isDeterministic: true };
    }

    // ── Fallback: unknown city or property type ──
    const formattedLocation = city.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.99acres.com/property-in-${formattedLocation}-ffid`;
    log.info(`[Firecrawl] Fallback URL (city/type not mapped): ${url}`);
    return { url, isDeterministic: false };
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve in time.
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
 * Check whether a Firecrawl error is a transient failure that can be retried.
 * Covers proxy tunnel failures, rate limits, and temporary server errors.
 */
function isRetryableError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err?.statusCode || err?.status || 0;
    // Proxy / tunnel failures
    if (msg.includes('err_tunnel_connection_failed')
        || msg.includes('proxy error')
        || msg.includes('internal proxy')) return 'proxy';
    // Rate-limited
    if (code === 429 || msg.includes('rate limit')) return 'rate_limit';
    // Temporary server error
    if (code === 503 || code === 502 || msg.includes('temporarily unavailable')) return 'server';
    return null;
}

/**
 * Sanitize user-input strings before embedding in URLs or logs.
 * Strips control chars, trims, collapses whitespace, limits length.
 */
function sanitize(input, maxLen = 60) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[\x00-\x1F\x7F]/g, '')   // strip control chars
        .trim()
        .replace(/\s+/g, ' ')                // collapse whitespace
        .slice(0, maxLen);
}

class FirecrawlService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('[FirecrawlService] API key is required — no fallback allowed.');
        }
        this.firecrawl = new FirecrawlApp({ apiKey });
    }

    async findProperties(city, maxPrice, propertyCategory = "Residential", propertyType = "Flat", limit = 6) {
        try {
            // Sanitize user inputs before using them in URLs / prompts
            city = sanitize(city, 40);
            propertyCategory = sanitize(propertyCategory, 30);
            propertyType = sanitize(propertyType, 20);

            if (!city) throw new Error('City name is required');

            // Build the best possible URL (deterministic if city is known, fallback otherwise)
            const { url, isDeterministic } = build99acresURL(city, maxPrice, propertyType);

            // Use a precise, type-aware prompt label
            const propertyTypeLabel = PROPERTY_TYPE_LABELS[propertyType] || propertyType;

            // Format budget for the prompt in human-readable form
            const priceNum = parseFloat(maxPrice);
            const budgetLabel = priceNum < 1
                ? `${Math.round(priceNum * 100)} Lakhs`
                : `${priceNum} Crores`;

            const propertySchema = {
                type: "object",
                properties: {
                    properties: {
                        type: "array",
                        description: `List of exactly ${limit} property details`,
                        items: {
                            type: "object",
                            properties: {
                                building_name: {
                                    type: "string",
                                    description: "Name of the building/property"
                                },
                                property_type: {
                                    type: "string",
                                    description: "Type of property (e.g. Flat, Independent House, Villa, Plot)"
                                },
                                location_address: {
                                    type: "string",
                                    description: "Complete address of the property"
                                },
                                price: {
                                    type: "string",
                                    description: "Price of the property in INR (e.g. ₹45 L, ₹1.2 Cr)"
                                },
                                description: {
                                    type: "string",
                                    description: "Brief description (max 50 words)"
                                },
                                amenities: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Top 3-5 amenities only"
                                },
                                area_sqft: {
                                    type: "string",
                                    description: "Area in square feet"
                                },
                                bedrooms: {
                                    type: "string",
                                    description: "Number of bedrooms (e.g. 2 BHK, 3 BHK)"
                                },
                                property_url: {
                                    type: "string",
                                    description: "Direct URL link to this specific property listing on 99acres"
                                }
                            },
                            required: ["building_name", "property_type", "location_address", "price"]
                        }
                    }
                },
                required: ["properties"]
            };

            // Build a more precise prompt — reinforces filters even on a pre-filtered page
            const promptLines = [
                `Extract exactly ${limit} ${propertyCategory} ${propertyTypeLabel} listed for sale in ${city}.`,
                `Maximum budget: ${budgetLabel}.`,
                `Only include properties priced at or below ${budgetLabel}.`,
                `For each property, extract the building name, type, full address, price, area in sqft, bedrooms, amenities, and the direct 99acres listing URL.`,
                `Return exactly ${limit} properties, no more, no fewer.`,
            ];
            if (!isDeterministic) {
                // On the generic page we need the LLM to filter harder
                promptLines.push(`IMPORTANT: This is a general listing page. Carefully filter ONLY ${propertyTypeLabel} — ignore all other property types.`);
            }

            // ── Use scrapeUrl with JSON format instead of extract() ──
            // extract() returns empty arrays for 99acres pages because it uses a
            // different (agentic) pipeline.  scrapeUrl with formats:["json"] does a
            // full browser render first and then applies LLM extraction, which works
            // reliably on JS-heavy listing pages like 99acres.
            log.info(`[Firecrawl] Scraping (json) from: ${url}`);

            const scrapeOpts = {
                formats: ["json"],
                jsonOptions: {
                    prompt: promptLines.join(' '),
                    schema: propertySchema
                },
                waitFor: 10000,
                timeout: FIRECRAWL_TIMEOUT_MS,  // tell Firecrawl server-side to cap too
                onlyMainContent: true
            };

            const scrapeResult = await this._scrapeWithRetry(url, scrapeOpts, `findProperties(${city})`);

            // scrapeUrl returns extracted JSON at scrapeResult.json
            const rawProperties = scrapeResult.json?.properties || [];

            // Enforce limit in code — never trust the LLM to respect it
            const properties = rawProperties.slice(0, limit);
            log.info(`[Firecrawl] Extracted ${rawProperties.length} properties, returning ${properties.length}`);

            return { properties };
        } catch (error) {
            log.error('Error finding properties:', error.message || error);
            throw error;
        }
    }

    async getLocationTrends(city, limit = 5) {
        try {
            city = sanitize(city, 40);
            if (!city) throw new Error('City name is required');

            const formattedLocation = city.toLowerCase().replace(/\s+/g, '-');

            // Use specific trends page URL — NO wildcard
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
                                location: { type: "string" },
                                price_per_sqft: { type: "number" },
                                percent_increase: { type: "number" },
                                rental_yield: { type: "number" }
                            },
                            required: ["location", "price_per_sqft", "percent_increase", "rental_yield"]
                        }
                    }
                },
                required: ["locations"]
            };

            // ── Use scrapeUrl with JSON format instead of extract() ──
            log.info(`[Firecrawl] Scraping trends (json) from: ${url}`);

            const scrapeOpts = {
                formats: ["json"],
                jsonOptions: {
                    prompt: `From this page, extract price trend data for ${limit} major localities in ${city}. Include: location name, price per sqft, yearly percent increase, and rental yield.`,
                    schema: locationSchema
                },
                waitFor: 10000,
                timeout: FIRECRAWL_TIMEOUT_MS,
                onlyMainContent: true
            };

            const scrapeResult = await this._scrapeWithRetry(url, scrapeOpts, `getLocationTrends(${city})`);

            // scrapeUrl returns extracted JSON at scrapeResult.json
            const rawLocations = scrapeResult.json?.locations || [];

            // Enforce limit in code
            const locations = rawLocations.slice(0, limit);
            log.info(`[Firecrawl] Extracted ${rawLocations.length} locations, returning ${locations.length}`);

            return { locations };
        } catch (error) {
            log.error('Error fetching location trends:', error.message || error);
            throw error;
        }
    }

    // ── Shared retry helper ──────────────────────────────────────────────────

    /**
     * Attempt scrapeUrl with geo-proxy first, then retry on transient errors.
     * Retry strategy:
     *   1. Try with location: { country: "IN" }
     *   2. On proxy error → retry WITHOUT geo-proxy
     *   3. On rate-limit / 503 → back off and retry WITH same options
     */
    async _scrapeWithRetry(url, baseOpts, label) {
        let lastError;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            const useGeo = attempt === 0; // first attempt includes geo-proxy
            const opts = useGeo
                ? { ...baseOpts, location: { country: "IN" } }
                : { ...baseOpts };        // subsequent retries skip geo-proxy

            try {
                const result = await withTimeout(
                    this.firecrawl.scrapeUrl(url, opts),
                    FIRECRAWL_TIMEOUT_MS,
                    `${label} (attempt ${attempt + 1})`
                );

                if (!result.success) {
                    throw new Error(`Firecrawl returned error: ${result.error || 'Unknown error'}`);
                }
                return result;
            } catch (err) {
                lastError = err;
                const reason = isRetryableError(err);

                if (!reason || attempt === MAX_RETRIES) {
                    // Non-retryable or exhausted retries
                    break;
                }

                // Back off: 2s for proxy, 3s for rate limit, 1s for server
                const delayMs = reason === 'rate_limit' ? 3000
                              : reason === 'proxy'      ? 2000
                              :                           1000;
                log.warn(`[Firecrawl] ${reason} error on attempt ${attempt + 1}, retrying in ${delayMs / 1000}s…`);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }

        throw lastError;
    }
}

/**
 * Factory — create a FirecrawlService with a caller-supplied API key.
 * The default-singleton export is intentionally removed:
 * server env-var keys MUST NOT be used as a fallback.
 */
export function createFirecrawlService(apiKey) {
    return new FirecrawlService(apiKey);
}
