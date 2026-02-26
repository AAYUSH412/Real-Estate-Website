import defaultFirecrawlService, { createFirecrawlService } from '../services/firecrawlService.js';
import defaultAIService, { createAIService } from '../services/aiService.js';
import { validateAndFixPropertyAnalysis, validateAndFixLocationAnalysis } from '../utils/validateAIResponse.js';

/**
 * Resolve per-request service instances.
 * If the caller supplies X-Github-Key / X-Firecrawl-Key headers, use those.
 * Otherwise fall back to the server's own env-key singletons.
 */
function resolveServices(req) {
    const githubKey    = req.headers['x-github-key']?.trim();
    const firecrawlKey = req.headers['x-firecrawl-key']?.trim();

    const usingUserKeys = !!(githubKey && firecrawlKey);

    return {
        aiService:        githubKey    ? createAIService(githubKey)        : defaultAIService,
        firecrawlService: firecrawlKey ? createFirecrawlService(firecrawlKey) : defaultFirecrawlService,
        usingUserKeys,
    };
}

export const searchProperties = async (req, res) => {
    try {
        const { city, maxPrice, propertyCategory, propertyType, limit = 6 } = req.body;

        if (!city || !maxPrice) {
            return res.status(400).json({ success: false, message: 'City and maxPrice are required' });
        }

        const { firecrawlService, aiService, usingUserKeys } = resolveServices(req);
        console.log(`[PropertyController] Using ${usingUserKeys ? 'user-provided' : 'server'} API keys`);

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
                message: `No properties found in ${city} within the given budget`,
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

        res.json({ success: true, properties: propertiesData.properties, analysis });
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

        const { firecrawlService, aiService, usingUserKeys } = resolveServices(req);
        console.log(`[PropertyController] Trends using ${usingUserKeys ? 'user-provided' : 'server'} API keys`);

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
                message: `No location trend data found for ${city}`,
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

        res.json({ success: true, locations: locationsData.locations, analysis });
    } catch (error) {
        console.error('Error getting location trends:', error);
        res.status(500).json({ success: false, message: 'Failed to get location trends', error: error.message });
    }
};