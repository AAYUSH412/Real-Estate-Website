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

// ── MagicBricks URL builder ───────────────────────────────────────────────────
// property type → MagicBricks proptype param
const MB_PROP_TYPE = {
    'Flat':       'Multistorey-Apartment,Builder-Floor-Apartment,Penthouse,Studio-Apartment',
    'House':      'Residential-House,Villa',
    'Villa':      'Residential-House,Villa',
    'Plot':       'Residential-Plot',
    'Penthouse':  'Penthouse',
    'Studio':     'Studio-Apartment',
    'Commercial': 'Office-Space,Shop,Showroom,Commercial-Plot',
};

// Convert crore float to MagicBricks BudgetMin/BudgetMax string
// e.g. 0.50 → "50-Lac", 1.5 → "1.5-Crores", 5 → "5-Crores"
function mbBudget(crores) {
    if (!crores || crores <= 0) return '';
    if (crores < 1) return `${Math.round(crores * 100)}-Lac`;
    return `${crores}-Crores`;
}

function buildMagicBricksUrl({ city, bhk, minPrice, maxPrice, propertyType }) {
    const proptype = MB_PROP_TYPE[propertyType] || MB_PROP_TYPE['Flat'];
    const bedroom  = (!bhk || bhk === 'Any') ? '' : bhk.replace(' BHK', '');
    const params   = new URLSearchParams({
        proptype,
        cityName: city,
        ...(bedroom       && { bedroom }),
        ...(maxPrice      && { BudgetMax: mbBudget(parseFloat(maxPrice)) }),
        ...(minPrice > 0  && { BudgetMin: mbBudget(parseFloat(minPrice)) }),
    });
    return `https://www.magicbricks.com/property-for-sale/residential-real-estate?${params}`;
}

// ── Housing.com URL builder ───────────────────────────────────────────────────
const HOUSING_TYPE_SLUG = {
    'Flat':       'flats',
    'House':      'independent-houses',
    'Villa':      'villas',
    'Plot':       'plots',
    'Penthouse':  'penthouses',
    'Studio':     'studio-apartments',
    'Commercial': 'office-spaces',
};

function buildHousingUrl({ city, propertyType }) {
    const slug     = HOUSING_TYPE_SLUG[propertyType] || 'flats';
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    return `https://housing.com/in/buy/${slug}/${citySlug}/`;
}

// ── 99acres URL builder ───────────────────────────────────────────────────────
// 99acres uses numeric city IDs. Map only the common cities; fall back to search URL.
const ACRES99_CITY_ID = {
    'mumbai': 1, 'delhi': 2, 'bangalore': 3, 'hyderabad': 4, 'ahmedabad': 5,
    'chennai': 6, 'kolkata': 7, 'pune': 8, 'jaipur': 10, 'surat': 14,
    'lucknow': 15, 'kanpur': 16, 'nagpur': 17, 'indore': 18, 'bhopal': 20,
    'patna': 21, 'noida': 60, 'gurgaon': 56, 'ghaziabad': 61, 'faridabad': 57,
    'navi mumbai': 44, 'thane': 46, 'vadodara': 45, 'coimbatore': 29,
    'kochi': 30, 'visakhapatnam': 32, 'chandigarh': 25,
};

const ACRES99_PROP_TYPE = {
    'Flat': '1', 'House': '2', 'Villa': '2', 'Plot': '3',
    'Penthouse': '1', 'Studio': '1', 'Commercial': '14',
};

// Budget in 99acres is in Lakhs × 10 (e.g. 1 Cr = budget param 100)
function acres99Budget(crores) {
    if (!crores || crores <= 0) return '';
    return String(Math.round(crores * 100));
}

function buildAcres99Url({ city, bhk, minPrice, maxPrice, propertyType }) {
    const cityId   = ACRES99_CITY_ID[city.toLowerCase()];
    const propType = ACRES99_PROP_TYPE[propertyType] || '1';
    const bedroom  = (!bhk || bhk === 'Any') ? '' : bhk.replace(' BHK', '');

    // Fall back to text search if city not in lookup table
    if (!cityId) {
        const typeTerm = propertyType === 'Villa' ? 'independent-villa' : propertyType.toLowerCase();
        const citySlug = city.toLowerCase().replace(/\s+/g, '-');
        return `https://www.99acres.com/search/property/buy/${typeTerm}/${citySlug}?res_com=R&preference=S&area_unit=1`;
    }

    const params = new URLSearchParams({
        city: String(cityId),
        property_type: propType,
        preference: 'S',
        area_unit: '1',
        res_com: 'R',
        ...(bedroom           && { bedroom }),
        ...(maxPrice > 0      && { budget_max: acres99Budget(parseFloat(maxPrice)) }),
        ...(minPrice > 0      && { budget_min: acres99Budget(parseFloat(minPrice)) }),
    });
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const typePath = propertyType === 'Villa' ? 'independent-villa' :
                     propertyType === 'House' ? 'independent-house' : '';
    const path = typePath
        ? `/search/property/buy/${typePath}/${citySlug}`
        : `/search/property/buy/${citySlug}`;
    return `https://www.99acres.com${path}?${params}`;
}

