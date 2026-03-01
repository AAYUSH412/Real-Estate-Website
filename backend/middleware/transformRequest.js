/**
 * Transform the new frontend's AI search request format to the backend format.
 *
 * Frontend sends:
 *   { city, price: { min, max }, type, category }
 *
 * Backend expects:
 *   { city, maxPrice (in Crores string), propertyType, propertyCategory, limit }
 *
 * IMPORTANT: The propertyType values passed here MUST match the keys in
 * PROPERTY_TYPE_SLUGS in firecrawlService.js so that the correct 99acres
 * URL slug is selected. Valid values:
 *   Flat | House | Villa | Plot | Penthouse | Studio | Commercial
 */
export const transformAISearchRequest = (req, res, next) => {
  const { city, price, type, category } = req.body;

  // Convert price from absolute INR to Crores (1 Cr = 1,00,00,000)
  let maxPriceInCr = '5'; // sensible default
  if (price?.max) {
    maxPriceInCr = (price.max / 10000000).toFixed(1);
  }

  // Map frontend "type" values to the canonical property types used by firecrawlService.
  // Each value here must match a key in PROPERTY_TYPE_SLUGS.
  const typeMap = {
    // Direct matches (frontend dropdown values)
    Flat: 'Flat',
    Villa: 'Villa',
    House: 'House',
    Plot: 'Plot',
    Penthouse: 'Penthouse',
    Studio: 'Studio',
    // Aliases / alternative names the frontend might send
    Modern: 'Flat',
    Apartment: 'Flat',
    Independent: 'House',
    'Independent House': 'House',
    'Studio Apartment': 'Studio',
    'Residential Land': 'Plot',
    Commercial: 'Commercial',
  };

  req.body = {
    city: city || req.body.city,
    maxPrice: maxPriceInCr,
    propertyType: typeMap[type] || type || 'Flat',
    propertyCategory: category || 'Residential',
    limit: 6,
  };

  next();
};
