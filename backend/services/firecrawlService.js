import FirecrawlApp from "@mendable/firecrawl-js";
import { config } from '../config/config.js';

class FirecrawlService {
    constructor(apiKey) {
        this.firecrawl = new FirecrawlApp({
            apiKey: apiKey || config.firecrawlApiKey
        });
    }

    async findProperties(city, maxPrice, propertyCategory = "Residential", propertyType = "Flat", limit = 6) {
        try {
            const formattedLocation = city.toLowerCase().replace(/\s+/g, '-');
            
            // Use specific listing page URL — NO wildcard to avoid crawling hundreds of pages
            const url = `https://www.99acres.com/property-in-${formattedLocation}-ffid`;

            const propertyTypePrompt = propertyType === "Flat" ? "Flats" : "Individual Houses";
            
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
                                    description: "Type of property (commercial, residential, etc)"
                                },
                                location_address: {
                                    type: "string",
                                    description: "Complete address of the property"
                                },
                                price: {
                                    type: "string",
                                    description: "Price of the property in INR"
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
                                }
                            },
                            required: ["building_name", "property_type", "location_address", "price"]
                        }
                    }
                },
                required: ["properties"]
            };
            
            const extractResult = await this.firecrawl.extract(
                [url],
                {
                    prompt: `From this single page, extract ${limit} ${propertyCategory} ${propertyTypePrompt} in ${city} priced under ${maxPrice} crores. Return exactly ${limit} properties, no more.`,
                    schema: propertySchema
                }
            );

            if (!extractResult.success) {
                throw new Error(`Failed to extract property data: ${extractResult.error || 'Unknown error'}`);
            }

            // Enforce limit in code — never trust the LLM to respect it
            const properties = extractResult.data.properties.slice(0, limit);
            console.log(`[Firecrawl] Extracted ${extractResult.data.properties.length} properties, returning ${properties.length}`);

            return { properties };
        } catch (error) {
            console.error('Error finding properties:', error);
            throw error;
        }
    }

    async getLocationTrends(city, limit = 5) {
        try {
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
            
            const extractResult = await this.firecrawl.extract(
                [url],
                {
                    prompt: `From this page, extract price trend data for ${limit} major localities in ${city}. Include: location name, price per sqft, yearly percent increase, and rental yield.`,
                    schema: locationSchema
                }
            );

            if (!extractResult.success) {
                throw new Error(`Failed to extract location data: ${extractResult.error || 'Unknown error'}`);
            }

            // Enforce limit in code
            const locations = extractResult.data.locations.slice(0, limit);
            console.log(`[Firecrawl] Extracted ${extractResult.data.locations.length} locations, returning ${locations.length}`);
            
            return { locations };
        } catch (error) {
            console.error('Error fetching location trends:', error);
            throw error;
        }
    }
}

/**
 * Factory — create a FirecrawlService with a caller-supplied API key.
 */
export function createFirecrawlService(apiKey) {
    return new FirecrawlService(apiKey);
}

export default new FirecrawlService();