// ── NoBroker URL builder ──────────────────────────────────────────────────────
// Owner-direct listings (zero brokerage) — unique inventory not on MagicBricks.
// Slug format: /flats-for-sale-in-{city} with optional ?price=minINR,maxINR
const NB_TYPE_SLUG = {
    'Flat':       'flats',
    'House':      'independent-house',
    'Villa':      'villa',
    'Plot':       'plot',
    'Penthouse':  'penthouse',
    'Studio':     'studio-apartment',
    'Commercial': 'office-space',
};

function buildNoBrokerUrl({ city, propertyType, minPrice, maxPrice }) {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const typeSlug = NB_TYPE_SLUG[propertyType] || 'flats';
    // NoBroker price param is in raw INR: 1 Cr = 10,000,000
    const toINR = cr => Math.round(parseFloat(cr) * 10_000_000);
    const minINR = parseFloat(minPrice) > 0 ? toINR(minPrice) : 0;
    const maxINR = parseFloat(maxPrice) > 0 ? toINR(maxPrice) : 0;
    const priceParam = maxINR > 0 ? `?price=${minINR},${maxINR}` : '';
    return `https://www.nobroker.in/${typeSlug}-for-sale-in-${citySlug}${priceParam}`;
}

// ── Square Yards URL builder ──────────────────────────────────────────────────
// Good for premium/new-launch projects. URL: /sale/{bhk}-bhk-{type}-for-sale-in-{city}
const SY_TYPE_SLUG = {
    'Flat':       'flat',
    'House':      'independent-house',
    'Villa':      'villa',
    'Plot':       'plot',
    'Penthouse':  'penthouse',
    'Studio':     'studio-apartment',
    'Commercial': 'commercial',
};

function buildSquareYardsUrl({ city, bhk, propertyType }) {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const typeSlug = SY_TYPE_SLUG[propertyType] || 'flat';
    const bhkPrefix = (!bhk || bhk === 'Any') ? '' : `${bhk.replace(' BHK', '')}-bhk-`;
    return `https://www.squareyards.com/sale/${bhkPrefix}${typeSlug}-for-sale-in-${citySlug}`;
}

// ── Multi-source search config ────────────────────────────────────────────────
const SEARCH_SOURCES = {
    'magicbricks':  { limit: 6 },
    'nobroker':     { limit: 6 },
    'squareyards':  { limit: 6 },
    'housing':      { limit: 6 },
    '99acres':      { limit: 6 },
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
                required: ["building_name", "property_type", "location_address"],
            },
        },
    },
    required: ["properties"],
};

// SEARCH_RESULT_PROMPT is a function so we can inject the city for location validation.
function buildSearchResultPrompt(city) {
    return (
        `Extract FOR SALE (purchase) property listings from this page that are located in ${city}, India. ` +
        "Each property must have a total purchase price in Crores or Lakhs — NOT a rental price in /month or /bed. " +
        "Skip PG, paying guest, rental listings, and any property whose address is NOT in " + city + ". " +
        "If this is a category page with multiple listings, extract up to 6 listings. " +
        "If this is a single property detail page, extract that one property. " +
        "For building_name: use the actual society/project name shown on the page. " +
        "If no project name is visible, use the locality name or street address — never invent generic names like 'Building A'. " +
        "For total_price: copy the exact displayed price (e.g. '₹1.25 Cr', '₹75 Lakhs', 'Price on Request'). Never guess a price."
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build direct search page URLs for each source.
 * Returns an array of { sourceKey, url } pairs to scrape.
 * Direct URLs match exactly what a user sees when filtering on the website —
 * unlike the old search() approach which used Google web search.
 */
function buildSourceUrls({ city, locality, bhk, minPrice, maxPrice, propertyType }) {
    // When a locality is specified, append it to city name for MagicBricks/housing
    const cityArg = locality ? `${locality}, ${city}` : city;

    // Active sources — ordered by reliability.
    // housing.com and squareyards consistently return 0 (anti-bot / no content extracted).
    const sources = [
        {
            key: 'magicbricks',
            url: buildMagicBricksUrl({ city, bhk, minPrice, maxPrice, propertyType }),
        },
        {
            key: 'nobroker',
            url: buildNoBrokerUrl({ city: locality || city, propertyType, minPrice, maxPrice }),
        },
        {
            key: '99acres',
            url: buildAcres99Url({ city, bhk, minPrice, maxPrice, propertyType }),
        },
    ];

    return sources;
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
 * Reconstruct total_price from price_per_sqft × carpet area when total_price
 * is missing. Prevents dropping otherwise good listings just because one field
 * failed to extract. Marks reconstructed prices with _price_reconstructed flag
 * so the AI prompt can treat them with appropriate uncertainty.
 */
function reconstructPrice(p) {
    if (p.total_price && !/^\s*$/.test(p.total_price)) return p;

    const ppsft = parseFloat((p.price_per_sqft || '').replace(/[^\d.]/g, ''));
    const area  = parseFloat((p.carpet_area_sqft || p.superbuiltup_area_sqft || '').replace(/[^\d.]/g, ''));

    if (ppsft > 100 && area > 100) {
        const totalCr = (ppsft * area) / 1e7;
        const formatted = totalCr >= 1
            ? `₹${totalCr.toFixed(2)} Cr`
            : `₹${Math.round(totalCr * 100)} L`;
        return { ...p, total_price: formatted, _price_reconstructed: true };
    }

    // Can't reconstruct — mark as POR so it passes price filter and AI notes missing data
    return { ...p, total_price: 'Price on Request' };
}

/**
 * Normalize a building name for dedup comparison.
 * Strips filler words and punctuation so "Lodha Park" and "Lodha The Park"
 * collapse to the same key. Uses first 15 chars to tolerate suffix differences.
 */
function normalizeForDedup(name, bhk, address) {
    const n = (name || '')
        .toLowerCase()
        .replace(/\b(the|by|at|phase|tower|wing|block|residency|residences|heights|enclave|gardens|garden)\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);
    const b   = (bhk     || '').replace(/\s/g, '').toLowerCase().substring(0, 6);
    const loc = (address || '').split(',')[0].toLowerCase().replace(/[^a-z]/g, '').substring(0, 8);
    return `${n}:${b}:${loc}`;
}

/**
 * Deduplicate scraped properties using a normalized key so spelling variants
 * ("Lodha Park" vs "Lodha The Park") and missing BHK fields are handled.
 * When duplicates exist, the one with more populated fields wins.
 */
function deduplicateProperties(properties) {
    const best = new Map();

    for (const p of properties) {
        const key = normalizeForDedup(p.building_name, p.bhk_config, p.location_address);

        if (!best.has(key)) {
            best.set(key, p);
        } else {
            const existing    = best.get(key);
            const countFilled = obj => Object.values(obj).filter(v => v && v !== '').length;
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

    // Smart minimum: only drop listings that are clearly irrelevant junk (< 10% of budget).
    // The old 30% floor was too aggressive and cut valid results.
    if (min === 0 && max >= 1) {
        min = max * 0.10;
    }

    return properties.filter(p => {
        const price = p.total_price || '';

        // Reject price strings that look like rentals
        if (/\/bed|\/bedroom|\/month|\/day/i.test(price)) return false;

        // Reject URLs that are clearly rentals/PG
        const url = p.property_url || '';
        if (/paying.guest|pg-for-rent|for-rent/.test(url)) return false;

        // Keep "Price on Request" listings — they show up for premium/builder properties.
        // They pass price filtering but the AI can note the missing price in its analysis.
        const isPOR = /price on request|por|call for price/i.test(price);
        if (isPOR) return true;

        // Parse and validate against budget
        const priceInCr = parsePriceToCrores(price);
        if (priceInCr === null) return false;

        if (max > 0 && priceInCr > max * 1.15) return false;
        if (min > 0 && priceInCr < min * 0.85) return false;

        return true;
    });
}

/**
 * Validate that a RERA number looks like a real registration, not a hallucination.
 *
 * Real Indian RERA formats:
 *   Maharashtra: P51800000001  (P + state code + 8 digits)
 *   Gujarat:     PR/GJ/AHMEDABAD/AUDA/RAA00007/091019
 *   Karnataka:   PRM/KA/RERA/1251/310/PR/... (long slash-separated)
 *   Delhi/UP:    UPRERAPRJ12345
 *
 * Hallucinated formats we reject: "RERA-123456", "RERA123", "NA", "N/A", "Not Available"
 */
function isRealReraNumber(rera) {
    if (!rera || typeof rera !== 'string') return false;
    const s = rera.trim();
    if (!s || s.length < 8) return false;
    // Reject obvious placeholder values
    if (/^(n\/?a|not available|na|none|pending|upcoming|-)$/i.test(s)) return false;
    // Reject simple "RERA-NNNN" or "RERAXXXXXX" without slashes or state codes
    if (/^rera[-\s]?\d+$/i.test(s)) return false;
    // Must contain either a slash (real state formats) OR start with a known prefix + digits
    const hasSlash   = s.includes('/');
    const hasPrefix  = /^(P\d{11}$|PR\/|UPRERA|HRERA|MAHA|TNRERA|GJ\/|KA\/)/i.test(s);
    return hasSlash || hasPrefix;
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
        limit          = 12,
    }) {
        try {
            city         = sanitize(city, 40);
            locality     = sanitize(locality, 40);
            propertyType = sanitize(propertyType, 20);

            if (!city) throw new Error('City name is required');

            // ── Step 1: Build direct search page URLs ──────────────────────
            // Each URL is a real website search page with budget/type/BHK filters
            // applied — identical to what a user sees when manually searching.
            const priceNum    = parseFloat(maxPrice);
            const budgetLabel = priceNum < 1
                ? `${Math.round(priceNum * 100)} Lakhs`
                : `${priceNum} Crores`;

            const sourceUrls = buildSourceUrls({ city, locality, bhk, minPrice, maxPrice, propertyType });

            console.log('\n[DEBUG] ─── Firecrawl Direct URL Scraping ──────────────');
            console.log('[DEBUG] Mode         : scrapeUrl (direct search page)');
            console.log('[DEBUG] City         :', city, locality ? `| Locality: ${locality}` : '');
            console.log('[DEBUG] BHK          :', bhk);
            console.log('[DEBUG] Budget       :', minPrice, '–', maxPrice, 'Cr →', budgetLabel);
            console.log('[DEBUG] Type         :', propertyType);
            console.log('[DEBUG] Possession   :', possession);
            console.log('[DEBUG] Sources      : magicbricks, nobroker, 99acres');
            sourceUrls.forEach(s => console.log(`[DEBUG] ${s.key.padEnd(12)}: ${s.url}`));
            console.log('[DEBUG] ────────────────────────────────────────────────\n');

            // ── Step 2: Batched scrape — 3 sources at a time ─────────────────
            // Running all 5 in parallel exhausts Firecrawl's proxy pool and causes
            // ERR_TUNNEL_CONNECTION_FAILED. Batching limits concurrent renders to 3.
            // Each source uses _scrapeWithRetry which retries proxy/tunnel errors.
            const scrapeOpts = {
                formats: [{
                    type: 'json',
                    prompt: buildSearchResultPrompt(city),
                    schema: SEARCH_RESULT_SCHEMA,
                }],
                waitFor:         2000, // JS-heavy portals (especially Housing.com) render listings late
                onlyMainContent: true,
            };

            const scrapeOne = async ({ key: sourceKey, url }) => {
                try {
                    const result = await this._scrapeWithRetry(url, scrapeOpts, `findProperties:${sourceKey}`);
                    return { sourceKey, data: [result], error: null };
                } catch (err) {
                    log.warn(`[Firecrawl] Scrape failed for ${sourceKey}: ${err.message}`);
                    return { sourceKey, data: [], error: err };
                }
            };

            // Batch into groups of 3 — run each batch in parallel, batches sequentially
            const BATCH_SIZE = 3;
            const allResults = [];
            for (let i = 0; i < sourceUrls.length; i += BATCH_SIZE) {
                const batch = sourceUrls.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(batch.map(scrapeOne));
                allResults.push(...batchResults);
                // Stop early if we already have enough raw properties
                const soFar = allResults.reduce((n, r) => n + r.data.reduce((m, d) => m + (d.json?.properties?.length || 0), 0), 0);
                if (soFar >= limit * 3) break;
            }

            const searchResults = allResults;

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
                        const base = {
                            ...prop,
                            rera_number:  isRealReraNumber(prop.rera_number) ? prop.rera_number : '',
                            property_url: result.url,
                            source:       sourceKey,
                        };
                        // Recover listings whose total_price failed to extract
                        extracted.push(reconstructPrice(base));
                    }
                }
                return extracted;
            });

            console.log('[DEBUG] ─── Scrape + Extract Results (all sources) ─────');
            searchResults.forEach(({ sourceKey, data }) => {
                const propCount = data.reduce((n, r) => n + (r.json?.properties?.length || 0), 0);
                console.log(`[DEBUG] ${sourceKey.padEnd(12)}: ${propCount} properties extracted`);
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
            const maxPriceNum = parseFloat(maxPrice) || 0;
            const smartMinPrice = parseFloat(minPrice) || (maxPriceNum >= 1 ? maxPriceNum * 0.10 : 0);
            if (smartMinPrice > 0) {
                console.log(`[DEBUG] Smart min price      : ₹${smartMinPrice.toFixed(2)} Cr (10% floor for ${maxPriceNum} Cr budget)`);
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

            const sourceNames = sourceUrls.map(s => s.key).join(', ');
            log.info(`[Firecrawl] Returning ${properties.length} properties for ${city} (sources: ${sourceNames})`);
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
